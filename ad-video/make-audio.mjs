// Synthesises the 30s soundtrack (music bed + sound effects) as a 44.1kHz stereo WAV.
// Everything is generated from scratch here, so there is nothing to license.
// The picture and the sound share ./timing.js, so cuts and hits land on the beat.
//   node make-audio.mjs --out music.wav
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const T = createRequire(import.meta.url)("./timing.js");
const EV = T.EV;
const outPath = path.resolve((() => { const i = process.argv.indexOf("--out"); return i > -1 ? process.argv[i + 1] : path.join(here, "music.wav"); })());

const SR = 44100, DUR = T.DURATION, N = Math.round(SR * DUR);
const L = new Float32Array(N), R = new Float32Array(N);
let seed = 1234567;
const rng = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const TWO_PI = Math.PI * 2;

// Add a mono generator into the stereo bus. fn(tau, absTime) -> sample
function add(t0, len, fn, gain = 1, pan = 0) {
  const s0 = Math.max(0, Math.round(t0 * SR)), n = Math.round(len * SR);
  const gl = gain * Math.cos((pan + 1) * Math.PI / 4), gr = gain * Math.sin((pan + 1) * Math.PI / 4);
  for (let i = 0; i < n; i++) {
    const idx = s0 + i; if (idx >= N) break;
    const tau = i / SR, v = fn(tau, t0 + tau);
    L[idx] += v * gl; R[idx] += v * gr;
  }
}
const lp = a => { let y = 0; return x => (y += a * (x - y)); };       // one-pole low-pass
const lpA = hz => 1 - Math.exp(-TWO_PI * hz / SR);
const midi = n => 440 * Math.pow(2, (n - 69) / 12);

/* ---------------- instruments ---------------- */
function kick(t0, g = 1) {
  add(t0, .38, tau => {
    const ph = TWO_PI * (46 * tau + 125 * (1 - Math.exp(-30 * tau)) / 30);
    return (Math.sin(ph) * Math.exp(-tau * 9) + (tau < .004 ? (rng() * 2 - 1) * .35 : 0)) * Math.min(1, tau / .0015);
  }, .95 * g);
}
function clap(t0, g = 1) {
  let prev = 0;
  add(t0, .3, tau => {
    const n = rng() * 2 - 1, hp = n - prev * .6; prev = n;
    const bursts = (tau < .012 ? 1 : 0) * Math.exp(-tau * 90) + (tau >= .012 && tau < .026 ? Math.exp(-(tau - .012) * 90) : 0) + (tau >= .026 ? Math.exp(-(tau - .026) * 20) * .8 : 0);
    return hp * bursts;
  }, .36 * g, .08);
}
function hat(t0, g = 1, open = false) {
  let prev = 0;
  add(t0, open ? .3 : .07, tau => { const n = rng() * 2 - 1, hp = n - prev; prev = n; return hp * Math.exp(-tau * (open ? 16 : 85)); }, .13 * g, -.18);
}
function bass(t0, f, dur, g = 1) {
  const f1 = lp(lpA(650)), ph0 = rng();
  add(t0, dur + .12, (tau, abs) => {
    const saw = 2 * (((f * tau + ph0) % 1)) - 1;
    const env = Math.min(1, tau / .006) * Math.exp(-tau * 3.2) * (tau > dur ? Math.exp(-(tau - dur) * 45) : 1);
    return (f1(saw) * .75 + Math.sin(TWO_PI * f * tau) * .7) * env;
  }, .34 * g);
}
function arp(t0, f, g = 1, pan = 0) {
  const f1 = lp(lpA(3600));
  add(t0, .24, tau => {
    const ph = (f * tau) % 1, p = ph < .32 ? 1 : -1;
    return f1(p) * Math.min(1, tau / .002) * Math.exp(-tau * 15);
  }, .075 * g, pan);
}
function pad(t0, dur, freqs, g = 1) {
  const fs_ = freqs.map(f => [lp(lpA(1300)), lp(lpA(1300)), f, rng()]);
  add(t0, dur + .5, (tau, abs) => {
    let s = 0;
    for (const [a, b, f, ph] of fs_) { s += a(2 * (((f * 1.002 * tau + ph) % 1)) - 1) + b(2 * (((f * .998 * tau + ph * .5) % 1)) - 1); }
    const env = Math.min(1, tau / .3) * (tau > dur ? Math.exp(-(tau - dur) * 8) : 1);
    const duck = 1 - .62 * Math.exp(-(abs % T.BEAT) * 9);    // sidechain-style pump on every kick
    return s * env * duck / freqs.length;
  }, .1 * g);
}
function whoosh(t0, dur, g = 1, f0 = 260, f1 = 5200) {
  let low = 0, band = 0;
  add(t0, dur, tau => {
    const p = tau / dur, fc = f0 * Math.pow(f1 / f0, p), f = 2 * Math.sin(Math.PI * fc / SR);
    const n = rng() * 2 - 1, high = n - low - .22 * band; band += f * high; low += f * band;
    return band * Math.pow(Math.sin(Math.PI * p), 1.6);
  }, .55 * g);
}
function crash(t0, len = 1.1, g = 1) {
  let prev = 0, y = 0;
  add(t0, len, tau => { const n = rng() * 2 - 1; y += .35 * (n - y); const hp = n - y; prev = n; return hp * Math.exp(-tau * 3.4) * Math.min(1, tau / .003); }, .3 * g, .1);
}
function boom(t0, g = 1) {
  add(t0, .7, tau => Math.sin(TWO_PI * (38 * tau + 40 * (1 - Math.exp(-9 * tau)) / 9)) * Math.exp(-tau * 5.5) * Math.min(1, tau / .003), .85 * g);
}
function thump(t0, g = 1) {             // word-slam: low hit + short noise snap
  boom(t0, .55 * g);
  let prev = 0;
  add(t0, .09, tau => { const n = rng() * 2 - 1, hp = n - prev * .5; prev = n; return hp * Math.exp(-tau * 60); }, .22 * g);
}
function bubble(t0, g = 1, f0 = 420) {  // UI pop
  add(t0, .16, tau => Math.sin(TWO_PI * (f0 * tau + (f0 * 1.8) * (1 - Math.exp(-48 * tau)) / 48)) * Math.exp(-tau * 26) * Math.min(1, tau / .0015), .3 * g);
}
function bell(t0, f, g = 1, dur = .9, pan = 0) {
  add(t0, dur, tau => {
    const e = Math.exp(-tau * (5 + f / 600));
    return (Math.sin(TWO_PI * f * tau) + .45 * Math.sin(TWO_PI * f * 2.756 * tau) * Math.exp(-tau * 14) + .3 * Math.sin(TWO_PI * f * 5.4 * tau) * Math.exp(-tau * 25)) * e * Math.min(1, tau / .002);
  }, .2 * g, pan);
}
function click(t0, g = 1) {
  let prev = 0;
  add(t0, .03, tau => { const n = rng() * 2 - 1, hp = n - prev; prev = n; return hp * Math.exp(-tau * 150); }, .16 * g, (rng() - .5) * .5);
}
function snap(t0, g = 1) {              // sticker lands
  click(t0, 1.6 * g);
  add(t0, .1, tau => Math.sin(TWO_PI * 150 * tau) * Math.exp(-tau * 38), .5 * g);
  bubble(t0 + .015, .7 * g, 520);
}
function beep(t0, f, dur, g = 1) {
  const f1 = lp(lpA(2600));
  add(t0, dur + .03, tau => f1(Math.sin(TWO_PI * f * tau) > 0 ? 1 : -1) * Math.min(1, tau / .004) * (tau > dur ? Math.exp(-(tau - dur) * 120) : 1), .13 * g);
}
function sparkle(t0, notes, step, g = 1) { notes.forEach((n, i) => bell(t0 + i * step, midi(n), g, .8, ((i % 2) - .5) * .5)); }

/* ---------------- music bed ---------------- */
// I - V - vi - IV in C major, one chord per bar (2s); 14 bars, then a C major end card.
const CHORDS = [
  { root: 48, tones: [60, 64, 67] }, // C
  { root: 43, tones: [55, 59, 62] }, // G
  { root: 45, tones: [57, 60, 64] }, // Am
  { root: 41, tones: [53, 57, 60] }, // F
];
const END_DRUMS = 28;                   // drums stop when the end card lands
const BARS = Math.round(END_DRUMS / T.BAR);
for (let bar = 0; bar < BARS; bar++) {
  const bt = bar * T.BAR, ch = CHORDS[bar % 4];
  pad(bt, T.BAR, ch.tones.map(midi), 1);
  // drums
  for (let b = 0; b < 4; b++) {
    const t = bt + b * T.BEAT;
    kick(t, b === 0 ? 1 : .92);
    if (b === 1 || b === 3) clap(t);
    hat(t + T.BEAT / 2, 1);
    if (b === 3) hat(t + T.BEAT * .75, .8, true);
  }
  hat(bt, .5); hat(bt + T.BEAT * 2, .5);
  // bass from bar 1
  if (bar >= 1) {
    const r = midi(ch.root);
    bass(bt, r, .42);
    bass(bt + .75, r, .2, .9);
    bass(bt + 1.25, r * 2, .2, .8);
    bass(bt + 1.75, r * 1.5, .2, .85);
  }
  // arpeggio from bar 2 (16th notes, two octaves up)
  if (bar >= 2) {
    const seq = [0, 1, 2, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 3, 2, 1];
    const tones = ch.tones.map(m => midi(m + 12)).concat(midi(ch.tones[0] + 24));
    for (let s = 0; s < 16; s++) arp(bt + s * T.BEAT / 4, tones[seq[s]], s % 4 === 0 ? 1.15 : 1, (s % 2 ? .32 : -.32));
  }
}
// snare/clap build into the end card (last 1.5s before 28.0)
for (let i = 0; i < 6; i++) clap(26.5 + i * .25, .5 + i * .1);
for (let i = 0; i < 8; i++) clap(27.5 + i * .0625 * 2, .6 + i * .07);
whoosh(27.0, 1.1, 1.2, 200, 7000);
// end card: sustained C major bed with a fading tail
pad(28.0, 2.0, [midi(48), midi(55), midi(60), midi(64), midi(67), midi(72)], 4.2);
bell(28.55, midi(79), .5, 1.4, .2); bell(28.95, midi(84), .45, 1.1, -.2);   // soft sparkle so the card doesn't go quiet
kick(28.0, 1.1); crash(28.0, 1.6, 1.2); boom(28.0, 1);

/* ---------------- sound effects (all tied to on-screen events) ---------------- */
// colour wipes
T.CUTS.forEach((c, i) => { whoosh(c - .38, .7, 1, 220, 6200); crash(c - .02, .9, i === 6 ? 0 : .7); boom(c - .02, .55); });
// scene 1
[0, EV.s1.words + EV.s1.wordStep].forEach(t => thump(t));   // frame-0 hit + the second word
whoosh(EV.s1.card - .3, .6, .7); EV.s1.q.forEach((t, i) => bubble(t, 1, 380 + i * 90));
bubble(EV.s1.emoji, 1.1, 300); bubble(EV.s1.pill, 1.1, 460); click(EV.s1.pill + .02);
// scene 2
for (let i = 0; i < 3; i++) thump(EV.s2.words + i * EV.s2.wordStep, .8);
whoosh(EV.s2.win - .3, .55, .7);
const FIELD_LEN = [11, 22, 20, 2, 1];
EV.s2.fields.forEach((end, i) => {
  const start = end - .38; for (let c = 0; c < FIELD_LEN[i]; c++) click(start + c * (.38 / FIELD_LEN[i]), .8);
  bell(end, midi([72, 74, 76, 79, 81][i]), .55);
});
bubble(EV.s2.btn, 1, 330); click(EV.s2.click, 3); bell(EV.s2.click, midi(72), .8); bell(EV.s2.click + .04, midi(76), .7); bell(EV.s2.click + .08, midi(79), .7); bell(EV.s2.click + .12, midi(84), .6);
add(EV.s2.click, .25, tau => Math.sin(TWO_PI * 90 * tau) * Math.exp(-tau * 14), .4);
// scene 3
for (let i = 0; i < 3; i++) thump(EV.s3.words + i * EV.s3.wordStep, .8);
whoosh(EV.s3.card - .3, .55, .7); bubble(EV.s3.pill, 1.1, 480);
whoosh(EV.s3.lensIn - .05, .75, .5, 400, 2600);
beep(EV.s3.alert, 880, .09, 1); beep(EV.s3.alert + .13, 660, .09, 1); beep(EV.s3.alert + .26, 880, .12, 1);
thump(EV.s3.alert, .9);
EV.s3.chips.forEach((t, i) => bubble(t, .9, 360 + i * 70));
bell(EV.s3.pick, midi(84), 1.1, 1.2); bell(EV.s3.pick + .06, midi(88), 1, 1.2); bell(EV.s3.pick + .12, midi(91), .9, 1.2);
// scene 4
for (let i = 0; i < 3; i++) thump(EV.s4.words + i * EV.s4.wordStep, .8);
whoosh(EV.s4.box - .3, .6, .7);
EV.s4.stickers.forEach(t => { whoosh(t - .5, .5, .55, 500, 3500); snap(t); });
sparkle(EV.s4.pill, [84, 88, 91, 96], .07, .9); bubble(EV.s4.pill, 1, 480);
// scene 5
for (let i = 0; i < 3; i++) thump(EV.s5.words + i * EV.s5.wordStep, .8);
whoosh(EV.s5.panel - .3, .6, .7);
bubble(EV.s5.m1, 1.1, 360); bubble(EV.s5.m1 + .06, .8, 520);
bubble(EV.s5.listenFrom, .8, 300); bubble(EV.s5.listenFrom + .08, .7, 420);
whoosh(EV.s5.m2 - .08, .25, .5, 800, 4200); bubble(EV.s5.m2, 1.1, 460); bubble(EV.s5.m2 + .05, .8, 640);
bubble(EV.s5.m3, 1.1, 360); bubble(EV.s5.m3 + .06, .8, 520);
sparkle(EV.s5.heart, [88, 91, 96], .06, .8);
// scene 6
for (let i = 0; i < 3; i++) thump(EV.s6.words + i * EV.s6.wordStep, .8);
whoosh(EV.s6.card - .3, .6, .7);
const TICK_NOTES = [72, 74, 76, 79, 81, 84, 86, 88];
EV.s6.ticks.forEach((t, i) => { bell(t, midi(TICK_NOTES[i]), .75, .6, (i % 2 ? .3 : -.3)); bubble(t, .6, 500 + i * 50); });
thump(EV.s6.stamp, 1.4); crash(EV.s6.stamp, 1.4, 1.1); sparkle(EV.s6.stamp + .05, [84, 88, 91, 96, 100], .06, 1);
// scene 7
for (let i = 0; i < 3; i++) thump(EV.s7.words + i * EV.s7.wordStep, .8);
for (let i = 0; i < 13; i++) bubble(EV.s7.chips + i * EV.s7.chipStep, .55, 380 + i * 38);
bell(EV.s7.chips + .45, midi(79), .7); bell(EV.s7.chips + .53, midi(84), .7);
bubble(EV.s7.sub, 1, 420);
thump(EV.s7.cta, 1.3); sparkle(EV.s7.cta, [72, 76, 79, 84, 88, 91], .06, 1); crash(EV.s7.cta, 1.2, .8);
bubble(EV.s7.cta + .25, .9, 500); bubble(EV.s7.url, 1, 450);
// scene 8
sparkle(EV.s8.logo, [72, 76, 79, 84, 88], .08, 1.2); bubble(EV.s8.tag, 1, 420); bubble(EV.s8.url, 1, 500);
bell(EV.s8.logo, midi(60), 1, 1.8); bell(EV.s8.logo, midi(67), .8, 1.8);

/* ---------------- master ---------------- */
// gentle fade in/out so the file loops cleanly and never clicks at the end
const FADE_IN = Math.round(.004 * SR), FADE_OUT = Math.round(.5 * SR);
for (let i = 0; i < FADE_IN; i++) { const g = i / FADE_IN; L[i] *= g; R[i] *= g; }
for (let i = 0; i < FADE_OUT; i++) { const g = Math.pow(i / FADE_OUT, 1.5), idx = N - 1 - i; L[idx] *= g; R[idx] *= g; }
// soft-clip then normalise to -1.2 dBFS peak
const drive = 1.25, norm = Math.tanh(drive);
let peak = 0;
for (let i = 0; i < N; i++) { L[i] = Math.tanh(L[i] * drive) / norm; R[i] = Math.tanh(R[i] * drive) / norm; peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); }
const target = Math.pow(10, -1.2 / 20), gain = target / peak;
let sumSq = 0;
const pcm = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  const l = Math.max(-1, Math.min(1, L[i] * gain)), r = Math.max(-1, Math.min(1, R[i] * gain));
  sumSq += l * l + r * r;
  pcm.writeInt16LE(Math.round(l * 32767), i * 4); pcm.writeInt16LE(Math.round(r * 32767), i * 4 + 2);
}
const hdr = Buffer.alloc(44);
hdr.write("RIFF", 0); hdr.writeUInt32LE(36 + pcm.length, 4); hdr.write("WAVE", 8); hdr.write("fmt ", 12);
hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(2, 22); hdr.writeUInt32LE(SR, 24);
hdr.writeUInt32LE(SR * 4, 28); hdr.writeUInt16LE(4, 32); hdr.writeUInt16LE(16, 34); hdr.write("data", 36); hdr.writeUInt32LE(pcm.length, 40);
fs.writeFileSync(outPath, Buffer.concat([hdr, pcm]));
const rms = Math.sqrt(sumSq / (N * 2));
console.log(`Wrote ${outPath}`);
console.log(`  duration ${DUR}s  peak ${(20 * Math.log10(target)).toFixed(1)} dBFS  RMS ${(20 * Math.log10(rms)).toFixed(1)} dBFS`);
