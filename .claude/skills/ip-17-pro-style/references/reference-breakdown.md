# Reference breakdown

This file records what was measured in the reference ad, how it was measured, and what remains
unverified. The values here set the defaults in `scripts/build-promo.mjs` (the `T`, `ROLES`,
`ADVANCE`, and layout tables), `assets/ip-kit.js`, and `assets/ip-3d.mjs`.

## Source

- Tutorial: "iPhone 17 Pro Promo Animation Tutorial | After Effects" (MotionSpark),
  https://www.youtube.com/watch?v=ALXSnlRJsgc, 15:18, 3840x2160 at 60 fps.
- The finished ad plays first: frames 0.0-8.0 s, 1920x1080 at 60 fps, full frame with no
  presentation border. The channel intro starts at 8.03 s.
- It was built in After Effects:
  - Two Sketchfab iPhone 17 Pro models, an AirPods model, and a Poly Haven HDRI in an
    environment light with cast shadows.
  - Montserrat text layers, a shape-layer highlight with Trim Paths, and a 25% black rounded
    rectangle.
  - A time-reversed duplicate precomp for the exit.
  - An Animation Composer bounce on the Apple logo, a null-parented slide, and a track matte for
    the wordmark.
  - Motion blur on every layer, in a composition trimmed to 8 s.

## Method

1. Downloaded the video and its auto-captions with `yt-dlp` into a scratch folder (never into
   the kit). The narration explains each step and many keyframe counts.
2. Extracted all 540 frames of 0-9 s. Built contact sheets at 10 fps for structure, every 3 or 6
   frames for each move, and used full frames for layout and colour.
3. Took per-frame measurements with OpenCV on the extracted frames:
   - Right edges of each text line
   - Tagline hue pixels
   - The green highlight's extent
   - The card's top edge above its centre
   - Connected components of each phone (top and bottom edges, projected width)
   - The logo lockup's ink box
4. Fitted easing curves with least squares to `cubic-bezier(x1, 0, x2, 1)`, After Effects easy
   ease with graph-editor influence, and to a dropped-ball bounce. Residuals were 0.2-2 px on
   positions and 0.001-0.006 on scales.
5. Font identification: rendered Montserrat at weights 400-800 over the hold frame and fitted
   each line's size to its ink width. The letterforms coincide, and the ink heights agree to
   about 1 px.
6. Audio: spectrogram and window RMS. This is signal analysis only; nothing here claims listening.

## Timeline (8.0 s at 60 fps)

| Time | What happens |
| --- | --- |
| 0.00-1.67 | Two phones fly in: one from above the frame, one from below. Each spins one full turn about its long axis: back, edge at 0.32 s, screen at 0.5 s, edge at 0.8 s, back |
| -0.20-1.81 | Five copy lines slide in from the left, one every 0.083 s (5 frames) |
| 1.07-1.57 | A green round-capped highlight draws left to right behind the white price text |
| 1.10-2.10 | Grey card: 0 -> 115% in 0.5 s -> 100% in 0.5 s. The AirPods pop 5 frames later and spin |
| 1.3-1.6 | As the orange phone settles, its back catches the key light and turns from orange to gold |
| 1.70/2.10-3.60 | Complete stillness. Frame-to-frame change is zero. The phones settle at 1.70 s and the card at 2.10 s; the AirPods land at about 2.18 s |
| 3.60-5.42 | The exact reverse of 0.28-2.10 (mirror time 5.70 s) |
| 5.36-5.88 | Apple logo pops at centre with a bounce |
| 5.97-6.80 | Logo slides left and the "iPhone" wordmark emerges from behind it |
| 6.80-8.00 | End card holds |

The phones' first visible frame is 0.28 s. The first 0.27 s is pure white, and so is the gap
after the exit, which the logo pop starts before (5.36 s against 5.42 s).

## Measured motion

**Products**
- Position ease: 0.00 -> 1.667 s, `cubic-bezier(0.34, 0, 0.03, 1)`. Easy ease out, then a
  100% incoming influence (RMS 0.6-1.0 px).
- The top phone starts with its bottom edge 223 px above the frame (0.206 H). The bottom phone
  starts with its top edge 174 px below the frame (0.161 H).
- Y rotation follows the same ease: a full 360-degree turn that ends with the power-button edge
  turned about 30 degrees toward camera. The front phone's edge-on frame is 0.80 s and the back
  phone's is 0.84 s.
- The spin and the ease together put the screen toward camera near 0.5 s. The reference
  screens show the orange "flow line" wallpaper and a dark lock screen.
- Rest: front (orange) phone box 1059-1384 x 112-897, back (silver) 1392-1699 x 216-986.
  Centres are (1221, 504) and (1545, 601); heights 785 and 770 px.

**Copy**
- Slide: 1.667 s, `cubic-bezier(0.69, 0, 0.10, 1)`, from 1590 px left of rest (0.83 W; the
  widest line starts 691 px off-frame).
- The stagger is 0.083 s. Starts are -0.196, -0.113, -0.029, 0.054, and 0.138 s (a joint fit
  over five lines; RMS 1.7 px).
- The price line does not slide; its highlight reveals it.
- Opacity 0 -> 1 over 20 frames, 2 frames after each line starts (narration). It is invisible
  in practice because the lines start off-frame.

**Highlight, card, lockup**
- Highlight: 1.074 -> 1.565 s, `cubic-bezier(0.31, 0, 0.68, 1)` (AE easy ease), Trim Paths end
  0 -> 100. The stroke has round caps and is 66 px tall (1.17 em of the price size). It overhangs
  the price text by 0.9 em per side. The price text is white, so it only appears where green has
  been drawn.
- Card: scale from 1.100 s: 0 -> 1.149 in 0.5 s with `cubic-bezier(0.33, 0, 0, 1)`, then
  1.149 -> 1.0 in 0.5 s with `cubic-bezier(1, 0, 0.66, 1)` (RMS 0.001).
- Logo pop: 5.363 -> 5.882 s, scale 0 -> 1. It grows as u^2.08 to full size, then rebounds to
  0.846 and settles (restitution a1 = 0.154; RMS 0.006). This is shallower than GSAP
  `bounce.out`, which dips to 0.75.
- Logo slide: 5.972 -> 6.798 s, `cubic-bezier(0.33, 0, 0, 1)`, 175 px left.
- Wordmark: the same timing, `cubic-bezier(0.35, 0, 0, 1)`. It moves 318.5 px right relative to
  the frame and is hidden left of the logo's middle.
- The final lockup is 720-1143 x 458-595. The mark is 111 x 137 px, the gap is 34 px, and the
  wordmark baseline is at 575.

**Exit**: frame(t) equals frame(5.70 - t). For example, the silver bottom edge is 795 at 0.80 s
and 790 at 4.90 s. The tagline box at 0.667 s matches the one at 5.03 s. Motion blur reverses
with it.

**Motion blur**: text lines smear horizontally to about 29 px at peak speed (3450 px/s). That
fits After Effects' default 180-degree shutter at 60 fps (1/120 s exposure). The phones and the
card blur the same way.

## Look

| Item | Measured |
| --- | --- |
| Background | #ffffff |
| Title | Montserrat 700, 78.3 px, #000, baseline 226, centred on x 570 |
| Tagline | Montserrat 500, 47.6 px, #cc7958, baseline about 298 |
| Offer lines | Montserrat 700, 56.5 px, #000, baselines 376 / 512 / 575 |
| Price | Montserrat 700, 56.5 px, white; highlight #67e172, centre y 423.5, x 277-863 |
| Card | 258 x 310 px, radius 14, #c0c0c0 (25% black over white), centred (560, 766), top 611 |
| Orange phone at rest | plateau #f9cd80, glass panel #fdffa8 (top) to #fcf299, frame #f7b06f |
| Silver phone at rest | plateau #525050, glass #898989 (top) to #b7b6b8, frame #b5b5b3 |
| Lockup | mark 111 x 137 at centre y 526; wordmark 75 px ink height |

The stack's baseline gaps are 72 (title to tagline), 78, 67 (to the price), 69, and 63 px. They
were set by eye and are kept as a table.

## Audio (signal analysis only)

- A trap-style music bed with 808 kicks and hats runs from 0.10 s and is cut dead at about
  5.40 s, as the logo pops. A short tail decays by 5.6 s.
- Near silence follows until a single broadband hit with a tonal body and an 808 at 6.05 s, just
  after the logo starts sliding. It rings out by about 7.6 s.
- No whooshes coincide with the phone moves.

## Limits

- The rest angles of the phones (about 30 and 36 degrees) are inferred from projected widths and
  the timing of the edge-on frames. The reference's third-party model is narrower than a real
  phone, so its exact angles cannot be recovered.
- The HDRI is unknown. The kit's studio environment was tuned until the rest colours, and the
  orange-to-gold glint as the phone settles, matched the frames above. It is not a physical
  match.
- The AirPods model was an animated third-party asset. The kit's open earbuds case is a
  deliberately generic stand-in.
- The measurements come from a YouTube re-encode. Colours are about ±3 levels, and anything under
  2 px is an estimate.

## Re-running this analysis

```sh
yt-dlp -f "299+140" --merge-output-format mp4 -o ref.mp4 "https://www.youtube.com/watch?v=ALXSnlRJsgc"
mkdir -p frames && ffmpeg -t 9 -i ref.mp4 -fps_mode passthrough -q:v 2 frames/f%04d.jpg   # every frame
ffmpeg -t 10 -i ref.mp4 -vf "fps=10,scale=384:-1,tile=10x10" -frames:v 1 sheet.jpg
```

This is the only step in the skill that uses the network, and it is optional. Keep downloads in
a scratch folder and never commit them. To compare a render with the
reference, stack the same timestamps side by side:

```sh
ffmpeg -i renders/<draft>.mp4 -t 8 -i ref.mp4 -filter_complex \
  "[0]fps=5,scale=384:216[a];[1]trim=0:8,fps=5,scale=384:216[b];[a][b]hstack,tile=4x10" \
  -frames:v 1 compare.jpg
```
