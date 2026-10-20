// Renders ad.html frame-by-frame with the system Chrome over the DevTools protocol.
// No npm dependencies: uses Node's built-in WebSocket + fetch.
// Each worker runs its OWN Chrome process, because background tabs in a shared
// headless window never receive animation frames and would stall.
//
//   node render.mjs --out /path/frames                       # all frames (30fps x 30s)
//   node render.mjs --out /path/preview --times 1.5,8.6,23.4  # just those moments
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (name, def) => { const i = process.argv.indexOf(`--${name}`); return i > -1 ? process.argv[i + 1] : def; };
const outDir = path.resolve(arg("out", path.join(here, "frames")));
const fps = Number(arg("fps", 30));
const duration = Number(arg("dur", 30));
const workers = Number(arg("workers", 4));
const timesArg = arg("times", null);
const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

if (!fs.existsSync(CHROME)) { console.error("Chrome not found at", CHROME); process.exit(1); }
fs.mkdirSync(outDir, { recursive: true });

const jobs = timesArg
  ? timesArg.split(",").map((s, i) => ({ t: Number(s), name: `t_${String(i).padStart(2, "0")}_${Number(s).toFixed(2)}.png` }))
  : Array.from({ length: Math.round(fps * duration) }, (_, i) => ({ t: i / fps, name: `f_${String(i).padStart(5, "0")}.png` }));

const procs = [];
const cleanup = () => { for (const p of procs) { try { p.chrome.kill(); } catch {} try { fs.rmSync(p.profile, { recursive: true, force: true }); } catch {} } };
process.on("exit", cleanup); process.on("SIGINT", () => { cleanup(); process.exit(130); });

class CDP {
  constructor(url) {
    this.id = 0; this.cb = new Map();
    this.ws = new WebSocket(url);
    this.open = new Promise((res, rej) => { this.ws.addEventListener("open", res); this.ws.addEventListener("error", rej); });
    this.ws.addEventListener("message", e => {
      const m = JSON.parse(e.data);
      if (m.id && this.cb.has(m.id)) { const f = this.cb.get(m.id); this.cb.delete(m.id); f(m); }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((res, rej) => {
      this.cb.set(id, m => (m.error ? rej(new Error(`${method}: ${JSON.stringify(m.error)}`)) : res(m.result)));
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
}

async function launch(workerIndex) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "ad-chrome-"));
  const port = 9300 + workerIndex * 7 + Math.floor(Math.random() * 6);
  const chrome = spawn(CHROME, [
    "--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    "--hide-scrollbars", "--no-first-run", "--no-default-browser-check", "--force-color-profile=srgb",
    "--window-size=1080,1080", "about:blank",
  ], { stdio: "ignore" });
  procs.push({ chrome, profile });
  for (let i = 0; i < 100; i++) {
    try { const r = await fetch(`http://127.0.0.1:${port}/json/version`); if (r.ok) break; } catch {}
    await new Promise(r => setTimeout(r, 150));
  }
  const url = pathToFileURL(path.join(here, "ad.html")).href;
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, { method: "PUT" })).json();
  const cdp = new CDP(target.webSocketDebuggerUrl);
  await cdp.open;
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1080, height: 1080, deviceScaleFactor: 1, mobile: false });
  for (let i = 0; i < 200; i++) {
    const v = await cdp.send("Runtime.evaluate", { expression: "window.__ready === true", returnByValue: true });
    if (v.result.value) return cdp;
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error("ad.html never became ready");
}

const started = Date.now();
let done = 0;
const queue = jobs.slice();
async function worker(i) {
  const cdp = await launch(i);
  for (;;) {
    const job = queue.shift();
    if (!job) break;
    await cdp.send("Runtime.evaluate", {
      expression: `seek(${job.t}); Promise.race([new Promise(r => requestAnimationFrame(() => r(true))), new Promise(r => setTimeout(() => r(false), 300))])`,
      awaitPromise: true,
    });
    const shot = await cdp.send("Page.captureScreenshot", { format: "png", optimizeForSpeed: true, clip: { x: 0, y: 0, width: 1080, height: 1080, scale: 1 } });
    fs.writeFileSync(path.join(outDir, job.name), Buffer.from(shot.data, "base64"));
    done++;
    if (done % 90 === 0 || done === jobs.length) {
      const el = (Date.now() - started) / 1000;
      console.log(`${done}/${jobs.length} frames  ${el.toFixed(0)}s  (~${((jobs.length - done) * el / done).toFixed(0)}s left)`);
    }
  }
}
await Promise.all(Array.from({ length: Math.min(workers, jobs.length) }, (_, i) => worker(i)));
console.log(`Rendered ${jobs.length} frame(s) to ${outDir} in ${((Date.now() - started) / 1000).toFixed(1)}s`);
cleanup();
process.exit(0);
