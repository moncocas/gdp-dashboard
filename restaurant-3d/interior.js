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

    // Monochrome checkered tiles, 300 mm squares, polished
    const checker = (() => {
      const S = 512, cell = 128, n = fbm(S, 8, 4, 41);
      const blk = hex(0x151413), wht = hex(0xece5d6), grout = hex(0x8c8478);
      const h = new Float32Array(S * S);
      const col = paint(S, S, (x, y) => {
        const i = y * S + x, gx = x % cell, gy = y % cell;
        if (gx < 1 || gy < 1) { h[i] = -1; return grout; }
        const dark = ((x / cell | 0) + (y / cell | 0)) % 2 === 0;
        const m = 0.94 + 0.08 * n[i];
        return (dark ? blk : wht).map(c => Math.min(255, c * m));
      });
      return { map: tex(col, 1.2, true), normal: tex(normalFromHeight(h, S, 1.2), 1.2) };
    })();

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

    // ---------- materials ----------
    const S = (o) => new THREE.MeshStandardMaterial(o);
    const P = (o) => new THREE.MeshPhysicalMaterial(o);
    const F = {
      earth: S({ map: rammed.map, normalMap: rammed.normal, normalScale: new THREE.Vector2(0.7, 0.7), roughness: 0.93 }),
      ceiling: S({ map: limewash, roughness: 0.95 }),
      travertine: S({ map: travertine.map, roughnessMap: travertine.rough, normalMap: travertine.normal, normalScale: new THREE.Vector2(0.4, 0.4), roughness: 1 }),
      checker: P({ map: checker.map, normalMap: checker.normal, normalScale: new THREE.Vector2(0.5, 0.5), roughness: 0.16, clearcoat: 0.4, clearcoatRoughness: 0.1 }),
      quarry: S({ map: quarry, roughness: 0.62 }),
      sandstone: S({ map: sandstone.map, normalMap: sandstone.normal, normalScale: new THREE.Vector2(0.8, 0.8), roughness: 0.88 }),
      velvetTerracotta: P({ color: 0x8c3a22, map: velvetRibs.map, normalMap: velvetRibs.normal, roughness: 0.82, sheen: 1, sheenColor: new THREE.Color(0xc96a4c), sheenRoughness: 0.5 }),
      velvetOchre: P({ color: 0xa8741c, map: velvetRibs.map, normalMap: velvetRibs.normal, roughness: 0.82, sheen: 1, sheenColor: new THREE.Color(0xd9a650), sheenRoughness: 0.5 }),
      walnut: S({ map: walnut, roughness: 0.48 }),
      walnutDoor: S({ map: walnut, color: 0xb79a88, roughness: 0.42 }),
      reededWalnut: S({ map: walnut, normalMap: reeds.normal, normalScale: new THREE.Vector2(1.2, 1.2), roughness: 0.45 }),
      boards: S({ map: boards, roughness: 0.7 }),
      roofSheet: S({ color: 0x34302d, metalness: 0.55, roughness: 0.5 }),
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
      [M.tile, F.quarry], [M.roof, F.roofSheet], [M.steel, F.charcoal], [M.brass, F.brass], [M.glass, F.glass],
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
      'Plinth': F.sandstone,
      'Dormer roof': [F.roofSheet, F.roofSheet, F.roofSheet, F.boards, F.roofSheet, F.roofSheet],
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

    // Checkered tiling in the transitional walkway (back door corridor) and the W.Cs
    addBox(groups.ground, F.checker, 1.4, 2.2, GF + 0.011, GF + 0.016, 0.2, 4.9, 'Walkway tiling');
    addBox(groups.ground, F.checker, 0.2, 1.2, GF + 0.011, GF + 0.016, 0.2, 2.9, 'W.C tiling');

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
    [[3.0, 9.15], [5.8, 9.15], [8.5, 9.15], [1.1, 8.9], [6.4, 6.8]].forEach(([x, z]) => pendant(groups.ground, x, z, GF + 1.55, CEIL));
    // Lounge
    [[3.0, 3.1], [5.6, 3.1], [8.2, 3.1], [1.6, 9.15], [4.0, 9.15], [6.4, 9.15], [8.8, 9.15],
     [2.8, 6.4], [4.8, 6.4], [7.0, 6.4], [8.9, 6.4], [3.05, 1.6], [5.85, 1.6]]
      .forEach(([x, z]) => pendant(groups.first, x, z, FF + 1.6, Math.min(roofUnder(z), FF + 3.4), 1.15));

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
    cloud(groups.ground, 4.1, CEIL - 0.28, 7.3, 1.35, 7);
    cloud(groups.ground, 7.8, CEIL - 0.28, 7.6, 1.15, 9);
    cloud(groups.first, 3.0, FF + 3.0, 6.3, 1.25, 13);
    cloud(groups.first, 7.3, FF + 3.0, 6.3, 1.35, 17);

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
    cove(groups.first, 0.2, 2.75, EAVE - 0.03, EAVE - 0.01, 9.76, 9.8, [1.5, EAVE, 9.65], [1.5, EAVE + 4, 7.6], 2.5, 0.25, 7);
    cove(groups.first, 7.15, 9.8, EAVE - 0.03, EAVE - 0.01, 9.76, 9.8, [8.5, EAVE, 9.65], [8.5, EAVE + 4, 7.6], 2.6, 0.25, 7);
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

    // Backlit silhouette murals: restaurant west wall and the lounge gable
    const muralRest = new THREE.CanvasTexture(mural(512, 820, 5)); muralRest.colorSpace = THREE.SRGBColorSpace;
    const muralGable = new THREE.CanvasTexture(mural(1400, 910, 3)); muralGable.colorSpace = THREE.SRGBColorSpace;
    const muralMat = t => S({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 0.35, roughness: 0.8 });
    const pr = new THREE.Mesh(new THREE.PlaneGeometry(2.0, GF + 3.1 - (GF + 0.15)), muralMat(muralRest));
    pr.rotation.y = Math.PI / 2; pr.position.set(0.205, GF + 0.15 + (3.1 - 0.15) / 2, 8.72);
    pr.userData.keepUV = true; pr.receiveShadow = true; pr.name = 'Silhouette panel'; groups.ground.add(pr);
    cove(groups.ground, 0.21, 0.26, GF + 0.04, GF + 0.07, 7.72, 9.72, [0.32, GF + 0.08, 8.72], [0.0, GF + 2.5, 8.72], 2.0, 0.15, 10);

    const shape = new THREE.Shape();
    const gpts = [[0.2, FF + 0.02], [9.8, FF + 0.02], [9.8, roofUnder(9.8) - 0.05], [5, RIDGE - 0.12], [0.2, roofUnder(0.2) - 0.05]];
    gpts.forEach(([z, y], i) => (i ? shape.lineTo(-z, y) : shape.moveTo(-z, y)));
    const gg = new THREE.ShapeGeometry(shape);
    const gp = gg.attributes.position, guv = gg.attributes.uv;
    for (let i = 0; i < gp.count; i++) guv.setXY(i, 1 - (-gp.getX(i)) / 10, (gp.getY(i) - FF) / (RIDGE - FF));
    gg.rotateY(Math.PI / 2);
    const gm = new THREE.Mesh(gg, muralMat(muralGable));
    gm.material.side = THREE.DoubleSide; gm.position.x = 0.205; gm.userData.keepUV = true; gm.receiveShadow = true;
    gm.name = 'Silhouette panel'; groups.first.add(gm);
    cove(groups.first, 0.21, 0.26, FF + 0.03, FF + 0.06, 0.3, 9.7, [0.35, FF + 0.08, 5], [0.0, FF + 4, 5], 9.4, 0.2, 6);

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
