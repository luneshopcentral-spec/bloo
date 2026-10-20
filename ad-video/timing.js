/* Shared timeline for the 30s ad. Loaded by ad.html (browser) and make-audio.mjs (Node)
   so the picture and the soundtrack are driven by the same numbers.
   120 BPM -> 1 beat = 0.5s, 1 bar = 2s, 15 bars = 30s. Scene cuts land on bar lines. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.TIMING = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const BPM = 120;
  const BEAT = 60 / BPM;
  const BAR = BEAT * 4;
  const FPS = 30;
  const DURATION = 30;

  // Scene 1 starts at 0; scene k+1 starts at CUTS[k] (hidden under the colour wipe).
  const CUTS = [4, 8, 12, 16, 20, 24, 28];
  const SCENE_STARTS = [0].concat(CUTS);

  const EV = {
    // First word is already settled on frame 0 (so the auto-thumbnail is the hook); the second slams in at 0.45s.
    s1: { words: -0.5, wordStep: 0.95, card: 1.15, q: [1.9, 2.1, 2.3, 2.5], emoji: 1.45, pill: 2.95 },
    s2: { words: 4.25, wordStep: 0.25, win: 4.45, fields: [5.15, 5.6, 6.05, 6.45, 6.85], btn: 6.85, click: 7.35 },
    s3: { words: 8.25, wordStep: 0.2, pill: 8.75, card: 8.5, lensIn: 9.05, lensOn: 9.75, alert: 9.85, chips: [10.5, 10.65, 10.8], pick: 11.3 },
    s4: { words: 12.25, wordStep: 0.3, box: 12.45, stickers: [13.1, 13.55, 14.0, 14.45], pill: 15.0 },
    s5: { words: 16.25, wordStep: 0.3, panel: 16.4, m1: 16.8, listenFrom: 17.3, listenTo: 18.05, m2: 18.1, m3: 19.0, heart: 19.4 },
    s6: { words: 20.25, wordStep: 0.3, card: 20.45, ticks: [21.0, 21.25, 21.5, 21.75, 22.0, 22.25, 22.5, 22.75], stamp: 23.05 },
    s7: { words: 24.25, wordStep: 0.3, chips: 24.7, chipStep: 0.07, sub: 25.9, cta: 26.5, url: 27.1 },
    s8: { logo: 28.15, tag: 28.7, url: 29.1, chord: 28.1 },
  };

  // Screen-shake impacts: [time, amplitude px]
  const SHAKES = [
    [7.35, 9], [9.85, 15], [13.1, 7], [13.55, 5], [14.0, 5], [14.45, 7],
    [23.05, 20], [26.5, 8], [28.15, 12],
  ];

  // Confetti bursts: time, origin, particle count, spread ('fan' goes upward, 'ring' goes everywhere)
  const BURSTS = [
    { t: 7.4, x: 740, y: 885, n: 70, mode: "fan" },
    { t: 15.0, x: 540, y: 640, n: 80, mode: "ring" },
    { t: 23.05, x: 540, y: 640, n: 170, mode: "ring" },
    { t: 26.5, x: 540, y: 720, n: 90, mode: "fan" },
    { t: 28.15, x: 540, y: 480, n: 110, mode: "ring" },
  ];

  return { BPM, BEAT, BAR, FPS, DURATION, CUTS, SCENE_STARTS, EV, SHAKES, BURSTS };
});
