#!/usr/bin/env node
// Check a rendered iPhone 17 Pro style promo against the style's structural rules.
//
// Usage: node promo-audit.mjs <project-dir> <render.mp4> [--network-log <file>]
//
// Reads the timeline landmarks the builder wrote into <project>/index.html, decodes the render at
// low resolution, and checks: frame count and rate, a perfectly still hold, an exit that mirrors
// the entrance, no long blank gaps after the opening, a still end card, and the audio shape
// (bed stops at the pop, stinger on the slide, loudness and true peak). With --network-log it
// also fails if offline-guard.cjs blocked any connection during the render. Exit code 1 on failure.
// Signal checks only: watch the render and listen to it as well.

import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve, relative } from "node:path";
import { spawnSync } from "node:child_process";

const argv = process.argv.slice(2);
const netLogArg = argv.includes("--network-log") ? argv[argv.indexOf("--network-log") + 1] : null;
const [projectArg, renderArg] = argv.filter((a, i) => !a.startsWith("--") && argv[i - 1] !== "--network-log");
if (!projectArg || !renderArg) {
  console.log("Usage: node promo-audit.mjs <project-dir> <render.mp4> [--network-log <file>]");
  process.exit(1);
}
const project = resolve(projectArg);
const render = resolve(project, renderArg);
if (!existsSync(render)) { console.error(`No render at ${render}`); process.exit(1); }
const html = readFileSync(resolve(project, "index.html"), "utf8");
const m = html.match(/window\.IP_CONFIG = (\{.*\});/);
if (!m) { console.error("index.html has no IP_CONFIG; build it with build-promo.mjs."); process.exit(1); }
const cfg = JSON.parse(m[1]);
const mk = cfg.markers || {};

const rows = [];
let failed = false;
const report = (gate, ok, detail) => { rows.push([ok ? "pass" : "FAIL", gate, detail]); if (!ok) failed = true; };
const note = (gate, detail) => rows.push(["info", gate, detail]);

// ---------------------------------------------------------------- video
const probe = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-count_frames", "-show_entries",
  "stream=nb_read_frames,r_frame_rate,width,height", "-of", "json", render], { encoding: "utf8" });
const vs = JSON.parse(probe.stdout).streams[0];
const [num, den] = vs.r_frame_rate.split("/").map(Number);
const fps = num / den;
const frames = Number(vs.nb_read_frames);
report("Frame size", vs.width === cfg.width && vs.height === cfg.height, `${vs.width}x${vs.height} (plan ${cfg.width}x${cfg.height})`);
report("Frame rate", Math.abs(fps - cfg.fps) < 0.01, `${fps} fps (plan ${cfg.fps})`);
report("Frame count", Math.abs(frames - Math.round(cfg.duration * cfg.fps)) <= 1, `${frames} frames (plan ${Math.round(cfg.duration * cfg.fps)})`);

const sw = cfg.width >= cfg.height ? 192 : 108, sh = cfg.width >= cfg.height ? 108 : 192;
// passthrough: decode exactly the stored frames (a stream that starts slightly after zero must not
// gain a duplicated first frame, which would shift every index).
const raw = spawnSync("ffmpeg", ["-v", "error", "-i", render, "-fps_mode", "passthrough", "-vf", `scale=${sw}:${sh}:flags=area,format=gray`, "-f", "rawvideo", "-"],
  { maxBuffer: 1 << 30 });
const size = sw * sh;
const count = Math.floor(raw.stdout.length / size);
const frame = i => raw.stdout.subarray(Math.max(0, Math.min(count - 1, i)) * size, (Math.max(0, Math.min(count - 1, i)) + 1) * size);
const at = t => Math.round(t * fps);
function diff(a, b) {
  let s = 0, peak = 0;
  for (let i = 0; i < a.length; i++) { const d = Math.abs(a[i] - b[i]); s += d; if (d > peak) peak = d; }
  return { mean: s / a.length, peak };
}
// "Ink" is anything that differs from the stage colour, so a coloured background is not content.
function luma(css) {
  const c = String(css || "#ffffff").trim();
  let r, g, b, m;
  if ((m = c.match(/^#([0-9a-f]{3})$/i))) [r, g, b] = [...m[1]].map(h => parseInt(h + h, 16));
  else if ((m = c.match(/^#([0-9a-f]{6})/i))) [r, g, b] = [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16));
  else if ((m = c.match(/rgba?\(\s*([\d.]+%?)[\s,]+([\d.]+%?)[\s,]+([\d.]+%?)/i)))
    [r, g, b] = m.slice(1, 4).map(v => (v.endsWith("%") ? (parseFloat(v) * 255) / 100 : Number(v)));
  else return 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const bgLuma = luma(cfg.background);
function inked(f) {
  let n = 0;
  for (let i = 0; i < f.length; i++) if (Math.abs(f[i] - bgLuma) > 20) n++;
  return n / f.length;
}

// Hold: the reference sits perfectly still between the settle and the reverse.
if (cfg.mirror != null && mk.entranceEnd != null) {
  const a = at(mk.entranceEnd + 0.05), b = at(mk.exitStart - 0.05);
  let worst = 0;
  for (let i = a + 1; i <= b; i++) worst = Math.max(worst, diff(frame(i - 1), frame(i)).mean);
  report("Still hold", worst < 0.35, `${mk.entranceEnd.toFixed(2)}-${mk.exitStart.toFixed(2)}s, largest frame-to-frame change ${worst.toFixed(3)} (limit 0.35 of 255)`);

  // Exit mirrors the entrance: frame n ~ frame (M - n), M = the mirror in frames (the builder
  // snaps it to a whole frame).
  const M = Math.round(cfg.mirror * fps);
  let worstMirror = 0, worstAt = 0;
  for (let n = at(0.3); n <= at(mk.entranceEnd); n += Math.max(1, Math.round(fps / 10))) {
    const d = diff(frame(n), frame(M - n)).mean;
    if (d > worstMirror) { worstMirror = d; worstAt = n / fps; }
  }
  report("Mirrored exit", worstMirror < 2.0, `worst mean difference ${worstMirror.toFixed(2)} at ${worstAt.toFixed(1)}s vs ${(cfg.mirror - worstAt).toFixed(1)}s (limit 2.0)`);
} else note("Mirrored exit", "plan has no exit");

// Blank gaps: after the first half second nothing should sit empty for more than 0.25 s. Without a
// lockup the spot legitimately ends on the empty stage once the exit clears.
const scanEnd = mk.popAt == null && mk.exitClear != null ? Math.min(count, at(mk.exitClear)) : count;
let run = 0, longest = 0, longestAt = 0;
for (let i = at(0.5); i < scanEnd; i++) {
  if (inked(frame(i)) < 0.0005) { run++; if (run > longest) { longest = run; longestAt = i - run + 1; } } else run = 0;
}
if (mk.popAt == null && mk.exitClear != null) {
  let tail = 0;
  for (let i = count - 1; i >= 0 && inked(frame(i)) < 0.0005; i--) tail++;
  report("Empty tail", tail / fps <= 1.0, `${(tail / fps).toFixed(2)}s of empty stage at the end (the style ends about 0.5s after the exit)`);
}
report("No blank gaps", longest / fps <= 0.25, longest ? `longest empty run ${(longest / fps).toFixed(2)}s at ${(longestAt / fps).toFixed(2)}s` : "none after 0.5s");
const firstInk = [...Array(Math.min(count, at(1))).keys()].find(i => inked(frame(i)) >= 0.0005);
note("First visible frame", firstInk == null ? "none in the first second" : `${(firstInk / fps).toFixed(3)}s (reference 0.28s)`);

// End card: still for its last 0.5 s and carrying the lockup.
{
  let worst = 0;
  for (let i = count - at(0.5); i < count; i++) worst = Math.max(worst, diff(frame(i - 1), frame(i)).mean);
  const ink = inked(frame(count - 1));
  report("Still end card", worst < 0.2 && (mk.popAt == null || ink > 0.002), `last 0.5s change ${worst.toFixed(3)}, inked ${(ink * 100).toFixed(2)}% of frame`);
}

// ---------------------------------------------------------------- audio
const hasAudio = spawnSync("ffprobe", ["-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", render], { encoding: "utf8" }).stdout.trim();
if (!hasAudio) {
  if (mk.musicOut != null || mk.stingerAt != null) report("Audio", false, "the plan has music or a stinger but the render has no audio track");
  else note("Audio", "render has no audio track");
} else {
  const pcm = spawnSync("ffmpeg", ["-v", "error", "-i", render, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], { maxBuffer: 1 << 30 }).stdout;
  // Copy into an aligned buffer: a Buffer's byteOffset is not guaranteed to be a multiple of 4.
  const x = new Float32Array(pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + (pcm.length - (pcm.length % 4))));
  const rms = (t0, t1) => {
    const a = Math.max(0, Math.round(t0 * 16000)), b = Math.min(x.length, Math.round(t1 * 16000));
    let s = 0;
    for (let i = a; i < b; i++) s += x[i] * x[i];
    return b > a ? 20 * Math.log10(Math.sqrt(s / (b - a)) + 1e-9) : -120;
  };
  if (mk.musicOut != null) {
    const bed = rms(0.5, mk.musicOut - 0.2);
    // The bed must reach the cut: the prepared file may not end early, and the last second before
    // the cut must still carry sound (the groove has quiet pockets, never silence).
    const tail = rms(mk.musicOut - 1.0, mk.musicOut - 0.05);
    const short = mk.musicEnd != null && mk.musicEnd < mk.musicOut - 0.05;
    // Without a lockup the bed runs to the end of the spot.
    if (mk.popAt == null && Math.abs(mk.musicOut - cfg.duration) > 0.15) report("Bed runs to the end", false, `the bed stops at ${mk.musicOut}s, not at the end (${cfg.duration}s); remove audio.musicOut`);
    report(mk.popAt != null ? "Bed runs to the pop" : "Bed runs to the end", !short && tail > -45,
      short ? `the bed file ends at ${mk.musicEnd}s, ${(mk.musicOut - mk.musicEnd).toFixed(2)}s before the cut at ${mk.musicOut}s`
        : `last second before the cut ${tail.toFixed(1)} dBFS (silence would be below -45)`);
  }
  if (mk.musicOut != null && mk.popAt != null) {
    const bed = rms(0.5, mk.musicOut - 0.2);
    const expected = mk.popAt + 0.04;
    if (Math.abs(mk.musicOut - expected) > 0.15) report("Bed cut on the pop", false, `the bed is cut at ${mk.musicOut}s, not at the pop (${expected.toFixed(3)}s); remove audio.musicOut`);
    // Silence between the cut and the stinger, skipping any sound effects placed in that window.
    let a = mk.musicOut + 0.1;
    const b = (mk.stingerAt ?? mk.musicOut + 0.5) - 0.02;
    const windows = [];
    for (const [s0, s1] of [...(mk.sfx || [])].sort((x, y) => x[0] - y[0])) {
      if (s1 <= a || s0 >= b) continue;
      if (s0 > a) windows.push([a, s0]);
      a = Math.max(a, s1);
    }
    if (b > a) windows.push([a, b]);
    const gaps = windows.filter(([x, y]) => y - x >= 0.05);
    if (!gaps.length) note("Bed stops at the pop", "no sound-effect-free gap to measure");
    else {
      const after = Math.max(...gaps.map(([x, y]) => rms(x, y)));
      report("Bed stops at the pop", after < bed - 30, `bed ${bed.toFixed(1)} dBFS, gap after ${mk.musicOut.toFixed(2)}s ${after.toFixed(1)} dBFS`);
    }
  }
  if (mk.stingerAt != null) {
    // The hit must land on the slide: its first 0.4 s is audible and within 10 dB of its loudest
    // 0.4 s window over the next 2 s (a riser or late peak fails).
    const hit = rms(mk.stingerAt, mk.stingerAt + 0.4);
    let loudest = -120, loudestAt = mk.stingerAt;
    for (let t = mk.stingerAt; t + 0.4 <= Math.min(cfg.duration, mk.stingerAt + 2); t += 0.05) {
      const v = rms(t, t + 0.4);
      if (v > loudest) { loudest = v; loudestAt = t; }
    }
    // Loud enough to read as a hit: within 15 dB of the bed (or above -30 dBFS with no bed).
    const floor = mk.musicOut != null ? rms(0.5, mk.musicOut - 0.2) - 15 : -30;
    report("Stinger on the slide", hit > floor && hit >= loudest - 10,
      `${hit.toFixed(1)} dBFS in the 0.4s after ${mk.stingerAt.toFixed(2)}s (needs > ${floor.toFixed(1)}); loudest window ${loudest.toFixed(1)} dBFS at +${(loudestAt - mk.stingerAt).toFixed(2)}s`);
  }
  const loud = spawnSync("ffmpeg", ["-hide_banner", "-i", render, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" }).stderr;
  const I = Number((loud.match(/I:\s+(-?[\d.]+) LUFS/g) || []).pop()?.match(/-?[\d.]+/)[0]);
  const TP = Number((loud.match(/Peak:\s+(-?[\d.]+) dBFS/g) || []).pop()?.match(/-?[\d.]+/)[0]);
  report("True peak", TP <= -1.0, `${TP} dBTP (limit -1.0)`);
  note("Loudness", `${I} LUFS integrated (web video usually sits near -14)`);
}

// Offline: the audited file must be the exact output of a guarded render session (same path,
// size, and modification time as the guard recorded at exit), that session must have routed its
// browser through the guard, and no guarded command in the log may have been blocked.
// HyperFrames' own update, skills, and telemetry calls are refused too, and only reported.
if (argv.includes("--network-log")) {
  const f = [resolve(project, netLogArg || ""), resolve(netLogArg || "")].find(x => netLogArg && existsSync(x) && statSync(x).isFile());
  if (!f) report("Offline", false, `no guard log at ${netLogArg || "(missing value)"}; preload offline-guard.cjs with IP_OFFLINE_LOG set`);
  else {
    const sessions = new Map();
    for (const line of readFileSync(f, "utf8").split("\n")) {
      const m = line.match(/^\[offline-guard\] ([0-9a-f]{12}) (\S+) (\d+) (start|browser|blocked|suppressed|output) ?(.*)$/);
      if (!m) continue;
      const [, id, time, pid, event, detail] = m;
      if (!sessions.has(id)) sessions.set(id, { id, time: Date.parse(time), events: [], output: null });
      const ses = sessions.get(id);
      if (event === "output") { try { ses.output = JSON.parse(detail); } catch {} }
      ses.events.push({ event, detail, pid: Number(pid) });
    }
    const st = statSync(render);
    const match = [...sessions.values()].find(x => x.output && x.output.path === render && x.output.size === st.size &&
      Math.abs(x.output.mtimeMs - Math.round(st.mtimeMs)) <= 2);
    const blocked = [...sessions.values()].flatMap(x => x.events.filter(e => e.event === "blocked").map(e => e.detail));
    const suppressed = [...sessions.values()].flatMap(x => x.events.filter(e => e.event === "suppressed")).length;
    const name = render.split("/").pop();
    if (!match) report("Offline", false, `no guarded render in the log produced this exact ${name}; render it with the guard preloaded and --output ${relative(project, render)}`);
    else if (!match.events.some(e => e.event === "browser")) report("Offline", false, `the render session for ${name} launched no proxied browser`);
    else report("Offline", blocked.length === 0,
      blocked.length ? `${blocked.length} blocked connection(s): ${[...new Set(blocked)].slice(0, 3).join(", ")}`
        : `produced by guarded session ${match.id} with its browser proxied; nothing blocked across ${sessions.size} guarded command(s)` +
          (suppressed ? `; ${suppressed} HyperFrames update/skills/telemetry call(s) refused` : ""));
  }
}

const w = Math.max(...rows.map(r => r[1].length));
for (const [s, g, d] of rows) console.log(`${s.padEnd(5)} ${g.padEnd(w)}  ${d}`);
process.exit(failed ? 1 : 0);
