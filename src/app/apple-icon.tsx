import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ width: "180px", height: "180px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "40px", background: "#06201b", color: "#6ee7b7", fontSize: "94px", fontWeight: 900 }}>D</div>,
    size
  );
}
