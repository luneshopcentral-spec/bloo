"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en"><body><main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "system-ui, sans-serif", background: "#f8fafc", color: "#0f172a" }}><div style={{ maxWidth: "520px", textAlign: "center" }}><p style={{ color: "#047857", fontWeight: 700 }}>DispenseRx Practice</p><h1 style={{ fontSize: "36px", margin: "12px 0" }}>Something went wrong</h1><p style={{ color: "#475569", lineHeight: 1.6 }}>Your account data has not been intentionally changed. Try loading the page again, or contact support if the problem continues.</p><div style={{ marginTop: "28px", display: "flex", justifyContent: "center", gap: "12px" }}><button onClick={() => reset()} style={{ border: 0, borderRadius: "6px", background: "#065f46", color: "white", padding: "12px 18px", fontWeight: 700 }}>Try again</button><a href="/support" style={{ border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", padding: "12px 18px", fontWeight: 700, textDecoration: "none" }}>Support</a></div></div></main></body></html>
  );
}
