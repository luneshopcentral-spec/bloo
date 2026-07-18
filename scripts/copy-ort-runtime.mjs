// Copies the onnxruntime-web WASM runtime into public/ort so the semantic
// matcher loads it same-origin. The site ships COOP/COEP (require-corp)
// headers for the local patient voice, which block the runtime's default
// CDN download in some browsers — self-hosting avoids that entirely.
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const runtimeFiles = [
  // All WASM backend variants — transformers.js picks one at runtime
  // (currently the asyncify build for device: "wasm").
  "ort-wasm-simd-threaded.mjs",
  "ort-wasm-simd-threaded.wasm",
  "ort-wasm-simd-threaded.asyncify.mjs",
  "ort-wasm-simd-threaded.asyncify.wasm",
  "ort-wasm-simd-threaded.jspi.mjs",
  "ort-wasm-simd-threaded.jspi.wasm",
  "ort-wasm-simd-threaded.jsep.mjs",
  "ort-wasm-simd-threaded.jsep.wasm",
];

function copyRuntime(sourceDir, targetDir, label, files) {
  mkdirSync(targetDir, { recursive: true });
  for (const file of files) {
    const source = join(sourceDir, file);
    if (!existsSync(source)) {
      console.warn(`copy-ort-runtime: missing ${file} for ${label} — skipped`);
      continue;
    }
    copyFileSync(source, join(targetDir, file));
  }
}

copyRuntime(
  join(projectRoot, "node_modules", "onnxruntime-web", "dist"),
  join(projectRoot, "public", "ort"),
  "semantic matcher",
  runtimeFiles
);

copyRuntime(
  join(projectRoot, "node_modules", "kokoro-js", "node_modules", "onnxruntime-web", "dist"),
  join(projectRoot, "public", "ort-kokoro"),
  "Kokoro safety voice",
  [
    "ort.bundle.min.mjs",
    "ort-wasm-simd-threaded.mjs",
    "ort-wasm-simd-threaded.wasm",
    "ort-wasm-simd-threaded.jsep.mjs",
    "ort-wasm-simd-threaded.jsep.wasm",
  ]
);

copyFileSync(
  join(projectRoot, "node_modules", "kokoro-js", "dist", "kokoro.web.js"),
  join(projectRoot, "public", "ort-kokoro", "kokoro.web.js")
);

console.log("copy-ort-runtime: semantic and Kokoro runtimes copied");
