"use client";

// Temporary diagnostics page for the semantic matcher — not linked anywhere.
import { useState } from "react";
import { useSemanticMatcher } from "@/hooks/useSemanticMatcher";
import { getConversationCase } from "@/lib/conversation/cases";

const conversation = getConversationCase("case-7");

export default function MatcherTestPage() {
  const matcher = useSemanticMatcher(conversation);
  const [input, setInput] = useState("Keep these tablets somewhere the grandkids cannot reach them.");
  const [result, setResult] = useState<string>("");

  async function classify() {
    const candidates = await matcher.classify(input);
    setResult(JSON.stringify(candidates?.slice(0, 5) ?? null, null, 2));
  }

  return (
    <main style={{ padding: 24, fontFamily: "monospace" }}>
      <h1>Semantic matcher diagnostics</h1>
      <p id="matcher-status">status: {matcher.status}</p>
      <p id="matcher-backend">backend: {matcher.backend}</p>
      <p id="matcher-message">message: {matcher.statusMessage}</p>
      <p id="matcher-progress">progress: {matcher.progress ?? "–"}</p>
      <textarea
        value={input}
        onChange={(event) => setInput(event.target.value)}
        rows={3}
        style={{ width: "100%", maxWidth: 640 }}
      />
      <br />
      <button type="button" onClick={() => void classify()} disabled={matcher.status !== "ready"}>
        Classify
      </button>
      <pre id="matcher-result">{result}</pre>
    </main>
  );
}
