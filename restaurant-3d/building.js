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
  function buildRestaurant(THREE) {
    // Levels, from Section X-X
    const GF = 0.3;            // ground floor finish above ground level
    const CEIL = 3.75;         // underside of first floor slab (GF + 3,450)
    const FF = 3.9;            // first floor finish (150 mm slab)
    const EAVE = FF + 1.5;     // top of first floor knee walls
    const RIDGE = EAVE + 5.0;  // 45 deg roof over a 10 m span, ridge on grid 3
    const RIDGE_Z = 5.0;

    const std = (color, o) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.85, metalness: 0 }, o || {}));
    const mats = {
      plaster: std(0xece6da),
      concrete: std(0xb3ada2),
      column: std(0xd8c4a0),
      stone: std(0xd8d0c2, { roughness: 0.45 }),
      tile: std(0xc5d0cd, { roughness: 0.5 }),
      roof: std(0x46525b, { metalness: 0.45, roughness: 0.5, side: THREE.DoubleSide }),
      steel: std(0x50575e, { metalness: 0.6, roughness: 0.4 }),
      brass: std(0xb08d57, { metalness: 0.9, roughness: 0.35 }),
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
    function rod(g, mat, a, b, r) {
      const A = new THREE.Vector3(a[0], a[1], a[2]), B = new THREE.Vector3(b[0], b[1], b[2]);
      const dir = B.clone().sub(A), len = dir.length();
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), mat);
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
    // W.C block (ceiling at 2.7 m so the stair can pass over it)
    const WC_TOP = 2.8;
    wall(ground, 'z', 0.2, 3.0, 1.2, 1.4, GF, WC_TOP, [
      { a: 0.7, b: 1.35, s: GF, h: 2.4, k: 'door' }, { a: 2.1, b: 2.75, s: GF, h: 2.4, k: 'door' }
    ]);
    box(ground, mats.plaster, 0.2, 1.2, GF, WC_TOP, 1.5, 1.6);
    box(ground, mats.plaster, 0.2, 1.4, GF, WC_TOP, 2.9, 3.0);
    box(ground, mats.plaster, 0.2, 1.4, WC_TOP, WC_TOP + 0.1, 0.2, 3.0, 'W.C ceiling');

    // R.C columns
    const colsGF = [[0.1, 0.1], [2.3, 0.1], [5.0, 0.1], [9.9, 0.1], [0.1, 5.0], [2.3, 5.0], [5.0, 5.0], [9.9, 5.0], [0.1, 9.9], [5.0, 9.9], [9.9, 9.9]];
    colsGF.forEach(([x, z]) => box(ground, mats.column, x - 0.11, x + 0.11, GF, CEIL, z - 0.11, z + 0.11, 'R.C column'));

    // Shopfront glazing to the verandah (grid 5) and the east side of the restaurant
    curtain(ground, 'x', 0.2, 4.89, 9.9, GF, 3.45, 1.2);
    curtain(ground, 'x', 5.11, 9.79, 9.9, GF, 3.45, 1.15, [6.3, 7.9]);
    curtain(ground, 'z', 5.11, 9.79, 9.9, GF, 3.45, 1.15);
    // 450 x 200 R.C beams over the glazing
    box(ground, mats.column, 0, 10, 3.45, CEIL, 9.8, 10, 'R.C beam');
    box(ground, mats.column, 9.8, 10, 3.45, CEIL, 5.0, 10, 'R.C beam');

    // Staircase: 23 risers x 157 mm, quarter landing, mild steel railing
    const R = (FF - GF) / 23, G = 0.3;
    for (let i = 1; i <= 6; i++) {
      const x1 = 3.0 - G * (i - 1), x0 = x1 - G;
      box(ground, mats.stone, x0, x1, GF, GF + R * i, 6.6, 7.6, 'Stair');
    }
    box(ground, mats.stone, 0.2, 1.2, GF, GF + R * 7, 6.6, 7.6, 'Stair landing');
    for (let r = 8; r <= 22; r++) {
      const z1 = 6.6 - G * (r - 8), z0 = z1 - G, top = GF + R * r;
      box(ground, mats.stone, 0.2, 1.2, top - 0.22, top, z0, z1, 'Stair');
    }
    const rail = (g, a, b) => rod(g, mats.brass, a, b, 0.022);
    rail(ground, [3.0, GF + R + 0.9, 7.6], [1.2, GF + R * 7 + 0.9, 7.6]);
    rail(ground, [1.2, GF + R * 7 + 0.9, 7.6], [1.2, GF + R * 7 + 0.9, 6.6]);
    rail(ground, [1.2, GF + R * 7 + 0.9, 6.6], [1.2, FF + 0.9, 2.1]);
    for (let i = 0; i <= 6; i++) {
      const x = 3.0 - 0.3 * i, y = GF + R * (i + 1);
      rail(ground, [x, y, 7.6], [x, y + 0.9, 7.6]);
    }
    for (let r = 8; r <= 22; r += 1) {
      const z = 6.6 - G * (r - 8) - 0.15, y = GF + R * r;
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
    box(ground, mats.sanitary, 0.5, 0.9, GF, GF + 0.42, 0.25, 0.85, 'W.C');
    box(ground, mats.sanitary, 0.5, 0.9, GF, GF + 0.42, 1.65, 2.25, 'W.C');
    box(ground, mats.sanitary, 0.25, 0.55, GF + 0.75, GF + 0.9, 3.4, 3.9, 'Wash hand basin');
    // Restaurant
    booth(ground, 3.0, 9.15, GF, mats.sofaGF);
    booth(ground, 5.8, 9.15, GF, mats.sofaGF);
    booth(ground, 8.5, 9.15, GF, mats.sofaGF);
    roundTable(ground, 1.1, 8.9, GF, 4, mats.sofaGF);
    roundTable(ground, 6.4, 6.8, GF, 4, mats.sofaGF);
    [[1.9, 8.7], [1.9, 9.5], [4.4, 8.7], [7.2, 8.7], [5.3, 6.8], [7.5, 6.8]].forEach(([x, z]) => plant(ground, x, z, GF, 0.8));

    // ---------- First floor ----------
    // 150 mm slab, cantilevered 500 mm past grid A, with the stair void
    const VOID = { x0: 0.2, x1: 1.25, z0: 2.1, z1: 6.6 };
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
    const DX0 = 2.75, DX1 = 7.15;                        // just outside grids C1 (2.8) and B1 (7.0)
    const DHEAD = FF + 2.63;
    const DZB = RIDGE_Z + (RIDGE - DHEAD) - 0.05;        // where the dormer roof meets the main slope

    // Knee walls to front and back (1.5 m); the front one stops either side of the dormer
    wall(first, 'x', 0, 10, 0, 0.2, FF, EAVE);
    wall(first, 'x', 0, DX0, 9.8, 10, FF, EAVE);
    wall(first, 'x', DX1, 10, 9.8, 10, FF, EAVE);

    // Dormer front: chunky portal frame, four glazed bays and a guarding transom
    box(first, mats.column, DX0, DX0 + 0.2, FF, DHEAD, 9.95, 10.2, 'Dormer frame');
    box(first, mats.column, DX1 - 0.2, DX1, FF, DHEAD, 9.95, 10.2, 'Dormer frame');
    box(first, mats.column, DX0, DX1, DHEAD - 0.2, DHEAD, 9.95, 10.2, 'Dormer frame');
    box(first, mats.column, DX0, DX1, FF - 0.05, FF + 0.06, 9.95, 10.2, 'Dormer frame');
    curtain(first, 'x', DX0 + 0.2, DX1 - 0.2, 10.05, FF + 0.06, DHEAD - 0.2, 1.0);
    box(first, mats.frame, DX0 + 0.2, DX1 - 0.2, FF + 1.05, FF + 1.11, 10.0, 10.1, 'Dormer transom');

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
    [0.1, 2.3, 5.0, 9.9].forEach(x => box(first, mats.column, x - 0.11, x + 0.11, FF, BEAM_Y, RIDGE_Z - 0.11, RIDGE_Z + 0.11, 'R.C column'));
    box(first, mats.column, 0.1, 9.9, BEAM_Y, BEAM_Y + 0.2, RIDGE_Z - 0.1, RIDGE_Z + 0.1, 'R.C beam');

    // Lounge furniture
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
    // Skylight opening on the back slope, between grids D and B
    const SK = { x0: 3.6, x1: 6.4, d0: 1.8, d1: 3.0 };
    panel(roof, mats.roof, 'N', RX0, SK.x0, 0, D_N, 0, T, 'Roof sheeting');
    panel(roof, mats.roof, 'N', SK.x1, RX1, 0, D_N, 0, T, 'Roof sheeting');
    panel(roof, mats.roof, 'N', SK.x0, SK.x1, 0, SK.d0, 0, T, 'Roof sheeting');
    panel(roof, mats.roof, 'N', SK.x0, SK.x1, SK.d1, D_N, 0, T, 'Roof sheeting');
    const DD = DZB - RIDGE_Z;                            // slope distance cut back for the dormer
    panel(roof, mats.roof, 'S', RX0, DX0, 0, D_S, 0, T, 'Roof sheeting');
    panel(roof, mats.roof, 'S', DX1, RX1, 0, D_S, 0, T, 'Roof sheeting');
    panel(roof, mats.roof, 'S', DX0, DX1, 0, DD, 0, T, 'Roof sheeting');
    panel(roof, mats.glass, 'N', SK.x0, SK.x1, SK.d0, SK.d1, 0.02, 0.02, 'Skylight glazing');
    panel(roof, mats.frame, 'N', SK.x0 - 0.06, SK.x0, SK.d0, SK.d1, 0.02, 0.1, 'Skylight frame');
    panel(roof, mats.frame, 'N', SK.x1, SK.x1 + 0.06, SK.d0, SK.d1, 0.02, 0.1, 'Skylight frame');
    panel(roof, mats.frame, 'N', SK.x0 - 0.06, SK.x1 + 0.06, SK.d0 - 0.06, SK.d0, 0.02, 0.1, 'Skylight frame');
    panel(roof, mats.frame, 'N', SK.x0 - 0.06, SK.x1 + 0.06, SK.d1, SK.d1 + 0.06, 0.02, 0.1, 'Skylight frame');
    // Box-profile ribs at 300 mm centres
    for (let x = RX0 + 0.15; x < RX1; x += 0.3) {
      const inSky = x > SK.x0 && x < SK.x1;
      if (inSky) {
        panel(roof, mats.roof, 'N', x - 0.02, x + 0.02, 0, SK.d0, T, 0.04);
        panel(roof, mats.roof, 'N', x - 0.02, x + 0.02, SK.d1, D_N, T, 0.04);
      } else {
        panel(roof, mats.roof, 'N', x - 0.02, x + 0.02, 0, D_N, T, 0.04);
      }
      panel(roof, mats.roof, 'S', x - 0.02, x + 0.02, 0, x > DX0 && x < DX1 ? DD : D_S, T, 0.04);
    }

    // Dormer roof (shallow fall to the front, standing seams) and clad cheeks
    const droof = box(roof, mats.roof, DX0 - 0.12, DX1 + 0.12, DHEAD, DHEAD + 0.16, DZB - 0.1, 10.45, 'Dormer roof');
    droof.rotation.x = 0.04;
    for (let z = DZB + 0.15; z < 10.4; z += 0.3) box(roof, mats.roof, DX0 - 0.12, DX1 + 0.12, DHEAD + 0.16, DHEAD + 0.2, z - 0.015, z + 0.015);
    function cheek(x0) {
      const s = new THREE.Shape();
      s.moveTo(DZB, DHEAD);
      s.lineTo(10.2, DHEAD);
      s.lineTo(10.2, roofUnder(10.2) - 0.05);
      s.closePath();
      const geo = new THREE.ExtrudeGeometry(s, { depth: 0.18, bevelEnabled: false });
      geo.rotateY(-Math.PI / 2);
      const m = new THREE.Mesh(geo, mats.roof);
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
      const r = 0.035, m = mats.steel;
      rod(roof, m, [x, yB, tz], [x, yB, 10 - tz], r);
      rod(roof, m, [x, EAVE, 0.1], [x, RIDGE - 0.05, RIDGE_Z], r);
      if (x > DX0 && x < DX1) rod(roof, m, [x, RIDGE - DD, DZB], [x, RIDGE - 0.05, RIDGE_Z], r);
      else rod(roof, m, [x, EAVE, 9.9], [x, RIDGE - 0.05, RIDGE_Z], r);
      rod(roof, m, [x, yB, RIDGE_Z], [x, RIDGE - 0.05, RIDGE_Z], r);
      const za = (tz + RIDGE_Z) / 2, zb = 10 - za;
      rod(roof, m, [x, yB, za], [x, roofUnder(za), za], r);
      rod(roof, m, [x, yB, zb], [x, roofUnder(zb), zb], r);
      rod(roof, m, [x, roofUnder(za), za], [x, yB, RIDGE_Z], r);
      rod(roof, m, [x, roofUnder(zb), zb], [x, yB, RIDGE_Z], r);
    });

    return { root: all, groups: { site, ground, first, roof }, mats, levels: { GF, FF, EAVE, RIDGE } };
  }

  root.buildRestaurant = buildRestaurant;
})(typeof window !== 'undefined' ? window : globalThis);
