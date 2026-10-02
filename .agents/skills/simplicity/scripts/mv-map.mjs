#!/usr/bin/env node
// Map a music video for a simplicity edit: frame-accurate cuts (with a flag for shots that carry a
// baked-in border) and, given a time inside a chorus, every repeat of that chorus with its sync
// offset.
//
// Usage: node .claude/skills/simplicity/scripts/mv-map.mjs <video> [--chorus <seconds>] [--out map.json]
//
// Cuts are found inside the central 70% of the frame, because a constant film-frame overlay or
// letterbox hides cuts from whole-frame scene detection. A shot is "border" when the left edge of
// the frame stays black. Chorus repeats come from cross-correlating a 10 s window of the 1-4 kHz
// (vocal) envelope against the whole track. Pass a time in the chorus you cut the song to; each
// repeat's offset (`repeat - chorus`) is the `"sync"` value for shots taken from that repeat.

import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const args = process.argv.slice(2);
if (!args.length || args.includes("--help")) {
  console.log("Usage: node mv-map.mjs <video> [--chorus <seconds>] [--out map.json]");
  process.exit(args.length ? 0 : 1);
}
const video = args[0];
const opt = k => (args.includes(k) ? args[args.indexOf(k) + 1] : null);
const chorusAt = opt("--chorus") != null ? Number(opt("--chorus")) : null;
const outPath = opt("--out");

const probe = JSON.parse(spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate:format=duration", "-of", "json", video], { encoding: "utf8" }).stdout);
const [fn, fd] = probe.streams[0].r_frame_rate.split("/").map(Number);
const FPS = fn / fd, DUR = Number(probe.format.duration);

// ---------------------------------------------------------------- cuts
const W = 96, H = 54, SZ = W * H * 3;
const raw = spawnSync("ffmpeg", ["-v", "error", "-i", video, "-vf", `crop=iw*0.7:ih*0.7:iw*0.15:ih*0.15,scale=${W}:${H}`, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { maxBuffer: 2 ** 31 }).stdout;
const n = Math.floor(raw.length / SZ);
const diff = new Float64Array(n), hdist = new Float64Array(n);
let prevHist = null;
for (let i = 0; i < n; i++) {
  const hist = new Float64Array(48);
  let d = 0;
  for (let p = 0; p < SZ; p++) {
    const v = raw[i * SZ + p];
    hist[(p % 3) * 16 + (v >> 4)]++;
    if (i) d += Math.abs(v - raw[(i - 1) * SZ + p]);
  }
  diff[i] = i ? d / SZ : 0;
  if (prevHist) { let s = 0; for (let k = 0; k < 48; k++) s += Math.abs(hist[k] - prevHist[k]); hdist[i] = s / (2 * W * H * 3); }
  prevHist = hist;
}
const cutsF = [];
for (let i = 1; i < n; i++) {
  const loc = [];
  for (let j = Math.max(1, i - 12); j < Math.min(n, i + 13); j++) if (j !== i) loc.push(diff[j]);
  loc.sort((a, b) => a - b);
  const med = loc[loc.length >> 1] || 0;
  if ((diff[i] > Math.max(18, 4 * med) && hdist[i] > 0.12) || hdist[i] > 0.35) {
    if (cutsF.length && i - cutsF.at(-1) <= 2) { if (diff[i] > diff[cutsF.at(-1)]) cutsF[cutsF.length - 1] = i; }
    else cutsF.push(i);
  }
}
// border flag: the left 8% strip stays near black through the shot
const edge = spawnSync("ffmpeg", ["-v", "error", "-i", video, "-vf", "fps=4,crop=iw*0.08:ih*0.5:0:ih*0.25,scale=8:8,format=gray", "-f", "rawvideo", "-"], { maxBuffer: 1 << 28 }).stdout;
const edgeAt = t => { const k = Math.min(Math.floor(edge.length / 64) - 1, Math.max(0, Math.floor(t * 4))); let s = 0; for (let j = 0; j < 64; j++) s += edge[k * 64 + j]; return s / 64; };
const bounds = [0, ...cutsF.map(f => f / FPS), DUR];
const shots = [];
for (let i = 0; i < bounds.length - 1; i++) {
  const a = bounds[i], b = bounds[i + 1];
  let s = 0, c = 0;
  for (let t = a + 0.25; t < b - 0.1; t += 0.25) { s += edgeAt(t); c++; }
  if (!c) { s = edgeAt((a + b) / 2); c = 1; }
  shots.push({ n: i + 1, from: Math.round(a * 1000) / 1000, to: Math.round(b * 1000) / 1000, frames: Math.round((b - a) * FPS), border: s / c < 14 });
}

// ---------------------------------------------------------------- chorus repeats
let repeats = null;
if (chorusAt != null) {
  const SR = 8000, HOP = 80; // 100 Hz envelope
  const a = spawnSync("ffmpeg", ["-v", "error", "-i", video, "-vn", "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 1 << 30 }).stdout;
  const x = new Float32Array(a.buffer.slice(a.byteOffset, a.byteOffset + a.length - (a.length % 4)));
  // band-pass 1-4 kHz with two biquads (RBJ), then an RMS envelope
  const biquad = (sig, type, f0, q) => {
    const w = 2 * Math.PI * f0 / SR, al = Math.sin(w) / (2 * q), cs = Math.cos(w);
    const b = type === "hp" ? [(1 + cs) / 2, -(1 + cs), (1 + cs) / 2] : [(1 - cs) / 2, 1 - cs, (1 - cs) / 2];
    const a0 = 1 + al, a1 = -2 * cs, a2 = 1 - al;
    const y = new Float32Array(sig.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < sig.length; i++) { const v = (b[0] * sig[i] + b[1] * x1 + b[2] * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = sig[i]; y2 = y1; y1 = v; y[i] = v; }
    return y;
  };
  const band = biquad(biquad(x, "hp", 1000, 0.707), "lp", 4000, 0.707);
  const m = Math.floor(band.length / HOP), env = new Float64Array(m);
  for (let i = 0; i < m; i++) { let s = 0; for (let j = 0; j < HOP; j++) { const v = band[i * HOP + j]; s += v * v; } env[i] = Math.log(Math.sqrt(s / HOP) + 1e-4); }
  const i0 = Math.round(chorusAt * 100), L = 1000;
  const ref = env.slice(i0, i0 + L); const rm = ref.reduce((p, v) => p + v, 0) / L; const rr = ref.map(v => v - rm); const rn = Math.hypot(...rr);
  const score = new Float64Array(m - L);
  for (let k = 0; k < m - L; k++) {
    let mu = 0; for (let j = 0; j < L; j++) mu += env[k + j]; mu /= L;
    let s = 0, q = 0; for (let j = 0; j < L; j++) { const v = env[k + j] - mu; s += v * rr[j]; q += v * v; }
    score[k] = s / (Math.sqrt(q) * rn || 1);
  }
  const peaks = [];
  for (let k = 1; k < score.length - 1; k++) if (score[k] > 0.6 && score[k] >= score[k - 1] && score[k] >= score[k + 1]) peaks.push([k, score[k]]);
  peaks.sort((p, q) => q[1] - p[1]);
  const kept = [];
  for (const p of peaks) if (kept.every(k => Math.abs(k[0] - p[0]) > 2000)) kept.push(p);
  repeats = kept.sort((p, q) => p[0] - q[0]).map(([k, s]) => ({ at: Math.round(k * 10) / 1000, score: Math.round(s * 1000) / 1000, sync: Math.round((k / 100 - chorusAt) * 1000) / 1000 }));
}

// ---------------------------------------------------------------- report
console.log(`${video}: ${DUR.toFixed(2)} s at ${FPS} fps, ${shots.length} shots (${shots.filter(s => s.border).length} with a border)`);
for (const s of shots) console.log(`  ${String(s.n).padStart(3)}  ${s.from.toFixed(3).padStart(8)} - ${s.to.toFixed(3).padStart(8)}  ${String(s.frames).padStart(4)} f  ${s.border ? "border" : "full"}`);
if (repeats) {
  console.log(`\nchorus window ${chorusAt}-${chorusAt + 10} s repeats at:`);
  for (const r of repeats) console.log(`  ${r.at.toFixed(2).padStart(8)} s  score ${r.score}  -> shots from this repeat take "sync": ${r.sync}`);
}
if (outPath) { writeFileSync(outPath, JSON.stringify({ video, fps: FPS, duration: DUR, shots, repeats }, null, 2) + "\n"); console.log(`\nwrote ${outPath}`); }
