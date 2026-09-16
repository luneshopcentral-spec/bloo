"use client";
import { useEffect, useState } from "react";

export function useLocalDraft<T>({ storageKey, value, enabled }: { storageKey: string | null; value: T; enabled: boolean }) {
  const [candidate, setCandidate] = useState<T | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  useEffect(() => {
    setCandidate(null);
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw && raw.length < 100_000) setCandidate(JSON.parse(raw));
    } catch { /* Unavailable or invalid local storage. */ }
    setLoadedKey(storageKey);
  }, [storageKey]);
  useEffect(() => {
    if (!storageKey || loadedKey !== storageKey || candidate || !enabled) return;
    const timer = setTimeout(() => { try { localStorage.setItem(storageKey, JSON.stringify(value)); } catch {} }, 400);
    return () => clearTimeout(timer);
  }, [storageKey, loadedKey, candidate, enabled, value]);
  function clear() {
    if (storageKey) try { localStorage.removeItem(storageKey); } catch {}
    setCandidate(null);
  }
  return { candidate, clear };
}
