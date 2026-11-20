import { describe, expect, it } from "vitest";
import {
  joinTranscript,
  keepsListeningThroughPauses,
  kokoroSpeech,
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

  it("reads patch rates and kidney results the way a person would", () => {
    expect(preparePatientSpeech("The patch is 25 mcg/h.")).toBe("The patch is 25 micrograms per hour.");
    expect(preparePatientSpeech("My eGFR was low")).toBe("My e G F R was low.");
  });

  it("respells the medicine names the generated voice gets wrong, for the generated voice only", () => {
    expect(kokoroSpeech("I take amlodipine 5 mg and sertraline.")).toBe("I take am lodi peen 5 milligrams and sertraleen.");
    expect(preparePatientSpeech("I take amlodipine 5 mg.")).toBe("I take amlodipine 5 milligrams.");
  });

  it("reads addresses the Australian way, but leaves dates alone", () => {
    expect(preparePatientSpeech("My address is 78 Lygon St, Carlton 3053."))
      .toBe("My address is 78 Lygon Street, Carlton 3 0 5 3.");
    expect(preparePatientSpeech("31 Riverview Rd, Hawthorn 3122")).toBe("31 Riverview Road, Hawthorn 3 1 2 2.");
    expect(preparePatientSpeech("My date of birth is 14 March 1965.")).toBe("My date of birth is 14 March 1965.");
  });

  it("provides useful recognition failure messages", () => {
    expect(speechRecognitionErrorMessage("not-allowed")).toContain("Microphone access");
    expect(speechRecognitionErrorMessage("no-speech")).toContain("No speech");
    expect(speechRecognitionErrorMessage("network")).toContain("Chrome, Edge and Safari");
  });
});

describe("student speech", () => {
  it("adds a second go at the microphone to the draft", () => {
    expect(joinTranscript("take one capsule four times a day", "and finish the whole course"))
      .toBe("take one capsule four times a day and finish the whole course");
    expect(joinTranscript("", "hello")).toBe("hello");
    expect(joinTranscript("Typed correction. ", "")).toBe("Typed correction.");
  });

  it("listens through pauses except where the browser repeats words", () => {
    expect(keepsListeningThroughPauses("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/142.0")).toBe(true);
    expect(keepsListeningThroughPauses("Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/142.0 Mobile")).toBe(false);
  });
});
