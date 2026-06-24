"use client";

import { useState, useEffect } from "react";

interface StatusBarProps {
  message: string;
}

export function StatusBar({ message }: StatusBarProps) {
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
      setClock(`OVR | ${date} ${time}`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="fred-statusbar">
      <span>{message}</span>
      <span>{clock}</span>
    </div>
  );
}
