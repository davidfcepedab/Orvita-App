import { ImageResponse } from "next/og"

export const size = {
  width: 512,
  height: 512,
}

export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #111827 45%, #0b1220 100%)",
        }}
      >
        <div
          style={{
            width: 318,
            height: 318,
            borderRadius: 9999,
            border: "14px solid rgba(107, 159, 216, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 0 20px rgba(107, 159, 216, 0.12)",
          }}
        >
          <div
            style={{
              width: 134,
              height: 134,
              borderRadius: 9999,
              background: "linear-gradient(135deg, #2dd4bf 0%, #14b8a6 100%)",
              boxShadow: "0 0 48px rgba(45, 212, 191, 0.45)",
            }}
          />
        </div>
      </div>
    ),
    size,
  )
}

