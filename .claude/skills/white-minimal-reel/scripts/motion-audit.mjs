#!/usr/bin/env node
// Measure the motion signature of a rendered White Minimal reel against its plan:
// animation scenes should update at the posterize rate (~12 unique frames/s) and never freeze
// for long; footage should update at the full frame rate.
//
// Usage: node motion-audit.mjs <project-dir> <render.mp4> [--plan wm-plan.json]
// Structural evidence only. It cannot judge taste; still watch the render.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
if (args.length < 2 || args.includes("--help")) {
  console.log("Usage: node motion-audit.mjs <project-dir> <render.mp4> [--plan wm-plan.json]");
  process.exit(args.length < 2 ? 1 : 0);
}
const project = resolve(args[0]);
const video = resolve(project, args[1]);
const plan = JSON.parse(readFileSync(resolve(project, args.includes("--plan") ? args[args.indexOf("--plan") + 1] : "wm-plan.json"), "utf8"));
const target = plan.style?.posterizeFps ?? 12;

const probe = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate", "-of", "csv=p=0", video], { encoding: "utf8" });
const [num, den] = (probe.stdout || "30/1").trim().split("/").map(Number);
const fps = num / (den || 1);

const W = 120, H = 214;
const raw = spawnSync("ffmpeg", ["-loglevel", "error", "-i", video, "-vf", `scale=${W}:${H}:flags=area,format=gray`, "-f", "rawvideo", "-"], { maxBuffer: 1 << 30 });
if (raw.status !== 0) { console.error("ffmpeg could not decode the render."); process.exit(1); }
const n = W * H, frames = Math.floor(raw.stdout.length / n);
const diff = [];
for (let i = 0; i + 1 < frames; i++) {
  let sum = 0;
  const a = i * n, b = (i + 1) * n;
  for (let k = 0; k < n; k++) sum += Math.abs(raw.stdout[a + k] - raw.stdout[b + k]);
  diff.push(sum / n);
}

// A frame is a posterize hold when its change is small next to the steps around it; it is
// still (no motion at all) when it and both neighbours are below the encoder-noise floor.
const NOISE = 0.3;
function measure(t0, t1) {
  const s = Math.max(1, Math.round(t0 * fps)), e = Math.min(diff.length - 1, Math.round(t1 * fps));
  let changes = 0, run = 0, longest = 0;
  for (let i = s; i < e; i++) {
    const around = Math.max(diff[i - 1], diff[i + 1]);
    const still = diff[i] < NOISE && around < NOISE;
    const hold = still || diff[i] < 0.4 * around;
    if (!hold) changes++;
    if (still) { run++; longest = Math.max(longest, run); } else run = 0;
  }
  const secs = Math.max(1 / fps, (e - s) / fps);
  return { rate: changes / secs, frozen: longest / fps };
}

let problems = 0;
const scenes = [...(plan.scenes || [])].sort((a, b) => a.start - b.start);
console.log(`render ${fps.toFixed(2)} fps, posterize target ${target} fps`);
for (const s of scenes) {
  // Skip the cut frames at both edges; judge the body of the scene.
  const m = measure(s.start + 0.1, s.end - 0.1);
  const early = measure(s.start + 0.1, s.start + Math.min(1.2, (s.end - s.start) * 0.6));
  const ok = early.rate <= target + 1.5 && early.rate >= target * 0.6;
  if (!ok) problems++;
  if (m.frozen > 0.9) problems++;
  console.log(`scene ${String(s.id).padEnd(16)} unique ${early.rate.toFixed(1)}/s early, ${m.rate.toFixed(1)}/s overall, longest hold ${m.frozen.toFixed(2)}s` +
    `${ok ? "" : "  <- expected ~" + target + "/s (posterize missing or too little motion)"}${m.frozen > 0.9 ? "  <- frozen; extend object/drift motion" : ""}`);
}
let t = 0;
for (const s of [...scenes, { start: Infinity }]) {
  const end = Math.min(s.start, frames / fps);
  if (end - t > 0.8) {
    const m = measure(t + 0.35, end - 0.1);
    const ok = m.rate >= Math.min(fps, 30) * 0.55;
    if (!ok) problems++;
    console.log(`footage ${t.toFixed(2)}-${end.toFixed(2)}s   unique ${m.rate.toFixed(1)}/s${ok ? "" : "  <- footage looks posterized or frozen"}`);
  }
  t = Math.max(t, s.end ?? t);
}
console.log(problems ? `${problems} motion issue(s).` : "Motion signature matches the style.");
process.exitCode = problems ? 1 : 0;
