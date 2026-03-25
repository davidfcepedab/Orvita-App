"use client"

import { useState } from "react"
import { type ColorTheme, type LayoutMode, useApp, themes } from "@/app/contexts/AppContext"
import { Monitor, Palette, Sliders } from "lucide-react"

export default function ConfigV3() {
  const { colorTheme, setColorTheme, layoutMode, setLayoutMode } = useApp()
  const theme = themes[colorTheme]
  const [intensity, setIntensity] = useState(50)

  const themeOptions: { id: ColorTheme; label: string; colors: string[] }[] = [
    { id: "arctic", label: "Arctic (Light)", colors: ["#F4F7F9", "#10B981", "#38BDF8"] },
    { id: "carbon", label: "Carbon (Dark)", colors: ["#0F0F10", "#34D399", "#60A5FA"] },
    { id: "sand", label: "Sand (Warm)", colors: ["#FAF8F5", "#FCD34D", "#FDBA74"] },
  ]

  const layoutOptions: { id: LayoutMode; label: string }[] = [
    { id: "balanced", label: "Balanceado (Default)" },
    { id: "compact", label: "Alta Densidad (Pro)" },
    { id: "zen", label: "Focus Mode (Zen)" },
  ]

  return (
    <div className="mx-auto max-w-4xl space-y-12">
      <div>
        <h2 className="text-3xl tracking-tight">Engine Settings</h2>
        <p className="text-sm" style={{ color: theme.textMuted }}>
          Control parametrico de la interfaz Orbita OS
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-8">
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-xs uppercase tracking-wider" style={{ color: theme.textMuted }}>
              <Palette className="h-4 w-4" />
              Entorno de Color
            </h3>
            <div className="grid gap-3">
              {themeOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setColorTheme(option.id)}
                  className="flex items-center justify-between rounded-xl border p-4"
                  style={{
                    backgroundColor: colorTheme === option.id ? theme.surfaceAlt : theme.surface,
                    borderColor: colorTheme === option.id ? theme.text : theme.border,
                  }}
                >
                  <span className="text-sm">{option.label}</span>
                  <div className="flex gap-1">
                    {option.colors.map((color) => (
                      <div key={color} className="h-4 w-4 rounded-full border" style={{ backgroundColor: color }} />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-xs uppercase tracking-wider" style={{ color: theme.textMuted }}>
              <Monitor className="h-4 w-4" />
              Densidad de Datos
            </h3>
            <div className="grid gap-3">
              {layoutOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setLayoutMode(option.id)}
                  className="flex items-center justify-between rounded-xl border p-4"
                  style={{
                    backgroundColor: layoutMode === option.id ? theme.surfaceAlt : theme.surface,
                    borderColor: layoutMode === option.id ? theme.text : theme.border,
                  }}
                >
                  <span className="text-sm">{option.label}</span>
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: layoutMode === option.id ? theme.accent.health : theme.border }} />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-xs uppercase tracking-wider" style={{ color: theme.textMuted }}>
              <Sliders className="h-4 w-4" />
              Intensidad Haptica / Animaciones
            </h3>
            <div className="rounded-xl border p-6" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
              <div className="mb-4 flex justify-between text-xs" style={{ color: theme.textMuted }}>
                <span>Sutil</span>
                <span>Inmersivo</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={intensity}
                onChange={(event) => setIntensity(Number(event.target.value))}
                className="w-full cursor-pointer appearance-none rounded-lg"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs uppercase tracking-wider" style={{ color: theme.textMuted }}>
            Live Preview
          </h3>
          <div className="flex h-[500px] flex-col gap-6 rounded-3xl border-2 p-8" style={{ backgroundColor: theme.bg, borderColor: theme.border }}>
            <div className="flex items-center justify-between">
              <div className="h-6 w-24 rounded-md" style={{ backgroundColor: theme.surfaceAlt }} />
              <div className="h-8 w-8 rounded-full" style={{ backgroundColor: theme.surfaceAlt }} />
            </div>
            <div className="flex-1 rounded-2xl border p-6" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
              <div className="mb-6 h-4 w-1/3 rounded" style={{ backgroundColor: theme.textMuted, opacity: 0.2 }} />
              <div className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="flex items-center gap-4">
                    <div
                      className="h-10 w-10 rounded-xl"
                      style={{
                        backgroundColor: item === 1 ? theme.accent.finance : theme.surfaceAlt,
                        opacity: item === 1 ? 1 : 0.5,
                      }}
                    />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-3/4 rounded" style={{ backgroundColor: theme.text, opacity: 0.8 }} />
                      <div className="h-2 w-1/2 rounded" style={{ backgroundColor: theme.textMuted, opacity: 0.4 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex h-16 items-center justify-around rounded-2xl border px-4" style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }}>
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-6 w-6 rounded" style={{ backgroundColor: theme.textMuted, opacity: item === 1 ? 0.8 : 0.2 }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
