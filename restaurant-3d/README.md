# Restaurant 3D model

This is a 3D model of the **Proposed Restaurant Development** for client Sadik Abdi, drawing AU/PL05/2026.08 at 1:100. It's built from the ground floor plan, first floor plan, roof plan and Section X‑X.

| File | What it is |
| --- | --- |
| `index.html` | An interactive viewer with four views: Exterior, Roof off, Ground floor and Section X‑X. Serve the folder and open it in a browser, for example with `python3 -m http.server`. |
| `building.js` | The model geometry, in metres. Every dimension is taken from the drawing. |
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
