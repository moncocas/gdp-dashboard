/*
 * Proposed Restaurant Development (client: Sadik Abdi), drawing AU/PL05/2026.08.
 * 3D model built from the ground floor plan, first floor plan, roof plan and Section X-X.
 *
 * Units are metres. Axes:
 *   x  runs along grid E -> A (E = 0, A = 10.0, A1 = 10.5)
 *   z  runs along grid 1 -> 6 (grid 1 / back wall = 0, grid 5 / front = 10.0, verandah edge = 11.2)
 *   y  is up (ground level = 0)
 *
 * Works in the browser (window.buildRestaurant) and in Node (globalThis.buildRestaurant).
 */
(function (root) {
  // opts.furnished: true adds the dining furniture and plants (left out by default: empty shell)
  function buildRestaurant(THREE, opts) {
    const furnished = !!(opts && opts.furnished);
    // Levels, from Section X-X
    const GF = 0.3;            // ground floor finish above ground level
    const CEIL = 3.75;         // underside of first floor slab (GF + 3,450)
    const FF = 3.9;            // first floor finish (150 mm slab)
    const EAVE = FF + 1.5;     // top of first floor knee walls
    const RIDGE = EAVE + 5.0;  // 45 deg roof over a 10 m span, ridge on grid 3
    const RIDGE_Z = 5.0;

    const std = (color, o) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.85, metalness: 0 }, o || {}));
    const mats = {
      plaster: std(0xf3f1ec),
      dormerClad: std(0x33363a, { metalness: 0.45, roughness: 0.5 }),
      concrete: std(0xb3ada2),
      column: std(0xd8c4a0),
      stone: std(0xd8d0c2, { roughness: 0.45 }),
      tile: std(0xc5d0cd, { roughness: 0.5 }),
      roof: std(0x7d7e7c, { metalness: 0.45, roughness: 0.5, side: THREE.DoubleSide }),
      steel: std(0x50575e, { metalness: 0.6, roughness: 0.4 }),
      brass: std(0xb08d57, { metalness: 0.9, roughness: 0.35 }),
      stripe: std(0xeadfd0),
      velvetOrange: std(0xb4461f),
      floral: std(0xeee5d2),
      marbleWhite: std(0xf2f0eb, { roughness: 0.2 }),
      darkWood: std(0x3a2416, { roughness: 0.5 }),
      rattan: std(0xb07a45),
      rug: std(0xdddddd),
      led: std(0x000000, { emissive: 0xffb466, emissiveIntensity: 3 }),
      glass: std(0x9cc7d6, { transparent: true, opacity: 0.3, roughness: 0.05, metalness: 0.1, depthWrite: false, side: THREE.DoubleSide }),
      frame: std(0x2e3337, { metalness: 0.4, roughness: 0.5 }),
      door: std(0x7a4a28),
      wood: std(0x9b6c44),
      sofaGF: std(0x5f7d6b),
      sofaFF: std(0xd6ad35),
      counter: std(0xe2ded6, { roughness: 0.4 }),
      inox: std(0xc3c8cc, { metalness: 0.7, roughness: 0.3 }),
      leaf: std(0x4c873a, { flatShading: true }),
      pot: std(0xbf7a52),
      grass: std(0x93a777),
      paving: std(0xc2bbad),
      sanitary: std(0xf8f8f6, { roughness: 0.2 })
    };

    const site = new THREE.Group(); site.name = 'Site';
    const ground = new THREE.Group(); ground.name = 'Ground floor';
    const first = new THREE.Group(); first.name = 'First floor';
    const roof = new THREE.Group(); roof.name = 'Roof';
    const all = new THREE.Group(); all.name = 'Restaurant';
    all.add(site, ground, first, roof);

    const shadowy = (m, cast) => { m.castShadow = cast !== false; m.receiveShadow = true; return m; };

    function box(g, mat, x0, x1, y0, y1, z0, z1, name) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)), mat);
      m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      if (name) m.name = name;
      g.add(shadowy(m, mat !== mats.glass));
      return m;
    }

    // Round bar between two points (railings, truss members, mullions on slopes)
    const UP = new THREE.Vector3(0, 1, 0);
    function rod(g, mat, a, b, r, seg) {
      const A = new THREE.Vector3(a[0], a[1], a[2]), B = new THREE.Vector3(b[0], b[1], b[2]);
      const dir = B.clone().sub(A), len = dir.length();
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg || 8), mat);
      m.position.copy(A).add(B).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(UP, dir.normalize());
      g.add(shadowy(m));
      return m;
    }

    // Axis-aware box: 'x' walls run along x (a = x, c = z), 'z' walls run along z (a = z, c = x)
    function abox(g, mat, axis, a0, a1, y0, y1, c0, c1, name) {
      return axis === 'x' ? box(g, mat, a0, a1, y0, y1, c0, c1, name) : box(g, mat, c0, c1, y0, y1, a0, a1, name);
    }

    function windowFill(g, axis, a0, a1, s, h, c0, c1) {
      const cm = (c0 + c1) / 2, f = 0.05;
      abox(g, mats.glass, axis, a0, a1, s, h, cm - 0.01, cm + 0.01);
      abox(g, mats.frame, axis, a0, a1, s, s + f, cm - 0.04, cm + 0.04);
      abox(g, mats.frame, axis, a0, a1, h - f, h, cm - 0.04, cm + 0.04);
      abox(g, mats.frame, axis, a0, a0 + f, s, h, cm - 0.04, cm + 0.04);
      abox(g, mats.frame, axis, a1 - f, a1, s, h, cm - 0.04, cm + 0.04);
      abox(g, mats.frame, axis, (a0 + a1) / 2 - f / 2, (a0 + a1) / 2 + f / 2, s, h, cm - 0.04, cm + 0.04);
    }

    function doorFill(g, axis, a0, a1, s, h, c0, c1) {
      const cm = (c0 + c1) / 2;
      abox(g, mats.door, axis, a0 + 0.04, a1 - 0.04, s, h - 0.04, cm - 0.025, cm + 0.025);
      abox(g, mats.frame, axis, a0, a0 + 0.04, s, h, c0 - 0.005, c1 + 0.005);
      abox(g, mats.frame, axis, a1 - 0.04, a1, s, h, c0 - 0.005, c1 + 0.005);
      abox(g, mats.frame, axis, a0, a1, h - 0.04, h, c0 - 0.005, c1 + 0.005);
    }

    // Masonry wall with openings: ops = [{a, b, s (sill), h (head), k: 'win' | 'door' | 'hole'}]
    function wall(g, axis, a0, a1, c0, c1, y0, y1, ops, mat) {
      mat = mat || mats.plaster;
      let cur = a0;
      (ops || []).slice().sort((p, q) => p.a - q.a).forEach(op => {
        if (op.a > cur) abox(g, mat, axis, cur, op.a, y0, y1, c0, c1);
        if (op.s > y0) abox(g, mat, axis, op.a, op.b, y0, op.s, c0, c1);
        if (op.h < y1) abox(g, mat, axis, op.a, op.b, op.h, y1, c0, c1);
        if (op.k === 'win') windowFill(g, axis, op.a, op.b, op.s, op.h, c0, c1);
        if (op.k === 'door') doorFill(g, axis, op.a, op.b, op.s, op.h, c0, c1);
        cur = op.b;
      });
      if (a1 > cur) abox(g, mat, axis, cur, a1, y0, y1, c0, c1);
    }

    // Aluminium-framed glazed screen with mullions every ~step metres, optional door bay [da, db]
    function curtain(g, axis, a0, a1, c, y0, y1, step, door) {
      abox(g, mats.glass, axis, a0, a1, y0, y1, c - 0.01, c + 0.01);
      const n = Math.max(1, Math.round((a1 - a0) / step));
      for (let i = 0; i <= n; i++) {
        const a = a0 + (a1 - a0) * i / n;
        abox(g, mats.frame, axis, a - 0.03, a + 0.03, y0, y1, c - 0.05, c + 0.05);
      }
      abox(g, mats.frame, axis, a0, a1, y0, y0 + 0.08, c - 0.05, c + 0.05);
      abox(g, mats.frame, axis, a0, a1, y0 + 2.4, y0 + 2.46, c - 0.05, c + 0.05);
      abox(g, mats.frame, axis, a0, a1, y1 - 0.06, y1, c - 0.05, c + 0.05);
      if (door) {
        abox(g, mats.frame, axis, door[0] - 0.05, door[0] + 0.05, y0, y0 + 2.4, c - 0.07, c + 0.07);
        abox(g, mats.frame, axis, door[1] - 0.05, door[1] + 0.05, y0, y0 + 2.4, c - 0.07, c + 0.07);
        abox(g, mats.frame, axis, (door[0] + door[1]) / 2 - 0.02, (door[0] + door[1]) / 2 + 0.02, y0, y0 + 2.4, c - 0.07, c + 0.07);
        abox(g, mats.brass, axis, door[0] + 0.15, door[1] - 0.15, y0 + 1.0, y0 + 1.04, c - 0.1, c + 0.1, 'Door pull');
      }
    }

    // ---------- Furniture ----------
    function plant(g, x, z, y, s) {
      s = s || 1;
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * s, 0.12 * s, 0.32 * s, 12), mats.pot);
      pot.position.set(x, y + 0.16 * s, z); g.add(shadowy(pot));
      const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3 * s, 0), mats.leaf);
      leaves.position.set(x, y + 0.32 * s + 0.26 * s, z); leaves.scale.set(1, 1.3, 1); g.add(shadowy(leaves));
    }

    // Booth: two sofas facing across a table, laid out along x, centred at (cx, cz)
    function booth(g, cx, cz, y, fabric, len) {
      len = len || 1.1;
      const z0 = cz - len / 2, z1 = cz + len / 2;
      [[cx - 1.0, cx - 0.5, -1], [cx + 0.5, cx + 1.0, 1]].forEach(([x0, x1, side]) => {
        box(g, fabric, x0, x1, y, y + 0.45, z0, z1);
        const bx = side < 0 ? [x0, x0 + 0.14] : [x1 - 0.14, x1];
        box(g, fabric, bx[0], bx[1], y + 0.45, y + 1.0, z0, z1);
      });
      box(g, mats.wood, cx - 0.35, cx + 0.35, y + 0.71, y + 0.75, z0 + 0.1, z1 - 0.1);
      box(g, mats.brass, cx - 0.04, cx + 0.04, y, y + 0.71, cz - 0.04, cz + 0.04);
    }

    function roundTable(g, cx, cz, y, chairs, fabric) {
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.04, 24), mats.wood);
      top.position.set(cx, y + 0.73, cz); g.add(shadowy(top));
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.2, 0.71, 12), mats.brass);
      leg.position.set(cx, y + 0.355, cz); g.add(shadowy(leg));
      for (let i = 0; i < chairs; i++) {
        const t = (i / chairs) * Math.PI * 2 + Math.PI / 4;
        const px = cx + Math.cos(t) * 0.7, pz = cz + Math.sin(t) * 0.7;
        const c = new THREE.Group();
        box(c, fabric, -0.22, 0.22, 0, 0.45, -0.22, 0.22);
        box(c, fabric, 0.16, 0.24, 0.45, 0.85, -0.22, 0.22);
        c.position.set(px, y, pz); c.rotation.y = -t;
        g.add(c);
      }
    }

    // L-shaped lounge sofa against the back wall, x0..x1 with the return at x0 or x1
    function sectional(g, x0, x1, z0, y, returnAt) {
      const f = mats.sofaFF;
      box(g, f, x0, x1, y, y + 0.42, z0, z0 + 0.8);
      box(g, f, x0, x1, y + 0.42, y + 0.85, z0, z0 + 0.18);
      const rx = returnAt === 'left' ? [x0, x0 + 0.8] : [x1 - 0.8, x1];
      box(g, f, rx[0], rx[1], y, y + 0.42, z0 + 0.8, z0 + 1.7);
      const bx = returnAt === 'left' ? [x0, x0 + 0.18] : [x1 - 0.18, x1];
      box(g, f, bx[0], bx[1], y + 0.42, y + 0.85, z0 + 0.8, z0 + 1.7);
      const cx = (x0 + x1) / 2;
      box(g, mats.wood, cx - 0.5, cx + 0.5, y, y + 0.4, z0 + 1.1, z0 + 1.6);
    }

    // ---------- Site ----------
    box(site, mats.grass, -25, 35, -0.06, -0.03, -25, 37, 'Ground');
    box(site, mats.paving, -1.5, 12.0, -0.03, 0.0, -1.5, 13.6, 'Paving');
    box(site, mats.concrete, 0, 10, 0, GF, 0, 10, 'Plinth');
    box(site, mats.stone, 0, 10, 0, GF - 0.01, 10, 11.2, 'Verandah');
    box(site, mats.stone, 3.2, 6.8, 0, 0.15, 11.2, 11.55, 'Entrance step');

    // ---------- Ground floor ----------
    box(ground, mats.stone, 0.2, 9.8, GF, GF + 0.01, 0.2, 9.8, 'Restaurant floor (polished stone)');
    box(ground, mats.tile, 2.4, 9.8, GF + 0.01, GF + 0.015, 0.2, 4.9, 'Kitchen floor (ceramic tiles)');

    // Perimeter walls (200 mm masonry)
    wall(ground, 'x', 0, 10, 0, 0.2, GF, CEIL, [
      { a: 0.35, b: 1.0, s: 1.8, h: 2.4, k: 'win' },   // WD-05  W.C
      { a: 1.5, b: 2.15, s: GF, h: 2.4, k: 'door' },   // DO-01a back door
      { a: 3.4, b: 5.0, s: 1.2, h: 2.4, k: 'win' },    // WD-03  kitchen
      { a: 8.2, b: 9.2, s: 1.5, h: 2.4, k: 'win' }     // WD-02  storage
    ]);
    wall(ground, 'z', 0.2, 9.8, 0, 0.2, GF, CEIL, [
      { a: 1.9, b: 2.5, s: 1.8, h: 2.4, k: 'win' }     // WD-05  W.C 2
    ]);
    wall(ground, 'z', 0.2, 5.1, 9.8, 10, GF, CEIL, [
      { a: 3.0, b: 3.9, s: GF, h: 2.4, k: 'door' }     // DO-01  cashier
    ]);

    // Kitchen / cashier front wall on grid 3 with serving openings
    wall(ground, 'x', 2.2, 9.8, 4.9, 5.1, GF, CEIL, [
      { a: 3.2, b: 7.4, s: 1.05, h: 2.3, k: 'hole' },  // cake display, barista and service counter
      { a: 8.1, b: 9.5, s: 1.05, h: 2.3, k: 'hole' }   // cashier
    ]);
    // Kitchen west wall on grid D
    wall(ground, 'z', 0.2, 4.9, 2.2, 2.4, GF, CEIL, [{ a: 3.8, b: 4.6, s: GF, h: 2.4, k: 'door' }]);
    // Storage room
    wall(ground, 'z', 0.2, 2.5, 7.5, 7.7, GF, CEIL);
    wall(ground, 'x', 7.7, 9.8, 2.5, 2.7, GF, CEIL, [{ a: 8.3, b: 9.1, s: GF, h: 2.4, k: 'door' }]);
    // W.C block (revised ground floor): two W.Cs and a basin lobby under the stair, ceiling at 2.4 m
    const WC_TOP = GF + 2.1;
    wall(ground, 'z', 0.2, 3.8, 1.2, 1.35, GF, WC_TOP, [
      { a: 0.9, b: 1.6, s: GF, h: 2.1, k: 'door' }, { a: 2.7, b: 3.4, s: GF, h: 2.1, k: 'door' }
    ]);
    box(ground, mats.plaster, 0.2, 1.2, GF, WC_TOP, 1.8, 2.0);
    box(ground, mats.plaster, 0.2, 1.2, GF, WC_TOP, 3.6, 3.8);
    box(ground, mats.plaster, 0.2, 1.35, WC_TOP, WC_TOP + 0.1, 0.2, 3.8, 'W.C ceiling');

    // R.C columns
    const colsGF = [[0.1, 0.1], [2.3, 0.1], [5.0, 0.1], [9.9, 0.1], [0.1, 5.0], [2.3, 5.0], [9.9, 5.0], [0.1, 9.9], [9.9, 9.9]];
    colsGF.forEach(([x, z]) => box(ground, mats.column, x - 0.11, x + 0.11, GF, CEIL, z - 0.11, z + 0.11, 'R.C column'));

    // Shopfront glazing to the verandah (grid 5) and the east side of the restaurant
    // Front (grid 5) left fully open to the verandah: no glazing or doors
    curtain(ground, 'z', 5.11, 9.79, 9.9, GF, 3.45, 1.15);
    // 450 x 200 R.C beams over the glazing
    box(ground, mats.column, 0, 10, 3.45, CEIL, 9.8, 10, 'R.C beam');
    box(ground, mats.column, 9.8, 10, 3.45, CEIL, 5.0, 10, 'R.C beam');

    // Staircase (revised plans): one straight flight up the west wall, 24 risers x 150 mm,
    // first riser on grid 5 at the open front, arriving on the first floor at grid 2
    const NR = 24, R = (FF - GF) / NR, SZ0 = 9.8, SZ1 = 2.0, G = (SZ0 - SZ1) / (NR - 1);
    for (let r = 1; r < NR; r++) {
      const z1 = SZ0 - G * (r - 1), z0 = z1 - G, top = GF + R * r;
      box(ground, mats.stone, 0.2, 1.2, Math.max(GF, top - 0.24), top, z0, z1, 'Stair');
    }
    // Raking steel stringer under the open (east) side
    rod(ground, mats.steel, [1.18, GF + 0.02, SZ0], [1.18, FF - 0.12, SZ1], 0.05);
    const rail = (g, a, b) => rod(g, mats.brass, a, b, 0.022);
    rail(ground, [1.2, GF + R + 0.9, SZ0 - G / 2], [1.2, FF + 0.9, SZ1 + G / 2]);
    for (let r = 1; r < NR; r += 2) {
      const z = SZ0 - G * (r - 0.5), y = GF + R * r;
      rail(ground, [1.2, y, z], [1.2, y + 0.9, z]);
    }

    // Kitchen
    box(ground, mats.inox, 3.4, 4.5, GF, GF + 0.9, 0.25, 0.85, 'Freezer');
    box(ground, mats.counter, 4.6, 7.4, GF, GF + 0.9, 0.2, 0.8, 'Cooking range');
    box(ground, mats.inox, 5.4, 6.8, GF + 0.9, GF + 0.95, 0.25, 0.75, 'Burners');
    box(ground, mats.counter, 3.6, 4.1, GF, GF + 0.9, 1.6, 4.2, 'Prep station');
    box(ground, mats.counter, 2.4, 3.0, GF, GF + 0.9, 1.8, 3.4, 'Washing station');
    box(ground, mats.inox, 2.5, 2.9, GF + 0.85, GF + 0.92, 2.0, 2.6, 'Sink');
    box(ground, mats.inox, 6.6, 7.2, GF, GF + 1.7, 1.4, 2.6, 'Ovens');
    box(ground, mats.wood, 7.7, 8.1, GF, GF + 2.1, 0.2, 2.5, 'Storage shelving');
    box(ground, mats.wood, 9.4, 9.8, GF, GF + 2.1, 0.2, 2.5, 'Storage shelving');
    box(ground, mats.counter, 3.2, 7.4, GF, GF + 1.05, 4.35, 4.9, 'Service counter');
    box(ground, mats.glass, 3.25, 3.95, GF + 1.05, GF + 1.5, 4.4, 4.85, 'Cake display');
    box(ground, mats.wood, 8.2, 9.6, GF, GF + 1.0, 4.1, 4.6, 'Cashier desk');
    // W.C fittings
    box(ground, mats.sanitary, 0.45, 0.85, GF, GF + 0.42, 0.25, 0.85, 'W.C');
    box(ground, mats.sanitary, 0.45, 0.85, GF, GF + 0.42, 2.05, 2.65, 'W.C');
    // Basin vanity in the lobby under the stair: reeded base, marble top with upstand, two basins
    box(ground, mats.wood, 0.2, 0.72, GF, GF + 0.8, 3.92, 5.18, 'Vanity base');
    box(ground, mats.counter, 0.2, 0.76, GF + 0.8, GF + 0.85, 3.88, 5.22, 'Vanity top');
    box(ground, mats.counter, 0.2, 0.24, GF + 0.85, GF + 1.05, 3.88, 5.22, 'Vanity top');
    [4.22, 4.88].forEach(z => {
      box(ground, mats.counter, 0.36, 0.66, GF + 0.851, GF + 0.853, z - 0.2, z + 0.2, 'Basin');
      box(ground, mats.brass, 0.24, 0.38, GF + 0.98, GF + 1.0, z - 0.012, z + 0.012, 'Tap');
      box(ground, mats.brass, 0.36, 0.38, GF + 0.9, GF + 1.0, z - 0.012, z + 0.012, 'Tap');
    });
    // Restaurant
    if (furnished) {
    booth(ground, 3.0, 9.15, GF, mats.sofaGF);
    booth(ground, 5.8, 9.15, GF, mats.sofaGF);
    booth(ground, 8.5, 9.15, GF, mats.sofaGF);
    roundTable(ground, 1.1, 8.9, GF, 4, mats.sofaGF);
    roundTable(ground, 6.4, 6.8, GF, 4, mats.sofaGF);
    [[1.9, 8.7], [1.9, 9.5], [4.4, 8.7], [7.2, 8.7], [5.3, 6.8], [7.5, 6.8]].forEach(([x, z]) => plant(ground, x, z, GF, 0.8));
    }

    // ---------- First floor ----------
    // 150 mm slab, cantilevered 500 mm past grid A, with the stair void
    const VOID = { x0: 0.2, x1: 1.25, z0: 2.0, z1: 6.8 };
    box(first, mats.stone, 0, 10.5, CEIL, FF, 0, VOID.z0, 'First floor slab');
    box(first, mats.stone, 0, 10.5, CEIL, FF, VOID.z1, 10, 'First floor slab');
    box(first, mats.stone, 0, VOID.x0, CEIL, FF, VOID.z0, VOID.z1, 'First floor slab');
    box(first, mats.stone, VOID.x1, 10.5, CEIL, FF, VOID.z0, VOID.z1, 'First floor slab');
    // Railing around the stair void
    rail(first, [VOID.x1, FF + 1.0, VOID.z0], [VOID.x1, FF + 1.0, VOID.z1]);
    rail(first, [VOID.x0, FF + 1.0, VOID.z1], [VOID.x1, FF + 1.0, VOID.z1]);
    for (let z = VOID.z0 + 0.3; z <= VOID.z1 + 0.01; z += 0.3) rail(first, [VOID.x1, FF, z], [VOID.x1, FF + 1.0, z]);
    for (let x = VOID.x0 + 0.3; x < VOID.x1; x += 0.3) rail(first, [x, FF, VOID.z1], [x, FF + 1.0, VOID.z1]);

    // Glazed dormer on the front slope (Revised Elevation 02): grid C1 to B1, head 2,630 above first floor
    const DX0 = 2.4, DX1 = 7.4;                          // 2,400 | 5,000 | 2,400 on the revised first floor
    const DF = 11.2;                                     // front pushed 1.2 m past grid 5, to grid 6
    const DHEAD = FF + 2.63;
    const DZB = RIDGE_Z + (RIDGE - DHEAD) - 0.05;        // where the dormer roof meets the main slope

    // Knee walls to front and back (1.5 m); the front one stops either side of the dormer
    wall(first, 'x', 0, 10, 0, 0.2, FF, EAVE);
    wall(first, 'x', 0, DX0, 9.8, 10, FF, EAVE);
    wall(first, 'x', DX1, 10, 9.8, 10, FF, EAVE);

    // Dormer floor cantilevers 1.2 m over the verandah
    box(first, mats.stone, DX0, DX1, CEIL, FF, 10, DF, 'First floor slab');
    // Dormer front: chunky portal frame, four glazed bays and a guarding transom
    box(first, mats.column, DX0, DX0 + 0.2, CEIL, DHEAD, DF - 0.05, DF + 0.2, 'Dormer frame');
    box(first, mats.column, DX1 - 0.2, DX1, CEIL, DHEAD, DF - 0.05, DF + 0.2, 'Dormer frame');
    box(first, mats.column, DX0, DX1, DHEAD - 0.2, DHEAD, DF - 0.05, DF + 0.2, 'Dormer frame');
    box(first, mats.column, DX0, DX1, CEIL - 0.05, FF + 0.06, DF - 0.05, DF + 0.2, 'Dormer frame');
    curtain(first, 'x', DX0 + 0.2, DX1 - 0.2, DF + 0.05, FF + 0.06, DHEAD - 0.2, 1.0);
    box(first, mats.frame, DX0 + 0.2, DX1 - 0.2, FF + 1.05, FF + 1.11, DF, DF + 0.1, 'Dormer transom');

    // West gable wall: pentagon in the (z, y) plane, 200 mm thick
    function gableShape(inset) {
      const s = new THREE.Shape();
      s.moveTo(0 + inset, FF);
      s.lineTo(10 - inset, FF);
      s.lineTo(10 - inset, EAVE + inset);
      s.lineTo(RIDGE_Z, RIDGE - inset * 1.4);
      s.lineTo(0 + inset, EAVE + inset);
      s.closePath();
      return s;
    }
    function gable(mat, depth, x, inset, name) {
      const geo = new THREE.ExtrudeGeometry(gableShape(inset), { depth, bevelEnabled: false });
      geo.rotateY(-Math.PI / 2);
      const m = new THREE.Mesh(geo, mat);
      m.position.x = x + depth;
      m.name = name;
      return shadowy(m, mat !== mats.glass);
    }
    first.add(gable(mats.plaster, 0.2, 0, 0, 'West gable wall'));

    // East gable: full-height glazing onto the planter balcony
    first.add(gable(mats.glass, 0.02, 9.9, 0.01, 'East gable glazing'));
    const roofUnder = z => EAVE + Math.min(z, 10 - z);
    for (let z = 0.2; z <= 9.81; z += 1.2) {
      box(first, mats.frame, 9.87, 9.95, FF, roofUnder(z) - 0.02, z - 0.03, z + 0.03, 'Mullion');
    }
    box(first, mats.frame, 9.87, 9.95, FF + 2.4, FF + 2.46, 0.1, 9.9, 'Transom');
    rod(first, mats.frame, [9.91, EAVE, 0], [9.91, RIDGE, RIDGE_Z], 0.04);
    rod(first, mats.frame, [9.91, EAVE, 10], [9.91, RIDGE, RIDGE_Z], 0.04);

    // R.C columns and beam on grid 3 carrying the trusses
    const BEAM_Y = FF + 3.2;
    // (Grid 3 columns and beam removed: the lounge is clear-span under the trusses)

    // Lounge furniture
    if (furnished) {
    sectional(first, 1.9, 4.2, 0.25, FF, 'left');
    sectional(first, 4.7, 7.0, 0.25, FF, 'right');
    booth(first, 3.0, 3.1, FF, mats.sofaFF);
    booth(first, 5.6, 3.1, FF, mats.sofaFF);
    booth(first, 8.2, 3.1, FF, mats.sofaFF);
    roundTable(first, 2.8, 6.4, FF, 2, mats.sofaFF);
    roundTable(first, 4.8, 6.4, FF, 2, mats.sofaFF);
    roundTable(first, 7.0, 6.4, FF, 3, mats.sofaFF);
    roundTable(first, 8.9, 6.4, FF, 2, mats.sofaFF);
    booth(first, 1.6, 9.15, FF, mats.sofaFF);
    booth(first, 4.0, 9.15, FF, mats.sofaFF);
    booth(first, 6.4, 9.15, FF, mats.sofaFF);
    booth(first, 8.8, 9.15, FF, mats.sofaFF);
    [[4.45, 0.6], [4.45, 1.3], [1.6, 0.5]].forEach(([x, z]) => plant(first, x, z, FF, 0.9));
    }
    // Lounge: long striped banquette along the mural (north) wall, marble bistro tables and
    // velvet chairs facing it (after the reference photo). Stair landing at the west end kept clear.
    const BX0 = 1.6, BX1 = 9.55, BZ = 0.2, BD = 0.62;
    box(first, mats.stripe, BX0 + 0.12, BX1 - 0.12, FF, FF + 0.44, BZ, BZ + BD, 'Banquette seat');
    for (let x = BX0 + 0.12; x < BX1 - 0.13; x += 0.9) {
      const x1 = Math.min(x + 0.88, BX1 - 0.12);
      box(first, mats.stripe, x, x1, FF + 0.44, FF + 1.02, BZ, BZ + 0.16, 'Banquette back');
    }
    box(first, mats.rattan, BX0, BX0 + 0.12, FF, FF + 0.72, BZ, BZ + BD, 'Rattan end');
    box(first, mats.rattan, BX1 - 0.12, BX1, FF, FF + 0.72, BZ, BZ + BD, 'Rattan end');
    box(first, mats.darkWood, BX0 + 0.12, BX1 - 0.12, FF, FF + 0.08, BZ + BD - 0.02, BZ + BD, 'Banquette plinth');
    const TZ = 1.22;
    for (let k = 0; k < 8; k++) {
      const x = 2.2 + k * 0.98;
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.035, 40), mats.marbleWhite);
      top.position.set(x, FF + 0.74, TZ); top.name = 'Table top'; first.add(shadowy(top));
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.315, 0.315, 0.012, 40), mats.darkWood);
      rim.position.set(x, FF + 0.716, TZ); first.add(shadowy(rim));
      for (let b = 0; b < 9; b++) {                       // turned / twisted pedestal
        const bead = new THREE.Mesh(new THREE.SphereGeometry(0.048, 14, 10), mats.darkWood);
        bead.position.set(x, FF + 0.1 + b * 0.068, TZ); bead.scale.set(1, 0.85, 1); bead.name = 'Table leg';
        first.add(shadowy(bead));
      }
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.05, 32), mats.brass);
      foot.position.set(x, FF + 0.025, TZ); foot.name = 'Table base'; first.add(shadowy(foot));
      // bistro chair facing the banquette
      const cz = TZ + 0.62;
      box(first, mats.velvetOrange, x - 0.21, x + 0.21, FF + 0.42, FF + 0.5, cz - 0.21, cz + 0.21, 'Chair seat');
      [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]].forEach(([dx, dz]) =>
        box(first, mats.darkWood, x + dx - 0.015, x + dx + 0.015, FF, FF + 0.42, cz + dz - 0.015, cz + dz + 0.015, 'Chair frame'));
      [-0.18, 0.18].forEach(dx => box(first, mats.darkWood, x + dx - 0.015, x + dx + 0.015, FF + 0.42, FF + 0.95, cz + 0.19, cz + 0.22, 'Chair frame'));
      const bs = new THREE.Shape();
      bs.moveTo(-0.18, 0); bs.lineTo(0.18, 0); bs.lineTo(0.18, 0.22); bs.absarc(0, 0.22, 0.18, 0, Math.PI, false); bs.closePath();
      const back = new THREE.Mesh(new THREE.ExtrudeGeometry(bs, { depth: 0.04, bevelEnabled: false }), mats.floral);
      back.position.set(x, FF + 0.55, cz + 0.17); back.rotation.x = -0.08; back.name = 'Chair back';
      first.add(shadowy(back));
    }
    // Floral scatter cushions on the banquette
    [2.0, 2.35, 4.6, 6.95, 7.3, 9.1].forEach((x, k) => {
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), mats.floral);
      c.scale.set(1, 0.95, 0.35); c.position.set(x, FF + 0.66, BZ + 0.24); c.rotation.z = (k % 2 ? 0.25 : -0.2);
      c.name = 'Cushion'; first.add(shadowy(c));
    });

    // Lounge centre: serpentine (S-shaped) booth from two half-ring booths, terracotta channel-tufted
    // upholstery in a reeded walnut shell, a round table in each curve, rattan armchairs and round rugs
    function ringSector(g, mat, rIn, rOut, a0, a1, y0, h, cx, cz, name) {
      const sh = new THREE.Shape();
      sh.moveTo(rOut * Math.cos(a0), rOut * Math.sin(a0));
      sh.absarc(0, 0, rOut, a0, a1, false);
      sh.lineTo(rIn * Math.cos(a1), rIn * Math.sin(a1));
      sh.absarc(0, 0, rIn, a1, a0, true);
      const geo = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false, curveSegments: 40 });
      geo.rotateX(-Math.PI / 2);                         // shape (x, y) -> world (x, -z); extrusion -> up
      const m = new THREE.Mesh(geo, mat);
      m.position.set(cx, y0, cz); m.name = name;
      g.add(shadowy(m)); return m;
    }
    const SR = 1.3, SZ = 5.8, SC = [[3.6, Math.PI, 2 * Math.PI], [3.6 + 2 * SR, 0, Math.PI]];
    SC.forEach(([cx, a0, a1]) => {
      ringSector(first, mats.wood, SR - 0.08, SR, a0, a1, FF, 1.05, cx, SZ, 'Booth shell');
      ringSector(first, mats.sofaGF, SR - 0.24, SR - 0.08, a0, a1, FF + 0.42, 0.6, cx, SZ, 'Booth back');
      ringSector(first, mats.sofaGF, SR - 0.78, SR - 0.08, a0, a1, FF, 0.44, cx, SZ, 'Booth seat');
      ringSector(first, mats.led, SR, SR + 0.02, a0, a1, FF + 0.01, 0.025, cx, SZ, 'Booth glow');
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.04, 40), mats.wood);
      top.position.set(cx, FF + 0.74, SZ); top.name = 'Booth table'; first.add(shadowy(top));
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 0.72, 20), mats.frame);
      ped.position.set(cx, FF + 0.36, SZ); first.add(shadowy(ped));
      const rug = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.01, 64), mats.rug);
      rug.position.set(cx, FF + 0.005, SZ); rug.name = 'Rug'; first.add(shadowy(rug, false));
      // two rattan armchairs on the open side, facing the booth
      const open = a0 === 0 ? 1 : -1;                    // +z (south) for the second, -z (north) for the first
      [-0.5, 0.5].forEach(dx => {
        const ch = new THREE.Group();
        box(ch, mats.rattan, -0.34, 0.34, 0.0, 0.42, -0.32, 0.32, 'Armchair');
        box(ch, mats.rattan, -0.34, 0.34, 0.42, 0.78, 0.22, 0.32, 'Armchair');
        box(ch, mats.rattan, -0.34, -0.26, 0.42, 0.62, -0.32, 0.32, 'Armchair');
        box(ch, mats.rattan, 0.26, 0.34, 0.42, 0.62, -0.32, 0.32, 'Armchair');
        box(ch, mats.stripe, -0.26, 0.26, 0.42, 0.52, -0.3, 0.22, 'Armchair cushion');
        ch.position.set(cx + dx * 1.05, FF, SZ + open * 0.95);
        ch.rotation.y = (open > 0 ? 0 : Math.PI) + dx * -0.7 * open;
        first.add(ch);
      });
    });
    // planters closing each end of the S
    [[3.6 - SR - 0.3, SZ], [3.6 + 3 * SR + 0.3, SZ]].forEach(([x, z]) => {
      box(first, mats.frame, x - 0.25, x + 0.25, FF, FF + 0.55, z - 0.25, z + 0.25, 'Planter box');
      plant(first, x, z, FF + 0.55, 0.8);
    });

    // Planter boxes on the 500 mm cantilever
    box(first, mats.concrete, 10.02, 10.48, FF, FF + 0.45, 0.1, 9.9, 'Planter');
    for (let z = 0.5; z < 9.8; z += 0.65) {
      const p = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), mats.leaf);
      p.position.set(10.25, FF + 0.62, z); p.scale.set(1, 1.2, 1);
      first.add(shadowy(p));
    }

    // ---------- Roof: steel trusses, 28g box profile sheeting, flat skylight ----------
    const S2 = Math.SQRT2, T = 0.06;
    const RX0 = -0.4, RX1 = 10.9;          // 300-400 mm verges
    const D_N = 6.0, D_S = 6.6;            // eaves: 1.0 m past grid 1, 1.6 m past grid 5 (over the verandah)
    // A roof panel between horizontal distances d0..d1 from the ridge
    function panel(g, mat, side, x0, x1, d0, d1, lift, thick, name) {
      lift = lift || 0; thick = thick || T;
      const len = (d1 - d0) * S2;
      const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, thick, len), mat);
      const dm = (d0 + d1) / 2, off = (thick / 2 + lift) / S2;
      if (side === 'N') { m.rotation.x = -Math.PI / 4; m.position.set((x0 + x1) / 2, RIDGE - dm + off, RIDGE_Z - dm - off); }
      else { m.rotation.x = Math.PI / 4; m.position.set((x0 + x1) / 2, RIDGE - dm + off, RIDGE_Z + dm + off); }
      if (name) m.name = name;
      g.add(shadowy(m, mat !== mats.glass));
      return m;
    }
    // Back slope: one continuous sheet (skylight removed)
    panel(roof, mats.roof, 'N', RX0, RX1, 0, D_N, 0, T, 'Roof sheeting');
    const DD = DZB - RIDGE_Z;                            // slope distance cut back for the dormer
    panel(roof, mats.roof, 'S', RX0, DX0, 0, D_S, 0, T, 'Roof sheeting');
    panel(roof, mats.roof, 'S', DX1, RX1, 0, D_S, 0, T, 'Roof sheeting');
    panel(roof, mats.roof, 'S', DX0, DX1, 0, DD, 0, T, 'Roof sheeting');
    // Box-profile ribs at 300 mm centres
    for (let x = RX0 + 0.15; x < RX1; x += 0.3) {
      panel(roof, mats.roof, 'N', x - 0.02, x + 0.02, 0, D_N, T, 0.04);
      panel(roof, mats.roof, 'S', x - 0.02, x + 0.02, 0, x > DX0 && x < DX1 ? DD : D_S, T, 0.04);
    }

    // Dormer roof (shallow fall to the front, standing seams) and clad cheeks
    const droof = box(roof, mats.dormerClad, DX0 - 0.12, DX1 + 0.12, DHEAD, DHEAD + 0.16, DZB - 0.1, DF + 0.45, 'Dormer roof');
    droof.rotation.x = 0.04;
    for (let z = DZB + 0.15; z < DF + 0.4; z += 0.3) box(roof, mats.dormerClad, DX0 - 0.12, DX1 + 0.12, DHEAD + 0.16, DHEAD + 0.2, z - 0.015, z + 0.015);
    function cheek(x0) {
      const s = new THREE.Shape();
      s.moveTo(DZB, DHEAD);
      s.lineTo(DF + 0.2, DHEAD);
      s.lineTo(DF + 0.2, CEIL - 0.05);
      s.lineTo(10, CEIL - 0.05);
      s.lineTo(10, EAVE);
      s.closePath();
      const geo = new THREE.ExtrudeGeometry(s, { depth: 0.18, bevelEnabled: false });
      geo.rotateY(-Math.PI / 2);
      const m = new THREE.Mesh(geo, mats.dormerClad);
      m.position.x = x0 + 0.18; m.name = 'Dormer cheek';
      roof.add(shadowy(m));
    }
    cheek(DX0 - 0.12);
    cheek(DX1 - 0.06);
    box(roof, mats.steel, DX0, DX1, DHEAD - 0.2, DHEAD, DZB - 0.15, DZB, 'Dormer trimmer');
    // Ridge capping and fascia boards
    const cap = new THREE.Mesh(new THREE.BoxGeometry(RX1 - RX0, 0.22, 0.22), mats.frame);
    cap.rotation.x = Math.PI / 4; cap.position.set((RX0 + RX1) / 2, RIDGE + 0.04, RIDGE_Z); roof.add(shadowy(cap));
    box(roof, mats.frame, RX0, RX1, RIDGE - D_N - 0.12, RIDGE - D_N + 0.08, RIDGE_Z - D_N - 0.05, RIDGE_Z - D_N + 0.03, 'Fascia');
    [[RX0, DX0 - 0.12], [DX1 + 0.12, RX1]].forEach(([a, b]) => box(roof, mats.frame, a, b, RIDGE - D_S - 0.12, RIDGE - D_S + 0.08, RIDGE_Z + D_S - 0.03, RIDGE_Z + D_S + 0.05, 'Fascia'));

    // Prefabricated SHS/RHS trusses (bottom chord on the grid 3 beam level)
    const tz = BEAM_Y + 0.2 - EAVE;        // where the bottom chord meets the slope
    [0.3, 2.3, 5.0, 7.6, 9.7].forEach(x => {
      const yB = BEAM_Y + 0.2;
      const r = 0.075, m = mats.steel;
      rod(roof, m, [x, yB, tz], [x, yB, 10 - tz], r, 4);
      rod(roof, m, [x, EAVE, 0.1], [x, RIDGE - 0.05, RIDGE_Z], r, 4);
      if (x > DX0 && x < DX1) rod(roof, m, [x, RIDGE - DD, DZB], [x, RIDGE - 0.05, RIDGE_Z], r, 4);
      else rod(roof, m, [x, EAVE, 9.9], [x, RIDGE - 0.05, RIDGE_Z], r, 4);
      rod(roof, m, [x, yB, RIDGE_Z], [x, RIDGE - 0.05, RIDGE_Z], r, 4);
      const za = (tz + RIDGE_Z) / 2, zb = 10 - za;
      rod(roof, m, [x, yB, za], [x, roofUnder(za), za], r, 4);
      rod(roof, m, [x, yB, zb], [x, roofUnder(zb), zb], r, 4);
      rod(roof, m, [x, roofUnder(za), za], [x, yB, RIDGE_Z], r, 4);
      rod(roof, m, [x, roofUnder(zb), zb], [x, yB, RIDGE_Z], r, 4);
    });

    return { root: all, groups: { site, ground, first, roof }, mats, levels: { GF, FF, EAVE, RIDGE } };
  }

  root.buildRestaurant = buildRestaurant;
})(typeof window !== 'undefined' ? window : globalThis);
