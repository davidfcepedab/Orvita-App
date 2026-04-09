import { ImageResponse } from "next/og"

export const size = {
  width: 180,
  height: 180,
}

export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(140deg, #111827 0%, #0f172a 100%)",
          borderRadius: 30,
        }}
      >
        <div
          style={{
            width: 112,
            height: 112,
            borderRadius: 9999,
            border: "7px solid rgba(107, 159, 216, 0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 0 9px rgba(107, 159, 216, 0.15)",
          }}
        >
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 9999,
              background: "linear-gradient(135deg, #2dd4bf 0%, #14b8a6 100%)",
            }}
          />
        </div>
      </div>
    ),
    size,
  )
}

