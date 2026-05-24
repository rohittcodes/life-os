import { ImageResponse } from "next/og"

export const runtime = "edge"
export const size = { width: 32, height: 32 }
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: "#09090b",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", gap: 4 }}>
            <div style={{ width: 7, height: 7, background: "white", borderRadius: 2 }} />
            <div style={{ width: 7, height: 7, background: "rgba(255,255,255,0.4)", borderRadius: 2 }} />
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <div style={{ width: 7, height: 7, background: "rgba(255,255,255,0.4)", borderRadius: 2 }} />
            <div style={{ width: 7, height: 7, background: "white", borderRadius: 2 }} />
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
