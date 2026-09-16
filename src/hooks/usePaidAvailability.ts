"use client";
import { useEffect, useState } from "react";
export function usePaidAvailability() {
  const [available, setAvailable] = useState(false);
  useEffect(() => { let active = true; void fetch("/api/availability").then((r) => r.json()).then((data) => { if (active) setAvailable(data.paidAccess === true); }).catch(() => {}); return () => { active = false; }; }, []);
  return available;
}
