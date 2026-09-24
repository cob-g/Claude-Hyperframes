# Music and the stinger

The reference ad cuts a trap beat (808s and hats, about 140 BPM) dead as the brand mark pops. It
then lets a single broadband hit ring out as the mark slides aside. Use real, licensed music
found on the web, not synthesized placeholder music. Downloading is a one-time preparation
step; the build and the render stay offline.

## 1. Find a track and a hit in the browser

Search free libraries whose licence allows commercial web video:

| Library | Licence | What to check |
| --- | --- | --- |
| [Mixkit music](https://mixkit.co/free-stock-music/trap/) | Mixkit Stock Music Free License | Allowed: web, social, online ads, YouTube. Not allowed: TV or radio, CD or DVD, video games, remixing into a music-only track, registering on a rights-management service. No attribution. |
| [Mixkit sound effects](https://mixkit.co/free-sound-effects/impact/) | Mixkit Sound Effects Free License | Free for commercial use, including broadcast. Never redistribute the file on its own. |
| [Pixabay music](https://pixabay.com/music/search/trap/) | Pixabay Content License | Skip any track marked **Content ID registered**, because uploads using it can be claimed on YouTube. |

- **The bed.** Filter for trap or hip-hop with a confident, positive, or "technology" mood. Aim
  for about 130-145 BPM, and a drop where the 808s come in hard. Mixkit's "Young Trizzy 02"
  (Arulo) is a good fit: 140 BPM, drop at 13.72 s.
- **The hit.** Search impact, cinematic, or intro. You want a hard transient that rings for 1-2 s.
  Many "impacts" open with a riser or a slow swell, so play the file and find the transient.
  `stingerStart` skips everything before it. The demo uses Mixkit's "Big cinematic impact" from
  2.135 s, the silent gap just before its hit.
- **Checks before you download.** Read the licence on the track page and confirm the track is
  not Content ID registered. Record what you checked.

With a coding agent, use web search to find the pages. On a page such as Mixkit's, the file URL
is in the audio player's `data-audio-player-preview-url-value` attribute, for example
`https://assets.mixkit.co/music/431/431.mp3`.

## 2. Download it with provenance

```sh
node .agents/skills/ip-17-pro-style/scripts/fetch-audio.mjs <file-url> video-projects/<slug>/assets/audio/<name>.mp3 \
  --page "<track page>" --license "<licence name>" --license-url "<licence URL>" --title "<title>" --artist "<artist>"
```

The script saves the file next to a `.provenance.json` record: source page, file URL, licence,
retrieval time, SHA-256, and duration.
- It downloads to a temporary file and only replaces the target, even with `--force`, when the
  result is playable audio.
- It times out after 60 s.
- It refuses to run while the offline guard is preloaded. Download in a clean shell.

Copy the record into the project's `VERIFY.md`.

## 3. Cue the bed

Most tracks open with an intro. The spot needs the beat from its first frames, so start the bed
at the drop:

```sh
node .agents/skills/ip-17-pro-style/scripts/music-cue.mjs video-projects/<slug>/assets/audio/<name>.mp3 --cut <bed cut>
```

`--cut` is the "bed cut" that `build-promo.mjs` prints: the pop plus 0.04 s, which is 5.403 s
with the default timing. Build once, cue, then build again.

The script prints the tempo, the drops, and a `musicStart` for each drop:

- **The drop lands near 0.25 s,** when the products first show.
- **A bar line falls 30 ms after the cut,** so the cut is clean. When no bar line fits within a
  beat of 0.25 s, it settles for a half bar or a beat, and says which.

Each drop is assumed to start a bar. A later drop that is not a whole number of bars after the
first is flagged, because it may enter on another beat. Prefer the first drop, or check the
flagged one by ear.

Put the value in the plan:

```json
"audio": {
  "music": "assets/audio/young-trizzy-02.mp3", "musicStart": 13.44,
  "stinger": "assets/audio/big-cinematic-impact.mp3", "stingerStart": 2.135
}
```

`stingerStart` trims a riser, a swell, or silence from the front of the hit, just as
`musicStart` does for the bed. The audit expects the hit to be audible within 0.4 s of the
slide. A stinger that runs past the end of the spot fades out over its last 0.3 s.

The builder levels both files and puts a lookahead limiter on them (bed toward -14 LUFS, hit
toward -16 LUFS, ceiling -4.5 dBFS). Downloaded masters are often brick-walled, and HyperFrames'
188 kbps AAC encode would otherwise push their transients past 0 dBTP.

## 4. Listen

The audit checks the signal:

- The bed reaches the cut and stops there.
- The hit lands on the slide.
- True peak is -1 dBTP or lower.

It cannot tell whether the music fits. Listen to the draft at full volume, especially the drop
under the products, the cut at the pop, and the hit.
