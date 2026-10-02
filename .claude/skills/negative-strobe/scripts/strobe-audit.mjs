#!/usr/bin/env node
// Audit a rendered "negative strobe" film against the plan and the style's measurable rules.
//
// Usage: node .claude/skills/negative-strobe/scripts/strobe-audit.mjs <project-dir> <render.mp4>
//
// Checks: format and length; every planned state is on its own frames (a one-frame flash that
// lands a frame late, twice, or not at all is the failure this style invites); the picture is
// neutral and two-tone; the pace and the flash rate; loudness, true peak, the mutes, A/V sync
// against ns/audio/mix.wav, a sound onset on every cue, and the bed's share of bass.
// Prints PASS / WARN / FAIL / INFO lines and exits 1 on any FAIL.

import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync, spawn } from "node:child_process";

const [projectArg, renderArg] = process.argv.slice(2);
if (!projectArg || !renderArg) {
  console.log("Usage: node strobe-audit.mjs <project-dir> <render.mp4>");
  process.exit(1);
}
const project = resolve(projectArg);
const render = resolve(project, renderArg);
const cuesPath = join(project, "ns", "cues.json");
if (!existsSync(render)) { console.error(`missing ${render}`); process.exit(1); }
if (!existsSync(cuesPath)) { console.error(`missing ${cuesPath}; build the project first`); process.exit(1); }
const cues = JSON.parse(readFileSync(cuesPath, "utf8"));
const FPS = cues.fps, TOTAL = cues.frames;
let fails = 0;
const out = (lvl, msg) => { if (lvl === "FAIL") fails++; console.log(`${lvl.padEnd(4)} ${msg}`); };
const r2 = n => Math.round(n * 100) / 100;

// ---------------------------------------------------------------- format
const pr = JSON.parse(spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,width,height,r_frame_rate:format=duration", "-of", "json", render], { encoding: "utf8" }).stdout);
const vs = pr.streams.find(s => s.codec_type === "video");
const [fn, fd] = vs.r_frame_rate.split("/").map(Number);
const dur = Number(pr.format.duration);
out(vs.width === cues.width && vs.height === cues.height ? "PASS" : "FAIL", `format ${vs.width}x${vs.height} (plan ${cues.width}x${cues.height})`);
out(Math.abs(fn / fd - FPS) < 0.01 ? "PASS" : "FAIL", `frame rate ${r2(fn / fd)} (plan ${FPS}; any other rate drops or doubles one-frame pieces)`);
out(Math.abs(dur - cues.duration) <= 1.5 / FPS ? "PASS" : "WARN", `duration ${r2(dur)} s (plan ${cues.duration} s)`);
out(pr.streams.some(s => s.codec_type === "audio") ? "PASS" : "FAIL", "audio stream present");

// ---------------------------------------------------------------- picture (a tenth scale)
const W = Math.round(cues.width / 10), H = Math.round(cues.height / 10), SIZE = W * H;
const frames = await new Promise((res, rej) => {
  const p = spawn("ffmpeg", ["-v", "error", "-i", render, "-vf", `scale=${W}:${H}:flags=area`, "-pix_fmt", "rgb24", "-f", "rawvideo", "-"]);
  const rows = [];
  let pend = Buffer.alloc(0);
  p.stdout.on("data", d => {
    pend = Buffer.concat([pend, d]);
    while (pend.length >= SIZE * 3) {
      const f = pend.subarray(0, SIZE * 3);
      pend = pend.subarray(SIZE * 3);
      const y = new Uint8Array(SIZE);
      let mean = 0, chroma = 0, ext = 0;
      for (let i = 0; i < SIZE; i++) {
        const r = f[i * 3], g = f[i * 3 + 1], b = f[i * 3 + 2];
        const v = Math.round((r + g + b) / 3);
        y[i] = v; mean += v; chroma += Math.max(r, g, b) - Math.min(r, g, b);
        if (v < 26 || v > 230) ext++;
      }
      rows.push({ y, mean: mean / SIZE, chroma: chroma / SIZE, ext: ext / SIZE });
    }
  });
  p.on("close", c => c === 0 ? res(rows) : rej(new Error("ffmpeg decode failed")));
});
const stillCache = {};
function stillY(file) {
  if (stillCache[file]) return stillCache[file];
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", join(project, file), "-vf", `scale=${W}:${H}:flags=area`, "-pix_fmt", "gray", "-f", "rawvideo", "-"], { maxBuffer: 1 << 24 });
  const y = new Uint8Array(r.stdout.subarray(0, SIZE));
  let mean = 0; for (const v of y) mean += v;
  mean /= SIZE;
  let dev = 0; for (const v of y) dev += (v - mean) * (v - mean);
  return (stillCache[file] = { y, mean, flat: Math.sqrt(dev / SIZE) < 12 });
}
function corr(a, b) {
  let ma = 0, mb = 0;
  for (let i = 0; i < SIZE; i++) { ma += a[i]; mb += b[i]; }
  ma /= SIZE; mb /= SIZE;
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < SIZE; i++) { const x = a[i] - ma, y = b[i] - mb; sab += x * y; saa += x * x; sbb += y * y; }
  return saa && sbb ? sab / Math.sqrt(saa * sbb) : 0;
}
// Every frame of every state shows what the plan put there.
const wrong = [];
let hardExt = 0, hardN = 0;
for (const s of cues.states) {
  for (let f = s.frame; f < s.frame + s.frames; f++) {
    const fr = frames[f];
    if (!fr) { wrong.push(`${f}: missing`); continue; }
    let ok;
    if (s.kind === "black") ok = fr.mean < 8;
    else if (s.kind === "white") ok = fr.mean > 244;
    else if (s.kind === "card") ok = s.neg ? fr.mean < 110 : fr.mean > 145;
    else {
      const st = stillY(s.file);
      // A flat still (nearly one tone) has no pattern to correlate; its level decides.
      ok = st.flat ? Math.abs(fr.mean - st.mean) < 12 : corr(fr.y, st.y) > 0.9;
      if (s.grade !== "soft") { hardExt += fr.ext; hardN++; }
    }
    if (!ok) wrong.push(`${f}: ${s.kind}${s.clip ? ` ${s.clip}@${s.off} ${s.token}` : ""}`);
  }
}
out(!wrong.length ? "PASS" : "FAIL", `every state on its frames: ${TOTAL - wrong.length}/${TOTAL}${wrong.length ? ` (wrong at ${wrong.slice(0, 8).join("; ")})` : ""}`);
const chroma = frames.reduce((a, f) => a + f.chroma, 0) / Math.max(1, frames.length);
out(chroma < 3 ? "PASS" : "FAIL", `neutral picture: mean chroma ${r2(chroma)} of 255 (want < 3)`);
if (hardN) {
  const share = hardExt / hardN;
  out(share >= 0.6 ? "PASS" : "WARN", `two tones: ${Math.round(share * 100)}% of the ink and stamp pixels are paper or ink (want ≥ 60%; the reference's result frames are 70-90%). Lower look.bands.ink or fix a pivot if it is short.`);
}

// Pace, measured on the render: a change is any frame that differs from the one before it.
const diff = (a, b) => { let s = 0; for (let i = 0; i < SIZE; i++) s += Math.abs(a[i] - b[i]); return s / SIZE; };
const changes = [];
for (let i = 1; i < frames.length; i++) if (diff(frames[i].y, frames[i - 1].y) > 6) changes.push(i);
// A flash is a pair of opposing luminance changes, each 10% of full scale or more, over a quarter
// of the frame or more. It is counted per pixel: a positive frame and its negative swap light and
// dark without moving the frame's mean at all.
const flashes = [];
const lastSwing = new Int8Array(SIZE);
for (let i = 1; i < frames.length; i++) {
  const a = frames[i - 1].y, b = frames[i].y;
  let area = 0;
  for (let p = 0; p < SIZE; p++) {
    const d = b[p] - a[p];
    if (d >= 26) { if (lastSwing[p] < 0) area++; lastSwing[p] = 1; }
    else if (d <= -26) { if (lastSwing[p] > 0) area++; lastSwing[p] = -1; }
  }
  if (area / SIZE >= 0.25) flashes.push(i);
}
const peakIn = arr => { let m = 0; for (const f of arr) m = Math.max(m, arr.filter(g => g >= f && g < f + FPS).length); return m; };
out("INFO", `pace: ${changes.length} picture changes (${r2(changes.length / (frames.length / FPS))}/s, ${peakIn(changes)} in the busiest second; plan ${cues.pace.changes})`);
out("INFO", `flashes: ${flashes.length} (${peakIn(flashes)} in the busiest second). More than 3 a second is flashing imagery: post with a warning.`);
// Runs of one-frame states, and the longest hold.
let run = 0, longestRun = 0;
for (const s of cues.states) { if (s.frames === 1 && s.kind !== "black") { run++; longestRun = Math.max(longestRun, run); } else run = 0; }
out(longestRun <= FPS ? "PASS" : "WARN", `longest strobe run: ${longestRun} frames (a run over one second stops reading as a transition; break it with a hold or a black frame)`);
const holds = cues.states.filter(s => s.kind === "still");
const longestHold = Math.max(0, ...holds.map(s => s.frames));
out(longestHold <= FPS ? "PASS" : "WARN", `longest frozen still: ${longestHold} frames (over one second reads as a stall; run it live with "step": 1 or cut it)`);

// ---------------------------------------------------------------- audio
const eb = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", render, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" }).stderr;
const num = re => Number(((eb.match(re) || []).pop() || "").match(/-?[\d.]+/)?.[0]);
const I = num(/I:\s+-?[\d.]+ LUFS/g), TP = num(/Peak:\s+-?[\d.]+ dBFS/g);
out(Math.abs(I + 14) <= 1 ? "PASS" : "WARN", `loudness ${I} LUFS (want -14 ± 1)`);
out(TP <= -1 ? "PASS" : "FAIL", `true peak ${TP} dBTP (want ≤ -1; if the mix is lower, remux with a cleaner AAC encoder, see SKILL.md)`);
function pcm(file, sr = 8000, af = null) {
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", file, "-ac", "1", "-ar", String(sr), ...(af ? ["-af", af] : []), "-f", "f32le", "-"], { maxBuffer: 1 << 28 });
  const b = r.stdout;
  return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length - (b.length % 4)));
}
const mixPath = join(project, "ns", "audio", "mix.wav");
if (existsSync(mixPath)) {
  const a = pcm(render), m = pcm(mixPath);
  // envelope cross-correlation at 1 ms steps, +-120 ms
  const env = x => { const e = []; for (let i = 0; i + 8 <= x.length; i += 8) { let s = 0; for (let j = 0; j < 8; j++) s += Math.abs(x[i + j]); e.push(s); } return e; };
  const ea = env(a), em = env(m);
  let best = -Infinity, lag = 0;
  for (let L = -120; L <= 120; L++) {
    let s = 0;
    for (let i = 200; i < Math.min(ea.length, em.length) - 200; i++) s += ea[i] * (em[i + L] || 0);
    if (s > best) { best = s; lag = L; }
  }
  out(Math.abs(lag) <= 1000 / FPS ? "PASS" : "FAIL", `A/V: render audio vs mix.wav offset ${lag} ms (≤ 1 frame)`);
  const rms = (x, t0, t1) => { const i0 = Math.max(0, Math.floor(t0 * 8000)), i1 = Math.floor(t1 * 8000); let s = 0; for (let i = i0; i < i1; i++) s += x[i] * x[i]; return 10 * Math.log10(s / Math.max(1, i1 - i0) + 1e-12); };
  for (const mu of cues.cues.find(c => c.kind === "music")?.mutes || []) {
    if (mu.b - mu.a < 0.06) continue;
    const inside = rms(m, mu.a + 0.02, mu.b - 0.01), around = rms(m, Math.max(0, mu.a - 0.5), mu.a);
    out(around - inside >= 10 ? "PASS" : "WARN", `mute ${r2(mu.a)}-${r2(mu.b)} s sits ${r2(around - inside)} dB under the half-second before it (want ≥ 10; an sfx tail may sit in it)`);
  }
}
const sfxStem = join(project, "ns", "audio", "stems", "sfx.wav");
const placed = cues.cues.filter(c => c.kind && c.kind !== "music" && c.start != null && c.align !== "end");
if (existsSync(sfxStem) && placed.length) {
  const x = pcm(sfxStem, 8000);
  const hop = 40; // 5 ms
  const e = []; for (let i = 0; i + hop <= x.length; i += hop) { let s = 0; for (let j = 0; j < hop; j++) s += x[i + j] * x[i + j]; e.push(Math.sqrt(s / hop)); }
  let ok = 0; const late = [];
  for (const c of placed) {
    const i0 = Math.max(0, Math.floor((c.at - 1 / FPS) * 200)), i1 = Math.floor((c.at + 1 / FPS) * 200);
    const before = Math.max(1e-5, ...e.slice(Math.max(0, i0 - 8), i0));
    const peak = Math.max(...e.slice(i0, i1 + 1));
    if (peak > before * 1.6 || peak > 0.02) ok++; else late.push(`${c.kind}@${c.frame}`);
  }
  out(ok === placed.length ? "PASS" : "WARN", `sound cues with an onset on their frame: ${ok}/${placed.length}${late.length ? ` (quiet or masked: ${late.slice(0, 8).join(", ")})` : ""}`);
}
// The bed should be a wall of bass: the reference keeps 87% of its energy below 150 Hz.
const bedStem = join(project, "ns", "audio", "stems", "bed.wav");
if (existsSync(bedStem)) {
  const pw = x => { let s = 0; for (const v of x) s += v * v; return s; };
  const share = pw(pcm(bedStem, 12000, "lowpass=f=150,lowpass=f=150")) / (pw(pcm(bedStem, 12000)) || 1);
  out(share >= 0.4 ? "PASS" : "WARN", `bed: ${Math.round(share * 100)}% of its energy below 150 Hz (want ≥ 40%; the reference measures 87%). A thin track cannot carry this cut.`);
} else out("WARN", "no music bed in the mix: this style is cut to a loud, bass-heavy track.");

console.log(fails ? `\n${fails} FAIL` : "\nno FAIL");
process.exit(fails ? 1 : 0);
