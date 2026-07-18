import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CONVERSATION_CASES } from "../src/lib/conversation/cases";
import { buildConversationAudioManifest } from "../src/lib/voice/patient-audio-library";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const audioRoot = join(projectRoot, "public", "audio", "patients");
const docsRoot = join(projectRoot, "docs");
const checkOnly = process.argv.includes("--check");

const rows = Object.values(CONVERSATION_CASES).flatMap(buildConversationAudioManifest);

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

if (checkOnly) {
  const missing = rows.filter((row) => !existsSync(join(audioRoot, row.caseId, row.filename)));
  if (missing.length > 0) {
    console.error(`Patient audio library is missing ${missing.length} of ${rows.length} files.`);
    for (const row of missing.slice(0, 25)) {
      console.error(`  ${row.caseId}/${row.filename}`);
    }
    if (missing.length > 25) console.error(`  …and ${missing.length - 25} more.`);
    process.exitCode = 1;
  } else {
    console.log(`Patient audio library complete: ${rows.length} files found.`);
  }
} else {
  mkdirSync(audioRoot, { recursive: true });
  mkdirSync(docsRoot, { recursive: true });

  const csvRows = [
    ["File name", "What the patient should say"],
    ...rows.map((row) => [`${row.caseId}/${row.filename}`, row.text]),
  ];
  writeFileSync(
    join(docsRoot, "patient-voice-recording-manifest.csv"),
    `\uFEFF${csvRows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`,
    "utf8"
  );

  console.log(`Patient voice manifest generated: ${rows.length} recordings across ${Object.keys(CONVERSATION_CASES).length} cases.`);
}
