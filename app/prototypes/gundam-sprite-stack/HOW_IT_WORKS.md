## What It Does
An articulated RX-78-2 walk cycle on a turntable demonstrates sprite stacking from the supplied figure photograph. Hidden surfaces are inferred.

## Architecture
    horizontal PNG atlas -> rotate and squash each slice -> lift by z -> canvas

## Frontend / API
The React page owns the 24-pose, 1.44-second walk loop and independent view rotation. A two-link leg solution positions the hips and knees for alternating foot contact and lift. Each arm swings together with its equipment. Pause walk holds the current pose, and Stand restores the original slice sheet. The angle slider pauses rotation. Squash changes the camera projection and spacing separates layers. Mobile controls open in a bottom sheet. Sliders support arrow keys. Valid settings persist locally. There are no network APIs.

## AI Usage
The coding assistant authored the sectional geometry from the reference photograph. No inference runs in the app.

## Key Dependencies
React, Next.js static PNG imports, Canvas 2D and requestAnimationFrame.

## Component Tree
GundamStack contains the canvas, playback toggle and settings panel.

## Error Handling
Failed atlas loads show a reload message. Storage and parse failures use defaults. Reduced-motion preferences start the suit standing still.

## File Structure
page.tsx manages interaction. render.ts draws the bottom-to-top slices with nearest sampling. slices.png contains 126 frames of 104 × 80 pixels in one row. walk.png packs the nonempty horizontal sections from every gait pose. walk-rects.json maps these regions to offsets and heights for bottom-to-top rendering. metadata.json registers the prototype.

## Battle moves
Attack and Defend are replayable one-shot actions that return to standing. Either button interrupts the current move. The rifle lifts, flashes and recoils. The shield swings across the torso and holds through contact. Both use battle.png and the bottom-up slices and 75 ms timelines in battle-poses.json. The camera can turn during either action.
