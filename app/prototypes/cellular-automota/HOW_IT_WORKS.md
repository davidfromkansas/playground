# Cellular Automota

## What It Does

Conway's Game of Life fills the whole screen as a 3D voxel garden. Live squares are one of ten voxel flower species (sunflower, tulip, rose, forget-me-not, lavender, daisy, poppy, lily, hydrangea, marigold) that grow up from the ground when born and wilt into the grass when they die. Empty squares are grass.

## Architecture

```text
Play / Step / Randomize / Clear / tap   Settings (speed, plot size, density, reseed)
              |                                  |            \
              v                                  v             v
        GardenScene  <---------------------------+        localStorage
          |   \
          |    Board (life.ts): wrapping grid, alive + species arrays
          |      step() -> births, deaths
          v
   bornAt / diedAt timestamps per cell
          |
          v
   per frame: species voxels -> one InstancedMesh -> three.js renderer
```

## Frontend / API

- `page.tsx` owns settings, the running flag and generation stats. Settings persist under `playground:cellular-automota:v1`.
- `GardenScene` owns the board and the three.js scene. React talks to it through `setSettings`, `setRunning`, `setTheme`, `step`, `randomize`, `clear` and `paint`.
- Grid size comes from the screen: the camera looks down at 45° and each cell is stretched in depth so it shows as a square. Columns = width / plot size, rows = height / plot size plus a few rows so tall plants fill the top edge. The board wraps at the edges. Resizing keeps the overlapping part of the garden.
- Rules: a live cell with 2 or 3 neighbours survives, an empty cell with exactly 3 is born. A newborn takes the most common species among its three parents, with a 3% chance of a random species, so colonies keep their colour.
- When "Reseed when the garden stalls" is on, a repeating or nearly empty board for three generations gets a few random clusters sprinkled in.
- Tap or drag on the grass to plant. Starting a drag on a plant removes plants instead.
- Birth: voxels scale up from the ground in height order. Death: voxels turn brown from the top down, then shrink and sink. Plants sway slightly. With reduced motion, changes are instant and nothing sways.
- Desktop shows a floating control card. Under 720px it becomes a Play button and a bottom sheet. The scene follows the global theme: day light in light mode, cool moonlight in dark mode.
- No network requests, model calls or API routes.

## Key Dependencies

three.js (WebGL rendering, instancing, shadows), next-themes, shadcn Button, Switch and Sheet, Lucide icons.

## Component Tree

CellularAutomota renders GardenView (canvas + GardenScene) and GardenControls (desktop card, mobile sheet).

## Error Handling

Malformed or unavailable storage uses defaults and write failures keep settings in memory. If WebGL cannot start, a message stays visible instead of the canvas. Voxel counts are capped per board so very large screens cannot exhaust memory.

## File Structure

- `page.tsx` owns state and persistence.
- `types.ts` and `data.ts` define settings, bounds, defaults and the scene palette.
- `life.ts` is the pure Game of Life board with species inheritance.
- `species.ts` defines the ten voxel flower models.
- `garden-scene.ts` builds the three.js scene, runs generations and animates plants.
- `garden-view.tsx` mounts the canvas and handles tap-to-plant.
- `garden-controls.tsx` renders the desktop card and mobile sheet.
- `metadata.json` describes the gallery entry.
