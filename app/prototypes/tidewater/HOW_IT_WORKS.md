# Tidewater

## What It Does

Explore a wind-driven cove from the beach, the surface, or overhead. Both presets and all material controls run live.

## Launch

From the repository root run `npm ci`, then `npm run dev`. Open http://localhost:3000/prototypes/tidewater in a WebGL 2 browser. The private production route uses the playground's existing sign-in.

## Architecture

Three.js provides WebGL 2 buffers, render targets, clipping, and orbit controls inside the existing Next.js app. Custom GLSL keeps wave displacement, underwater visibility and foam in one surface pass.

```text
settings -> wave uniforms ----------------------+
static sky -> cube map -------------------------|
camera -> terrain and rocks -> color + depth ---|-> water composite -> canvas
       -> clipped mirror view -> reflection ----+
```

Five Gerstner components displace points laterally and vertically. Their analytic derivatives give the geometric normal. A single indexed polar grid follows the camera continuously. Its rings widen with distance and share vertices along every boundary. Two independently seeded, mipmapped textures supply scrolling normal slopes, noise and foam cells. Directional specular light breaks into glints as the slopes change.

The opaque pass captures sand, stones and the sky. The water shader reconstructs scene positions from depth and rejects distortion samples in front of or above the local surface. Path length controls color absorption. A short depth ramp softens contacts. Foam coverage combines depth, crest elevation, upward orientation, animated noise and a cellular texture. Fresnel mixes transmission with a sky cube and a planar, clipped reflection of nearby geometry.

## Frontend / API

The page validates and persists settings in versioned local storage. View selection, orbit and zoom, pause and FPS are session state. Drag to orbit and use the wheel or pinch to zoom. Camera buttons support keyboard and touch. Native sliders support arrow keys. Small screens use a bottom sheet. All rendering runs locally and requires no prototype API.

## Key Dependencies

Three.js and OrbitControls, React, Next.js, Radix Sheet and Lucide icons.

## Component Tree and File Structure

```text
page.tsx                    settings and persistence
  viewer.tsx                camera, pause and FPS
    engine.ts               scene lifecycle, orbit and render passes
      scenery.ts            sky, sand, headlands and stones
      textures.ts           seeded periodic textures
      water.ts              grid and surface shaders
  controls.tsx              presets and material controls
types.ts / data.ts          settings schema, defaults and ranges
tidewater.css               responsive layout
metadata.json               gallery entry
```

## Error Handling and Resource Use

Unavailable WebGL or a lost context displays a recovery message. Invalid or inaccessible storage falls back to in-memory defaults. Camera or size changes invalidate the opaque and mirror passes. A stationary view reuses both. Low quality skips the planar pass, Balanced uses half-resolution reflections and High uses 85%. The canvas resolution also scales with quality. Offscreen and hidden views skip rendering. Unmount releases geometry, materials, textures, targets, controls and observers.

## AI Usage

The running demo makes no model calls.

## Limitations

The surface is a procedural swell field. Foam has no buoyancy or transport simulation. Refraction uses a single visible depth layer and cannot reveal hidden objects. The flat mirror approximates reflection from a curved wave. The camera stays above water.

## Visual checks

The beach, surface and overhead cameras were exercised with calm and choppy water. A stationary sequence and a drag-orbit sequence showed continuous shoreline coverage and no visible radial mesh seams or abrupt changes in geometry density. The low view exposed a crest sorting issue during development. The final surface pass uses its own depth buffer. The remaining grazing-angle reflection breakup is most visible against the stone arch. Repeating ripple tiles and individual foam cells become easier to recognize close to the surface.

The desktop and 375 px views support the same settings. Browser checks covered switching camera and quality, persistence across reload, the mobile sheet, and pause/resume. A paused scene crop remained pixel-identical across samples and changed after resuming.

[Choppy surface view](captures/surface.webp) · [Overhead view](captures/overhead.webp) · [375 px beach view](captures/mobile.webp)

## Reproduce the performance profile

Build with `npm run build`, then start the production server with `npm start` and a local `PLAYGROUND_PASSWORD`. In a second terminal with the same variable, run `node app/prototypes/tidewater/profile.mjs http://127.0.0.1:3000`. Install Playwright Chromium with `npx playwright install chromium` or point `CHROMIUM_PATH` at an installed Chromium binary. Each quality gets a warm-up and two six-second frame-interval samples, one stationary and one continuously dragging the orbit camera.

## Measured performance

Chromium 156 on Linux, ANGLE Vulkan SwiftShader software renderer, AMD EPYC 9V74 host with a four-core CPU quota. Calm preset, 1360 × 850 browser viewport, device pixel ratio 1. Timings include the complete scene and browser frame scheduling.

| Quality | Drawing buffer | Camera | Mean FPS | 95th-percentile frame (ms) |
| --- | --- | --- | ---: | ---: |
| Balanced | 850 × 467 | stationary | 22.1 | 66.6 |
| Balanced | 850 × 467 | orbit | 10.7 | 100.1 |
| Low | 415 × 228 | stationary | 59.3 | 16.7 |
| Low | 415 × 228 | orbit | 26.3 | 66.7 |
| High | 1323 × 726 | stationary | 9.8 | 183.3 |
| High | 1323 × 726 | orbit | 5.2 | 233.3 |

Low approached 60 FPS with a stationary camera. Continuous orbit refreshed the scenery passes and missed the 60 FPS target at every setting. Hardware-accelerated GPU performance remains unmeasured.
