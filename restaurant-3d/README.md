# Restaurant 3D model

This is a 3D model of the **Proposed Restaurant Development** for client Sadik Abdi, drawing AU/PL05/2026.08 at 1:100. It's built from the ground floor plan, first floor plan, roof plan and Section X‑X.

| File | What it is |
| --- | --- |
| `index.html` | A photographic viewer with six views: Restaurant, Lounge, Walkway, Exterior, Roof off and Section X‑X. Serve the folder and open it in a browser, for example with `python3 -m http.server`. |
| `building.js` | The model geometry, in metres. Every dimension is taken from the drawing. |
| `interior.js` | The "Earth & Artisanship" interior scheme: materials, textures, light fittings and lighting. It changes finishes only, not the geometry. |
| `renders/` | Still renders at 1920 × 1200 of the restaurant, lounge, walkway, exterior and Section X‑X. |
| `restaurant.glb` | The model as a file you can open in Blender, SketchUp, Windows 3D Viewer and similar tools. |
| `export-glb.cjs` | Rebuilds `restaurant.glb` from `building.js`. Run `npm install three@0.128.0 && node export-glb.cjs`. |

## Assumptions where the drawing is silent

- **Plinth:** the ground floor is 300 mm above ground level.
- **Staircase:** it's modelled as a quarter‑turn stair, a 6‑step flight, a landing and a straight flight up the west wall. It keeps the drawing's 23 risers × 157 mm and 300 mm goings.
- **W.C. ceiling:** it's at 2.8 m so the stair can pass over the second W.C.
- **Roof overhangs:** the roof extends about 1.0 m past grid 1 and 1.6 m past grid 5, so it covers the verandah. It overhangs the gable ends by 300–400 mm.
- **East gable (grid A):** it's modelled fully glazed, behind the 500 mm planter cantilever. The west gable is 200 mm masonry.
- **Windows and doors:** sizes are typical estimates, because the window and door schedule isn't on this sheet.
- **Furniture:** it follows the plan layout using simple shapes.

## Earth & Artisanship scheme

The scheme in `interior.js` replaces every material with a textured one and adds the lighting layer. Walls, slabs, the stair, the roof and the furniture positions stay exactly as `building.js` builds them.

- **Walls:** rammed earth in terracotta and ochre strata.
- **Floors:** 600 mm polished travertine in the dining areas, and 300 mm black and off‑white checkered tiles in the back‑of‑house walkway and W.C.s.
- **Seating:** fluted velvet, terracotta on the ground floor and ochre in the lounge.
- **Joinery:** reeded walnut on the service counter and cashier desk, and brushed brass on the railings and table bases.
- **Ceilings:** timber boarding under the roof, rattan ceiling clouds and woven rattan pendants over every table.
- **Lighting:** low late‑afternoon sun through the shopfront and the east gable, warm LED coves, and backlit tree‑silhouette panels on the restaurant's west wall and the lounge gable.
- **Rendering:** filmic (ACES) tone mapping, ground‑truth ambient occlusion (GTAO) and bloom.

## Revised elevations (not yet applied)

The geometry still follows the original floor plans. The revised elevations sheet differs from them in the following ways:

- **Ground floor height:** 3,100 mm plus a 350 mm beam.
- **Dormer:** a glazed dormer on Elevation 02, between grids C1 and B1.
- **Verandah roof:** a lean‑to roof over the verandah.
