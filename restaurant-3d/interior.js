/*
 * "Earth & Artisanship" interior scheme for the restaurant model (browser only).
 *
 * Takes the model returned by buildRestaurant() and changes ONLY finishes and lighting:
 *   - swaps every material for a procedural, textured PBR material
 *   - re-projects UVs in world space so textures keep real-world scale (no vertex moves)
 *   - adds light fittings and decor the scheme calls for: woven pendants, rattan ceiling
 *     installations, LED coves, backlit silhouette murals and checkered walkway tiling
 * Walls, slabs, stair, roof and furniture positions are left exactly as built.
 */
(function (root) {
  function applyEarthArtisanship(THREE, model, opts) {
    opts = opts || {};
    const { groups, levels } = model;
    const { GF, FF, EAVE, RIDGE } = levels;
    const CEIL = FF - 0.15;
    const roofUnder = z => EAVE + Math.min(z, 10 - z);

    // ---------- procedural texture toolkit ----------
    function rng(seed) {
      return function () {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    // Tileable fractal value noise, values 0..1. sx/sy stretch the base frequency per axis.
    function fbm(size, period, octaves, seed, sx, sy) {
      sx = sx || 1; sy = sy || 1;
      const out = new Float32Array(size * size);
      let amp = 1, norm = 0;
      for (let o = 0; o < octaves; o++) {
        const px = Math.max(1, Math.round(period * sx * (1 << o))), py = Math.max(1, Math.round(period * sy * (1 << o)));
        const r = rng(seed + o * 101), g = new Float32Array(px * py);
        for (let i = 0; i < g.length; i++) g[i] = r();
        for (let y = 0; y < size; y++) {
          const fy = (y / size) * py, yi = Math.floor(fy), yf = fy - yi, v = yf * yf * (3 - 2 * yf);
          const y0 = (yi % py) * px, y1 = ((yi + 1) % py) * px;
          for (let x = 0; x < size; x++) {
            const fx = (x / size) * px, xi = Math.floor(fx), xf = fx - xi, u = xf * xf * (3 - 2 * xf);
            const x0 = xi % px, x1 = (xi + 1) % px;
            const a = g[y0 + x0] + (g[y0 + x1] - g[y0 + x0]) * u;
            const b = g[y1 + x0] + (g[y1 + x1] - g[y1 + x0]) * u;
            out[y * size + x] += (a + (b - a) * v) * amp;
          }
        }
        norm += amp; amp *= 0.5;
      }
      for (let i = 0; i < out.length; i++) out[i] /= norm;
      return out;
    }
    const hex = h => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
    const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    const clamp01 = v => Math.max(0, Math.min(1, v));

    // Paint a size x size canvas from fn(x, y) -> [r, g, b, a?]
    function paint(w, h, fn) {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const ctx = c.getContext('2d'), img = ctx.createImageData(w, h), d = img.data;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const p = fn(x, y), i = (y * w + x) * 4;
        d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2]; d[i + 3] = p.length > 3 ? p[3] : 255;
      }
      ctx.putImageData(img, 0, 0);
      return c;
    }
    function normalFromHeight(hf, size, strength) {
      return paint(size, size, (x, y) => {
        const l = hf[y * size + ((x - 1 + size) % size)], r = hf[y * size + ((x + 1) % size)];
        const u = hf[((y - 1 + size) % size) * size + x], d = hf[((y + 1) % size) * size + x];
        let nx = (l - r) * strength, ny = (d - u) * strength, nz = 1;
        const len = Math.hypot(nx, ny, nz); nx /= len; ny /= len; nz /= len;
        return [(nx * 0.5 + 0.5) * 255, (ny * 0.5 + 0.5) * 255, (nz * 0.5 + 0.5) * 255];
      });
    }
    function tex(canvas, metres, srgb) {
      const t = new THREE.CanvasTexture(canvas);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(1 / metres, 1 / metres);
      t.anisotropy = 8;
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      return t;
    }

    // Rammed earth: horizontal compaction strata in terracotta, ochre and sand
    const rammed = (() => {
      const S = 512, n1 = fbm(S, 4, 4, 11, 1, 0.5), n2 = fbm(S, 32, 3, 12), strata = 26;
      const pal = [0x9e5d3c, 0xa66541, 0xae6e47, 0x985838, 0xb3774d, 0xa16040, 0xa96a44].map(hex);
      const h = new Float32Array(S * S);
      const col = paint(S, S, (x, y) => {
        const i = y * S + x, layer = (y / S) * strata + (n1[i] - 0.5) * 1.4;
        const k = ((Math.floor(layer) % strata) + strata) % strata, f = layer - Math.floor(layer);
        const base = pal[(k * 5 + 3) % pal.length];
        const shade = 0.86 + 0.2 * n2[i] - (f < 0.05 ? 0.07 : 0);
        h[i] = n2[i] * 0.6 + (f < 0.06 ? -0.4 : 0);
        return base.map(c => clamp01((c / 255) * shade) * 255);
      });
      return { map: tex(col, 1.6, true), normal: tex(normalFromHeight(h, S, 3), 1.6) };
    })();

    // Limewash ceiling
    const limewash = (() => {
      const S = 256, n = fbm(S, 6, 4, 21), a = hex(0xe2d2bb), b = hex(0xd3bea2);
      return tex(paint(S, S, (x, y) => mix(a, b, n[y * S + x])), 2.0, true);
    })();

    // Polished travertine, 600 x 600 tiles (texture covers 1.2 m)
    const travertine = (() => {
      const S = 1024, vein = fbm(S, 3, 5, 31, 0.3, 6), n = fbm(S, 24, 3, 32), tile = 512;
      const a = hex(0xcdb592), b = hex(0xb89c76), grout = hex(0x8f7a5c);
      const tints = [1.0, 0.96, 1.03, 0.98];
      const rough = new Float32Array(S * S), h = new Float32Array(S * S);
      const col = paint(S, S, (x, y) => {
        const i = y * S + x, gx = x % tile, gy = y % tile, tId = (x / tile | 0) + 2 * (y / tile | 0);
        const isG = gx < 2 || gy < 2;
        const v = vein[i] > 0.6 ? (vein[i] - 0.6) * 2.2 : 0;
        rough[i] = isG ? 0.85 : 0.18 + v * 0.25;
        h[i] = isG ? -1 : -v * 0.6;
        if (isG) return grout;
        return mix(a, b, clamp01(n[i] * 0.6 + v)).map(c => c * tints[tId]);
      });
      return {
        map: tex(col, 1.2, true),
        rough: tex(paint(S, S, (x, y) => { const r = rough[y * S + x] * 255; return [r, r, r]; }), 1.2),
        normal: tex(normalFromHeight(h, S, 1.5), 1.2)
      };
    })();

    // Black and white marble laid diagonally, ~280 mm squares, polished (texture covers 1.6 m)
    const checker = (() => {
      const S = 512, c = 128, n = fbm(S, 4, 5, 41), w = fbm(S, 6, 4, 42);
      const blk = hex(0x121212), wht = hex(0xeeebe4), grout = hex(0x7d776d);
      const h = new Float32Array(S * S);
      const col = paint(S, S, (x, y) => {
        const i = y * S + x, u = x + y, v = x - y + S * 4;
        if (u % c < 1.5 || v % c < 1.5) { h[i] = -1; return grout; }
        const dark = ((Math.floor(u / c) + Math.floor(v / c)) & 1) === 0;
        const vein = Math.abs(Math.sin((x * 0.018 + y * 0.011) + n[i] * 9 + w[i] * 4));
        const line = vein < 0.035 ? 1 - vein / 0.035 : 0;
        const base = dark ? blk : wht;
        const vc = dark ? hex(0x6a6862) : hex(0x9a958b);
        return mix(base, vc, line * 0.75).map(ch => Math.min(255, ch * (0.96 + 0.06 * n[i])));
      });
      return { map: tex(col, 1.6, true), normal: tex(normalFromHeight(h, S, 1.0), 1.6) };
    })();

    // Oak herringbone, 90 x 450 mm planks laid at 45 deg; one 10 m texture so the pattern never repeats on the floor
    const herringbone = (() => {
      const N = 2048, M = 10, px = N / M, w = 0.09 * px, k = 5, cv = document.createElement('canvas');
      cv.width = cv.height = N;
      const ctx = cv.getContext('2d'), r = rng(181);
      ctx.fillStyle = '#5c3e26'; ctx.fillRect(0, 0, N, N);
      ctx.translate(N / 2, N / 2); ctx.rotate(Math.PI / 4);
      const tones = ['#a8744a', '#b5814f', '#9c6a42', '#c18d5a', '#ae7a4c', '#93633c'];
      const plank = (x, y, pw, ph, horiz) => {
        ctx.fillStyle = tones[Math.floor(r() * tones.length)];
        ctx.fillRect(x * w + 0.6, y * w + 0.6, pw * w - 1.2, ph * w - 1.2);
        ctx.strokeStyle = 'rgba(70,40,20,0.22)'; ctx.lineWidth = 0.8;
        for (let g = 0; g < 3; g++) {
          const o = 0.2 + r() * 0.6; ctx.beginPath();
          if (horiz) { ctx.moveTo(x * w + 2, (y + o) * w); ctx.lineTo((x + pw) * w - 2, (y + o + (r() - 0.5) * 0.15) * w); }
          else { ctx.moveTo((x + o) * w, y * w + 2); ctx.lineTo((x + o + (r() - 0.5) * 0.15) * w, (y + ph) * w - 2); }
          ctx.stroke();
        }
      };
      const span = Math.ceil(N * 0.75 / w);
      for (let m = -span; m <= span; m++) for (let n = -2 * span; n <= 2 * span; n++) {
        const ox = n + m * k, oy = n - m * k;
        if (Math.abs(ox) > 2 * span || Math.abs(oy) > 2 * span) continue;
        plank(ox, oy, k, 1, true);                 // horizontal plank
        plank(ox + k, oy - k + 1, 1, k, false);    // vertical plank tucked against its end
      }
      return tex(cv, M, true);
    })();

    // Black and white maze rug (after the booth reference)
    const maze = (() => {
      const S = 512, c = 32, cv = paint(S, S, (x, y) => {
        const cx = (x / c) | 0, cy = (y / c) | 0, lx = x % c, ly = y % c, vert = (cx + cy) % 2 === 0;
        const t = vert ? lx : ly, line = (t % 8) < 4;
        return line ? [24, 24, 24] : [236, 233, 226];
      });
      return tex(cv, 0.8, true);
    })();
    // Woven basket pendant: vertical cane strips with an ochre band and patchwork blocks (alpha gaps)
    const basketCanvas = (() => {
      const W = 1024, H = 256, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      const ctx = cv.getContext('2d'), r = rng(191);
      for (let x = 0; x < W; x += 6) {
        ctx.fillStyle = r() < 0.5 ? '#f0dcb0' : '#e6cc98'; ctx.fillRect(x, 0, 4, H);
      }
      const bandTop = H * 0.55;
      for (let x = 0; x < W; x += 6) { ctx.fillStyle = r() < 0.5 ? '#e39a22' : '#d4861a'; ctx.fillRect(x, bandTop, 4, H - bandTop); }
      for (let k = 0; k < 14; k++) {
        const x0 = Math.floor(r() * W / 6) * 6, bw = 30 + Math.floor(r() * 5) * 6, y0 = H * (0.15 + r() * 0.6), bh = 20 + r() * 40;
        for (let x = x0; x < x0 + bw; x += 6) {
          for (let y = y0; y < y0 + bh; y += 10) { ctx.fillStyle = ((x + y) / 6 | 0) % 2 ? '#1e1b18' : '#f4efe6'; ctx.fillRect(x, y, 4, 8); }
        }
      }
      return cv;
    })();

    // Candy-stripe upholstery: cream with paired rust pinstripes
    const stripes = (() => {
      const S = 256, n = fbm(S, 32, 3, 151), cream = hex(0xeee4d4), rust = hex(0xa8472c);
      return tex(paint(S, S, (x, y) => {
        const k = x % 32, on = (k >= 4 && k < 7) || (k >= 10 && k < 12);
        return (on ? rust : cream).map(c => c * (0.95 + 0.07 * n[y * S + x]));
      }), 0.22, true);
    })();
    // Small floral print (chair backs, cushions)
    const floral = (() => {
      const S = 512, cv = document.createElement('canvas'); cv.width = cv.height = S;
      const ctx = cv.getContext('2d'), r = rng(161);
      ctx.fillStyle = '#efe7d6'; ctx.fillRect(0, 0, S, S);
      const leafC = ['#7f9a5e', '#5f7a48', '#a9b98a'], flowC = ['#d98c8c', '#c2603f', '#e7b7a4', '#b04a5a'];
      for (let k = 0; k < 160; k++) {
        const x = r() * S, y = r() * S, a = r() * Math.PI * 2, L = 10 + r() * 18;
        ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = leafC[k % 3];
        ctx.beginPath(); ctx.ellipse(L / 2, 0, L / 2, L / 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      for (let k = 0; k < 55; k++) {
        const x = r() * S, y = r() * S, R0 = 6 + r() * 9, c = flowC[k % 4];
        ctx.fillStyle = c;
        for (let pt = 0; pt < 6; pt++) { const a = pt / 6 * Math.PI * 2; ctx.beginPath(); ctx.arc(x + Math.cos(a) * R0 * 0.6, y + Math.sin(a) * R0 * 0.6, R0 * 0.45, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = '#e9c46a'; ctx.beginPath(); ctx.arc(x, y, R0 * 0.3, 0, Math.PI * 2); ctx.fill();
      }
      return tex(cv, 0.35, true);
    })();
    // White marble (bistro table tops)
    const whiteMarble = (() => {
      const S = 512, n = fbm(S, 3, 6, 171), w = fbm(S, 5, 4, 172);
      const a = hex(0xf4f2ed), vein = hex(0xb9b4ab);
      return tex(paint(S, S, (x, y) => {
        const i = y * S + x, v = Math.abs(Math.sin(x * 0.01 + y * 0.015 + n[i] * 10 + w[i] * 4));
        return mix(a, vein, (v < 0.04 ? 1 - v / 0.04 : 0) * 0.6);
      }), 0.7, true);
    })();

    // Polished red marble (vanity top)
    const redMarble = (() => {
      const S = 512, n = fbm(S, 3, 6, 141), w = fbm(S, 5, 4, 142);
      const a = hex(0x6e221c), b = hex(0x9a3a2e), vein = hex(0xe8c9bd);
      return tex(paint(S, S, (x, y) => {
        const i = y * S + x, v = Math.abs(Math.sin(x * 0.012 - y * 0.02 + n[i] * 11 + w[i] * 5));
        const line = v < 0.05 ? 1 - v / 0.05 : 0;
        return mix(mix(a, b, w[i]), vein, line * 0.8);
      }), 0.9, true);
    })();

    // Hand-painted botanical mural: giant leaves over arches on a plaster ground
    function botanical(W, H, seed, pal) {
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      const ctx = cv.getContext('2d'), r = rng(seed);
      ctx.fillStyle = pal.ground; ctx.fillRect(0, 0, W, H);
      // plaster mottling
      for (let k = 0; k < 900; k++) {
        ctx.fillStyle = `rgba(${pal.mottle},${0.03 + r() * 0.05})`;
        ctx.beginPath(); ctx.arc(r() * W, r() * H, 10 + r() * 60, 0, Math.PI * 2); ctx.fill();
      }
      // arches and colour blocks
      const unit = H;
      for (let k = 0; k < W / unit * 1.6; k++) {
        const aw = unit * (0.25 + r() * 0.35), ax = r() * W, top = H * (0.15 + r() * 0.45);
        ctx.fillStyle = pal.blocks[Math.floor(r() * pal.blocks.length)];
        ctx.beginPath(); ctx.moveTo(ax - aw / 2, H); ctx.lineTo(ax - aw / 2, top + aw / 2);
        ctx.arc(ax, top + aw / 2, aw / 2, Math.PI, 0); ctx.lineTo(ax + aw / 2, H); ctx.closePath(); ctx.fill();
      }
      function leaf(x, y, ang, L, Wd, col, vein, kind) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
        const p = new Path2D();
        if (kind === 'banana') {
          p.moveTo(0, 0);
          p.bezierCurveTo(L * 0.25, -Wd, L * 0.75, -Wd * 0.9, L, 0);
          p.bezierCurveTo(L * 0.75, Wd * 0.9, L * 0.25, Wd, 0, 0);
        } else {
          p.moveTo(0, 0);
          p.bezierCurveTo(L * 0.1, -Wd * 1.3, L * 0.9, -Wd * 1.2, L, 0);
          p.bezierCurveTo(L * 0.9, Wd * 1.2, L * 0.1, Wd * 1.3, L * 0.05, Wd * 0.15);
          p.closePath();
        }
        ctx.fillStyle = col; ctx.fill(p);
        // painted two-tone: lighter upper half
        ctx.save(); ctx.clip(p); ctx.fillStyle = 'rgba(255,240,220,0.13)'; ctx.fillRect(0, -Wd * 1.4, L, Wd * 1.4); ctx.restore();
        ctx.strokeStyle = vein; ctx.lineCap = 'round';
        ctx.lineWidth = Math.max(2, Wd * 0.06); ctx.beginPath(); ctx.moveTo(-L * 0.12, 0); ctx.lineTo(L * 0.97, 0); ctx.stroke();
        ctx.lineWidth = Math.max(1, Wd * 0.025);
        const nv = kind === 'banana' ? 22 : 8;
        for (let k = 1; k < nv; k++) {
          const t = k / nv, sx = L * t, prof = Math.sin(Math.PI * Math.min(1, t * 1.05));
          [-1, 1].forEach(sg => {
            ctx.beginPath(); ctx.moveTo(sx, 0);
            ctx.quadraticCurveTo(sx + Wd * 0.3, sg * Wd * 0.5 * prof, sx + Wd * 0.55, sg * Wd * 0.95 * prof); ctx.stroke();
          });
        }
        if (kind === 'monstera') {
          ctx.strokeStyle = pal.ground; ctx.lineWidth = Math.max(2, Wd * 0.07);
          for (let k = 2; k < 8; k++) {
            const sx = L * k / 9, prof = Math.sin(Math.PI * k / 9);
            [-1, 1].forEach(sg => { ctx.beginPath(); ctx.moveTo(sx + Wd * 0.25, sg * Wd * 0.45 * prof); ctx.lineTo(sx + Wd * 0.6, sg * Wd * 1.15 * prof); ctx.stroke(); });
          }
        }
        ctx.restore();
      }
      const count = Math.round(W / unit * pal.density);
      for (let k = 0; k < count; k++) {
        const kind = r() < pal.monstera ? 'monstera' : 'banana';
        const L = unit * (kind === 'banana' ? 0.55 + r() * 0.5 : 0.35 + r() * 0.3);
        const x = r() * W, y = H * (0.55 + r() * 0.6);
        const ang = -Math.PI / 2 + (r() - 0.5) * 1.6;
        const col = pal.leaves[Math.floor(r() * pal.leaves.length)];
        ctx.strokeStyle = pal.stem; ctx.lineWidth = unit * 0.012;
        ctx.beginPath(); ctx.moveTo(x, H + 10); ctx.quadraticCurveTo(x + (r() - 0.5) * 60, y + (H - y) / 2, x, y); ctx.stroke();
        leaf(x, y, ang, L, L * (kind === 'banana' ? 0.2 : 0.42), col, pal.vein, kind);
      }
      return cv;
    }

    // Fluted ribs (velvet booth upholstery and reeded walnut)
    function flutes(count, metres, depth) {
      const S = 256, h = new Float32Array(S * S);
      const g = paint(S, S, (x, y) => {
        const f = (x / S) * count, p = Math.pow(Math.sin(Math.PI * (f - Math.floor(f))), 0.55);
        h[y * S + x] = p;
        const v = 185 + 70 * p;
        return [v, v, v];
      });
      return { map: tex(g, metres, true), normal: tex(normalFromHeight(h, S, depth), metres) };
    }
    const velvetRibs = flutes(6, 0.33, 4);
    const reeds = flutes(10, 0.3, 6);

    // Walnut, grain running horizontally
    const walnut = (() => {
      const S = 512, g = fbm(S, 2, 5, 51, 0.15, 8), n = fbm(S, 16, 3, 52);
      const a = hex(0x40251a), b = hex(0x7a4b2d);
      return tex(paint(S, S, (x, y) => {
        const i = y * S + x, ring = 0.5 + 0.5 * Math.sin((y / S) * 70 + g[i] * 14);
        return mix(a, b, clamp01(ring * 0.65 + n[i] * 0.35));
      }), 1.0, true);
    })();

    // Ridge-parallel timber boarding for the underside of the roof
    const boards = (() => {
      const S = 512, g = fbm(S, 2, 4, 61, 0.1, 6), board = 64;
      const a = hex(0x87603f), b = hex(0xa67d55);
      const tints = [1, 0.93, 1.05, 0.97, 1.02, 0.9, 1.04, 0.96];
      return tex(paint(S, S, (x, y) => {
        if (y % board < 2) return [70, 45, 30];
        const k = (y / board) | 0;
        return mix(a, b, g[y * S + x]).map(c => Math.min(255, c * tints[k % 8]));
      }), 1.0, true);
    })();

    // Hand-woven rattan: basket weave with open gaps (alpha)
    const rattanCanvas = (() => {
      const S = 256, cell = 32, strands = 3, sw = cell / strands;
      const lt = hex(0xd2ab72), dk = hex(0x9c7240);
      return paint(S, S, (x, y) => {
        const cx = (x / cell) | 0, cy = (y / cell) | 0, horiz = (cx + cy) % 2 === 0;
        const across = horiz ? y % cell : x % cell, along = horiz ? x % cell : y % cell;
        const s = across % sw;
        if (s < 1.6) return [0, 0, 0, 0];
        const prof = Math.sin(Math.PI * (s - 1.6) / (sw - 1.6));
        const shade = 0.55 + 0.45 * prof * (0.85 + 0.15 * Math.sin(along * 0.4));
        return mix(dk, lt, shade).concat(255);
      });
    })();
    const rattan = tex(rattanCanvas, 0.16, true);

    // Terracotta quarry tiles for the kitchen (200 mm)
    const quarry = (() => {
      const S = 512, cell = 128, n = fbm(S, 12, 4, 71);
      const tints = [hex(0xb4613d), hex(0xa95736), hex(0xbe6c45), hex(0xae5c3a)], grout = hex(0x8e7b66);
      return tex(paint(S, S, (x, y) => {
        if (x % cell < 3 || y % cell < 3) return grout;
        const t = tints[((x / cell | 0) * 3 + (y / cell | 0) * 7) % 4];
        return t.map(c => c * (0.9 + 0.18 * n[y * S + x]));
      }), 0.8, true);
    })();

    // Hand-thrown terracotta (pots, planters)
    const clay = (() => {
      const S = 256, n = fbm(S, 10, 4, 81), a = hex(0xa9583a), b = hex(0xc47852);
      return tex(paint(S, S, (x, y) => mix(a, b, n[y * S + x])), 0.5, true);
    })();

    // Natural sandstone (column and beam cladding, plinth)
    const sandstone = (() => {
      const S = 512, layers = fbm(S, 3, 5, 91, 0.4, 3), n = fbm(S, 40, 3, 92);
      const a = hex(0xc9ad85), b = hex(0xe0c9a3), h = new Float32Array(S * S);
      const col = paint(S, S, (x, y) => {
        const i = y * S + x; h[i] = n[i] * 0.7 + layers[i] * 0.3;
        return mix(a, b, clamp01(layers[i] * 0.7 + n[i] * 0.3));
      });
      return { map: tex(col, 1.0, true), normal: tex(normalFromHeight(h, S, 2.5), 1.0) };
    })();

    // Site: dry warm grass and sandstone paving
    const grass = (() => {
      const S = 512, n = fbm(S, 16, 5, 101), a = hex(0x7d7d45), b = hex(0xa69c62);
      return tex(paint(S, S, (x, y) => mix(a, b, n[y * S + x])), 4.0, true);
    })();
    const pavers = (() => {
      const S = 512, n = fbm(S, 12, 4, 111);
      const a = hex(0xc4ab86), b = hex(0xd8c19c), grout = hex(0x9a8668);
      return tex(paint(S, S, (x, y) => {
        const row = (y / 128) | 0, xo = (x + (row % 2) * 128) % S;
        if (y % 128 < 3 || xo % 256 < 3) return grout;
        return mix(a, b, n[y * S + x]);
      }), 1.2, true);
    })();

    // Brushed metal roughness streaks
    const brushed = (() => {
      const S = 256, n = fbm(S, 2, 4, 121, 0.05, 16);
      return tex(paint(S, S, (x, y) => { const v = 70 + 70 * n[y * S + x]; return [v, v, v]; }), 0.4);
    })();

    // Precision-cut tree silhouettes, backlit (after the concept board's carved tree panels)
    function mural(w, h, seed) {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const ctx = c.getContext('2d'), r = rng(seed);
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#5a2617'); bg.addColorStop(1, '#8e4126');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
      const glow = ctx.createRadialGradient(w / 2, h * 0.75, 10, w / 2, h * 0.75, Math.max(w, h) * 0.7);
      glow.addColorStop(0, 'rgba(240,160,90,0.55)'); glow.addColorStop(1, 'rgba(240,160,90,0)');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
      function branch(x, y, ang, len, wid, depth, color) {
        const x2 = x + Math.cos(ang) * len, y2 = y - Math.sin(ang) * len;
        ctx.strokeStyle = color; ctx.lineWidth = wid; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + (r() - 0.5) * len * 0.3, (y + y2) / 2, x2, y2); ctx.stroke();
        if (depth <= 0) {
          ctx.fillStyle = color;
          for (let k = 0; k < 5; k++) {
            ctx.beginPath();
            ctx.ellipse(x2 + (r() - 0.5) * len, y2 + (r() - 0.5) * len * 0.8, len * 0.28, len * 0.14, r() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
          }
          return;
        }
        const n = 2 + (r() < 0.4 ? 1 : 0);
        for (let k = 0; k < n; k++) branch(x2, y2, ang + (r() - 0.5) * 1.3, len * (0.66 + r() * 0.12), wid * 0.62, depth - 1, color);
      }
      const unit = Math.min(w, h);
      const layers = [['#a65a32', 0.22], ['#c07040', 0.26], ['#311309', 0.3]];
      layers.forEach(([color, s], li) => {
        const trees = Math.max(2, Math.round(w / unit * 2));
        for (let t = 0; t < trees; t++) {
          const x = ((t + 0.5 + (li - 1) * 0.3) / trees) * w;
          branch(x, h, Math.PI / 2 + (r() - 0.5) * 0.15, unit * s, unit * 0.035, 6, color);
        }
      });
      return c;
    }

    // White lime plaster for every wall
    const whitePlaster = (() => {
      const S = 512, n = fbm(S, 10, 5, 131), m = fbm(S, 48, 3, 132);
      const a = hex(0xf6f4ef), b = hex(0xe9e5dc), h = new Float32Array(S * S);
      const col = paint(S, S, (x, y) => { const i = y * S + x; h[i] = n[i] * 0.6 + m[i] * 0.4; return mix(a, b, clamp01(n[i] * 0.8 + m[i] * 0.2)); });
      return { map: tex(col, 2.0, true), normal: tex(normalFromHeight(h, S, 1.2), 2.0) };
    })();

    // ---------- materials ----------
    const S = (o) => new THREE.MeshStandardMaterial(o);
    const P = (o) => new THREE.MeshPhysicalMaterial(o);
    const F = {
      earth: S({ map: whitePlaster.map, normalMap: whitePlaster.normal, normalScale: new THREE.Vector2(0.5, 0.5), roughness: 0.92 }),
      ceiling: S({ map: limewash, roughness: 0.95 }),
      travertine: S({ map: travertine.map, roughnessMap: travertine.rough, normalMap: travertine.normal, normalScale: new THREE.Vector2(0.4, 0.4), roughness: 1 }),
      checker: P({ map: checker.map, normalMap: checker.normal, normalScale: new THREE.Vector2(0.4, 0.4), roughness: 0.14, clearcoat: 0.5, clearcoatRoughness: 0.08 }),
      quarry: S({ map: quarry, roughness: 0.62 }),
      herringbone: P({ map: herringbone, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.2 }),
      stripe: S({ map: stripes, roughness: 0.85 }),
      rug: S({ map: maze, roughness: 0.95 }),
      floral: S({ map: floral, roughness: 0.8 }),
      velvetOrange: P({ color: 0xb4441f, roughness: 0.8, sheen: 1, sheenColor: new THREE.Color(0xe08a5c), sheenRoughness: 0.45 }),
      marbleWhite: P({ map: whiteMarble, roughness: 0.1, clearcoat: 0.6, clearcoatRoughness: 0.06 }),
      darkWood: S({ map: walnut, color: 0x7a6a62, roughness: 0.4 }),
      rattan: S({ color: 0xb37b46, normalMap: reeds.normal, normalScale: new THREE.Vector2(1.4, 1.4), roughness: 0.6 }),
      redMarble: P({ map: redMarble, roughness: 0.12, clearcoat: 0.5, clearcoatRoughness: 0.08 }),
      basinMarble: P({ map: redMarble, color: 0xcfa59a, roughness: 0.2 }),
      mirror: S({ color: 0xd8d8d8, metalness: 1, roughness: 0.04 }),
      sandstone: S({ map: sandstone.map, normalMap: sandstone.normal, normalScale: new THREE.Vector2(0.8, 0.8), roughness: 0.88 }),
      velvetTerracotta: P({ color: 0x8c3a22, map: velvetRibs.map, normalMap: velvetRibs.normal, roughness: 0.82, sheen: 1, sheenColor: new THREE.Color(0xc96a4c), sheenRoughness: 0.5 }),
      velvetOchre: P({ color: 0xa8741c, map: velvetRibs.map, normalMap: velvetRibs.normal, roughness: 0.82, sheen: 1, sheenColor: new THREE.Color(0xd9a650), sheenRoughness: 0.5 }),
      walnut: S({ map: walnut, roughness: 0.48 }),
      walnutDoor: S({ map: walnut, color: 0xb79a88, roughness: 0.42 }),
      reededWalnut: S({ map: walnut, normalMap: reeds.normal, normalScale: new THREE.Vector2(1.2, 1.2), roughness: 0.45 }),
      boards: S({ map: boards, roughness: 0.7 }),
      roofSheet: S({ color: 0x7a7b7a, metalness: 0.5, roughness: 0.48 }),
      dormerClad: S({ color: 0x2e3135, metalness: 0.5, roughness: 0.45 }),
      charcoal: S({ color: 0x2a2826, metalness: 0.45, roughness: 0.45 }),
      brass: S({ color: 0xb38a4c, metalness: 1, roughness: 0.6, roughnessMap: brushed }),
      glass: P({ color: 0x9fb2ad, transparent: true, opacity: 0.1, roughness: 0.03, metalness: 0, depthWrite: false, side: THREE.DoubleSide, specularIntensity: 1 }),
      inox: S({ color: 0xc8c8c4, metalness: 0.9, roughness: 0.3, roughnessMap: brushed }),
      honed: S({ map: travertine.map, normalMap: travertine.normal, roughness: 0.38, color: 0xf2e8dc }),
      sanitary: P({ color: 0xf6f3ee, roughness: 0.08, clearcoat: 0.6 }),
      leaf: S({ color: 0x5c6b2c, roughness: 0.72, flatShading: true }),
      clay: S({ map: clay, roughness: 0.85 }),
      grass: S({ map: grass, roughness: 1 }),
      pavers: S({ map: pavers, roughness: 0.9 }),
      rattan: S({ map: rattan, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.78 }),
      led: S({ color: 0x000000, emissive: 0xffb466, emissiveIntensity: 5 }),
      bulb: S({ color: 0x000000, emissive: 0xffc580, emissiveIntensity: 9 }),
      cord: S({ color: 0x1d1b1a, roughness: 0.6 })
    };

    // Old (geometry-builder) material -> new finish
    const M = model.mats;
    const swap = new Map([
      [M.plaster, F.earth], [M.concrete, F.sandstone], [M.column, F.sandstone], [M.stone, F.travertine],
      [M.tile, F.quarry], [M.roof, F.roofSheet], [M.dormerClad, F.dormerClad],
      [M.stripe, F.stripe], [M.rug, F.rug], [M.led, F.led], [M.floral, F.floral], [M.velvetOrange, F.velvetOrange], [M.marbleWhite, F.marbleWhite], [M.darkWood, F.darkWood], [M.rattan, F.rattan], [M.steel, F.charcoal], [M.brass, F.brass], [M.glass, F.glass],
      [M.frame, F.charcoal], [M.door, F.walnutDoor], [M.wood, F.walnut], [M.sofaGF, F.velvetTerracotta],
      [M.sofaFF, F.velvetOchre], [M.counter, F.honed], [M.inox, F.inox], [M.leaf, F.leaf], [M.pot, F.clay],
      [M.grass, F.grass], [M.paving, F.pavers], [M.sanitary, F.sanitary]
    ]);
    // Per-face finishes on boxes: [+x, -x, +y, -y, +z, -z]
    const byName = {
      'First floor slab': [F.travertine, F.travertine, F.travertine, F.ceiling, F.travertine, F.travertine],
      'W.C ceiling': F.ceiling,
      'Roof sheeting': [F.roofSheet, F.roofSheet, F.roofSheet, F.boards, F.roofSheet, F.roofSheet],
      'Service counter': [F.reededWalnut, F.reededWalnut, F.honed, F.reededWalnut, F.reededWalnut, F.reededWalnut],
      'Cashier desk': [F.reededWalnut, F.reededWalnut, F.honed, F.reededWalnut, F.reededWalnut, F.reededWalnut],
      'Planter': F.clay,
      'Booth shell': F.reededWalnut,
      'Restaurant floor (polished stone)': F.herringbone,
      'Kitchen floor (ceramic tiles)': F.checker,
      'Verandah': [F.sandstone, F.sandstone, F.herringbone, F.sandstone, F.sandstone, F.sandstone],
      'Entrance step': [F.sandstone, F.sandstone, F.herringbone, F.sandstone, F.sandstone, F.sandstone],
      'Vanity base': [F.reededWalnut, F.reededWalnut, F.reededWalnut, F.reededWalnut, F.reededWalnut, F.reededWalnut],
      'Vanity top': F.redMarble,
      'Basin': F.basinMarble,
      'Plinth': F.sandstone,
      'Dormer roof': [F.dormerClad, F.dormerClad, F.dormerClad, F.boards, F.dormerClad, F.dormerClad],
      'Dormer frame': [F.ceiling, F.ceiling, F.ceiling, F.ceiling, F.ceiling, F.ceiling]
    };
    model.root.traverse(o => {
      if (!o.isMesh) return;
      o.material = byName[o.name] || swap.get(o.material) || o.material;
      if (o.material === F.glass) o.userData.noAO = true;
    });

    // ---------- added fittings and decor (finishes and lighting only) ----------
    const lights = [];
    function addBox(g, mat, x0, x1, y0, y1, z0, z1, name) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat);
      m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      m.name = name || ''; m.castShadow = mat !== F.led; m.receiveShadow = true;
      g.add(m); return m;
    }

    // Black and white marble kept in the back-of-house zone: W.Cs, walkway and the basin lobby
    // (to the end of the vanity under the stair), with a brass threshold strip onto the herringbone
    addBox(groups.ground, F.checker, 0.2, 2.2, GF + 0.011, GF + 0.016, 0.2, 5.3, 'Back-of-house tiling');
    addBox(groups.ground, F.brass, 0.2, 2.2, GF + 0.011, GF + 0.018, 5.3, 5.32, 'Threshold strip');

    // ---------- Lounge: botanical mural on the back (north) knee wall ----------
    const loungeMural = new THREE.CanvasTexture(botanical(3072, 470, 23, {
      ground: '#e6d6bf', mottle: '120,80,50', stem: '#5b3a24', vein: 'rgba(40,20,10,0.55)',
      blocks: ['#b8643c', '#8f3b26', '#c98a4b', '#d9b48a', '#6e2f20'],
      leaves: ['#3f4a2a', '#5c6b2c', '#7a3424', '#a4522f', '#2f3a24', '#b8743c', '#6b6a3a'],
      density: 2.6, monstera: 0.45 }));
    loungeMural.colorSpace = THREE.SRGBColorSpace; loungeMural.anisotropy = 8;
    const lm = new THREE.Mesh(new THREE.PlaneGeometry(9.6, EAVE - 0.04 - FF), S({ map: loungeMural, roughness: 0.85 }));
    lm.position.set(5.0, (FF + EAVE - 0.04) / 2, 0.206);
    lm.userData.keepUV = true; lm.receiveShadow = true; lm.name = 'Botanical mural'; groups.first.add(lm);

    // ---------- Basin lobby under the stair (after the washroom reference) ----------
    const paper = new THREE.CanvasTexture(botanical(1024, 1100, 31, {
      ground: '#b9776a', mottle: '90,40,30', stem: '#6b3a2c', vein: 'rgba(255,235,220,0.35)',
      blocks: ['#a85c4c', '#c98b7a', '#9b4b3f'],
      leaves: ['#8c9a7b', '#c9a08f', '#e1c4b3', '#6f7e63', '#a65d4f', '#d9b9a5'],
      density: 9, monstera: 0.15 }));
    paper.colorSpace = THREE.SRGBColorSpace;
    const paperMat = S({ map: paper, roughness: 0.7 });
    const pw = new THREE.Mesh(new THREE.PlaneGeometry(1.42, 1.72), paperMat);   // west wall behind the vanity
    pw.rotation.y = Math.PI / 2; pw.position.set(0.206, GF + 0.86, 4.55);
    const ps = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.08), paperMat);       // up to the W.C ceiling (2.1 m)
    ps.position.set(0.7, GF + 1.04, 3.806);                                     // W.C wall closing the lobby
    [pw, ps].forEach(m => { m.userData.keepUV = true; m.receiveShadow = true; m.name = 'Leaf wallpaper'; groups.ground.add(m); });
    // Round mirror with a brass bead frame
    const mirror = new THREE.Mesh(new THREE.CircleGeometry(0.42, 48), F.mirror);
    mirror.rotation.y = Math.PI / 2; mirror.position.set(0.215, GF + 1.42, 4.55); mirror.userData.keepUV = true;
    groups.ground.add(mirror);
    for (let k = 0; k < 30; k++) {
      const a = k / 30 * Math.PI * 2, bead = new THREE.Mesh(new THREE.SphereGeometry(0.034, 12, 8), F.brass);
      bead.position.set(0.24, GF + 1.42 + Math.sin(a) * 0.46, 4.55 + Math.cos(a) * 0.46); bead.castShadow = true;
      groups.ground.add(bead);
    }
    // Fluted-glass sconces either side
    [3.98, 5.12].forEach(z => {
      const sc = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.3, 20), S({ color: 0x000000, emissive: 0xffd09a, emissiveIntensity: 3, emissiveMap: reeds.map }));
      sc.position.set(0.27, GF + 1.42, z); groups.ground.add(sc);
      addBox(groups.ground, F.brass, 0.2, 0.26, GF + 1.25, GF + 1.59, z - 0.02, z + 0.02);
      const l = new THREE.PointLight(0xffc890, 0.8, 4, 2); l.position.set(0.75, GF + 1.6, z); groups.ground.add(l); lights.push(l);
    });

    // ---------- Top floor: cluster of woven basket pendants (after the reference) ----------
    const basketTex = new THREE.CanvasTexture(basketCanvas); basketTex.colorSpace = THREE.SRGBColorSpace; basketTex.wrapS = THREE.RepeatWrapping;
    const basketMat = S({ map: basketTex, alphaTest: 0.3, transparent: false, side: THREE.DoubleSide, roughness: 0.7,
                          emissive: 0xffb060, emissiveMap: basketTex, emissiveIntensity: 0.18 });
    const basketPts = [];
    for (let k = 0; k <= 16; k++) {                       // dome top, straight drum sides
      const t = k / 16;
      basketPts.push(t < 0.45 ? new THREE.Vector2(Math.sin(t / 0.45 * Math.PI / 2) * 1.0, 1.0 + 0.55 * Math.cos(t / 0.45 * Math.PI / 2))
                              : new THREE.Vector2(1.0, 1.0 - (t - 0.45) / 0.55 * 1.0));
    }
    basketPts.reverse();
    const basketGeo = new THREE.LatheGeometry(basketPts, 64);
    function basket(x, z, rad, bottom, lit) {
      const m = new THREE.Mesh(basketGeo, basketMat);
      m.scale.set(rad, rad * 0.95, rad); m.position.set(x, bottom, z);
      m.userData.keepUV = true; m.castShadow = true; m.name = 'Woven basket pendant'; groups.first.add(m);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), F.bulb);
      bulb.position.set(x, bottom + rad * 0.55, z); groups.first.add(bulb);
      const top = roofUnder(z) - 0.03, y1 = bottom + rad * 1.5;
      if (top > y1) {
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, top - y1, 6), F.cord);
        rod.position.set(x, (top + y1) / 2, z); groups.first.add(rod);
      }
      if (lit) { const l = new THREE.PointLight(0xffb868, 7, 8, 2); l.position.set(x, bottom + rad * 0.3, z); groups.first.add(l); lights.push(l); }
    }
    // over the S-booth, varying sizes and drops
    basket(3.6, 5.8, 0.5, FF + 1.95, true);
    basket(6.2, 5.8, 0.55, FF + 1.9, true);
    basket(4.9, 5.0, 0.38, FF + 2.45, false);
    basket(4.95, 6.7, 0.42, FF + 2.3, true);
    basket(2.5, 4.7, 0.34, FF + 2.5, false);
    basket(7.4, 7.0, 0.36, FF + 2.4, false);
    basket(8.4, 4.6, 0.45, FF + 2.1, true);
    // over the banquette tables along the mural
    [2.7, 4.66, 6.62, 8.58].forEach((x, k) => basket(x, 1.3, 0.3, FF + 1.75, k % 2 === 0));

    // ---------- Ground floor: colourful woven disc lights (after the reference) ----------
    const discCanvas = (() => {
      const W = 2048, H = 64, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      const ctx = cv.getContext('2d'), rr = rng(77);
      const cols = ['#c8322a', '#e2662a', '#f0b52f', '#f7d36a', '#2f8f5b', '#1f8a85', '#f3e6cc', '#d9455f', '#e98a3a', '#7fb069'];
      let x = 0;
      while (x < W) {
        const w = 18 + rr() * 70; ctx.fillStyle = cols[Math.floor(rr() * cols.length)];
        ctx.fillRect(x, 0, w + 1, H); x += w;
      }
      for (let k = 0; k < W; k += 4) { ctx.fillStyle = `rgba(0,0,0,${0.08 + rr() * 0.12})`; ctx.fillRect(k, 0, 1, H); }
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, 'rgba(255,245,225,0.55)'); g.addColorStop(0.25, 'rgba(255,245,225,0)'); g.addColorStop(1, 'rgba(0,0,0,0.12)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      return cv;
    })();
    const discTex = new THREE.CanvasTexture(discCanvas); discTex.colorSpace = THREE.SRGBColorSpace; discTex.wrapS = THREE.RepeatWrapping;
    const discMat = S({ map: discTex, side: THREE.DoubleSide, roughness: 0.75, emissive: 0xffffff, emissiveMap: discTex, emissiveIntensity: 0.04 });
    const bowlMat = S({ color: 0xb38a4c, metalness: 1, roughness: 0.35, side: THREE.DoubleSide });
    function disc(x, z, rad, y, tilt) {
      const pts = [];
      for (let k = 0; k <= 12; k++) { const t = k / 12; pts.push(new THREE.Vector2(0.12 + (rad - 0.12) * t, 0.22 * (1 - t) - 0.05 * t * t)); }
      const geo = new THREE.LatheGeometry(pts, 96);
      const m = new THREE.Mesh(geo, discMat);
      m.position.set(x, y, z); m.rotation.set(tilt, 0, tilt * 0.6);
      m.userData.keepUV = true; m.castShadow = true; m.name = 'Woven disc light';
      groups.ground.add(m);
      const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), bowlMat);
      bowl.position.set(x, y + 0.2, z); groups.ground.add(bowl);
      const glow = new THREE.Mesh(new THREE.CircleGeometry(0.12, 24), F.bulb);
      glow.rotation.x = Math.PI / 2; glow.position.set(x, y + 0.06, z); groups.ground.add(glow);
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, CEIL - (y + 0.22), 6), F.cord);
      cord.position.set(x, (CEIL + y + 0.22) / 2, z); groups.ground.add(cord);
      const l = new THREE.PointLight(0xffc488, 6, 7, 2); l.position.set(x, y - 0.12, z); groups.ground.add(l); lights.push(l);
    }
    disc(3.2, 6.7, 1.05, CEIL - 0.55, 0.04);
    disc(5.7, 7.3, 1.25, CEIL - 0.7, -0.03);
    disc(8.2, 6.6, 0.95, CEIL - 0.5, 0.05);
    disc(2.6, 8.9, 0.8, CEIL - 0.85, -0.05);
    disc(4.6, 9.0, 0.9, CEIL - 0.6, 0.03);
    disc(7.0, 8.95, 1.0, CEIL - 0.8, -0.04);
    disc(9.0, 8.7, 0.65, CEIL - 0.6, 0.06);

    // Woven rattan pendant with a warm lamp inside
    const bellGeo = new THREE.LatheGeometry([
      new THREE.Vector2(0.02, 0.36), new THREE.Vector2(0.07, 0.35), new THREE.Vector2(0.15, 0.3),
      new THREE.Vector2(0.23, 0.2), new THREE.Vector2(0.28, 0.09), new THREE.Vector2(0.3, 0.0)
    ], 40);
    const bellRattan = F.rattan.clone();
    bellRattan.map = rattan.clone(); bellRattan.map.repeat.set(10, 3); bellRattan.map.needsUpdate = true;
    function pendant(g, x, z, bottom, top, scale) {
      scale = scale || 1;
      const bell = new THREE.Mesh(bellGeo, bellRattan);
      bell.scale.setScalar(scale); bell.position.set(x, bottom, z);
      bell.castShadow = true; bell.userData.keepUV = true; g.add(bell);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), F.bulb);
      bulb.position.set(x, bottom + 0.12 * scale, z); g.add(bulb);
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, top - bottom - 0.36 * scale, 6), F.cord);
      cord.position.set(x, (top + bottom + 0.36 * scale) / 2, z); g.add(cord);
      addBox(g, F.brass, x - 0.05, x + 0.05, top - 0.03, top, z - 0.05, z + 0.05);
      const l = new THREE.PointLight(0xffc28a, 6, 7, 2);
      l.position.set(x, bottom + 0.08 * scale, z); g.add(l); lights.push(l);
    }
    // Ground floor dining: over each booth and round table
    // Pendants and rattan clouds belong to the furniture layout; only added when furnished
    const furnished = !!opts.furnished;
    if (furnished) {
    [[3.0, 9.15], [5.8, 9.15], [8.5, 9.15], [1.1, 8.9], [6.4, 6.8]].forEach(([x, z]) => pendant(groups.ground, x, z, GF + 1.55, CEIL));
    // Lounge
    [[3.0, 3.1], [5.6, 3.1], [8.2, 3.1], [1.6, 9.15], [4.0, 9.15], [6.4, 9.15], [8.8, 9.15],
     [2.8, 6.4], [4.8, 6.4], [7.0, 6.4], [8.9, 6.4], [3.05, 1.6], [5.85, 1.6]]
      .forEach(([x, z]) => pendant(groups.first, x, z, FF + 1.6, Math.min(roofUnder(z), FF + 3.4), 1.15));
    }

    // Sculptural rattan ceiling clouds with a warm glow inside
    function cloud(g, x, y, z, r, seed) {
      const geo = new THREE.CylinderGeometry(r, r * 0.9, 0.14, 72, 1);
      const p = geo.attributes.position, rr = rng(seed), ph = [rr() * 6, rr() * 6, rr() * 6];
      for (let i = 0; i < p.count; i++) {
        const px = p.getX(i), pz = p.getZ(i), d = Math.hypot(px, pz);
        if (d < 1e-4) continue;
        const a = Math.atan2(pz, px);
        const k = 1 + 0.09 * Math.sin(3 * a + ph[0]) + 0.05 * Math.sin(5 * a + ph[1]) + 0.03 * Math.sin(9 * a + ph[2]);
        p.setX(i, px * k); p.setZ(i, pz * k);
      }
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, F.rattan);
      m.position.set(x, y, z); m.castShadow = true; m.name = 'Rattan ceiling installation'; g.add(m);
      const core = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.75, r * 0.75, 0.02, 48), F.led);
      core.position.set(x, y + 0.03, z); g.add(core);
      const l = new THREE.PointLight(0xffb66e, 4, 6, 2); l.position.set(x, y - 0.12, z); g.add(l); lights.push(l);
    }
    if (furnished) {
    cloud(groups.ground, 4.1, CEIL - 0.28, 7.3, 1.35, 7);
    cloud(groups.ground, 7.8, CEIL - 0.28, 7.6, 1.15, 9);
    cloud(groups.first, 3.0, FF + 3.0, 6.3, 1.25, 13);
    cloud(groups.first, 7.3, FF + 3.0, 6.3, 1.35, 17);
    }

    // LED coves and their washes
    if (opts.RectAreaLightUniformsLib) opts.RectAreaLightUniformsLib.init();
    function cove(g, x0, x1, y0, y1, z0, z1, pos, look, w, h, intensity) {
      addBox(g, F.led, x0, x1, y0, y1, z0, z1, 'LED cove');
      if (!opts.RectAreaLightUniformsLib) return;
      const l = new THREE.RectAreaLight(0xffb066, intensity, w, h);
      l.position.set(pos[0], pos[1], pos[2]); l.lookAt(look[0], look[1], look[2]);
      g.add(l); lights.push(l);
    }
    // Restaurant: cove over the kitchen front wall, washing down the counters
    cove(groups.ground, 2.4, 9.8, CEIL - 0.13, CEIL - 0.11, 5.11, 5.14, [6.1, CEIL - 0.15, 5.25], [6.1, 0, 6.2], 7.2, 0.25, 6);
    // Under the beam over the shopfront
    cove(groups.ground, 0.3, 9.7, 3.43, 3.445, 9.74, 9.79, [5, 3.42, 9.7], [5, 0, 9.0], 9.2, 0.2, 4);
    // Lounge: uplights along both knee walls, washing the timber-lined roof
    cove(groups.first, 0.2, 9.8, EAVE - 0.03, EAVE - 0.01, 0.2, 0.24, [5, EAVE, 0.35], [5, EAVE + 4, 2.4], 9.4, 0.25, 7);
    // Front knee wall is split by the dormer (grid C1 to B1)
    cove(groups.first, 0.2, 2.4, EAVE - 0.03, EAVE - 0.01, 9.76, 9.8, [1.3, EAVE, 9.65], [1.3, EAVE + 4, 7.6], 2.2, 0.25, 7);
    cove(groups.first, 7.4, 9.8, EAVE - 0.03, EAVE - 0.01, 9.76, 9.8, [8.6, EAVE, 9.65], [8.6, EAVE + 4, 7.6], 2.4, 0.25, 7);
    // Corridor downlights and kitchen task lighting
    [[1.8, 1.4], [1.8, 3.6]].forEach(([x, z]) => {
      const d = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.01, 24), F.bulb);
      d.position.set(x, CEIL - 0.005, z); groups.ground.add(d);
      const l = new THREE.PointLight(0xffc48a, 7, 5, 2); l.position.set(x, CEIL - 0.1, z); groups.ground.add(l); lights.push(l);
    });
    [[4.5, 2.4], [6.6, 2.4], [8.7, 1.3], [8.8, 3.8]].forEach(([x, z]) => {
      addBox(groups.ground, F.led, x - 0.5, x + 0.5, CEIL - 0.01, CEIL, z - 0.15, z + 0.15, 'Kitchen light panel');
      const l = new THREE.PointLight(0xffe2c0, 4, 6, 2); l.position.set(x, CEIL - 0.2, z); groups.ground.add(l); lights.push(l);
    });

    // (Silhouette murals removed: walls are kept plain white)
    void mural;

    // ---------- world-space UVs so every texture keeps real-world scale ----------
    model.root.updateMatrixWorld(true);
    const v = new THREE.Vector3(), n = new THREE.Vector3(), nm = new THREE.Matrix3();
    model.root.traverse(o => {
      if (!o.isMesh || o.userData.keepUV) return;
      const g = o.geometry, pos = g.attributes.position, nor = g.attributes.normal;
      if (!pos || !nor) return;
      nm.getNormalMatrix(o.matrixWorld);
      const uv = new Float32Array(pos.count * 2);
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
        n.fromBufferAttribute(nor, i).applyMatrix3(nm);
        const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
        if (ax >= ay && ax >= az) { uv[i * 2] = v.z; uv[i * 2 + 1] = v.y; }
        else if (ay >= az) { uv[i * 2] = v.x; uv[i * 2 + 1] = v.z; }
        else { uv[i * 2] = v.x; uv[i * 2 + 1] = v.y; }
      }
      g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    });

    return { finishes: F, lights };
  }

  root.applyEarthArtisanship = applyEarthArtisanship;
})(typeof window !== 'undefined' ? window : globalThis);
