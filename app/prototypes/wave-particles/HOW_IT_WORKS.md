# Wave Particles

## What It Does

Tap the tank to launch a signed crest and trough. Switch among a single source, synchronized sources and a towed hull, then toggle the particle overlay or pause and step through a reflection.

## Paper and implementation

Cem Yuksel, Donald H. House and John Keyser, _Wave Particles_, ACM Transactions on Graphics, SIGGRAPH 2007. [Author-hosted paper](https://www.cemyuksel.com/research/waveparticles/waveparticles.pdf)

| Paper technique                                        | Demo implementation                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Signed superposition and compact support, Eqs. 3 and 7 | Each moving packet adds a raised cosine inside its radius and zero outside. Opposite signs cancel wherever their supports overlap.                                                                                                                                                      |
| Expanding wavefronts, §3.2                             | When arc spacing exceeds half the support radius, a packet divides into three equal angular segments. Each child inherits one third of the signed amplitude and dispersion, with unchanged radius. Directions and positions are evaluated from the original emission point.             |
| Boundaries, §3.3                                       | Rays fold specularly across the four flat walls, including multiple bounces. Open mode lets outgoing packets escape. Only packet centers are reflected; kernels at the wall are clipped.                                                                                                |
| Extended height field, Eqs. 8–11                       | Each cell accumulates height and a horizontal vector equal to the local height times a negative directional sine. An approximate inverse warp samples displaced surface height for shading.                                                                                             |
| Object coupling, Eqs. 12–13                            | The prescribed hull emits two signed fans from equal effective end faces using swept volume per emission interval. The integrated radial kernel converts volume to amplitude. A separate, moored float responds to surface height with linear waterplane buoyancy and vertical damping. |

The demo uses CPU splatting and a lookup table on a 217 × 136 grid. The original paper also describes GPU filtering, event scheduling, general per-face coupling, lift, drag and rigid-body dynamics. Here the hull follows a prescribed path, the velocity calculation assumes quiescent water at its end faces, and the float has one vertical degree of freedom. The tank has a constant propagation speed, exponential damping, a lifetime cutoff and a 5,000-packet budget. It models surface disturbances without breaking waves or global currents.

## Architecture

```text
tap / pulse / hull -> signed packets -> advance, split, reflect
                                      -> height + horizontal warp
                                         |-> shaded tank and transect
                                         |-> buoyant float
```

## Frontend / API

The page persists the experiment, source amplitude, wave speed, boundary condition and overlay. TankView owns the frame loop, pause state, keyboard-accessible pulse and single-step actions. Tap placement works in tank coordinates at desktop and phone sizes. Desktop uses a side panel and mobile uses a bottom sheet. Changing the experiment or boundary condition, or resetting, restarts a reproducible scene. Increasing source amplitude affects future emissions. All computation is client-side. There are no prototype HTTP contracts.

## Key Dependencies, Component Tree and File Structure

React and Next.js provide the page and lifecycle. Canvas 2D renders the tank and profile. The playground provides Button and Sheet.

```text
page.tsx            persistence and responsive layout
  controls.tsx      settings, reset and randomize
  tank-view.tsx     timing, user input, canvases
    simulation.ts   packet propagation, reconstruction and buoyancy
    render.ts       inverse warp, shading, instruments and transect
data.ts / types.ts  constants, settings and particle data
wave.css            layout and theme tokens
metadata.json       private gallery entry
```

## Error Handling

Saved settings are validated and both storage operations tolerate restricted browsers. Missing Canvas 2D produces a visible error. Background or offscreen tabs skip time accumulation. Catch-up time is bounded and frame callbacks and observers are released on unmount.

## AI Usage

The running application makes no model calls.

## Launch

From the repository root run `npm ci` and `npm run dev`, then open [the local demo](http://localhost:3000/prototypes/wave-particles).

## Validation

Numerical checks covered the kernel peak, opposite-sign cancellation, the sign of longitudinal displacement, preservation of signed amplitude on subdivision, and inward versus outgoing directions at a wall. All three experiments retained finite field values and stayed within their particle budget over 600 additional simulation steps.

The transect auto-scales for large impulses. Desktop and 375 px production-browser checks covered pause, single-step, pointer input, experiment and boundary changes, saved settings, mobile sheet access and private route gating.
