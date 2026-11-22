## What It Does
Play Hangar Exit as a 30-second scene or trigger ten individual movements. Replay any movement or interrupt the film by selecting another.

## Architecture
    control -> playback clock -> sequence sample -> horizontal slice regions -> Canvas 2D

## Frontend / API
The page owns playback, pause, rotation and camera settings. A fresh click starts at zero. The walk loops, individual moves settle to standing, and the demo holds its final black frame at 30 seconds. Reduced motion starts in the standing pose. The camera panel becomes a bottom sheet on narrow screens. All controls support standard keyboard activation and sliders support arrow keys. No server API.

## AI Usage
The coding assistant authored the suit and its choreography from a reference photograph. Runtime playback uses precomputed sprite data.

## Key Dependencies
React, Next.js image imports, Canvas 2D and requestAnimationFrame.

## Component Tree
GundamStack contains the stage, playback controls, movement buttons and camera panel.

## Error Handling
Image decoding must complete before playback. A load error is shown on the stage. Storage errors fall back to memory. Unmounting cancels the active animation frame.

## File Structure
page.tsx coordinates loading and user input. sequence.ts maps time to camera and pose. render.ts draws a pixel-aligned stack and composited effects. hangar.ts paints the bay, lighting and floor. stage.css controls layout. The standing, walk, battle, flight and choreography PNGs contain horizontal sections. The JSON tables store source rectangles and offsets. Choreography also records muzzle, grip, shield and visor positions for projected effects.
