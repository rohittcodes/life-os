import { ImageResponse } from "next/og"

export const runtime = "edge"
export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: "#09090b",
          borderRadius: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Grid pattern — scaled up */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ width: 46, height: 46, background: "white", borderRadius: 10 }} />
            <div style={{ width: 46, height: 46, background: "rgba(255,255,255,0.25)", borderRadius: 10 }} />
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ width: 46, height: 46, background: "rgba(255,255,255,0.25)", borderRadius: 10 }} />
            <div style={{ width: 46, height: 46, background: "white", borderRadius: 10 }} />
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
