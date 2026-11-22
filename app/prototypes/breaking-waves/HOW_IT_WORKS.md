# Breaking Waves

## What It Does

Explore three moving surf lines that share one authored breaker animation. Choose a stage to pause, scrub a complete cycle, orbit into the barrel, or vary where the break travels along the coast.

## Source and scope

Hugh Malan, _Rendering Water in Horizon Forbidden West_, Advances in Real-Time Rendering, SIGGRAPH 2022. [Presentation with speaker notes](https://advances.realtimerendering.com/s2022/SIGGRAPH2022-Advances-Water-Malan.pdf)

| Slides    | Technique used here                                                                                                                                                                                                                                                                                                                           |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5–9       | An original sequence of cross-section curves rises, curls, plunges and returns to flat water. The ordered points trace the outside of the lip and then double back around its inner wall.                                                                                                                                                     |
| 10–13     | Bake horizontal and vertical offsets, a foam mask and cumulative arc length into a 192 × 96 floating-point texture. Cross-shore position selects a column. Local animation age selects a row. Offset the original mesh in each front's horizontal normal direction and vertically. Arc-length correction reduces stretched detail on the lip. |
| 14–22, 40 | Two shape boundaries and two guide boundaries define a Coons patch. The precomputed mesh stores shoreward travel, transverse distance and orientation. Three instances traverse the same patch with different start times. A linear phase gradient substitutes for the artist-drawn animation hints.                                          |
| 23–24     | Independent per-front strength modulation opens gaps without shifting the local stage of the wave. The demo evaluates a procedural mask in the shader.                                                                                                                                                                                        |

This is an original reconstruction of the breaking-wave technique. It uses no Guerrilla assets or Houdini cache. The profile and parameterized patch are baked during initialization or a coastline change. The renderer uses a densely sampled mesh, a vertex shader and a second texture of baked cross-section derivatives for smooth shading. The talk describes compute-generated vertices and localized tessellation. The beach is fixed geometry. A foam material and lightweight ballistic spray follow the animated lip. Physically simulated run-up, gameplay interaction and the talk's separate volumetric river-effect pipeline are outside this model.

## Architecture

```text
authored section keys -> interpolated curves -> displacement / foam / arc atlas
shape + guide curves  -> Coons patch -> mesh domain + wavefront normals
clock + phase gradient + strength mask -> vertex texture lookup -> displaced mesh
displaced normals + foam + sky lighting -> rendered coast
tracked phase + same atlas -> side profile
```

## Frontend / API

Page state owns persistent settings. The viewer owns playback, scrub position and stage shortcuts. Scrubbing pauses the clock. The chart shows the source cross-section at the center of the tracked front and includes the wave-height scale. Cutaway tracks the primary front, clips the near half of the mesh, and triangulates its ordered cross-section so the barrel stays hollow. Shore, Barrel and Overhead show the full surface. Individual rendered fronts also receive a gap mask, end fades and small ambient ripples. Drag or use touch to orbit. Scroll or pinch to zoom. The camera selector offers keyboard and touch alternatives. Reduced-motion sessions start paused. Small screens use a bottom sheet. All rendering is local and there are no prototype HTTP endpoints.

## Component Tree, File Structure and Key Dependencies

```text
page.tsx         persisted settings and responsive layout
  controls.tsx   coastline, camera and wave controls
  viewer.tsx     playback, stage shortcuts and chart
    scene.ts     Three.js renderer, orbit, lighting, beach and lifecycle
      cutaway.ts   triangulated inspection slice through all three fronts
      spray.ts     seeded, phase-addressable lip spray
      profile.ts curve keyframes and cross-section atlas
      coast.ts   Coons patch and indexed water mesh
      material.ts vertex displacement and water shading
data.ts / types.ts    settings schema and source link
breaking.css          responsive layout
metadata.json         private gallery entry
```

React, Next.js, Three.js WebGL 2, OrbitControls, and the playground's Button and Sheet components.

## Error Handling

Missing WebGL 2 and context loss display a recovery message. Settings are validated on load, and inaccessible storage falls back to in-memory state. Hidden or offscreen frames skip simulation. Geometry changes release the old mesh. Unmount releases the atlas, scene resources, renderer, controls, animation loop and observers.

## AI Usage

The running demo makes no model calls.

## Launch

From the repository root run `npm ci` and `npm run dev`, then open [Breaking Waves](http://localhost:3000/prototypes/breaking-waves).

## Validation

Run `node --test app/prototypes/breaking-waves/profile.test.mjs` with Node 24 to check baked sections and interpolated frames for crossings, a folded crest, and continuous seams. The production build was also exercised in a WebGL browser at desktop and mobile sizes, including orbit, scrubbing, camera changes, and persisted controls.
