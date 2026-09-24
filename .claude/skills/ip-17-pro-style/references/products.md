# Products: procedural models and your own GLB files

The products are real 3D objects rendered by three.js inside the page. Nothing is downloaded at
build or render time.

## Procedural phone (default)

`buildPhone` in `assets/ip-3d.mjs` builds a modern Pro-style phone:

- 71.9 x 150 x 8.75 mm aluminium body with rounded edges
- A full-width camera plateau
- Three lenses, a flash, a LiDAR dot, and a microphone
- A frosted glass window
- Side buttons
- A black front with a lit screen and an island pill

The screen shows a flow-line wallpaper, drawn in code in the finish's `screen` colour. The phone
has no logo on purpose.

Finishes are presets or objects:

| Preset | body | plateau | glass | Look at rest |
| --- | --- | --- | --- | --- |
| `orange` | #d9601a | #e27424 | #ffc24e | orange frame, gold back as it catches the softbox |
| `silver` | #b4b4b2 | #a6a6a5 | #9e9ea0 | grey metal, dark plateau |
| `blue` | #2c3a55 | #34435f | #4a5a78 | deep navy |
| `graphite` | #3a3a3c | #434345 | #505052 | near black |

The back glass is a tinted metal (`glassMetalness` 1), so reflections take the finish colour
and bright ones bloom toward gold in the ACES tone curve. Lower `glassMetalness` for a whiter,
glassier sheen.

## Procedural gift case

`buildCase` is an open earbuds case: a glossy base with a recess, the lid swung back, and two
buds standing in it. It is generic by design.

## Your own GLB

Use a model you have the rights to. You can export one from your own CAD or product files, or
download one under a licence that allows commercial video use. Record its source and licence in
the project's `VERIFY.md`.

1. Put the file in the project, for example `assets/models/phone.glb`. Use a plain `.glb`: its
   textures must be embedded, or sit next to a `.gltf`. It must not use Draco or Meshopt
   compression, because the kit ships no decoders and never fetches them from the web. The
   builder checks all of this.
2. Reference it:

   ```json
   "products": [{ "src": "assets/models/phone.glb", "orient": [-90, 0, 90], "from": "bottom" }]
   ```

   The loader centres the model on its bounding box. It scales the model so its height (after
   `orient`) fills `h` pixels, then applies the same fly-in, spin, and rest pose as the procedural
   phone.
3. Find `orient` by rendering one still from the project folder, with telemetry off:
   `HYPERFRAMES_NO_TELEMETRY=1 npx hyperframes snapshot --at 3 --no-end --describe false`.
   The back should face the camera and the top should point up.
   - `orient` rotates about Y first, then X, then Z, in degrees.
   - Models exported "Y up, screen toward +Z" usually need `[0, 180, 0]`.
   - Models exported lying flat need a 90-degree X turn.

   The `ry` rest angle and the spin then apply on top.
4. Materials come from the file and are lit by the studio environment. Very dark or very glossy
   PBR materials may need the `look` settings adjusted (`envIntensity`, `exposure`).

A quick test that orientation, centring, and scale work: a deliberately rotated, off-centre,
metre-scale test box rendered with `orient: [-90, 0, 90]` sits upright with its back marker at
the top, at the requested height.

## Brands and trademarks

The reference advertises Apple products with Apple's logo and wordmark. This kit ships none of
them:

- **Phones**: generic.
- **Lockup mark**: a placeholder monogram.
- **Wordmark**: your text.

Use your own brand, or a client's brand with permission. Do not recreate a third party's logo,
product design, or marks in a published video.
