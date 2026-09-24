#!/usr/bin/env node
// Download a music track or sound effect you found in the browser into a project, with a
// provenance record beside it. This is the one step of the skill that uses the network; the
// build and the render stay offline.
//
// Usage:
//   node .claude/skills/ip-17-pro-style/scripts/fetch-audio.mjs <file-url> <project>/assets/audio/<name>.mp3 \
//     --page <track page URL> --license "<licence name>" [--license-url <url>] \
//     [--title "<title>"] [--artist "<artist>"] [--notes "<anything else>"] [--force]
//
// Writes <name>.mp3 and <name>.mp3.provenance.json (source page, file URL, licence, title,
// artist, retrieval time, SHA-256, size, duration). Refuses to overwrite without --force, and
// refuses anything ffprobe cannot read as audio. Check the licence on the track page before
// downloading: for web video you need commercial use and no Content ID registration.

import { writeFileSync, existsSync, mkdirSync, unlinkSync, renameSync } from "node:fs";
import { dirname, resolve, extname } from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const usage = m => {
  if (m) console.error(m);
  console.error('Usage: node fetch-audio.mjs <file-url> <out-file> --page <url> --license "<name>" [--license-url <url>] [--title ..] [--artist ..] [--notes ..] [--force]');
  process.exit(1);
};
if (!args.length || args.includes("--help")) usage();
const opt = k => {
  const i = args.indexOf(`--${k}`);
  if (i < 0) return undefined;
  if (i + 1 >= args.length || args[i + 1].startsWith("--")) usage(`--${k} needs a value.`);
  return args[i + 1];
};
const [url, outArg] = args.filter((a, i) => !a.startsWith("--") && !(i && args[i - 1].startsWith("--") && args[i - 1] !== "--force"));
if (!url || !outArg) usage("Give the file URL and the output path.");
let parsed;
try { parsed = new URL(url); } catch { usage(`Not a URL: ${url}`); }
if (!/^https?:$/.test(parsed.protocol)) usage("Only http(s) downloads are supported.");
// Every flag is read before anything is downloaded, so a missing value never leaves a half-done file.
const page = opt("page"), license = opt("license"), licenseUrl = opt("license-url"), title = opt("title"), artist = opt("artist"), notes = opt("notes");
if (!page || !license) usage("--page and --license are required so the project records where the audio came from.");
const out = resolve(outArg);
if (!/\.(mp3|wav|m4a|aac|flac|ogg)$/i.test(out)) usage("The output must end in .mp3, .wav, .m4a, .aac, .flac, or .ogg.");
if (existsSync(out) && !args.includes("--force")) usage(`${outArg} exists; pass --force to replace it.`);
// This is the skill's one deliberate download; the offline guard would (rightly) block it and
// log it against the project's audit.
if (/offline-guard\.cjs/.test(process.env.NODE_OPTIONS || "")) usage("The offline guard is preloaded (NODE_OPTIONS). Run fetch-audio in a shell without it: env -u NODE_OPTIONS -u IP_OFFLINE_LOG node ...");

let res, buf;
try {
  res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (HyperFrames student kit; ip-17-pro-style fetch-audio)" }, redirect: "follow", signal: AbortSignal.timeout(60000) });
  if (!res.ok) usage(`Download failed: HTTP ${res.status} for ${url}`);
  buf = Buffer.from(await res.arrayBuffer());
} catch (e) {
  usage(`Download failed for ${url}: ${e.name === "TimeoutError" ? "no response within 60 s" : e.cause?.code || e.message}`);
}
// Probe a temporary copy; the existing file (with --force) is only replaced by playable audio.
mkdirSync(dirname(out), { recursive: true });
const tmp = `${out}.download${extname(out)}`;
writeFileSync(tmp, buf);
const probe = spawnSync("ffprobe", ["-v", "error", "-select_streams", "a:0", "-show_entries", "stream=codec_name,sample_rate,channels:format=duration", "-of", "json", tmp], { encoding: "utf8" });
let info = null;
try { info = JSON.parse(probe.stdout); } catch {}
const duration = Number(info?.format?.duration);
if (probe.status !== 0 || !info?.streams?.length || !(duration > 0)) {
  unlinkSync(tmp);
  usage(`${url} is not playable audio (content-type ${res.headers.get("content-type")}); nothing was changed.`);
}
renameSync(tmp, out);
const record = {
  title: title ?? null,
  artist: artist ?? null,
  source_page: page,
  file_url: url,
  license,
  license_url: licenseUrl ?? null,
  notes: notes ?? null,
  retrieved: new Date().toISOString(),
  sha256: createHash("sha256").update(buf).digest("hex"),
  bytes: buf.length,
  duration_s: Math.round(duration * 1000) / 1000,
  codec: info.streams[0].codec_name,
  sample_rate: Number(info.streams[0].sample_rate),
  channels: info.streams[0].channels,
};
writeFileSync(`${out}.provenance.json`, JSON.stringify(record, null, 2) + "\n");
console.log(`Saved ${outArg} (${record.duration_s}s ${record.codec}, ${Math.round(buf.length / 1024)} KB) and ${outArg}.provenance.json`);
console.log(`Licence: ${license}${record.license_url ? ` (${record.license_url})` : ""}. Add it to the project's VERIFY.md.`);
