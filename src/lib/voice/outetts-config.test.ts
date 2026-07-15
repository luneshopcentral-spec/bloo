import { describe, expect, it } from "vitest";
import {
  buildOutePrompt,
  estimateOuteMaxTokens,
  extractOuteAudioCodes,
  formatModelProgress,
  getOuteVoiceProfile,
  splitOuteSpeech,
} from "./outetts-config";

describe("OuteTTS patient voice configuration", () => {
  it("assigns stable authored speaker references to all counselling cases", () => {
    expect(getOuteVoiceProfile("case-1").name).toBe("Male voice 1");
    expect(getOuteVoiceProfile("case-3").name).toBe("Female voice 2");
    expect(getOuteVoiceProfile("case-12").name).toBe("Female voice 1");
    expect(getOuteVoiceProfile("future-case").speaker.words.length).toBeGreaterThan(5);
  });

  it("builds the version 0.1 completion prompt with speaker audio tokens", () => {
    const profile = getOuteVoiceProfile("case-1");
    const prompt = buildOutePrompt("Take 5 mg twice daily.", profile.speaker);
    expect(prompt).toContain("<|text_start|>");
    expect(prompt).toContain("take<|text_sep|>five<|text_sep|>mg");
    expect(prompt).toContain("<|audio_start|>");
    expect(prompt).toMatch(/<\|code_start\|><\|\d+\|>/);
  });

  it("extracts only WavTokenizer audio codes from completion text", () => {
    expect(extractOuteAudioCodes("word<|t_0.20|><|code_start|><|12|><|4099|><|code_end|>"))
      .toEqual([12, 4099]);
    expect(extractOuteAudioCodes("<|4100|><|99999|><|audio_end|>"))
      .toEqual([]);
  });

  it("chunks longer replies and keeps generation limits bounded", () => {
    const chunks = splitOuteSpeech(
      "This is the first patient sentence. This is the second patient sentence with some extra detail.",
      45
    );
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.length <= 45)).toBe(true);
    expect(estimateOuteMaxTokens("Short reply.")).toBeGreaterThanOrEqual(256);
    expect(estimateOuteMaxTokens("word ".repeat(100))).toBe(900);
  });

  it("formats bounded whole-number download progress", () => {
    expect(formatModelProgress(42.6)).toBe(" 43%");
    expect(formatModelProgress(120)).toBe(" 100%");
    expect(formatModelProgress(null)).toBe("");
  });
});
