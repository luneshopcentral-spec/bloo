import { describe, expect, it } from "vitest";
import {
  patientSpeechRate,
  preparePatientSpeech,
  selectPatientVoice,
  speechRecognitionErrorMessage,
} from "./web-speech";

function voice(
  name: string,
  lang: string,
  localService = true,
  isDefault = false
): SpeechSynthesisVoice {
  return {
    default: isDefault,
    lang,
    localService,
    name,
    voiceURI: name,
  };
}

describe("patient voice selection", () => {
  it("prefers a natural Australian English voice", () => {
    const selected = selectPatientVoice(
      [
        voice("US Default", "en-US", true, true),
        voice("Karen Compact", "en-AU"),
        voice("Matilda Natural", "en-AU"),
      ],
      "case-1"
    );

    expect(selected?.name).toBe("Matilda Natural");
  });

  it("selects consistently for the same patient", () => {
    const voices = [voice("Karen Natural", "en-AU"), voice("Matilda Natural", "en-AU")];
    expect(selectPatientVoice(voices, "patient-a")?.name).toBe(
      selectPatientVoice(voices, "patient-a")?.name
    );
    expect(patientSpeechRate("patient-a")).toBe(patientSpeechRate("patient-a"));
  });
});

describe("spoken patient text", () => {
  it("expands common medicine units without changing the written transcript", () => {
    expect(preparePatientSpeech("Take 10mL of 250 mg/5 mL and check the INR.")).toBe(
      "Take 10 millilitres of 250 milligrams per 5 millilitres and check the I N R."
    );
  });

  it("provides useful recognition failure messages", () => {
    expect(speechRecognitionErrorMessage("not-allowed")).toContain("Microphone access");
    expect(speechRecognitionErrorMessage("no-speech")).toContain("No speech");
  });
});
