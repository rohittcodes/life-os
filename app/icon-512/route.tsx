import { ImageResponse } from "next/og"

export const runtime = "edge"

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          background: "#09090b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 110,
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 26, width: 290, height: 290 }}>
          {[
            { bg: "#ffffff", opacity: 1 },
            { bg: "#ffffff", opacity: 0.4 },
            { bg: "#ffffff", opacity: 0.4 },
            { bg: "#ffffff", opacity: 0.8 },
          ].map((s, i) => (
            <div
              key={i}
              style={{
                width: 128,
                height: 128,
                background: s.bg,
                opacity: s.opacity,
                borderRadius: 30,
              }}
            />
          ))}
        </div>
      </div>
    ),
    { width: 512, height: 512 }
  )
}
