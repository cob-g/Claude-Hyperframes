#!/usr/bin/env node
// Transcribe a video/audio file locally with whisper.cpp (via `hyperframes transcribe`)
// -> word-level JSON in the kit's common format. No API key, nothing uploaded.
//
// Usage:
//   node scripts/transcribe-local.mjs <input> [--output path] [--model small.en] [--language en]
//
// Defaults:
//   --output   <input-without-ext>.json next to the source
//   --model    medium.en (tiny.en, base.en, small.en, medium.en, large-v3)
//   --language en
//
// Output: { text, audio_duration_secs, words: [{ text, start, end }], provider, model }

import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { dirname, join, resolve, basename, extname } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { argv, exit } from "node:process";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = resolve(SCRIPT_DIR, "..");

function die(msg, code = 1) {
  console.error(msg);
  exit(code);
}

const args = argv.slice(2);
if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
  console.log(
    "Usage: node scripts/transcribe-local.mjs <input> [--output path] " +
      "[--model tiny.en|base.en|small.en|medium.en|large-v3] [--language en]",
  );
  exit(args.length === 0 ? 1 : 0);
}

const opts = { input: null, output: null, model: "medium.en", language: "en" };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--output" || a === "-o") opts.output = args[++i];
  else if (a === "--model" || a === "-m") opts.model = args[++i];
  else if (a === "--language" || a === "--lang" || a === "-l") opts.language = args[++i];
  else if (a.startsWith("-")) die(`Unknown option: ${a}`);
  else if (!opts.input) opts.input = a;
  else die(`Unexpected argument: ${a}`);
}

const input = resolve(opts.input);
if (!existsSync(input)) die(`Input not found: ${input}`);
const output = resolve(
  opts.output ?? join(dirname(input), basename(input, extname(input)) + ".json"),
);

// Full source duration from ffprobe, so trailing silence is preserved for cutting.
const probe = spawnSync(
  "ffprobe",
  ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", input],
  { encoding: "utf8" },
);
if (probe.status !== 0) die(`ffprobe failed: ${probe.stderr}`);
const duration = Number(probe.stdout.trim());

const workDir = mkdtempSync(join(tmpdir(), "hf-transcribe-"));
try {
  console.log(`Transcribing locally with whisper.cpp (${opts.model}) ...`);
  const hf = join(WORKSPACE_ROOT, "node_modules", ".bin", "hyperframes");
  const run = spawnSync(
    hf,
    ["transcribe", input, "--engine", "whisper", "--model", opts.model,
      "--language", opts.language, "--dir", workDir],
    { stdio: ["ignore", "ignore", "inherit"] },
  );
  if (run.status !== 0) die(`hyperframes transcribe failed (exit ${run.status})`);

  const raw = JSON.parse(readFileSync(join(workDir, "transcript.json"), "utf8"));
  const list = Array.isArray(raw) ? raw : raw.words;
  if (!Array.isArray(list)) die("Unexpected transcript shape from hyperframes transcribe");

  const words = list
    .map((w) => ({ text: String(w.text ?? w.word ?? "").trim(), start: Number(w.start), end: Number(w.end) }))
    .filter((w) => w.text && Number.isFinite(w.start) && Number.isFinite(w.end));

  const result = {
    text: words.map((w) => w.text).join(" "),
    audio_duration_secs: Number.isFinite(duration) ? duration : words.at(-1)?.end ?? 0,
    words,
    provider: "whisper.cpp (local)",
    model: opts.model,
  };
  writeFileSync(output, JSON.stringify(result, null, 2) + "\n");
  console.log(`Wrote ${words.length} words (${result.audio_duration_secs.toFixed(2)}s) -> ${output}`);
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
