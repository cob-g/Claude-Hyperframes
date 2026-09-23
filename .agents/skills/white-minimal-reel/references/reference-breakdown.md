# Reference breakdown

What was measured in the reference edit, how, and what stays unverified. Values here set the
defaults in `assets/wm-kit.css`, `assets/wm-kit.js`, and `scripts/build-reel.mjs`.

## Source

- Tutorial: "How to Edit Viral White Minimal Reels in 2026" (Video Editing channel),
  https://www.youtube.com/watch?v=mQSYjBcosTs, 27:26, 1920x1080, 30 fps.
- The finished 9:16 reel appears near the end (about 26:16-26:53) inside a phone-shaped frame
  (450x800 px of the 1080p video, x 735, y 140). A glowing border belongs to that frame, not
  to the edit. The first 45 seconds show fragments of the same reel.
- The tutorial builds the animation scenes in After Effects and finishes captions in Premiere.
  The narration describes each effect and many parameter values; the frames confirm them.

## Method

1. Downloaded the video and auto-captions with `yt-dlp` into a scratch folder (never into
   the kit), cropped the reel to its own file, and read the tutorial captions for technique.
2. Contact sheets at 2 fps for structure, 10 fps sheets per scene for motion, and full-size
   frames for colour, type, and layout.
3. Frame-difference cadence on the reel (downscaled grey frames, mean absolute difference)
   to separate posterized scenes from full-rate footage.
4. A sharpness series (neighbour-pixel gradient energy) across each cut to time the blur
   settles, and pixel sampling for palette and title gradients, including the gradient
   colour swatch visible in the After Effects effect panel.
5. A font line-up render comparing free candidates against the reel's letterforms.
6. Audio: band energy around each cut (signal analysis only; nothing here claims listening).

## Structure of the example reel (37 s)

| Time in reel | Content |
| --- | --- |
| 0.0-2.4 | Face, close crop; hook caption accumulates word by word in a stacked layout |
| 2.4-6.4 | Scene: central organ object, concept title above it, faint script behind, small line below |
| 6.4-9.8 | Scene (blur push from the previous): object bleeding off the right edge, left text stack |
| 9.8-13.4 | Face, single-phrase captions |
| 13.4-16.3 | Scene: object in the centre over a giant grey ghost word; hero words flank it |
| 16.3-21.5 | Face, single-phrase captions |
| 21.5-24.9 | Scene: object rising from the bottom in front of a dark rising panel; stacked title on top |
| 24.9-28.8 | Scene (blur push): corner objects, two text clusters, a crisp curved line drawing on |
| 28.8-37.0 | Face with a tighter crop, single-word captions |

Scenes run 2.9-4.0 s. Animation covers about 48% of the reel. Four of five scene entrances
from footage are hard cuts into a settling camera; one scene-to-scene join is a blur push.
Scene-to-face returns are hard cuts.

## Measured motion

- **Posterize:** inside scenes, frame differences follow a hold-step cadence of 2 and 3
  frames at 30 fps (12 unique frames per second). Footage changes every frame except the
  source's own 25-to-30 fps duplicates. The tutorial applies Posterize Time 12 to the
  animation compositions only.
- **Scene settle:** first frame of a scene is heavily blurred and enlarged; sharpness climbs
  for about 0.8-1.2 s. The tutorial keyframes an adjustment layer from 140% scale and blur 30
  to 110% and sharp, with an ease that starts fast and ends slow.
- **Blur push:** the outgoing scene loses sharpness over about 0.5 s with an accelerating
  drift (position 540 -> 585 px, blur to 30); the incoming scene starts 55 px left and blurred
  and settles over about 0.8 s (position 485 -> 540 px).
- **Word pop:** about 0.4-0.6 s. The panel shows a 27 px rise (position 987 -> 960), opacity
  from 0, and blur from 15, all eased fast-then-slow, with layers delayed to follow speech.
- **Objects and panels** keep easing until the cut, so a posterized scene never fully freezes.
  Edge props drift with linear position and rotation keys across the whole scene.

## Look

- Paper background after grading: about #a89685 (warm) to #867d75 (cool) in mid areas, with
  darker corners. Built from a four-colour gradient sampled from the footage at 50% over
  white, a rough texture in colour burn, and a shadow texture at 35%.
- Hero gradient: start swatch #917535 in the effect panel; rendered tops about #74592a and
  bottoms about #3c2d0f after the finishing passes.
- Objects: desaturated and darkened (Hue/Saturation), a black silhouette copy with a radial
  zoom blur (amount 69-94) from a corner point at 50-65% opacity as the cast shadow, an inner
  shadow (size 20-73), and a halftone texture track-matted to the object at 50% multiply.
- Edge props: the same desaturation, a soft drop shadow, a Gaussian blur, and an inner shadow.
- Finishing adjustment layers: CC Vignette (angle of view 30), Gaussian blur 30 through an
  inverted feathered ellipse mask (feather 200), Noise 10%, Posterize Time 12.
- Accent strokes: a hand-drawn path with a very wide gradient stroke (black to dark grey) at
  25% opacity, multiply, trim-path draw-on, and a Gaussian blur so it reads as a shadow; a
  zigzag version eased in and out; and a thin, opaque, lightly blurred curve.

## Type

The reference uses Coolvetica Heavy Compressed for hero words, Coolvetica Regular for small
lines, Edwardian Script for special words, and Premiere captions (80 px, single line, at most
2 s per caption). The captions on screen render in the same compact retro grotesk. Free
stand-ins were chosen by rendering candidates beside the reel's letterforms:

- Anton for the heavy compressed face (closest weight and width; League Gothic and Bebas are
  too narrow, Oswald too wide).
- Familjen Grotesk 600 for small lines and captions (compact, tight, similar terminals).
- Pinyon Script for the formal script (Parisienne is the next closest).

## Captions

Off-white (#efe9e2 region), about 80 px, centred near y 1370 (71% of the height). The hook
builds a stacked block: content words large, function words small, rows offset left and right.
Later captions show one to three words, rise and defocus in, and swap without exits.

## Audio (signal analysis only)

No strong broadband transients coincide with the scene cuts, so there is no evidence of a
whoosh on every transition. Energy below 120 Hz sits about 5-8 dB higher during animation
scenes than during face sections, consistent with a low music bed or swell under the
animated parts. The tutorial mentions music and sound design without details. Treat both as
inferences and choose sound by listening.

## Limits

- The reel is only 450x800 inside a YouTube re-encode, so small type sizes and textures are
  estimates. Blur equivalence between After Effects "Blurriness" and CSS `blur()` was matched
  by eye from strips (CSS px = 0.4 x AE value), not measured optically.
- The motion audit reads the reference at 12-17 unique frames per second because the glowing
  presentation frame adds motion; a clean render reads 12.

## Re-running this analysis on another reference

```sh
yt-dlp -f "bv*[height<=1080]+ba/b" --merge-output-format mp4 -o ref.mp4 <url>
ffmpeg -ss <start> -t <dur> -i ref.mp4 -vf "crop=<w>:<h>:<x>:<y>" reel.mp4      # isolate the reel
ffmpeg -i reel.mp4 -vf "fps=2,scale=225:400,tile=10x3" sheet_%02d.jpg            # structure
ffmpeg -ss <cut-0.1> -t 1 -i reel.mp4 -vf "fps=10,scale=180:320,tile=10x1" strip.jpg  # one transition
```

Keep downloads in a scratch folder; do not commit them. Then run
`scripts/motion-audit.mjs` with a small plan that lists the reference scenes to measure its
cadence the same way as your render.
