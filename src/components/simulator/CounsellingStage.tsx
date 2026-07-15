"use client";

import { useMemo, useRef, useState } from "react";
import type { DispenseDecision } from "@/lib/types/case";
import type {
  ConversationCase,
  ConversationMatcherMode,
  ConversationMessage,
  CounsellingResult,
  UnsafeAdviceFinding,
} from "@/lib/conversation/types";
import {
  acceptSemanticCandidates,
  classifyWithRules,
  findUnsafeAdvice,
  matchResponseIntent,
} from "@/lib/conversation/matcher";
import { scoreCounselling } from "@/lib/conversation/score";
import { buildPatientReply } from "@/lib/conversation/reply";
import { useSemanticMatcher } from "@/hooks/useSemanticMatcher";
import { useVoiceConversation } from "@/hooks/useVoiceConversation";
import { formatModelProgress, OUTETTS_DOWNLOAD_MB } from "@/lib/voice/outetts-config";
import type { PracticeMode } from "@/lib/practice/modes";

interface CounsellingStageProps {
  conversation: ConversationCase;
  decision: DispenseDecision | null;
  onComplete: (result: CounsellingResult) => void;
  onViewResults: () => void;
  mode: PracticeMode;
}

function decisionLabel(decision: DispenseDecision | null): string {
  if (decision === "dispense") return "Dispense and hand medication to patient";
  if (decision === "hold_contact_prescriber") return "Hold supply and contact prescriber";
  if (decision === "do_not_supply") return "Do not supply";
  return "No decision recorded";
}

export function CounsellingStage({
  conversation,
  decision,
  onComplete,
  onViewResults,
  mode,
}: CounsellingStageProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>([
    {
      id: "patient-opening",
      role: "patient",
      text: conversation.openingMessage,
    },
  ]);
  const [input, setInput] = useState("");
  const [addressedTopicIds, setAddressedTopicIds] = useState<Set<string>>(new Set());
  const [unsafeAdvice, setUnsafeAdvice] = useState<UnsafeAdviceFinding[]>([]);
  const [pending, setPending] = useState(false);
  const [concernShown, setConcernShown] = useState(false);
  const [complete, setComplete] = useState(false);
  const [matcherMode, setMatcherMode] = useState<ConversationMatcherMode>("rules");
  const [interactionMode, setInteractionMode] = useState<"text" | "voice">("text");
  const [patientAudioEnabled, setPatientAudioEnabled] = useState(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const matcher = useSemanticMatcher(conversation);
  const voice = useVoiceConversation({
    patientKey: conversation.caseId,
    onTranscript: setInput,
  });

  const studentTurns = useMemo(
    () => messages.filter((message) => message.role === "student").length,
    [messages]
  );
  const matcherAvailable = matcher.status === "ready" || matcher.status === "fallback";
  const latestPatientMessage = useMemo(
    () => [...messages].reverse().find((message) => message.role === "patient") ?? null,
    [messages]
  );
  const isListening = voice.activity === "starting" || voice.activity === "listening";
  const isPatientSpeaking = voice.activity === "speaking";
  const isPatientAudioBusy = voice.activity === "loading"
    || voice.activity === "generating"
    || voice.activity === "speaking";

  function selectTextMode() {
    if (interactionMode === "text") return;
    voice.abortListening();
    voice.cancelSpeech();
    setInteractionMode("text");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function selectVoiceMode() {
    if (interactionMode === "voice") return;
    setInteractionMode("voice");
    if (patientAudioEnabled && latestPatientMessage) {
      voice.speak(latestPatientMessage.text);
    }
  }

  function replayPatient() {
    if (!latestPatientMessage) return;
    setPatientAudioEnabled(true);
    voice.speak(latestPatientMessage.text);
  }

  function togglePatientAudio() {
    if (patientAudioEnabled) {
      setPatientAudioEnabled(false);
      voice.cancelSpeech();
      return;
    }

    setPatientAudioEnabled(true);
    if (latestPatientMessage) voice.speak(latestPatientMessage.text);
  }

  const voiceStatus = voice.errorMessage
    ?? (voice.activity === "loading"
      ? `Loading OuteTTS-0.1 locally${formatModelProgress(voice.outeProgress)}. The first use is the longest.`
      : voice.activity === "generating"
        ? `OuteTTS-0.1 is generating ${conversation.patientRole}'s reply on this laptop.`
        : voice.activity === "starting"
      ? "Waiting for microphone permission or the browser speech service."
      : voice.activity === "listening"
      ? "Listening now. Speak naturally, then select Stop listening."
      : isPatientSpeaking
        ? `${conversation.patientRole} is speaking.`
        : voice.activity === "review" && input.trim()
          ? "Transcript ready. Check what was heard before sending it for marking."
          : voice.recognitionSupported === false
            ? "Voice input is unavailable in this browser. You can still type and hear the patient."
            : "Select Start speaking when you are ready. Nothing is sent for marking until you confirm the transcript.");

  async function sendMessage() {
    const text = input.trim();
    if (!text || pending || complete || !matcherAvailable) return;

    voice.abortListening();
    setInput("");
    setPending(true);
    const studentMessage: ConversationMessage = {
      id: crypto.randomUUID(),
      role: "student",
      text,
    };
    setMessages((previous) => [...previous, studentMessage]);

    const semanticCandidates = await matcher.classify(text);
    const matches = semanticCandidates
      ? acceptSemanticCandidates(conversation, text, semanticCandidates)
      : classifyWithRules(conversation, text);
    const currentMode: ConversationMatcherMode = semanticCandidates ? "semantic" : "rules";
    setMatcherMode(currentMode);

    const matchedTopicIds = matches.map((match) => match.topicId);
    const responseIntent = matchedTopicIds.length === 0
      ? matchResponseIntent(conversation, text)
      : null;
    const findings = findUnsafeAdvice(conversation, text);
    const nextAddressed = new Set(addressedTopicIds);
    for (const topicId of matchedTopicIds) nextAddressed.add(topicId);

    const patientReply = buildPatientReply(
      conversation,
      matchedTopicIds,
      addressedTopicIds,
      studentTurns + 1,
      concernShown,
      responseIntent
    );

    setAddressedTopicIds(nextAddressed);
    setUnsafeAdvice((previous) => {
      const known = new Set(previous.map((finding) => finding.id));
      return [...previous, ...findings.filter((finding) => !known.has(finding.id))];
    });
    if (patientReply.showConcern) setConcernShown(true);
    setMessages((previous) => {
      const updated = previous.map((message) =>
        message.id === studentMessage.id
          ? { ...message, matchedTopicIds }
          : message
      );
      return [
        ...updated,
        {
          id: crypto.randomUUID(),
          role: "patient" as const,
          text: patientReply.text,
        },
      ];
    });
    setPending(false);
    if (interactionMode === "voice" && patientAudioEnabled) {
      voice.speak(patientReply.text);
    }
    requestAnimationFrame(() => {
      transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" });
      inputRef.current?.focus();
    });
  }

  function finishConversation() {
    if (complete || pending || studentTurns < 2) return;
    voice.abortListening();
    voice.cancelSpeech();
    const result = scoreCounselling({
      conversation,
      addressedTopicIds,
      unsafeAdvice,
      transcript: messages,
      matcherMode,
    });
    setComplete(true);
    onComplete(result);
  }

  return (
    <main className="fred-counselling-stage">
      <header className="fred-counselling-header">
        <div>
          <div className="fred-stage-kicker">Stage 2 of 2 · Post-dispensing patient interaction</div>
          <h1>Patient handover: {conversation.patientRole}</h1>
          <p>{conversation.handoverGoal}</p>
        </div>
        <div className="fred-decision-recap">
          <span>Your recorded decision</span>
          <strong>{decisionLabel(decision)}</strong>
        </div>
      </header>

      <div className="fred-counselling-grid">
        <section className="fred-chat-window" aria-labelledby="patient-conversation-title">
          <div className="fred-chat-titlebar">
            <span id="patient-conversation-title">Patient Conversation</span>
            <span>{studentTurns} student turn{studentTurns === 1 ? "" : "s"}</span>
          </div>

          <div
            ref={transcriptRef}
            className="fred-chat-transcript"
            aria-live="polite"
            aria-relevant="additions"
          >
            {messages.map((message) => (
              <div key={message.id} className={`fred-chat-message ${message.role}`}>
                <span className="fred-chat-speaker">
                  {message.role === "patient" ? conversation.patientRole : "You"}
                </span>
                <p>{message.text}</p>
              </div>
            ))}
            {pending && (
              <div className="fred-chat-message patient pending" role="status">
                <span className="fred-chat-speaker">{conversation.patientRole}</span>
                <p>Thinking…</p>
              </div>
            )}
          </div>

          <div className="fred-chat-composer">
            <div className="fred-interaction-mode-row">
              <span>Interaction method</span>
              <div className="fred-interaction-mode-switch" role="group" aria-label="Interaction method">
                <button
                  type="button"
                  className={interactionMode === "text" ? "active" : ""}
                  aria-pressed={interactionMode === "text"}
                  onClick={selectTextMode}
                >
                  Text
                </button>
                <button
                  type="button"
                  className={interactionMode === "voice" ? "active" : ""}
                  aria-pressed={interactionMode === "voice"}
                  onClick={selectVoiceMode}
                >
                  Voice conversation
                </button>
              </div>
            </div>

            {interactionMode === "voice" && (
              <section className="fred-voice-controls" aria-labelledby="voice-controls-title">
                <div className="fred-voice-controls-heading">
                  <strong id="voice-controls-title">Voice controls</strong>
                  <span>
                    Patient voice: {voice.patientVoiceEngine === "outetts"
                      ? `OuteTTS-0.1 · ${voice.patientVoiceName} (${voice.patientVoiceLanguage})`
                      : `System fallback · ${voice.patientVoiceName ?? "default voice"}`}
                  </span>
                </div>
                {voice.patientVoiceEngine === "system" && voice.patientVoiceName && !voice.patientVoiceIsAustralian && (
                  <p className="fred-voice-quality-warning">
                    OuteTTS is unavailable in this session and no Australian system voice is installed. The best
                    available English system voice will be used while the written transcript remains available.
                  </p>
                )}
                {voice.patientVoiceNotice && (
                  <p className="fred-voice-quality-warning">{voice.patientVoiceNotice}</p>
                )}
                {voice.patientVoiceNotice && voice.outeDiagnostic && (
                  <details className="fred-voice-quality-warning">
                    <summary>Voice diagnostics</summary>
                    <code>{voice.outeDiagnostic}</code>
                  </details>
                )}
                <div className="fred-voice-buttons">
                  <button
                    type="button"
                    className={isListening ? "listening" : ""}
                    onClick={isListening ? voice.stopListening : voice.startListening}
                    disabled={
                      complete
                      || pending
                      || !matcherAvailable
                      || isPatientAudioBusy
                      || voice.recognitionSupported === false
                    }
                  >
                    {isListening ? "Stop listening" : "Start speaking"}
                  </button>
                  <button
                    type="button"
                    onClick={replayPatient}
                    disabled={
                      complete
                      || !latestPatientMessage
                      || isPatientAudioBusy
                      || voice.synthesisSupported === false
                    }
                  >
                    Replay patient
                  </button>
                  <button
                    type="button"
                    aria-pressed={!patientAudioEnabled}
                    onClick={togglePatientAudio}
                    disabled={complete || voice.synthesisSupported === false}
                  >
                    {patientAudioEnabled ? "Mute patient" : "Unmute patient"}
                  </button>
                </div>
                <p
                  className={`fred-voice-status ${voice.activity}`}
                  role="status"
                  aria-live="polite"
                >
                  {voiceStatus}
                </p>
                <p className="fred-voice-disclosure">
                  OuteTTS-0.1 patient audio is generated locally with no API key or per-conversation charge. Its
                  first-use Q4 model and quantized audio decoder download is about {OUTETTS_DOWNLOAD_MB} MB, plus browser
                  runtime files, and is cached where the browser permits. It is used under CC BY 4.0 with attribution
                  to OuteAI. Slow or unsupported devices automatically use the system voice. Student speech recognition
                  may use the browser or operating-system voice service. Text mode is always available.
                </p>
              </section>
            )}

            <label htmlFor="counselling-message">
              {interactionMode === "voice"
                ? "Recognised response (check or edit before sending)"
                : "Speak to the patient"}
            </label>
            <textarea
              ref={inputRef}
              id="counselling-message"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
              placeholder={
                matcherAvailable
                  ? interactionMode === "voice"
                    ? "Your spoken response will appear here. You can also type…"
                    : "Type exactly what you would say to the patient…"
                  : "Preparing the local matcher…"
              }
              disabled={!matcherAvailable || pending || complete}
              rows={3}
            />
            <div className="fred-chat-actions">
              <span>
                {interactionMode === "voice"
                  ? "Check the transcript before sending · Ctrl/⌘ + Enter"
                  : "Ctrl/⌘ + Enter to send"}
              </span>
              <button
                type="button"
                className="fred-chat-send"
                onClick={() => void sendMessage()}
                disabled={!input.trim() || !matcherAvailable || pending || complete || isListening}
              >
                {interactionMode === "voice" ? "Send spoken response" : "Send to patient"}
              </button>
              <button
                type="button"
                className="fred-chat-finish"
                onClick={complete ? onViewResults : finishConversation}
                disabled={pending || (!complete && studentTurns < 2)}
              >
                {complete ? "View results" : "Finish consultation"}
              </button>
            </div>
          </div>
        </section>

        <aside className="fred-counselling-sidebar" aria-label="Conversation assessment information">
          <section className="fred-assessment-card">
            <h2>Assessment conditions</h2>
            <p>
              {mode === "exam"
                ? "Exam mode: coaching and checklist detail stay hidden until you finish."
                : "Communicate as you would in an exam. Checklist progress and marks stay hidden until you finish."}
            </p>
            {mode !== "exam" && (
              <>
                <ul>
                  <li>Gather information before making assumptions.</li>
                  <li>Use patient-friendly language.</li>
                  <li>Give exact, safe instructions.</li>
                  <li>Use teach-back: ask the patient to explain the plan back in their own words.</li>
                  <li>Invite questions, answer them, then close professionally.</li>
                </ul>
                <details className="fred-teachback-help">
                  <summary>What does teach-back mean?</summary>
                  <p>
                    Ask the patient or carer to describe how they will use the medicine. Frame it as a check of
                    your explanation, not a test of them. “Do you understand?” does not demonstrate teach-back.
                  </p>
                </details>
              </>
            )}
          </section>

          <section className="fred-model-card" aria-live="polite">
            <h2>On-device language matching</h2>
            <div className={`fred-model-status ${matcher.status}`}>
              <span className="fred-model-dot" />
              <span>{matcher.statusMessage}</span>
            </div>
            {matcher.status === "loading" && matcher.progress !== null && (
              <div className="fred-model-progress" aria-label={`${matcher.progress}% loaded`}>
                <span style={{ width: `${matcher.progress}%` }} />
              </div>
            )}
            <p>
              Your conversation is processed locally in this browser. No paid model API or API key is used.
            </p>
            {matcher.status === "loading" && (
              <button type="button" onClick={matcher.activateRulesFallback}>
                Continue with expanded local matching
              </button>
            )}
          </section>

          <section className="fred-stage-note">
            <strong>Final marking</strong>
            <p>
              Your dispensing accuracy and patient communication will be combined after this consultation.
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}
