# After Effects to HyperFrames

How each technique in the reference maps onto this kit. The DOM layers live in
`assets/ip-kit.js` (`IP.*`) and `assets/ip-kit.css`. The 3D layer is `assets/ip-3d.mjs` (`IP3.*`),
bundled with three.js at build time.

## Mapping

| After Effects | HyperFrames implementation | Where |
| --- | --- | --- |
| 1920x1080 60 fps comp, trimmed to 8 s | Root composition; `--fps 60` at render | `build-promo.mjs` |
| White solid "BG" | `.ip-stage` background from `palette.background` | `ip-kit.css` |
| 3D models (Make Comp Size), environment light + HDRI, cast shadows | three.js scene on a transparent canvas; procedural phone and case, or your GLB; PMREM studio environment with softboxes | `ip-3d.mjs` |
| Position + rotation keys over 100 frames, Easy Ease, graph editor | Keyframed channels evaluated with `cubic-bezier(0.34, 0, 0.03, 1)` | `IP.channel`, `T.products` |
| Text layers slid in from off-frame left, 50-frame keys, stagger 5 frames | Per-line x channel, `cubic-bezier(0.69, 0, 0.10, 1)`, 0.083 s stagger | `T.copy` |
| Opacity 0 -> 100 over 20 frames, 2 frames late | Opacity channel, easy ease | `T.copy.fadeDelay/fadeDuration` |
| Pen-tool stroke, round cap, Trim Paths end 0 -> 100, white text above | SVG path with `pathLength=1` and dash offset; white text clipped to the drawn length | `ip-pill-path`, `revealBy` |
| Rectangle, 25% black, Roundness; scale 0 -> 115 -> 100 | Rounded div, two-segment scale channel | `T.card` |
| AirPods layer popped 5 frames after the card | 3D case (or image) with the same scale keys, delayed 0.083 s, plus a spin | `T.gift` |
| Duplicate, pre-compose, Time Reverse Layer, split mid-hold | Mirror time: after `mirror/2`, every entrance layer is evaluated at `mirror - t` | `IP.localTime` |
| Animation Composer bounce preset | Dropped-ball bounce ease fitted to the frames (a1 0.154, u^2.08) | `IP.bounce` |
| Null object carrying the logo left over 50 frames | x channel on the mark, `cubic-bezier(0.33, 0, 0, 1)` | `T.lockup` |
| Shape track matte so the wordmark comes out of the logo | The mark is painted above the word, and a `clip-path` polygon follows the mark's right edge every frame | `clipTo` |
| Motion blur switch on all layers (180 degree shutter) | 3D: ten sub-frame renders averaged in linear HDR, then ACES and sRGB. Type and cards: an SVG Gaussian scaled by the analytic speed x exposure | `IP3.render`, `IP.render` |
| HDRI reflections and the orange-to-gold glint | Tinted-metal back glass under a tall softbox 64 degrees right of camera, caught only in the last few degrees of the spin | `SOFTBOXES`, finishes |

## Why one clock, and why hf-seek

Every visible property is a pure function of composition time:

- DOM layers are evaluated from keyframe channels.
- The 3D pose is evaluated from the same channels at each sub-frame time.

`IP.render(t)` and `IP3.render(t)` are therefore idempotent and order-free. The page drives them
from two sources:

- **The HyperFrames `hf-seek` event**: on every seek during render. When the models are still
  loading, it waits through `detail.waitUntil`, so no frame is captured before the GLB files
  finish loading.
- **The `onUpdate` of one paused GSAP tween on the registered timeline**: during Studio playback.

The registered timeline is the single `window.__timelines["main"]`, as the HyperFrames contract
requires.

## Why motion blur is analytic

HyperFrames captures one instant per frame, and CSS has no motion blur. The kit knows every
channel's curve, so it computes speed exactly (a central difference at 1/960 s):

- **Text**: a moving edge smears over `speed x exposure` pixels. A Gaussian with the same
  variance has sigma = 0.29 x length. Text lines get that sigma horizontally.
- **Cards and the mark**: they get it from the growth rate times their half size.
- **3D**: the canvas re-poses the scene at ten times across the shutter and averages them, so
  spinning phones blur correctly along their arcs.

The shutter is centred on the frame time, as with After Effects' default phase.

## The reverse is exact

The reference exit is not a new animation; it is the entrance played backwards. Because the kit
evaluates channels at `mirror - t`, the exit reproduces every property in reverse, including
the highlight un-drawing, the card shrinking through its overshoot, and the direction of the
motion blur. `promo-audit.mjs` checks this directly: frame(t) against frame(mirror - t).

## Fonts

- Montserrat (OFL) was identified as the reference face by overlaying renders. It is the copy
  font, subset to Latin with weights 400-800.
- Inter (OFL) stands in for the wordmark's SF-style grotesk. Both fonts ship in
  `assets/fonts/` with their licenses.
- To use a licensed brand face, add an `@font-face` in the plan's `css` that points to a font file
  inside the project, then override `.ip-line` or `.ip-word`.
- Only ever name families that are declared. When a CSS family has no `@font-face`, the
  HyperFrames compiler fetches it from Google Fonts, and that request carries the page's text.
  The kit names nothing but its bundled faces and a generic `sans-serif`.
