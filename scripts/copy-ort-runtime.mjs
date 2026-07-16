// Copies the onnxruntime-web WASM runtime into public/ort so the semantic
// matcher loads it same-origin. The site ships COOP/COEP (require-corp)
// headers for the local patient voice, which block the runtime's default
// CDN download in some browsers — self-hosting avoids that entirely.
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = join(projectRoot, "node_modules", "onnxruntime-web", "dist");
const targetDir = join(projectRoot, "public", "ort");

const runtimeFiles = [
  // Plain WASM backend (device: "wasm") and the WebGPU-capable jsep variant.
  "ort-wasm-simd-threaded.mjs",
  "ort-wasm-simd-threaded.wasm",
  "ort-wasm-simd-threaded.jsep.mjs",
  "ort-wasm-simd-threaded.jsep.wasm",
];

mkdirSync(targetDir, { recursive: true });

for (const file of runtimeFiles) {
  const source = join(sourceDir, file);
  if (!existsSync(source)) {
    console.warn(`copy-ort-runtime: missing ${file} in onnxruntime-web/dist — skipped`);
    continue;
  }
  copyFileSync(source, join(targetDir, file));
}

console.log(`copy-ort-runtime: ONNX runtime copied to public/ort`);
