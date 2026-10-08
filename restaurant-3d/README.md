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
- **Staircase (Isiolo Eatery revised plans, 7‑10‑26):** one straight flight up the west wall, 24 risers × 150 mm. The first riser is on grid 5 at the open front, and it arrives on the first floor at grid 2. The first‑floor void runs from grid 2 to about 6.8 m.
- **W.C.s:** two W.C.s and a basin lobby sit under the stair, with the ceiling at 2.4 m so the stair can pass over them.
- **Roof overhangs:** the roof extends about 1.0 m past grid 1 and 1.6 m past grid 5, so it covers the verandah. It overhangs the gable ends by 300–400 mm.
- **East gable (grid A):** it's modelled fully glazed, behind the 500 mm planter cantilever. The west gable is 200 mm masonry.
- **Windows and doors:** sizes are typical estimates, because the window and door schedule isn't on this sheet.
- **Furniture:** none. Both floors are an empty shell, with no booths, tables, chairs, sofas, plants, pendant lamps or rattan ceiling clouds. The code is still there: pass `{ furnished: true }` to `buildRestaurant()` and `applyEarthArtisanship()` to bring it back. Kitchen equipment, W.C. fittings, the service counter and the cashier desk stay.

## Earth & Artisanship scheme

The scheme in `interior.js` replaces every material with a textured one and adds the lighting layer. Walls, slabs, the stair, the roof and the furniture positions stay exactly as `building.js` builds them.

- **Walls:** white lime plaster, inside and out.
- **Floors:** 600 mm polished travertine in the dining areas, and 300 mm black and off‑white checkered tiles in the back‑of‑house walkway and W.C.s.
- **Joinery:** reeded walnut on the service counter and cashier desk, and brushed brass on the railings and table bases.
- **Ceilings:** timber boarding under the roof.
- **Lighting:** low late‑afternoon sun through the open front and the east gable, and warm LED coves.
- **Roof:** grey standing‑seam sheeting, with black square‑section steel trusses under the timber‑lined roof.
- **Rendering:** filmic (ACES) tone mapping, ground‑truth ambient occlusion (GTAO) and bloom.

## Roof dormer (from Revised Elevation 02)

A glazed box dormer sits on the front roof slope. It's 5.0 m wide (2,400 | 5,000 | 2,400 on the revised first floor plan), and its floor cantilevers 1.2 m past grid 5, out to grid 6 over the verandah. Its head is 2,630 mm above the first floor. It has a deep light portal frame, four glazed bays with a guarding transom, and dark standing‑seam cladding on the roof and sides. The front knee wall, the roof sheeting and the truss on grid C stop around it.

## Finishes and lighting (latest)

- **Ground floor:** black and white marble laid diagonally throughout, including the restaurant, kitchen, walkway, W.C.s and verandah.
- **Lounge:** a hand‑painted‑style botanical mural (big leaves over arches) on the back knee wall, lit by the LED cove above it.
- **Basin lobby under the stair:** a red marble vanity with a reeded walnut base and brass taps, a round mirror with a brass bead frame, fluted‑glass sconces and leaf wallpaper.
- **Ground‑floor lights:** seven colourful woven disc pendants with brass centres over the restaurant.

## Other revisions

- **Columns:** the centre columns are removed, on grid C at lines 3 and 5 downstairs, and on grid 3 upstairs together with their beam. The lounge is now a clear span under the trusses.
- **Shopfront:** the ground‑floor front on grid 5 is fully open to the verandah, with no glazing or doors.

The rest of the revised elevations sheet isn't applied yet: the 3,100 mm ground floor with a 350 mm beam, and the lean‑to verandah roof.

## Walkthrough video

`video/record.cjs` renders the walkthrough frame by frame from `index.html` in headless Chromium. Its header comment has the `ffmpeg` command that turns the frames into an MP4.
