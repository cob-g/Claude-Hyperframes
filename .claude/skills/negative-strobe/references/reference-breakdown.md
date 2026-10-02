# Reference breakdown

The reference is an 81.0 s vertical tutorial reel: 1440x2560, 24 fps, AV1 with stereo AAC at
44.1 kHz. A creator answers the comment "What is this effect called" by rebuilding the effect in
DaVinci Resolve. The screen recording sits on top, the creator at his desk below, with one-word
captions between them. Every number below was measured from the file. The measuring commands are
at the end.

The reel shows the style twice:

- **The posted edit** (1.9-4.75 s): the finished piece the comment was about, filmed off a
  monitor. 68 frames of it are visible. The Resolve timeline is 8 s 9 frames long at 24 fps.
- **The tutorial's result** (78.85-79.45 s): the five clips he just cut and graded, played once in
  the viewer. 17 states in 17 frames, then black. This is a clean screen recording, so it is the
  ground truth for the look.

**The skill reproduces the edit**: the grade, the flip, the frame-level cut, and the pacing. It
does not build the tutorial around it (the split screen, the captions, the Resolve interface).

## What he teaches

In his words and order:

1. Put a bunch of clips on the timeline and keep each one short: "these are actually pretty long
   videos so I just grab a very short snippet of them".
2. "All we really have to do is cut by one frame." From each clip take three pieces of one frame
   each.
3. For motion, leave a gap between the pieces: "cut one frame, cut two frames, cut one frame, cut
   two frames, cut one frame." Keep one, drop two. Three kept frames then span seven source
   frames.
4. Put the kept pieces together. His five clips make a 17-frame timeline (the jump keeps five
   frames).
5. On the colour page, "each clip is gonna be different":
   - The first piece is black and white, with the highlights overexposed "so it's blown out" and
     the shadows "a lot darker". His curve is a steep S: the shadow point sits near (0.47, 0.19)
     and the highlight point near (0.79, 0.98). The steep part falls in the empty gap of the
     histogram, between the dark hump and the bright one. "I'm gonna go pretty exaggerated because
     I want it to be very obvious."
   - The next piece is "the same but ... an inverted clip": the same grade with the colours
     inverted.
   - Copy that pair across every clip.

He calls the result a "crazy glitch transition". It is a transition in the tutorial, 0.7 s long.
The posted edit uses the same grammar for all of its 8 seconds.

## Why it is so good

### Design

1. **Two tones.** The picture has no colour at all: mean chroma is 0.0-0.1 of 255. Black is 0
   and white is 251-255. In the hard frames 70-90% of the pixels are one or the other. Colour,
   skin tone, white balance, and exposure differences between cameras all disappear. A night
   street, a studio macro, and a mountain at noon become the same material, so any footage cuts
   with any other.
2. **The curve does the cutout.** Blowing out the highlights erases the sky and the background
   into paper. Crushing the shadows merges a dark jacket, trousers, and hair into one shape.
   What is left is a silhouette on empty ground, which is what a rotoscope would have produced,
   for free and on every frame.
3. **A frame reads in one glance.** A shape on a blank ground is the fastest image there is to
   read: a stencil, a photocopy, a screenprint, a logo. At one frame per image (42 ms) a normal
   photograph is noise. A silhouette still registers. The grade is what makes the speed legible.
4. **The negative is the same image.** Inverting flips every pixel and moves no edge. Measured on
   the result, a frame and its negative correlate at -0.84 to -0.98, and the mean pixel changes by
   0.74-0.84 of the full range. A cut between two different clips changes less (0.3-0.6). So the
   flip is the largest change a frame can make, and the composition does not move at all. The eye
   gets the hit of a cut and keeps the subject.
5. **Marks, not captions.** The edit has no titles. The brand is in the footage: lettering on a
   jacket, a round patch on a sleeve. Under this grade a logo on fabric becomes a clean stamp, and
   it flips to its own negative like everything else.
6. **Texture from the threshold.** A hard curve turns film grain and fine pattern into specks at
   the edge of a shape. A chain-link fence becomes a halftone, city lights become a dot grid, and
   a blurred close-up keeps a ragged edge. It looks printed, not filtered.

### The frames it uses

Every frame in both playbacks is one of these:

| Frame | What is in it | Why it earns a slot |
| --- | --- | --- |
| Silhouette | A figure against sky or water, backlit, whole body | The cleanest two-tone image; reads in one frame |
| Faceless portrait | A masked or turned-away head and shoulders, tight | A person without an identity; lights behind become dots |
| Mark | Lettering or a logo on a garment, macro | The brand as a stamp; the only "text" in the edit |
| Texture | Fabric folds or a crumpled surface, macro, no subject | Abstract black and white shapes; a rest for the eye between figures |
| Action | The peak pose of a jump or a stride, mid-air | Movement; three kept frames with gaps play it as a flipbook |
| Negative | Any of the above, inverted | The flash; the same shape as light on dark |
| Grey breath | The same shot with its mid-tones left in | One soft frame makes the hard ones around it look harder |
| Black | Nothing, for two frames | Punctuation: the strobe stops, then hits again |

Blur is used as a step, not a move: the patch shot is soft for two frames and sharp for two. So is
scale: a walking figure grows across four frames in jumps. Nothing glides.

### Pacing

- **The tutorial's burst:** 17 states in 17 frames (0.71 s), so 24 changes a second.
  - Four clips give three frames each and the fifth gives five.
  - Inside a clip the pieces alternate positive and negative. Clips start on either.
  - An odd count ends a clip on the polarity it began with, so the clip blinks once and is gone.
  - The mean luminance swings between 0.22 and 0.72 on consecutive frames.
- **The posted edit:** about 24 states in the 2.83 s that are visible, 8.5 a second.
  - From 3.21 s to 4.71 s the changes sit on a four-frame grid (6 a second), with pieces of two
    and three frames where it speeds up.
  - There are 6 full inversions in 2.75 s and one two-frame black.
- **Frames inside a hold are frozen.** Consecutive frames in a hold correlate at 1.00. Motion
  comes from the gap between one piece and the next, not from playback. It is closer to a slide
  projector than to video.
- **A clip returns with the action further on.** The jumper appears eight times in 1.2 s:
  standing, in the air, in the air inverted, standing again, reframed, inverted hard, in the air,
  landing.
  The polarity flips while the story advances, so the flicker reads as the transition and the
  jump still reads as a jump.
- **Counted in frames, not beats.** The cut grid is 4 frames (0.167 s). The track's tick grid is
  0.1155 s. They do not divide. The cut is made by frame count, as the tutorial says.

The speed is above what anyone can read as content. Eight images a second is rhythm; the content
is whatever the eye catches. That is why the frames have to be simple, and why the grade comes
before the cut.

### Sound

Only the posted edit has sound: 3.08 s of its track play under the opening. The tutorial's result
plays silent. So the tutorial teaches no sound design, and the track does all of it.

- **Loud and flat:** -9.0 LUFS integrated, sample peaks at 0.0 dBFS, crest factor 7 dB.
- **A wall of sub bass:** 92% of the energy is below 150 Hz (11% under 30 Hz, 60% at 30-60 Hz,
  22% at 60-150 Hz). The spectral peak is at 33 Hz. Mids from 500 Hz to 2 kHz hold 1.3%.
- **Nearly mono:** L/R correlation 0.99.
- **A fast tick on top:** high-band onsets repeat every 0.1155 s, which is sixteenth notes at
  130 BPM (8.7 a second). Peak-picking finds about 16 a second, so there are onsets between the
  sixteenths too.

Why that pairing works:

- The picture is all transient and no sustain: hard edges, hard cuts, full-range flips. The bass
  is all sustain. One layer hits and the other holds, so the sum feels heavy instead of busy.
- The tick layer is dense enough that every cut has a sound near it. With a tick every 116 ms, no
  cut can be more than 58 ms (1.4 frames) from one. A cut made by frame count still feels synced.
- There is almost nothing between 500 Hz and 2 kHz, where a voice would sit. The edit has no
  voice, no captions, and no faces. Picture and sound both leave the middle empty.

See [sound-design.md](sound-design.md) for how the skill builds this.

### Energy

- **Cold.** No colour, no faces, no words. The subjects are shapes and brand marks.
- **Aggressive but controlled.** The strobe is violent, and every frame under it is a composed,
  static image. The control is what separates it from a random glitch pack.
- **Confident.** It shows each image for a twelfth of a second and trusts it to land.
- **Physical.** Bass under 60 Hz and full-screen luminance flips are felt as much as seen.

It suits fashion, streetwear, outdoor and sports brands, music, nightlife, and any teaser that
sells a mood instead of explaining a product. It does not suit anything that must be read,
anything that needs a face, or any audience that should not be shown flashing images.

## Flashing

A positive frame followed by its negative is a full-screen flash, and at one frame each that is 12
flashes a second. Accessibility guidance (WCAG 2.3.1) puts the limit for general flashes at three
a second. The style is over that limit by design. Keep strobe runs short, break them with holds
and black, and post with a flashing-images warning. The audit reports the flash rate.

## What the skill adds

These are choices, not measurements:

- **Auto pivot.** He sets each curve by eye. The builder finds the split between shape and ground
  (Otsu's threshold over the frames in use) and places the S-curve there. A probe sheet shows the
  result at three pivots.
- **Three bands** for one curve: `stamp` (a near threshold), `ink` (his exaggerated S), `soft`
  (the grey breath).
- **Grain before the curve,** so edges break into specks on clean digital footage too.
- **Grid bursts.** A track's sixteenth is rarely a whole number of frames, so `"on": "grid"`
  starts each clip of a burst on the frame nearest its step. `"to"` holds an item to the next
  beat or bar, so a burst starts on one.
- **A light effects layer** under the track, each sound far below the bed.
- **A type card,** black on white or its negative, for work that needs a name at the end. The
  reference has none.

## Measuring it again

```sh
# every frame of the result, viewer only
ffmpeg -ss 78.85 -t 0.62 -i ref.mp4 -vf "crop=600:1090:835:50,scale=390:-1,tile=5x1" -fps_mode passthrough end%02d.png
# every frame of the posted edit, off the monitor
ffmpeg -ss 1.875 -t 2.92 -i ref.mp4 -vf "crop=420:760:590:500,scale=180:-1,tile=12x2" -fps_mode passthrough open%02d.png
# the timeline's timecode, frame by frame (it advances one frame per frame: a 24 fps timeline)
ffmpeg -ss 2.875 -t 1.9 -i ref.mp4 -vf "crop=200:44:850:486,scale=500:-1,tile=4x12" -fps_mode passthrough tc.png
# loudness of the posted edit's sound
ffmpeg -ss 1.66 -t 3.08 -i ref.mp4 -af ebur128=peak=true -f null -
# its bass share, tick rate, and tempo
ffmpeg -ss 1.66 -t 3.08 -i ref.mp4 -vn edit.wav && node .claude/skills/negative-strobe/scripts/track-fit.mjs edit.wav --len 2.5
# what he says, with timings (local whisper.cpp)
npm run transcribe:local -- ref.mp4
```

Per-frame correlation, luminance, and band shares came from a short numpy script over raw frames
and samples piped from ffmpeg. `strobe-audit.mjs` checks the same things on a render.
