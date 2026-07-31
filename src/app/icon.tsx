import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div style={{ width: "64px", height: "64px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "16px", background: "#06201b", color: "#6ee7b7", fontSize: "34px", fontWeight: 900 }}>D</div>,
    size
  );
}
