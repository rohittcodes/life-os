import { ImageResponse } from "next/og"

export const runtime = "edge"

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 192,
          height: 192,
          background: "#09090b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 40,
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, width: 110, height: 110 }}>
          {[
            { bg: "#ffffff", opacity: 1 },
            { bg: "#ffffff", opacity: 0.4 },
            { bg: "#ffffff", opacity: 0.4 },
            { bg: "#ffffff", opacity: 0.8 },
          ].map((s, i) => (
            <div
              key={i}
              style={{
                width: 48,
                height: 48,
                background: s.bg,
                opacity: s.opacity,
                borderRadius: 12,
              }}
            />
          ))}
        </div>
      </div>
    ),
    { width: 192, height: 192 }
  )
}
