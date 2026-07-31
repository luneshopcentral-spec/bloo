import { ImageResponse } from "next/og";

export const alt = "DispenseRx Practice — Australian dispensing workflow practice";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#061513", color: "white", padding: "72px 80px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "18px", color: "#6ee7b7", fontSize: "30px", fontWeight: 800 }}><span style={{ width: "54px", height: "54px", borderRadius: "14px", background: "#6ee7b7", color: "#06201b", display: "flex", alignItems: "center", justifyContent: "center" }}>D</span>DispenseRx Practice</div>
      <div style={{ display: "flex", flexDirection: "column" }}><div style={{ maxWidth: "930px", fontSize: "72px", lineHeight: 1.02, letterSpacing: "-3px", fontWeight: 900 }}>Practise Australian dispensing workflows before placement.</div><div style={{ marginTop: "28px", color: "#cbd5e1", fontSize: "28px" }}>Try 2 of 13 fictional cases free. No card required.</div></div>
      <div style={{ color: "#6ee7b7", fontSize: "22px" }}>Independent training simulator · Immediate safety feedback</div>
    </div>,
    size
  );
}
