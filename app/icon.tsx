import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#10262d", color: "#57c7d9", fontSize: 26, fontWeight: 900, border: "4px solid #f17363" }}>DO</div>,
    size
  );
}
