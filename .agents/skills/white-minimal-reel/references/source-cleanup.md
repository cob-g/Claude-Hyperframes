# Cleaning a source that already has captions

Reposted reels and CapCut exports often arrive with word captions, meme bars, or stickers
burned into the picture. The white minimal look sets its own type, so remove the old overlays
before cutting. The recipe below was proven on a 40 s talking head with word-by-word captions
and a semi-transparent caption bar over the opening clip.

## Word captions

1. **Find the band.** Sum near-white, low-chroma pixels per row over the whole clip; the
   caption band is the narrow peak (for example rows 926-972 of a 1280-row source).
2. **Segment per word.** Inside the band, keep bright components of glyph size, and start a
   new segment whenever the mask's overlap with the previous frame drops. One segment is one
   caption word.
3. **Read each word** with Apple Vision (`VNRecognizeTextRequest`, accurate, no language
   correction) on a 2x crop of the segment's middle frame. The segment start frames are the
   caption tool's word onsets. Check them against a spectrogram: in the tested source they
   matched the audible onsets, while whisper.cpp word times drifted by up to 0.9 s. Use them
   as word timings, with whisper's text for spelling and punctuation.
4. **Mask and fill.** Per frame, take the white glyph pixels inside the OCR box plus the
   pixels that stay lit through the whole segment (the caption is static; skin highlights
   and jewellery move), dilate by 4 px for anti-aliasing and chroma bleed, then fill with
   frequency-selective reconstruction: `cv2.xphoto.inpaint(..., INPAINT_FSR_BEST)` from
   `opencv-contrib-python-headless`. Telea and Navier-Stokes smear across strong edges (a
   dark shirt neckline turned into a black bite); temporal fills from optical-flow-warped
   neighbours left visible patchwork. FSR continues edges and costs about 1-3 s per frame,
   so run it in a process pool.
5. **Cover the residue.** Place the new captions on the old band and set
   `talkingHead.focusY` to that line (band y / source height), so every punch-in scales
   around it and the captions keep covering what inpainting cannot hide.

## A semi-transparent caption bar

Estimate the bar's per-row darkening by comparing the bar rows with the rows just outside
it, averaged over every frame and the columns without text, and divide it back out. Then
inpaint the text and any emoji (fill the emoji's bounding box: its dark details belong to
it) and soften the amplified compression noise inside the bar only.

## Other clean-up worth doing

- Blur readable number plates and faces of bystanders. A yellow UK plate tracks reliably by
  colour (HSV hue 18-38, saturation and value above 110) with a median-smoothed box.
- Cut black frames between clips; they read as dead air.
- Grade the footage toward the paper palette (for night footage: saturation 0.86,
  contrast 1.05, gamma 0.97, slightly warm highlights) and upscale once with lanczos
  instead of letting the browser scale 720p footage at every frame.

## Pitfalls

- With forked workers, call `cv2.setNumThreads(0)` before the parent uses OpenCV. Otherwise
  the children can deadlock on OpenCV's thread pool (0 % CPU, no progress).
- Upscaling and grading belong in the one re-encode that also sets keyframes every second
  (`-g 30 -keyint_min 30`), so the footage is encoded once after cleaning.
