"use client"

import { useState } from "react"

export default function CheckinPage() {

  const today = new Date().toISOString().split("T")[0]

  const [form, setForm] = useState<any>({
    fecha: today,
    hoy: true,
    ayer: false,

    calidadSueno: "",
    energia: "",
    ansiedad: "",
    estadoAnimo: "",

    entreno: false,
    tipoEntreno: "",
    minutosEntreno: "",
    peso: "",
    cintura: "",

    calidadConexion: "",

    deepWork: "",
    productividad: ""
  })

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleChange = (field: string, value: any) => {
    setForm({ ...form, [field]: value })
  }

  const handleSubmit = async () => {

    if (!form.calidadSueno || !form.energia || !form.estadoAnimo) {
      alert("Completa los campos principales")
      return
    }

    setLoading(true)
    setSuccess(false)

    await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })

    setLoading(false)
    setSuccess(true)

    setTimeout(() => setSuccess(false), 2000)
  }

  const scaleOptions = Array.from({ length: 10 }, (_, i) => i + 1)

  return (
    <div className="space-y-8">

      <div className="card">

        <h1 className="text-2xl font-semibold mb-6">
          Check-In Diario
        </h1>

        {/* ==============================
            FECHA
        ============================== */}

        <div className="space-y-4 mb-8">

          <input
            type="date"
            value={form.fecha}
            onChange={(e) => handleChange("fecha", e.target.value)}
            className="w-full border rounded-xl px-4 py-3"
          />

          <div className="flex gap-6 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.hoy}
                onChange={() => {
                  handleChange("hoy", true)
                  handleChange("ayer", false)
                  handleChange("fecha", today)
                }}
              />
              Hoy
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.ayer}
                onChange={() => {
                  const yesterday = new Date(Date.now() - 86400000)
                    .toISOString()
                    .split("T")[0]
                  handleChange("ayer", true)
                  handleChange("hoy", false)
                  handleChange("fecha", yesterday)
                }}
              />
              Fue ayer
            </label>
          </div>
        </div>

        {/* ==============================
            ESTADO MENTAL
        ============================== */}

        <Section
          title="Estado Mental"
          color="#EE3A93"
        >

          <ScaleInput
            label="Sueño"
            value={form.calidadSueno}
            onChange={(v) => handleChange("calidadSueno", v)}
            options={scaleOptions}
          />

          <ScaleInput
            label="Energía"
            value={form.energia}
            onChange={(v) => handleChange("energia", v)}
            options={scaleOptions}
          />

          <ScaleInput
            label="Ansiedad"
            value={form.ansiedad}
            onChange={(v) => handleChange("ansiedad", v)}
            options={scaleOptions}
          />

          <ScaleInput
            label="Estado ánimo"
            value={form.estadoAnimo}
            onChange={(v) => handleChange("estadoAnimo", v)}
            options={scaleOptions}
          />

        </Section>

        {/* ==============================
            FÍSICO
        ============================== */}

        <Section
          title="Físico"
          color="#3FC5BB"
        >

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.entreno}
              onChange={(e) =>
                handleChange("entreno", e.target.checked)
              }
            />
            Hoy entrené
          </label>

          {form.entreno && (
            <>
              <input
                placeholder="Tipo Entreno"
                className="w-full border rounded-xl px-4 py-3"
                value={form.tipoEntreno}
                onChange={(e) =>
                  handleChange("tipoEntreno", e.target.value)
                }
              />

              <input
                type="number"
                placeholder="Minutos Entreno"
                className="w-full border rounded-xl px-4 py-3"
                value={form.minutosEntreno}
                onChange={(e) =>
                  handleChange("minutosEntreno", e.target.value)
                }
              />
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <input
              type="number"
              placeholder="Peso (kg)"
              className="border rounded-xl px-4 py-3"
              value={form.peso}
              onChange={(e) =>
                handleChange("peso", e.target.value)
              }
            />
            <input
              type="number"
              placeholder="Cintura (cm)"
              className="border rounded-xl px-4 py-3"
              value={form.cintura}
              onChange={(e) =>
                handleChange("cintura", e.target.value)
              }
            />
          </div>

        </Section>

        {/* ==============================
            CONEXIÓN
        ============================== */}

        <Section
          title="Conexión"
          color="#6C4CE3"
        >

          <ScaleInput
            label="Calidad conexión"
            value={form.calidadConexion}
            onChange={(v) =>
              handleChange("calidadConexion", v)
            }
            options={scaleOptions}
          />

        </Section>

        {/* ==============================
            PRODUCTIVIDAD
        ============================== */}

        <Section
          title="Productividad"
          color="#3B82F6"
        >

          <input
            type="number"
            placeholder="Deep Work (hrs)"
            className="w-full border rounded-xl px-4 py-3"
            value={form.deepWork}
            onChange={(e) =>
              handleChange("deepWork", e.target.value)
            }
          />

          <ScaleInput
            label="Productividad"
            value={form.productividad}
            onChange={(v) =>
              handleChange("productividad", v)
            }
            options={scaleOptions}
          />

        </Section>

        {/* ==============================
            BOTÓN
        ============================== */}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className={`w-full mt-8 rounded-2xl py-4 font-semibold transition-all duration-300
          ${success
              ? "bg-emerald-500 text-white scale-105"
              : "bg-black text-white hover:scale-105"
            }`}
        >
          {loading
            ? "Guardando..."
            : success
            ? "✓ Guardado"
            : "Guardar Check-In"}
        </button>

      </div>
    </div>
  )
}

/* ======================================
   COMPONENTES AUXILIARES
====================================== */

function Section({ title, color, children }: any) {
  return (
    <div
      className="p-6 rounded-2xl mb-8 space-y-4"
      style={{
        backgroundColor: `${color}0D`, // 5% approx
        borderLeft: `4px solid ${color}`,
      }}
    >
      <h2
        className="text-sm uppercase tracking-wide font-semibold"
        style={{ color }}
      >
        {title}
      </h2>

      {children}
    </div>
  )
}

function ScaleInput({ label, value, onChange, options }: any) {
  return (
    <div>
      <label className="text-xs text-gray-500">
        {label}
      </label>

      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full mt-1 border rounded-xl px-4 py-3"
      >
        <option value="">Selecciona</option>
        {options.map((n: number) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </div>
  )
}
