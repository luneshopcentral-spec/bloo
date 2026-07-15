import { describe, expect, it } from "vitest";
import { formatModelProgress, getKokoroVoiceProfile } from "./kokoro-config";

describe("Kokoro patient voice profiles", () => {
  it("assigns stable authored voices to the counselling cases", () => {
    expect(getKokoroVoiceProfile("case-1").voice).toBe("am_michael");
    expect(getKokoroVoiceProfile("case-3").voice).toBe("bf_emma");
    expect(getKokoroVoiceProfile("case-6").voice).toBe("af_bella");
  });

  it("uses a high-quality default profile for new cases", () => {
    expect(getKokoroVoiceProfile("future-case")).toMatchObject({
      voice: "af_heart",
      name: "Heart",
    });
  });

  it("formats bounded whole-number download progress", () => {
    expect(formatModelProgress(42.6)).toBe(" 43%");
    expect(formatModelProgress(120)).toBe(" 100%");
    expect(formatModelProgress(null)).toBe("");
  });
});
