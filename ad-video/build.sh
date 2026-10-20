#!/bin/bash
# Rebuilds the ad from scratch:  render frames -> synthesise soundtrack -> encode -> add sound.
# Needs: macOS, Google Chrome, Node 22+, and the Xcode Command Line Tools (for swiftc). Nothing to install.
# Edit ad.html (text, colours, URL) or timing.js, then run:  ./build.sh
set -euo pipefail
cd "$(dirname "$0")"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
BASE="DispenseRx-ad-1080x1080"

echo "1/5  Compiling the encoder…";        swiftc -O encode.swift -o "$WORK/encode" 2>/dev/null
echo "2/5  Rendering 900 frames (30fps)…"; node render.mjs --out "$WORK/frames" --workers 4
echo "3/5  Synthesising the soundtrack…";  node make-audio.mjs --out "$WORK/music.wav"
echo "4/5  Encoding the video…";           "$WORK/encode" video "$WORK/frames" 30 "$BASE-silent.mp4"
echo "5/5  Adding sound…";                 "$WORK/encode" mux "$BASE-silent.mp4" "$WORK/music.wav" "$BASE.mp4"

echo
"$WORK/encode" probe "$BASE.mp4"
echo
echo "Done:  ad-video/$BASE.mp4   (with sound)"
echo "       ad-video/$BASE-silent.mp4   (no sound — add trending audio in TikTok/Instagram)"
