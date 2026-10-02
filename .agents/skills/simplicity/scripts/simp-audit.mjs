#!/usr/bin/env node
// Audit a rendered "simplicity" reel against the style's measurable rules.
//
// Usage: node .claude/skills/simplicity/scripts/simp-audit.mjs <project-dir> <render.mp4>
//
// Checks: format and length; no black frames; cut density before and after the drop; the longest
// frozen stretch; loudness, true peak, the dropout, and A/V sync against simp/audio/mix.wav; every
// sound cue has an onset on its frame in the sfx stem. Prints PASS / WARN / FAIL lines and exits 1
// on any FAIL.

import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync, spawn } from "node:child_process";

const [projectArg, renderArg] = process.argv.slice(2);
if (!projectArg || !renderArg) {
  console.log("Usage: node simp-audit.mjs <project-dir> <render.mp4>");
  process.exit(1);
}
const project = resolve(projectArg);
const render = resolve(project, renderArg);
const cuesPath = join(project, "simp", "cues.json");
if (!existsSync(render)) { console.error(`missing ${render}`); process.exit(1); }
if (!existsSync(cuesPath)) { console.error(`missing ${cuesPath}; build the project first`); process.exit(1); }
const cues = JSON.parse(readFileSync(cuesPath, "utf8"));
const plan = JSON.parse(readFileSync(join(project, "simp-plan.json"), "utf8"));
const FPS = cues.fps, TOTAL = cues.frames;
let fails = 0;
const out = (lvl, msg) => { if (lvl === "FAIL") fails++; console.log(`${lvl.padEnd(4)} ${msg}`); };
const r2 = n => Math.round(n * 100) / 100;

// ---------------------------------------------------------------- format
const pr = JSON.parse(spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,width,height,r_frame_rate:format=duration", "-of", "json", render], { encoding: "utf8" }).stdout);
const vs = pr.streams.find(s => s.codec_type === "video");
const [fn, fd] = vs.r_frame_rate.split("/").map(Number);
const dur = Number(pr.format.duration);
out(vs.width === 1920 && vs.height === 1080 ? "PASS" : "FAIL", `format ${vs.width}x${vs.height} (want 1920x1080)`);
out(Math.abs(fn / fd - FPS) < 0.01 ? "PASS" : "FAIL", `frame rate ${r2(fn / fd)} (plan ${FPS})`);
out(Math.abs(dur - cues.duration) <= 1.5 / FPS ? "PASS" : "WARN", `duration ${r2(dur)} s (plan ${cues.duration} s)`);
out(pr.streams.some(s => s.codec_type === "audio") ? "PASS" : "FAIL", "audio stream present");

// ---------------------------------------------------------------- picture metrics (quarter scale)
const W = 480, H = 270;
const FULL = [0, 0, W, H];
function crop(buf, [x, y, w, h]) {
  let s = 0;
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) s += buf[j * W + i];
  return s / (w * h);
}
function diff(a, b, [x, y, w, h]) {
  let s = 0;
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) s += Math.abs(a[j * W + i] - b[j * W + i]);
  return s / (w * h);
}
const frames = await new Promise((res, rej) => {
  const p = spawn("ffmpeg", ["-v", "error", "-i", render, "-vf", `scale=${W}:${H},format=gray`, "-f", "rawvideo", "-"]);
  const size = W * H, rows = [];
  let pend = Buffer.alloc(0), prev = null, n = 0;
  p.stdout.on("data", d => {
    pend = Buffer.concat([pend, d]);
    while (pend.length >= size) {
      const f = pend.subarray(0, size);
      pend = pend.subarray(size);
      const row = { n, win: crop(f, FULL) };
      if (prev) row.d_win = diff(f, prev, FULL);
      rows.push(row);
      prev = Buffer.from(f);
      n++;
    }
  });
  p.on("close", c => c === 0 ? res(rows) : rej(new Error("ffmpeg decode failed")));
});
// black frames and cut density
// The planned closing fade (film.fadeOut) is allowed to reach black.
const fadeFrom = TOTAL - (Number(plan.film?.fadeOut) || 0);
const black = frames.filter(f => f.win < 10 && f.n < fadeFrom).map(f => f.n);
out(!black.length ? "PASS" : "FAIL", `no black frames${black.length ? ` (black at ${black.slice(0, 12).join(", ")})` : ""}`);
// A cut is a spike: much larger than the frame-to-frame change around it. Handheld, fisheye, and
// whip footage moves a lot without cutting, so a fixed threshold would count motion as cuts.
const changes = frames.filter((f, i) => {
  if (!(f.d_win > 18)) return false;
  const around = frames.slice(Math.max(1, i - 8), i + 9).filter(g => g !== f).map(g => g.d_win || 0).sort((a, b) => a - b);
  return f.d_win > 3 * (around[around.length >> 1] || 0);
}).map(f => f.n);
const dropF = plan.music?.drop;
if (dropF != null) {
  const pre = changes.filter(c => c < dropF).length / (dropF / FPS);
  const post = changes.filter(c => c >= dropF).length / Math.max(1e-3, (TOTAL - dropF) / FPS);
  out(post < pre ? "PASS" : "WARN", `energy: ${r2(pre)} cuts/s before the drop, ${r2(post)} after (the drop should breathe)`);
} else out("WARN", `${changes.length} cuts (${r2(changes.length / (TOTAL / FPS))}/s); set music.drop to check the energy split`);
const holds = [];
let run = 0;
frames.slice(1).forEach(f => { if (f.d_win < 0.4) run++; else { if (run) holds.push(run); run = 0; } });
if (run) holds.push(run);
const longest = Math.max(0, ...holds);
out(longest <= 30 ? "PASS" : "WARN", `longest frozen stretch: ${longest} frames (a freeze is fine; > 30 reads as a stall)`);

// ---------------------------------------------------------------- audio
const eb = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", render, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" }).stderr;
const num = re => Number(((eb.match(re) || []).pop() || "").match(/-?[\d.]+/)?.[0]);
const I = num(/I:\s+-?[\d.]+ LUFS/g), TP = num(/Peak:\s+-?[\d.]+ dBFS/g);
out(Math.abs(I + 14) <= 1 ? "PASS" : "WARN", `loudness ${I} LUFS (want -14 ± 1)`);
out(TP <= -1 ? "PASS" : "FAIL", `true peak ${TP} dBTP (want ≤ -1; if the mix is lower, remux with a cleaner AAC encoder, see SKILL.md)`);
function pcm(file, sr = 8000) {
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", file, "-ac", "1", "-ar", String(sr), "-f", "f32le", "-"], { maxBuffer: 1 << 28 });
  const b = r.stdout;
  return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length - (b.length % 4)));
}
const mixPath = join(project, "simp", "audio", "mix.wav");
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
  const drop = cues.cues.find(c => c.kind === "music")?.dropout;
  if (drop) {
    const rms = (x, t0, t1) => { const i0 = Math.floor(t0 * 8000), i1 = Math.floor(t1 * 8000); let s = 0; for (let i = i0; i < i1; i++) s += x[i] * x[i]; return 10 * Math.log10(s / Math.max(1, i1 - i0) + 1e-12); };
    const inside = rms(m, drop.a + 0.02, drop.b - 0.01), around = rms(m, drop.a - 0.5, drop.a);
    out(around - inside >= 10 ? "PASS" : "WARN", `dropout ${r2(drop.a)}-${r2(drop.b)} s sits ${r2(around - inside)} dB under the half-second before it (want ≥ 10; sfx may sit in it)`);
  }
}
const sfxStem = join(project, "simp", "audio", "stems", "sfx.wav");
const placed = cues.cues.filter(c => c.kind && c.kind !== "music" && c.start != null);
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

console.log(fails ? `\n${fails} FAIL` : "\nno FAIL");
process.exit(fails ? 1 : 0);
