# After Effects to HyperFrames

How each technique in the reference maps onto HTML, CSS, SVG, and GSAP in this kit.
Kit names refer to `assets/wm-kit.css` (classes) and `assets/wm-kit.js` (`WM.*`).

## Mapping

| After Effects / Premiere | HyperFrames implementation | Kit |
| --- | --- | --- |
| 1080x1920 composition | Scene sub-composition `data-width="1080" data-height="1920"` | `build-reel.mjs` |
| Solid + 4-Color Gradient at 50% over white | Four corner `radial-gradient` layers over a base colour (pre-mixed with white) | `.wm-bg-grad`, `--wm-c1..4` |
| Rough texture, Color Burn | Near-white fractal noise multiplied in (true color-burn crushes in CSS) | `.wm-bg-rough` |
| Shadow texture at 35% | Blurred blind stripes plus a diagonal band, multiply, angle varied per scene | `.wm-bg-blinds`, `--wm-blind-angle` |
| Hue/Saturation (desaturate, darken) | `filter: grayscale() brightness() contrast()` on the object image | object `desat`, `brightness` |
| Black silhouette + CC Radial Fast Blur (cast shadow) | Nine silhouette copies (`brightness(0) blur()`) scaled about an off-object light point, fading outward | `WM.prepare`, `light`, `shadow` |
| Layer style: Inner Shadow | Inline SVG filter: inverted alpha, blurred, clipped to the alpha, flooded black | `#wm-<scene>-inner`, `inner.size/opacity` |
| Halftone texture, track matte, multiply 50% | Dot `radial-gradient` pattern, `mask-image` = the object PNG intersected with a density gradient | `.wm-obj-tone` |
| Text + Gradient Ramp | `background-clip: text` with a vertical `linear-gradient`, transparent fill | `.wm-hero`, `.wm-small`, `.wm-script`, `.wm-ghost` |
| Transform + Gaussian Blur "pop-up" keys | `fromTo` opacity 0, y +27, `blur()` to rest, power3.out | `WM.pop` |
| Layer delays | Each word revealed at its transcript onset minus two frames | `match` / `at` in the plan |
| Object scale/rotation keys, fast-to-slow | `fromTo` scale/rotation over the whole scene, power4.out | `WM.objectIn` (`settle`, `counter`) |
| Object position keys from below | `fromTo` y over the whole scene, power4.out | `WM.objectIn` (`rise`) |
| Edge objects with position/rotation keys | Linear `fromTo` x/y/rotation for the whole scene | `WM.drift`, `depth[]` |
| Drop Shadow + Gaussian Blur on edge objects | `filter: ... drop-shadow() blur()` on the prop image | `depth[].blur` |
| Shape layer with gradient stroke + Trim Paths | SVG path with a gradient stroke, `stroke-dashoffset` draw-on | `.wm-stroke`, `WM.draw` |
| Gradient rectangle rising | Absolutely positioned gradient div, multiply, halftone overlay, `fromTo` y | `.wm-panel`, `WM.panelIn` |
| Adjustment layer Transform 140 -> 110 + blur 30 -> 0 | One camera wrapper around the scene, scale and `filter: blur()` keyed | `.wm-cam`, `WM.camIntro` |
| Position shift + blur between scenes | Outgoing camera x +45 and blur (power2.in); incoming from x -55 and blur (power2.out) | `WM.camPushOut`, `WM.camPushIn` |
| CC Vignette | Radial multiply overlay above the camera | `.wm-vignette`, `--wm-vignette` |
| Gaussian blur through an inverted feathered ellipse mask | `backdrop-filter: blur()` with a radial `mask-image` | `.wm-edgeblur`, `--wm-edge-blur` |
| Noise 10% | Grey fractal noise tile, overlay blend, offset re-rolled on each posterized frame (seeded) | `.wm-grain`, `WM.grain` |
| Posterize Time 12 | The scene timeline is private; the registered timeline tweens its `time` with `steps(n)` | `WM.posterize` |
| Premiere captions, Transform preset (fade + rise) | Timed caption clips in a captions sub-composition, `fromTo` opacity/y/blur | `compositions/wm-captions.html` |
| Removal.ai / remove.bg | Apple Vision foreground instance mask, trimmed to alpha | `cutout.swift`, `fetch-object.mjs` |
| Google Images | Wikimedia Commons search filtered to public domain and CC0, with provenance files | `fetch-object.mjs` |

## Why posterize is a wrapper

HyperFrames seeks each registered timeline to the exact frame time. Quantizing inside the scene
keeps that contract and stays deterministic:

```js
var inner = gsap.timeline({ paused: true });   // all scene tweens go here
// ... WM.camIntro(inner, cam, 0); WM.pop(inner, word, 0.42); ...
window.__timelines["wm-<scene>"] = WM.posterize(inner, duration, 12);
```

`WM.posterize` returns a paused timeline holding one tween of `inner.time` from 0 to the scene
duration with `ease: "steps(round(duration * 12))"`. Seeking it to any frame lands the inner
playhead on the previous 1/12 s step, so every element, blur, and grain offset holds for two
or three frames exactly like Posterize Time.

## Gotchas found while building

- **Ship the fonts.** The compiler embeds Google fonts it discovers, but families used only
  through CSS variables inside timed scenes were missed in some renders while snapshots
  looked right, so hero words fell back to a default sans. The kit bundles the OFL files in
  `wm/fonts/` and declares them with `@font-face`. Always check fonts in the rendered MP4,
  not only in snapshots.
- **Dense keyframes.** A source with keyframes 8 s apart made the compiler warn about seek
  failures. Re-encode the cut with `-g 30 -keyint_min 30` first.
- **Texture SVGs must be base64.** A `utf8` SVG data URI inside a stylesheet had its internal
  `url(#filter)` rewritten by the asset pipeline, so the noise rectangle rendered unfiltered
  black and multiplied the whole scene to charcoal. Base64 URIs are left alone.
- **Sub-composition asset paths are project-root relative** (`assets/...`, `wm/...`). Lint
  rejects `../` paths even though some older examples use them.
- **Fit text against the element's own box.** `scrollWidth` includes padding; comparing it to
  the nominal width shrank every word to the minimum. `WM.prepare` compares with
  `clientWidth`.
- **`hyperframes remove-background` is for people.** It returned fragments of every object
  tested. Apple Vision's foreground mask lifted all of them cleanly.
- **Objects with several instances** (a camera beside a book) need `--instance N`.
- **Colour-burn** in CSS behaves far harsher than the After Effects texture look; the kit uses a
  near-white multiply instead.
- **Blur units:** After Effects "Blurriness" 30 matched CSS `blur(12px)` by strip comparison
  (`WM.aeBlur` = 0.4x).

## Using the original fonts

Coolvetica and Edwardian Script ITC are commercial or separately licensed. If the user owns
them, copy the files into the project (for example `assets/fonts/`) and override the tokens
after `wm/wm-kit.css` through the plan's `css` field:

```json
"css": "@font-face{font-family:'Coolvetica Hv Comp';src:url('assets/fonts/coolvetica-hv-comp.otf')} @font-face{font-family:'Edwardian';src:url('assets/fonts/edwardian.ttf')} :root{--wm-font-hero:'Coolvetica Hv Comp';--wm-font-script:'Edwardian'}"
```

Scene type then renders with those files; captions follow `--wm-font-text`.
