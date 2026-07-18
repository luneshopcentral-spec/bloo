import { describe, expect, it } from "vitest";
import { STATIC_CASES } from "@/lib/cases/static-cases";
import { getConversationCase } from "@/lib/conversation/cases";
import { buildPatientReply } from "@/lib/conversation/reply";
import {
  buildConversationAudioManifest,
  openingAudioSegment,
  patientAudioPublicPath,
} from "./patient-audio-library";
import { normalisePatientUtterance } from "./patient-utterance";

describe("patient audio library", () => {
  it("gives every authored patient line a unique, stable MP3 path", () => {
    for (const practiceCase of STATIC_CASES) {
      const conversation = getConversationCase(practiceCase.id);
      const manifest = buildConversationAudioManifest(conversation);
      const cueIds = manifest.map((row) => row.cueId);
      const paths = manifest.map((row) => row.publicPath);

      expect(new Set(cueIds).size).toBe(cueIds.length);
      expect(new Set(paths).size).toBe(paths.length);
      expect(manifest).toContainEqual(expect.objectContaining(openingAudioSegment(conversation)));
      expect(paths.every((path) => path.endsWith(".mp3"))).toBe(true);
    }
  });

  it("keeps reply text identical to the ordered audio segment scripts", () => {
    for (const practiceCase of STATIC_CASES) {
      const conversation = getConversationCase(practiceCase.id);
      const manifestIds = new Set(buildConversationAudioManifest(conversation).map((row) => row.cueId));
      for (const topic of conversation.topics) {
        const reply = buildPatientReply(
          conversation,
          [topic.id],
          new Set([conversation.concernTopicId]),
          4,
          true,
          null
        );
        expect(reply.text).toBe(reply.audioSegments.map((segment) => segment.text).join(" "));
        for (const segment of reply.audioSegments) expect(manifestIds.has(segment.cueId)).toBe(true);
      }
    }
  });

  it("constructs the deployed path from the case and cue", () => {
    expect(patientAudioPublicPath("case-3", "topic-storage-02"))
      .toBe("/audio/patients/case-3/topic-storage-02.mp3");
  });

  it("normalises every recording script for natural punctuation", () => {
    for (const practiceCase of STATIC_CASES) {
      const conversation = getConversationCase(practiceCase.id);
      for (const row of buildConversationAudioManifest(conversation)) {
        expect(row.text).toBe(row.text.trim());
        expect(row.text).toMatch(/[.!?…]$/u);
        expect(row.text).not.toMatch(/ {2,}/);
        expect(row.text).not.toMatch(/\S[—–]|[—–]\S/u);
        expect(row.text).not.toContain("'");
      }
    }
  });

  it("adds a spoken ending without changing intentional informal language", () => {
    expect(normalisePatientUtterance("  Yeah — that's fine  "))
      .toBe("Yeah — that’s fine.");
  });
});
