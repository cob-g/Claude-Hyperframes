// Offline guard for HyperFrames commands. Preload it to block and log every network connection
// that is not to this machine: from Node (the CLI), from child processes it runs (git, curl), and
// from the headless browser it launches.
//
//   export HYPERFRAMES_NO_TELEMETRY=1 IP_OFFLINE_LOG="$PWD/renders/offline.log"
//   export NODE_OPTIONS="--require <kit>/.claude/skills/ip-17-pro-style/scripts/offline-guard.cjs"
//   npx hyperframes render --quality draft --output renders/draft.mp4
//
// - Node: TCP connects to non-loopback hosts are refused; fetch() to them is rejected.
// - Child processes: http(s) URLs to non-loopback hosts in their arguments (git ls-remote, curl)
//   are rewritten to a closed local port, so they fail at once without leaving the machine.
// - Browsers: any process started with --headless or --remote-debugging-* gets --proxy-server
//   pointing at a refusing proxy inside this process, and WebRTC restricted to that proxy.
//   Browsers never proxy loopback, so the local file server keeps working. The generated page
//   also carries a Content-Security-Policy, so Chrome refuses remote loads before this point.
//
// Log lines (IP_OFFLINE_LOG) are "[offline-guard] <session> <ISO time> <pid> <event> <detail>".
// One session covers a top-level command and every process it starts. Events:
//   start      {"cwd", "argv"} of the top-level process
//   browser    a browser was launched through the proxy
//   blocked    a connection that content or tooling tried to make (fails the audit)
//   suppressed HyperFrames' own update check, skills check, or telemetry, from Node or git only
//              (matched by exact host; nothing left the machine)
//   output     {"path", "size", "mtimeMs"} of a render's --output file when the command exits,
//              so the audit can tie the log to that exact file
"use strict";
const net = require("node:net");
const http = require("node:http");
const fs = require("node:fs");
const cp = require("node:child_process");
const util = require("node:util");
const crypto = require("node:crypto");

const LOCAL = /^(localhost|127\.\d+\.\d+\.\d+|::1|\[::1\]|0\.0\.0\.0|::ffff:127\.\d+\.\d+\.\d+)$/i;
// HyperFrames' own maintenance traffic, by exact host (and repository path where a host serves
// anything else). Browser traffic is never classed this way.
function maintenance(target) {
  let u;
  try { u = new URL(/^[a-z]+:\/\//i.test(target) ? target : `https://${target}`); } catch { return false; }
  const host = u.hostname.toLowerCase(), path = u.pathname;
  if (["registry.npmjs.org", "us.i.posthog.com", "eu.i.posthog.com", "app.posthog.com", "skills.sh", "www.skills.sh"].includes(host)) return true;
  if (["raw.githubusercontent.com", "github.com", "codeload.github.com"].includes(host)) return /^\/heygen-com\/hyperframes(\.git)?(\/|$)/i.test(path);
  if (host === "api.github.com") return /^\/repos\/heygen-com\/hyperframes(\/|$)/i.test(path);
  return false;
}

if (!process.env.IP_GUARD_SESSION) process.env.IP_GUARD_SESSION = crypto.randomBytes(6).toString("hex");
const SESSION = process.env.IP_GUARD_SESSION;
const topLevel = !process.env.IP_GUARD_PARENT;
process.env.IP_GUARD_PARENT = String(process.pid);
const logFile = process.env.IP_OFFLINE_LOG;
function log(event, detail) {
  if (!logFile) return;
  try { fs.appendFileSync(logFile, `[offline-guard] ${SESSION} ${new Date().toISOString()} ${process.pid} ${event} ${detail}\n`); } catch {}
}
if (topLevel) {
  log("start", JSON.stringify({ cwd: process.cwd(), argv: process.argv.slice(1) }));
  // A render's output file, recorded at exit so the audit can match the exact file it checks.
  const argv = process.argv.slice(2);
  const i = argv.findIndex(a => a === "--output" || a === "-o");
  const outArg = i >= 0 ? argv[i + 1] : (argv.find(a => a.startsWith("--output=")) || "").slice(9) || null;
  if (argv.includes("render") && outArg) {
    const abs = require("node:path").resolve(process.cwd(), outArg);
    // Only a successful render that wrote the file during this session counts: an interrupted
    // or failed command leaves whatever file was there before, which it did not produce.
    const started = Date.now();
    process.on("exit", code => {
      try {
        const st = fs.statSync(abs);
        if (code === 0 && st.mtimeMs >= started - 1000) log("output", JSON.stringify({ path: abs, size: st.size, mtimeMs: Math.round(st.mtimeMs) }));
      } catch {}
    });
  }
}

function refuse(target, who) {
  const event = who !== "browser" && maintenance(target) ? "suppressed" : "blocked";
  if (event === "blocked") process.stderr.write(`[offline-guard] blocked ${target} (${who})\n`);
  log(event, `${target} (${who})`);
  return new Error(`offline-guard: network access to ${target} is blocked (this kit renders offline)`);
}

// ---------------------------------------------------------------- Node
function hostOf(args) {
  const a = args[0];
  if (typeof a === "object" && a) return { host: a.host || a.hostname || (a.path ? null : "localhost"), port: a.port, path: a.path, servername: a.servername };
  if (typeof a === "number") return { host: typeof args[1] === "string" ? args[1] : "localhost", port: a };
  return { path: a };
}
// TCP: every HTTP client, WebSocket, fetch (undici), and SDK ends up here.
const origConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  const opts = Array.isArray(args[0]) ? args[0][0] : args[0];
  const { host, port, path, servername } = hostOf([opts, args[1]]);
  if (!path && host && !LOCAL.test(String(host))) {
    const err = refuse(`${servername || host}:${port}`, "node");
    process.nextTick(() => this.destroy(err));
    return this;
  }
  return origConnect.apply(this, args);
};
// fetch: fail fast with a readable message instead of a socket error deep inside undici.
if (typeof globalThis.fetch === "function") {
  const origFetch = globalThis.fetch;
  globalThis.fetch = function (input, init) {
    let url;
    try { url = new URL(typeof input === "string" ? input : input.url || String(input)); } catch { return origFetch(input, init); }
    if ((url.protocol === "http:" || url.protocol === "https:") && !LOCAL.test(url.hostname)) return Promise.reject(refuse(url.href, "node"));
    return origFetch(input, init);
  };
}

// ---------------------------------------------------------------- browsers
// A proxy that refuses everything. The port is fixed per process so it is known before the
// browser spawns; if it cannot bind, the log says so and the audit fails.
const PROXY_PORT = 20000 + (process.pid % 30000);
const proxy = http.createServer((req, res) => {
  refuse(req.url, "browser");
  res.writeHead(403, { "content-type": "text/plain" });
  res.end("blocked by offline-guard");
});
proxy.on("connect", (req, socket) => {
  refuse(`https://${req.url}`, "browser");
  socket.end("HTTP/1.1 403 Forbidden\r\n\r\n");
});
proxy.on("error", e => log("blocked", `proxy-unavailable ${e.code || e.message}: browser traffic not covered`));
let proxyStarted = false;
function ensureProxy() {
  if (proxyStarted) return;
  proxyStarted = true;
  proxy.listen(PROXY_PORT, "127.0.0.1");
  proxy.unref();
}
const QUIET = ["--disable-background-networking", "--disable-component-update", "--disable-domain-reliability",
  "--disable-sync", "--no-pings", "--disable-client-side-phishing-detection", "--metrics-recording-only",
  "--force-webrtc-ip-handling-policy=disable_non_proxied_udp", "--webrtc-ip-handling-policy=disable_non_proxied_udp"];

// ---------------------------------------------------------------- child processes
function guardArgs(file, args) {
  if (!Array.isArray(args)) return args;
  const strs = args.map(String);
  if (strs.some(a => /^--(headless|remote-debugging-(pipe|port))/.test(a))) {
    ensureProxy();
    const out = strs.filter(a => !/^--(proxy-server|proxy-pac-url|no-proxy-server|proxy-bypass-list)/.test(a));
    out.push(`--proxy-server=http://127.0.0.1:${PROXY_PORT}`);
    // Drop Chrome's implicit bypass (which also sends link-local 169.254/16 and fe80::/10 direct)
    // and bypass loopback only.
    out.push("--proxy-bypass-list=<-loopback>;localhost;*.localhost;127.0.0.1/8;[::1]");
    for (const q of QUIET) if (!out.includes(q)) out.push(q);
    log("browser", `${String(file).split("/").pop()} via proxy 127.0.0.1:${PROXY_PORT}`);
    return out;
  }
  // Tools such as git ls-remote or curl: point remote URLs at a closed local port.
  let changed = false;
  const out = strs.map(a => {
    const m = a.match(/^(https?|git|ssh):\/\/([^/:@]+@)?([^/:]+)/i);
    if (!m || LOCAL.test(m[3])) return a;
    refuse(a, String(file).split("/").pop());
    changed = true;
    return "http://127.0.0.1:9/offline-guard";
  });
  return changed ? out : args;
}
function wrap(orig) {
  const wrapped = function (file, args, ...rest) {
    return orig.call(this, file, guardArgs(file, args), ...rest);
  };
  // Keep util.promisify(execFile) resolving to { stdout, stderr }.
  if (orig[util.promisify.custom]) {
    wrapped[util.promisify.custom] = (file, args, ...rest) => orig[util.promisify.custom](file, guardArgs(file, args), ...rest);
  }
  return wrapped;
}
for (const name of ["spawn", "execFile", "spawnSync", "execFileSync"]) cp[name] = wrap(cp[name]);
try { require("node:module").syncBuiltinESMExports(); } catch {}
