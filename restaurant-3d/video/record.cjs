// Records the walkthrough video frame by frame from index.html in headless Chromium.
//
//   node record.cjs <frames-dir> [--w 1280 --h 720 --fps 12 --fast --from 0 --to 9999]
//   ffmpeg -framerate 12 -i <frames-dir>/f%05d.jpg -vf "minterpolate=fps=24:mi_mode=mci" -c:v libx264 -pix_fmt yuv420p -crf 18 walkthrough.mp4
//
// Resumable: frames already on disk are skipped. Three.js is loaded from node_modules
// (THREE_DIR, default ./node_modules/three) instead of the CDN.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
const OUT = args[0];
const W = +opt('w', 1280), H = +opt('h', 720), FPS = +opt('fps', 12), FAST = !!opt('fast', false);
const THREE_DIR = process.env.THREE_DIR || path.join(__dirname, 'node_modules/three');
const PAGE = path.join(__dirname, '..', 'index.html');

// ---------- camera route ----------
const GF = 0.3, FF = 3.9, SR = (FF - GF) / 24, SG = 7.8 / 23;
const orbit = (deg, r, h) => { const a = deg * Math.PI / 180; return [5 + r * Math.sin(a), h, 5.6 + r * Math.cos(a)]; };
const shots = [
  { name: 'arrival', dur: 14, fov: 40, exp: [0.72, 0.75],
    cam: [orbit(-42, 25, 8), orbit(-15, 23, 5.5), orbit(15, 22, 3.8), orbit(42, 21.5, 3.0)],
    target: [[5, 4.8, 5.6], [5, 4.6, 5.6], [5, 4.4, 5.6], [5, 4.3, 5.6]],
    title: ['Earth & Artisanship', 'Proposed restaurant · Sadik Abdi', 1.0, 6.0] },
  { name: 'dormer', dur: 6, fov: 38, exp: [0.75, 0.75],
    cam: [[7.5, 2.2, 21.5], [5.6, 3.6, 19.5], [5.0, 4.6, 17.5]],
    target: [[5.6, 4.8, 9.5], [5.0, 5.3, 9.5], [4.95, 5.5, 9.5]],
    title: ['Glazed roof dormer', '5.0 m wide, 1.2 m out over the verandah', 0.8, 5.0] },
  { name: 'restaurant', dur: 12, fov: 56, exp: [0.78, 0.95], expAt: [0.25, 0.45],
    cam: [[7.1, 1.65, 14.5], [7.1, 1.65, 11.4], [7.1, 1.66, 9.4], [7.35, 1.68, 7.9], [8.4, 1.7, 6.3], [8.9, 1.72, 5.7]],
    target: [[7.1, 1.55, 6], [7.0, 1.5, 4], [6.0, 1.45, 4.5], [4.0, 1.4, 6.5], [2.2, 1.4, 8.6], [1.8, 1.4, 9.0]],
    title: ['Restaurant', 'Ground floor', 4.5, 10.5] },
  { name: 'walkway', dur: 9, fov: 62, exp: [1.35, 1.4],
    cam: [[1.8, 1.62, 6.3], [1.8, 1.62, 4.6], [1.8, 1.6, 2.4]],
    target: [[1.8, 1.0, 0.2], [1.8, 1.0, 0.0], [1.75, 1.05, -0.5]],
    title: ['Walkway', 'Checkered tiling to the back of house', 1.0, 7.5] },
  { name: 'stair', dur: 10, fov: 60, exp: [1.05, 1.0],
    cam: [[0.72, GF + 1.65, 11.2], [0.72, GF + 1.65, 10.2], [0.72, GF + SR * 8 + 1.6, 9.8 - SG * 7.5],
          [0.72, GF + SR * 16 + 1.6, 9.8 - SG * 15.5], [0.75, FF + 1.45, 1.8], [1.4, FF + 1.45, 1.6]],
    target: [[0.72, 2.2, 5.0], [0.72, 2.8, 5.0], [0.72, 3.8, 3.0], [0.72, 5.0, 0.5], [2.5, 5.4, 1.5], [8.0, 5.4, 6.0]],
    title: ['Staircase', 'One straight flight up the west wall', 1.0, 8.0] },
  { name: 'lounge', dur: 13, fov: 60, exp: [1.05, 1.0],
    cam: [[1.7, 5.4, 2.4], [3.4, 5.38, 4.0], [4.1, 5.36, 4.8], [6.0, 5.35, 7.6], [7.4, 5.35, 8.0]],
    target: [[8.5, 5.6, 5.0], [9.0, 5.7, 7.0], [1.0, 6.4, 6.0], [3.0, 5.6, 9.6], [4.9, 5.2, 11.2]],
    title: ['Lounge', 'Under the roof', 1.0, 9.0] },
  { name: 'section', dur: 10, fov: 42, exp: [0.95, 0.95], clip: [12, 5.8],
    cam: [[25, 5.0, 4.6], [23, 5.6, 5.4], [21.5, 6.2, 6.6]],
    target: [[5, 5.0, 5.4], [5, 5.0, 5.4], [5, 4.8, 5.6]],
    title: ['Section X–X', 'Both floors under one roof', 2.5, 9.0] },
  { name: 'closing', dur: 7, fov: 40, exp: [0.75, 0.75],
    cam: [orbit(55, 21, 3.2), orbit(30, 26, 6.5)],
    target: [[5, 4.3, 5.6], [5, 4.6, 5.6]],
    title: ['Earth & Artisanship', 'Proposed restaurant · Sadik Abdi', 1.5, 7.0], fadeOutEnd: true }
];

const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t * t * (3 - 2 * t);
function catmull(pts, t) {
  const n = pts.length - 1, f = Math.min(n - 1e-9, Math.max(0, t * n)), i = Math.floor(f), u = f - i;
  const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[Math.min(n, i + 1)], p3 = pts[Math.min(n, i + 2)];
  return p1.map((_, k) => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * u + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u * u + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * u * u * u));
}
const FADE = 0.6;
function frameState(time) {
  let t0 = 0;
  for (let si = 0; si < shots.length; si++) {
    const s = shots[si];
    if (time < t0 + s.dur || si === shots.length - 1) {
      const lt = Math.min(time - t0, s.dur), u = ease(lt / s.dur);
      let ex = s.exp[0];
      if (s.expAt) ex = lerp(s.exp[0], s.exp[1], ease(Math.min(1, Math.max(0, (u - s.expAt[0]) / (s.expAt[1] - s.expAt[0])))));
      else ex = lerp(s.exp[0], s.exp[1], u);
      let fade = 0;
      if (si > 0 && lt < FADE) fade = 1 - lt / FADE;
      if (lt > s.dur - FADE && (si < shots.length - 1 || s.fadeOutEnd)) fade = Math.max(fade, (lt - (s.dur - FADE)) / FADE);
      if (s.fadeOutEnd && lt > s.dur - 2) fade = Math.max(fade, (lt - (s.dur - 2)) / 2);
      const [ta, tb] = s.title.slice(2);
      const tOp = lt < ta ? 0 : lt < ta + 0.8 ? (lt - ta) / 0.8 : lt < tb ? 1 : lt < tb + 0.8 ? 1 - (lt - tb) / 0.8 : 0;
      return {
        shot: { cam: catmull(s.cam, u), target: catmull(s.target, u), fov: s.fov, exp: ex,
                clipX: s.clip ? lerp(s.clip[0], s.clip[1], ease(Math.min(1, lt / (s.dur * 0.6)))) : undefined },
        film: [s.title[0], s.title[1], Math.max(0, Math.min(1, tOp)), Math.min(1, fade)]
      };
    }
    t0 += s.dur;
  }
}
const TOTAL = shots.reduce((a, s) => a + s.dur, 0);
const N = Math.round(TOTAL * FPS);

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const from = +opt('from', 0), to = Math.min(N - 1, +opt('to', N - 1));
  const todo = [];
  for (let i = from; i <= to; i++) if (!fs.existsSync(path.join(OUT, `f${String(i).padStart(5, '0')}.jpg`))) todo.push(i);
  console.log(`${TOTAL}s, ${N} frames at ${FPS} fps; ${todo.length} to render`);
  if (!todo.length) return;
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  page.on('pageerror', e => console.log('pageerror:', e.message));
  await page.route('**/*', r => {
    const u = r.request().url(), m = u.match(/three@0\.170\.0\/(.*)$/);
    if (m) return r.fulfill({ path: path.join(THREE_DIR, m[1]), contentType: 'text/javascript' });
    if (u.includes('fonts.g')) return r.abort();
    return r.continue();
  });
  await page.goto('file://' + PAGE);
  await page.addStyleTag({ content: '.card,.caption,.loading{display:none!important}' });
  await page.waitForFunction(() => window.__render, null, { timeout: 180000 });
  await page.evaluate(h => window.__render.setHigh(h), !FAST);
  // Warm-up render: compiles every shader before timing starts
  await page.evaluate(st => { const r = window.__render; r.shot(st.shot); r.renderNow(); }, frameState(0));
  const t0 = Date.now();
  for (let k = 0; k < todo.length; k++) {
    const i = todo[k], st = frameState(i / FPS);
    await page.evaluate(st => { const r = window.__render; r.shot(st.shot); r.film(...st.film); r.renderNow(); }, st);
    const file = path.join(OUT, `f${String(i).padStart(5, '0')}.jpg`);
    await page.screenshot({ path: file + '.tmp', type: 'jpeg', quality: 93, timeout: 300000 });
    fs.renameSync(file + '.tmp', file);
    if (k % 20 === 0) {
      const per = (Date.now() - t0) / (k + 1) / 1000;
      console.log(`frame ${i}/${N - 1}  ${per.toFixed(1)} s/frame  ~${Math.round(per * (todo.length - k - 1) / 60)} min left`);
    }
  }
  await browser.close();
})();
