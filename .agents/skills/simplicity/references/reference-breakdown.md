# Reference breakdown

The reference is a 10.35 s vertical edit-breakdown reel: 720x1280, 24 fps, H.264 with stereo
AAC at 44.1 kHz. A creator shows their own birthday-vlog edit, a 16:9 film, inside a static
"EDIT / TIMELINE / BREAKDOWN" sheet. Every number below was measured from the file. The measuring
commands are at the end.

**The skill reproduces the film only**: its grade, pacing, tricks, title, and sound. The sheet
around it is the creator's presentation layer. It is described briefly at the end of the next
section, and it is not built.

## Why the film feels clean and expensive

1. **Premium footage treatment.**
   - Contrast is high: p1 luma is 1-8 and p99 is 250-255, so the blacks are crushed.
   - The highlights are cream (253, 255, 237) and the shadows are cool (9, 10, 13).
   - Mean saturation is 0.2-0.4 on neutral scenes and 0.7 on the warm café shots.
   - The look is warm and filmic, not "phone video".
2. **Composed shots.** Wide establishing shots, a low angle on the stairs, and window light in a
   café make each shot a composed photograph. The camera is locked off or gimbal-smooth, so
   151 of 248 frames are near duplicates of the frame before. The stillness is what makes the
   one-frame tricks read.
3. **Tricks that get out of the way.** Every effect lasts 1-5 frames, then the picture holds.
   Nothing lingers, and nothing is decorative: each trick either previews the next shot or points
   at the subject.
4. **One typographic element.** A small extended-type title (two blocks, a kicker over a wide
   word) enters with a few frames of jitter and then holds still for the whole film. The subject
   walks in front of it. There are no captions, lower thirds, or stickers.
5. **The music leads.** One song, no effect louder than it, and a cut that follows its
   arrangement (see "Sound design").

### The presentation around it (not reproduced)

The reel places the film in a still sheet:
- White grid paper and a heavy grotesk masthead.
- A condensed label line naming the technique on screen, for example "STUTTER EFFECT", 12 labels
  in 10 s.
- A screenshot of the Final Cut timeline with a moving playhead.
- Two credits.

The sheet never moves, so the busy film inside reads as controlled, and the timeline proves the
work is real. It makes a good "how I edited this" post, but it is packaging, not editing style.
The skill leaves it out; the film carries the style on its own.

## The edit (frame by frame at 24 fps)

The window's picture changes at these frames (scene score > 0.45):
17, 19, 21, 23, 25 | 44 | 52-56 | 68 | 83 | 102, 103, 106 | 131 | 141 | 156 | 166 | 176 | 186 | 193 | 213.
In total there are 30 picture changes in 10.35 s. 151 of the 248 frames are near duplicates of the
frame before, because the footage is mostly locked-off or gimbal-smooth.

| Frames | Label (starts at) | What happens |
| --- | --- | --- |
| 0-16 | TITLE ANIMATION (0) | Low-angle stairs shot. The "BIRTHDAY" and "VLOG" title blocks each enter with 3 one-frame position jumps (large, medium, home) and a per-letter flicker over about 8 frames. The kicker lines ("JUNE 13", "DJI POCKET 3") arrive 2 frames later. "++" marks sit outside each word |
| 17-26 | 1 FRAME CLIPS (17) | Five 2-frame clips: a food table, a sign, a street, a crowd, a plate |
| 27-43 | SUBJECT FLICKER GLOW (30) | Table top-down. Objects light up white with bloom, one to two frames each, hopping between the plates |
| 44-51 | – | Cut to a medium two-shot at the table |
| 52-67 | STUTTER EFFECT (52) | Selfie two-shot. Five consecutive frames alternate between two takes (a jump each frame), then it settles |
| 66-82 | CUT OUT TRANSITION (66) | Selfie. The next shot's subjects appear cut out in place, over the title, 2 frames before the cut at 68 |
| 79-86 | CUT OUT TRANSITION 2 (79) | The same move again, faster |
| 87-130 | NEEKO TILE EFFECT (87) | Rectangular tiles of the next shot (the PASEO sign) cover the selfie in a seeded order over about 18 frames. Some tiles flash cream for a frame. The coverage climbs to full |
| 117-121 | STUTTER EFFECT (117) | A second stutter, inside the tile sequence |
| 131-154 | SUBJECT FLICKER 5X (140) | Café counter, then the pair at the counter. The subject glows on alternate frames, five times |
| 155-163 | CUT OUT TRANSITION (155) | A cutout into the menu-board POV |
| 164-190 | GLOW + CUTOUT TRANSITION (164) | Glowing cutouts, then the POV hand on the menu, and the woman with a drink |
| 191-217 | CUTOUT TRANSITION (191) | A cutout into the long café wide |
| 218-247 | STUTTER TELEPORT EFFECT (218) | Locked café wide. The man blinks in and out against a clean plate of the same shot, then stays |

What makes the pacing feel expensive:

- **Front-loaded density.** In the first 2 s there are 10 picture changes and 3 labels. In the
  last 3 s there are 3 changes. The piece opens hot, then gives the eye a long locked wide to
  read the "teleport" gag.
- **Micro-duration contrast.** 2-frame clips sit next to 20-40 frame holds. Nothing is
  medium-length, so every cut feels deliberate.
- **Effects are motivated by the picture, not by a metronome.** Fitting the cut times to a
  sixteenth-note grid scores no better than chance (27 ms mean error at 120 BPM, where chance
  is 31 ms). The edit follows the lyric phrasing and the motion in the shots.
- **Every transition previews the next shot.** A cutout, a tile, or a stutter shows a piece of
  the incoming image before the cut. The viewer is always one step ahead, which reads as flow.

## The film title

- Two blocks, placed left and right of centre at 52% of the film's height, 8.4% in from each
  side.
- Each block is a kicker (the date or the camera) over an extended bold word. In a 912 px wide
  film the kicker is 12 px and the word 37 px; at 1920x1080 that is 25 px and 78 px. The type is
  set white with a faint shadow.
- The subject often passes in front of the title, a depth trick that uses a rotoscoped matte. In
  the creator's timeline, the title clips sit above an adjustment layer, and the cutouts sit as
  connected clips above the storyline.

## Sound design

The track is a licensed rap song ("Laugh Now Cry Later"), and the mix is almost all music.

- **Levels:** -13.9 LUFS integrated and a 0.7 LU loudness range, so it is brick-wall loud and
  flat. The true peak is +1.9 dBFS (the upload clips).
- **Spectrum:**
  - Sub below 60 Hz: -24 dB.
  - Bass: -8 dB.
  - Low mids: -3 dB, where the energy lives.
  - Mids: -7 dB.
  - Highs: -12 dB.
- **Stereo:** a side-to-mid ratio of 0.14 and an L/R correlation of 0.96, so it is nearly mono.
- **Arrangement over the 10 s:**
  - 0-6.5 s: vocal over hats with no kick. The spectral centroid sits at 3-4 kHz and the low
    band sits 3-7 dB under its median.
  - Frames 153-157 (6.38-6.54 s): the high band falls 40-48 dB, a near-silent breath.
  - 6.8-7.2 s: the low end rises. At 7.3 s the 808 and the kick land (low band +7 to +8 dB) and
    stay to the end, while the highs fall away.
- **Lyric sync:** the whisper transcript puts "Sometimes we laugh" at 6.75 s and "and sometimes
  we cry" at 7.65 s. The drop lands on the hook. The edit's busiest stretch (0.7-5 s) sits over
  the verse, and the long teleport shot sits on the drop. **Fast edit on thin music, calm edit
  on heavy music.** The two layers take turns carrying the energy.
- **Effects are almost absent.** High-band onsets line up with cuts at 0.75, 0.82, 0.93, 1.04,
  2.19, and 2.87 s, but they are the song's hats and not added whooshes. The mute before the
  drop reads as a designed cut in the mix.

For the rebuild, the skill keeps the song-led mix and adds a light layer of tiny transients:

- A shutter click per one-frame clip.
- A tick per stutter.
- A pop per cutout.
- A soft swoosh per title block and tile run.

Each sits 10-14 dB under the song. This is optional, and `sfx: {}` turns it off.

## Energy

- Confident, playful, and premium: the grade says "designer", and the moments say "fun day".
- Fast but not frantic: effects run in bursts of 2-5 frames, then hold for a beat.
- Every transition shows a piece of the next shot first, so the viewer always feels one step
  ahead.

## Measuring it again

```sh
# every frame, window only, in contact sheets
ffmpeg -i ref.mp4 -vf "crop=620:350:50:310,scale=310:-1,tile=5x6" -fps_mode passthrough win%02d.png
# scene changes inside the window
ffmpeg -i ref.mp4 -vf "crop=600:330:58:318,scale=150:-1,select='gte(scene,0)',metadata=print:key=lavfi.scene_score:file=scene.txt" -f null -
# loudness and range
ffmpeg -i ref.mp4 -af ebur128=peak=true -f null -
# lyrics with timings (local whisper.cpp)
whisper-cli -m ~/.cache/hyperframes/whisper/models/ggml-medium.en.bin -f audio16.wav -ml 1
```

The builder's `simp-audit.mjs` checks the measurable parts on a render: no black frames, the
energy split around the drop, the longest stall, loudness, true peak, A/V sync, and a sound onset
on every cue.
