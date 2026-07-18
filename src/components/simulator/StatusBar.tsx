"use client";

import { useState, useEffect } from "react";

export type StatusTone = "info" | "error" | "success";

interface StatusBarProps {
  message: string;
  tone: StatusTone;
  /** Increment to replay the error flash even when the message text repeats. */
  flashKey: number;
}

export function StatusBar({ message, tone, flashKey }: StatusBarProps) {
  const [clock, setClock] = useState("");

  useEffect(() => {
    function tick() {
      const now = new Date();
      const date = now.toLocaleDateString("en-AU", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      });
      const time = now.toLocaleTimeString("en-AU", {
        hour: "2-digit",
        minute: "2-digit",
      });
      setClock(`${date} ${time}`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      // Remounting on flashKey replays the CSS flash animation each time a
      // dispense attempt is blocked, even for back-to-back identical errors.
      key={tone === "error" ? `flash-${flashKey}` : "steady"}
      className={`fred-statusbar ${tone}`}
    >
      <span
        role={tone === "error" ? "alert" : "status"}
        aria-live={tone === "error" ? "assertive" : "polite"}
      >
        {tone === "error" ? "⚠ " : tone === "success" ? "✓ " : ""}
        {message}
      </span>
      <time aria-hidden="true">{clock}</time>
    </div>
  );
}
