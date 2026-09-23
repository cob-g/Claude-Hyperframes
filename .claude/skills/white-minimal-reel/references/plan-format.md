# `wm-plan.json` format

One JSON file in the project root drives `scripts/build-reel.mjs`. Paths are relative to the
project. Times are seconds on the cut video's timeline. Unknown fields are ignored.

```jsonc
{
  "title": "My reel",
  "source": {
    "video": "assets/cut.mp4",          // the clean cut; also used as the voice track
    "transcript": "assets/cut.json"     // word timings for that same file
  },
  "duration": 38.2,                      // optional; defaults to the video duration
  "voiceVolume": 1,                      // optional
  "music": { "src": "assets/bed.mp3", "volume": 0.12 },   // optional, licensed bed only
  "style": {                             // optional overrides
    "posterizeFps": 12,                  // 0 disables posterize
    "grain": 0.13, "vignette": 0.42, "edgeBlur": 9
  },
  "css": "",                             // optional extra CSS for the root (fonts, tokens)
  "talkingHead": {
    "focusX": 0.5, "focusY": 0.38,       // face position in the source frame (0-1)
    "punchIn": 1.16,                     // scale used on alternate face segments
    "framing": [{ "scale": 1 }, { "scale": 1.2 }],  // optional per-segment scale override
    "hookBlurIn": 0.6,                   // seconds; 0 = none
    "returnSettle": 0.28                 // seconds; 0 = hard cut back to the face
  },
  "captions": {
    "enabled": true,
    "hookEnd": 2.1,                      // words before this stack in the hook layout
    "maxWords": 3, "maxDuration": 1.5, "gap": 0.3
  },
  "scenes": [ /* see below */ ]
}
```

## Scene

```jsonc
{
  "id": "time-money",                    // becomes compositions/wm-time-money.html
  "start": 7.6, "end": 9.36,             // must not overlap; back-to-back scenes may touch
  "enter": "zoom",                       // "zoom" (default after footage) or "push"
  "exit": "cut",                         // "cut" or "push" (the next scene must start at end)
  "pushOut": 0.5,                        // optional push-out length
  "camera": { "from": 1.4, "to": 1.1, "blur": 30, "duration": 1.0 },  // optional
  "blindAngle": -9,                      // optional shadow angle
  "object": {
    "src": "assets/objects/hourglass.png",   // transparent PNG
    "x": 540, "y": 1010, "w": 640,           // centre and width; height follows the PNG
    "rotate": -3,
    "motion": "settle",                      // settle | rise | slide | counter | drift
    "motionOptions": { "fromScale": 1.2 },   // optional WM.objectIn options
    "at": 0,                                 // optional start time within the scene
    "light": { "x": "130%", "y": "-30%" },   // shadow streaks away from this point (object box %)
    "shadow": { "reach": 0.2, "strength": 0.2, "opacity": 0.65 },
    "inner": { "size": 16, "opacity": 0.55 },
    "desat": 0.85, "brightness": 0.9, "contrast": 1.08, "tone": 0.38
  },
  "objects": [],                         // optional extra hero objects, same fields
  "depth": [
    { "src": "assets/objects/pen.png", "x": 960, "y": 1780, "w": 640,
      "rotate": -38, "blur": 11, "dx": 24, "dy": 0, "dr": 3 }
  ],
  "panel": { "x": 150, "y": 880, "w": 780, "h": 1100, "from": "bottom", "at": 0.05 },
  "stroke": {
    "type": "sweep",                     // sweep | zigzag | line
    "d": "M 1000 180 C 700 420, 380 520, 240 900",   // SVG path in 1080x1920 space
    "width": 240, "at": 0.35, "duration": 0.9, "layer": "back"
  },
  "words": [
    { "text": "Time",                    // what is displayed
      "match": "time",                   // transcript words to time it (defaults to text)
      "role": "hero",                    // hero | small | script | ghost
      "x": 540, "y": 700, "size": 240,
      "anchor": "center",                // center | left | right
      "width": 1000,                     // fitting box; text shrinks to fit it
      "layer": "front",                  // front (over the object) or back
      "classes": ["gold", "solid"],      // dim | faint | solid | gold | ink | italic | caps | multiply
      "rotate": 0, "opacity": null, "at": null }
  ]
}
```

## Build behaviour

- Word times: `at` wins; otherwise the first match of `match` at or after the previous word
  inside the scene window, else anywhere in the window. Reveals start two frames early but
  never before 0.12 s into the scene.
- Captions are built from transcript words outside every scene, grouped by pause, punctuation,
  `maxWords`, and `maxDuration`, and never overlap a scene.
- Face segments alternate `1` and `punchIn` scale unless `framing` overrides them.
- A scene that follows another with `exit: "push"` enters with a push automatically.
- Every run copies the current kit into `wm/`, so rebuilding picks up kit fixes.
