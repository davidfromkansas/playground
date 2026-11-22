## What It Does
A continuously rotating RX-78-2 turntable demonstrates sprite stacking from the supplied figure photograph. Hidden surfaces are inferred.

## Architecture
    horizontal PNG atlas -> rotate and squash each slice -> lift by z -> canvas

## Frontend / API
The React page owns playback and controls. The angle slider pauses rotation. Squash changes the camera projection and spacing separates layers. Mobile controls open in a bottom sheet. Sliders support arrow keys. Valid settings persist locally. There are no network APIs.

## AI Usage
The coding assistant authored the sectional geometry from the reference photograph. No inference runs in the app.

## Key Dependencies
React, Next.js static PNG imports, Canvas 2D and requestAnimationFrame.

## Component Tree
GundamStack contains the canvas, playback toggle and settings panel.

## Error Handling
Failed atlas loads show a reload message. Storage and parse failures use defaults. Reduced-motion preferences start the turntable paused.

## File Structure
page.tsx manages interaction. render.ts draws the bottom-to-top slices with nearest sampling. slices.png contains 126 frames of 104 × 80 pixels in one row. metadata.json registers the prototype.
