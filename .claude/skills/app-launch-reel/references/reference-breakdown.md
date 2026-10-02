# Reference breakdown: the "NextDue motion reel"

The reference is a 15-second promo for a bill-reminder iPhone app (`motionref.mp4` in the kit
root, 1024x576, 30 fps, AAC 44.1 kHz). Everything below was measured from the file, not
guessed: frame sheets at 10 fps and at the native 30 fps around every cut, `scdet` scene-change
scores, sampled colours, spectrograms, band-limited onset envelopes, and EBU R128 loudness. The
recipe is at the end. The skill borrows the mechanics only, never the app, its name, its icon,
or its copy.

## Why it works (the short version)

1. **It is a story, not a feature list.** Identity, then a promise, then proof, then breadth,
   then values, then the call to action. The longest scene (27% of the runtime) is the product
   actually being used, because showing beats telling.
2. **One idea per frame.** Every frame carries one sentence of at most seven words, one hero
   object, and nothing else.
3. **Everything is on a 120 BPM grid.** Feature cuts land every two beats (1.0 s), words and
   list rows stagger on sixteenths (0.125 s), and UI sounds fall on the same sixteenths.
4. **Luminance flips at every cut.** Dark, then mid (brand blue), then light (paper), then dark
   again. Each cut reads as a hit even before anything moves, so the motion can stay restrained.
5. **Transitions are motivated, and they vary.** The logo floods into an iris, a pixel stair
   wipe introduces the product, whips carry the feature montage, the light/dark wipe *is* the
   feature it shows, a focus pull slows into the manifesto, and an iris into the end card
   mirrors the opening.
6. **Nothing is ever frozen.** Phones float, ghost numerals drift, glows breathe, and the
   longest still stretch before the end card is a few frames.
7. **A persistent HUD frames the piece.** A mono chapter counter, a timecode, and a progress bar
   stay put across wildly different backgrounds. They give continuity, signal a designed
   "reel", and tell the viewer how far along they are.
8. **The palette is one blue family plus neutrals.** A single warm accent (a peach hand-drawn
   underline and circle) appears once, and success green lives only inside the UI.
9. **Every visual event has a sound.** Whooshes on transitions, pops on UI elements, typing
   clicks, a scan sweep, a success chime, a riser into a drop, and a chord that rings out.
10. **The dynamics tell the arc.** A quiet riser, a steady body, a loud drop for the manifesto,
    and a decay to silence: 6.9 LU of loudness range at -14.7 LUFS.

The energy is precise, optimistic, and premium-tech: an Apple keynote cut by a product-studio
motion designer. It is fast without being frantic, because the rhythm is musical and every
frame resolves before the next cut.

## Timeline

Cuts from `scdet` and the frame sheets. "Mid" is the frame where the incoming scene takes over.

| Chapter (HUD) | In | Out | Length | Background (sampled) | Luminance | Exit transition |
| --- | --- | --- | --- | --- | --- | --- |
| 01 / 06 Identity | 0.00 | 2.00 | 2.00 s | ink #050811, glow #0e54c4 | dark | iris from the icon, 1.85-2.00 |
| 02 / 06 Typography | 2.00 | 3.35 | 1.35 s | brand #1a76fc -> #434dd0 (135 deg) | mid | pixel stair wipe, 3.20-3.55 |
| 03 / 06 Product | 3.35 | 7.50 | 4.1 s | paper #f9f9fb, lavender haze #e7e6f6 | light | whip left, 7.40-7.65 |
| 04 / 06 Features: scan | 7.50 | 8.50 | 1.0 s | ink #050914 | dark | whip |
| Features: widgets | 8.50 | 9.50 | 1.0 s | violet #2f248d -> #090a2c | mid-dark (hue shift) | whip |
| Features: light/dark | 9.50 | 10.50 | 1.0 s | paper, then night #0d0d0d | light -> dark | whip |
| Features: languages | 10.50 | 11.45 | 1.0 s | brand gradient | mid | focus pull (defocus + push) |
| 05 / 06 Manifesto | 11.45 | 12.95 | 1.5 s | black #040606, glow | dark | iris from "nonsense" |
| End card (HUD hidden) | 12.95 | 15.00 | 2.05 s | brand radial #1657e0, rings | mid | holds |

Scene lengths 2.0, 1.35, 4.1, 1.0, 1.0, 1.0, 1.0, 1.5, 2.05: a slow build, one long proof, an
accelerating montage (with a half-length beat inside the light/dark frame), a breath, and a
resolve. Mean scene length 1.67 s; eight cuts in fifteen seconds.

## Scene by scene

1. **Identity.** A stroke icon draws itself on a radial glow (0.2-0.8 s). The check lands on the
   first big hit (0.82 s) after a riser. A thin ring pulses outward, then the wordmark rises
   letter by letter through a mask while the icon slides left to make room (1.4-1.85 s). The
   icon's interior fills to a disc, which grows with two darker echo rings and floods the frame.
2. **Typography.** An eyebrow in spaced caps sits above a two-line headline whose words rise
   through masks at 2.03, 2.17, 2.30, 2.40, and 2.57 s (a sixteenth apart). Each rise takes 4-6
   frames with vertical smear. A peach hand-drawn underline strokes under the last word
   (2.6-2.75 s), then a loose circle is drawn around one of the outlined ghost numerals
   ("03 04 05 06 07", about 300 px tall at 1080p) drifting left along the bottom. The circled
   date is the product's idea told without words.
3. **Product.** After the pixel wipe the frame is empty paper for three frames. Then a phone
   flies in from below right, rotating to about 3 degrees, trailed by stepped echo copies
   (3.5-3.75 s). Copy on the left: eyebrow, headline, sub. Four list rows pop in on sixteenths
   (3.85-4.25 s). A bottom sheet slides up, an amount is typed, a chip and Save are tapped,
   the sheet drops, a new row inserts, and the total counts up. The headline swaps (old lines
   rise out, new lines rise in). A row is swiped to "paid" (green), the total counts down,
   confetti bursts inside the screen, and a toast confirms. It is the one scene that shows the
   product working, and it gets the most time.
4. **Scan.** A receipt card with viewfinder brackets (L-shaped corners) arrives with the whip
   and lags behind the frame. A glowing scan line sweeps, fields get outlined, and two detection
   chips pop out to the right.
5. **Widgets.** A home screen of blank tiles on a gold-framed phone; a widget lifts out of the
   screen (scale up, drift up-left, bigger shadow).
6. **Light and dark.** A centred headline and three cards stagger in on paper; halfway through,
   a slanted wipe with three grey echo bands and a toggle knob flips the whole frame to dark.
7. **Languages.** An eyebrow lists the languages; four translations of one line rise on
   sixteenths.
8. **Manifesto.** Type on black only. "No account." resolves out of blur on the drop; "No
   nonsense." (soft blue #83afff) resolves one beat later on a second hit; a sub line and three
   pills ("100% offline", "Private by design", "Zero tracking") pop in.
9. **End card.** The icon pops with overshoot, the wordmark rises, then the tagline and a URL
   pill. Concentric rings expand slowly; the HUD is gone. It holds for about 1.4 s.

## Frame types

Nine layouts recur; the skill implements each as a scene type
([frame-types.md](frame-types.md)).

| Frame | Layout | Used for |
| --- | --- | --- |
| Identity | Centred mark, glow, HUD; lockup forms left-right | Opening |
| Statement | Centred two-line headline, eyebrow, ghost numerals, hand-drawn annotation | The promise |
| Product | Copy left (eyebrow, H2, sub), live phone right | Proof |
| Scan | Copy left, object in viewfinder brackets with detection chips | A capture/AI feature |
| Device pop | Copy left, phone right, a card lifts out of the screen | Widgets, notifications |
| Stack | Centred headline over three UI cards, optional theme flip | A UI component or setting |
| Lines | Centred eyebrow and a stack of short lines | Languages, integrations, lists |
| Manifesto | Type only on black, two-tone lines, pills | Values |
| End card | Mark, wordmark, tagline, URL pill, rings; no HUD | Call to action |

## Type and chrome (scaled to 1920x1080)

- **Display:** a tight neo-grotesk (SF Pro Display / Inter Display class) at 700-800 weight,
  tracking about -0.045 em, line height about 1.0. Statement headline about 135 px, split-copy
  headline about 84 px, manifesto about 146 px, wordmark about 112 px.
- **Eyebrows:** 18-19 px, 600 weight, 0.2-0.25 em tracking, caps; blue-grey on paper, soft
  white on colour.
- **Sub copy:** 30 px regular, grey on paper, 66% white on colour.
- **HUD:** monospaced caps at about 15 px, 0.16 em tracking. Top left "● BRAND / MOTION REEL
  2026"; top right "03 / 06 — PRODUCT"; bottom left a running timecode; bottom right a 260 px
  progress bar. It inverts to dark on light frames.
- **Phone:** about 85% of frame height, centred at about 72% of the width, 3-4 degree tilt,
  soft long shadow.

## Motion measurements

| Move | Measured |
| --- | --- |
| Word rise | 4-6 frames through a clip mask with vertical smear; stagger 0.13 s (a sixteenth at 120 BPM) |
| Wordmark | letter-by-letter rise, about 0.03 s apart, while the mark slides left |
| Ring pulse | about 0.9 s, scale up and fade from about 0.5 opacity |
| Iris | about 0.2 s disc growth with two echo rings leading the edge |
| Pixel stair | 8 columns falling top to bottom in steps, staggered left to right, about 0.35 s; each leading edge has three tint bands |
| Whip | about 0.25-0.3 s push with heavy horizontal blur; the incoming hero lags and settles |
| Theme wipe | about 0.25 s slanted edge (about 18 degrees) with three grey echo bands and a knob |
| Focus pull | about 0.2 s: outgoing blurs and pushes in, incoming resolves from blur |
| Phone entry | about 0.25 s from below with 3 stepped echo copies (AE Echo look), slight overshoot |
| Idle | phones drift a few px and a degree; glows breathe; numerals drift about 40 px/s |

## Sound design

- **Bed:** four-on-the-floor house/electro at exactly 120.0 BPM. Kicks at 0.82 + 0.5 n s.
- **Transitions:** broadband whooshes that swell for about 0.2 s and peak at 1.85, 3.34, 7.35,
  8.35, 9.35, 9.85, 10.35, 11.31, and 12.81 s. Each peak is on the kick grid, 0.1-0.15 s ahead
  of the picture change: the sound leads the picture.
- **UI:** short descending pitched pops (about 1300 -> 600 Hz, about 80 ms) on every row, chip,
  tap, pill, and the URL (3.85, 3.98, 4.10, 4.25, 5.4, 5.65, 6.15, 12.4-12.6, 13.5 s). Typing
  clicks run under the amount entry (4.6-5.3 s). A pitched sweep plays under the scan
  (7.5-8.0 s), and a stacked-partial success chime sounds on "paid" (6.8-7.6 s).
- **Structure:** a riser (150 -> 400 Hz) runs into the first hit at 0.82 s. Before the
  manifesto a second riser plays (11.0-11.3 s) while the bed's low end drops out for about
  0.2 s. A sub impact lands on "No account." (11.35 s) and a second one on "No nonsense."
  (11.85 s). A chord blooms on the end card (13.0 s) and decays to silence by 14.6 s.
- **Level:** -14.7 LUFS integrated, 6.9 LU range, nearly mono (L/R correlation 0.97). In
  0.5 s windows the body sits around -19 dB RMS, the drop around -7 dB, and the tail falls to
  -36 dB.

## How it compares with the skill's demo

`reel-audit.mjs` run on the reference with the demo's grid (only the format check fails, since
the reference is 1024x576):

| Check | Reference | Demo render |
| --- | --- | --- |
| Picture change across each cut | 94, 112, 194, 52, 189, 106, 114, 99 | 107, 108, 192, 49, 192, 116, 119, 112 |
| Mean luma per scene | 18, 103, 230, 43, 37, (dark), 102, 18, 87 | 10, 103, 227, 42, 36, 157 (mid-flip), 100, 15, 97 |
| Loudness / range / true peak | -14.7 LUFS / 6.9 LU | -14.5 LUFS / 4.9 LU / -2.9 dBTP |
| Kick grid vs cuts | kicks on 0.345 + 0.5 n (beat-grid.mjs) | kicks 0 ms from the cut grid |

## How it was measured

```sh
ffprobe -v error -show_entries format=duration:stream=codec_type,width,height,r_frame_rate motionref.mp4
ffmpeg -i motionref.mp4 -vf "scdet=threshold=5" -f null - 2>&1 | grep scdet        # cut times
ffmpeg -ss 0 -t 3 -i motionref.mp4 -vf "fps=10,scale=320:-1,tile=5x6" -frames:v 1 sheet0.png
ffmpeg -ss 7.35 -t 0.4 -i motionref.mp4 -vf "scale=340:-1,tile=4x3" -frames:v 1 whip.png   # 30 fps around a cut
ffmpeg -i motionref.mp4 -lavfi "showspectrumpic=s=1500x600:scale=log:fscale=log" spec.png
ffmpeg -i motionref.mp4 -af ebur128=peak=true -f null -                              # loudness
node .claude/skills/app-launch-reel/scripts/beat-grid.mjs motionref.mp4 --to 15         # tempo and phase
```

Colours were sampled as 8x8 means with ffmpeg rawvideo output. Onsets came from band-limited
envelopes (below 150 Hz for kicks, above 4 kHz for whooshes) at 100-200 frames per second.
