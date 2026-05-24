import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "Life OS — Your personal operating system"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "#09090b",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "flex-end",
          padding: 80,
          fontFamily: "sans-serif",
        }}
      >
        {/* Background grid decoration */}
        <div
          style={{
            position: "absolute",
            top: 60,
            right: 80,
            display: "flex",
            flexDirection: "column",
            gap: 20,
            opacity: 0.08,
          }}
        >
          {[0,1,2,3,4].map((row) => (
            <div key={row} style={{ display: "flex", gap: 20 }}>
              {[0,1,2,3,4,5].map((col) => (
                <div key={col} style={{ width: 40, height: 40, background: "white", borderRadius: 8 }} />
              ))}
            </div>
          ))}
        </div>

        {/* Logo mark */}
        <div
          style={{
            width: 72,
            height: 72,
            background: "white",
            borderRadius: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 32,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ width: 18, height: 18, background: "#09090b", borderRadius: 4 }} />
              <div style={{ width: 18, height: 18, background: "rgba(9,9,11,0.3)", borderRadius: 4 }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ width: 18, height: 18, background: "rgba(9,9,11,0.3)", borderRadius: 4 }} />
              <div style={{ width: 18, height: 18, background: "#09090b", borderRadius: 4 }} />
            </div>
          </div>
        </div>

        {/* Text */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 72, fontWeight: 700, color: "white", letterSpacing: -2, lineHeight: 1 }}>
            Life OS
          </div>
          <div style={{ fontSize: 28, color: "rgba(255,255,255,0.5)", fontWeight: 400 }}>
            Your personal operating system
          </div>
        </div>

        {/* Bottom tags */}
        <div style={{ display: "flex", gap: 12, marginTop: 48 }}>
          {["Habits", "Finance", "Goals", "Projects", "Time Tracker", "Daily Notes"].map((tag) => (
            <div
              key={tag}
              style={{
                padding: "8px 16px",
                background: "rgba(255,255,255,0.08)",
                borderRadius: 100,
                color: "rgba(255,255,255,0.6)",
                fontSize: 18,
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              {tag}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  )
}
