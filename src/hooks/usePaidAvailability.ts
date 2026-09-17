"use client";
import { useEffect, useState } from "react";
export function useCheckoutAvailability() {
  const [state, setState] = useState({ available: false, testMode: false });
  useEffect(() => {
    let active = true;
    void fetch("/api/availability", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (active && data) setState({ available: data.available === true, testMode: data.testMode === true }); })
      .catch(() => {});
    return () => { active = false; };
  }, []);
  return state;
}
