"use client"

import { useState } from "react"
import Section from "@/app/components/Section"
import ScaleInput from "@/app/components/ScaleInput"

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
            ESTADO MENTAL
        ============================== */}

        <Section title="Estado Mental" color="#EE3A93">
          <ScaleInput
            label="Sueño"
            value={form.calidadSueno}
            onChange={(v: number) => handleChange("calidadSueno", v)}
            options={scaleOptions}
          />

          <ScaleInput
            label="Energía"
            value={form.energia}
            onChange={(v: number) => handleChange("energia", v)}
            options={scaleOptions}
          />

          <ScaleInput
            label="Ansiedad"
            value={form.ansiedad}
            onChange={(v: number) => handleChange("ansiedad", v)}
            options={scaleOptions}
          />

          <ScaleInput
            label="Estado ánimo"
            value={form.estadoAnimo}
            onChange={(v: number) => handleChange("estadoAnimo", v)}
            options={scaleOptions}
          />
        </Section>

        {/* ==============================
            FÍSICO
        ============================== */}

        <Section title="Físico" color="#3FC5BB">
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
                  handleChange("minutosEntreno", Number(e.target.value))
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
                handleChange("peso", Number(e.target.value))
              }
            />

            <input
              type="number"
              placeholder="Cintura (cm)"
              className="border rounded-xl px-4 py-3"
              value={form.cintura}
              onChange={(e) =>
                handleChange("cintura", Number(e.target.value))
              }
            />
          </div>
        </Section>

        {/* ==============================
            CONEXIÓN
        ============================== */}

        <Section title="Conexión" color="#6C4CE3">
          <ScaleInput
            label="Calidad conexión"
            value={form.calidadConexion}
            onChange={(v: number) =>
              handleChange("calidadConexion", v)
            }
            options={scaleOptions}
          />
        </Section>

        {/* ==============================
            PROFESIONAL
        ============================== */}

        <Section title="Profesional" color="#FF8C42">
          <ScaleInput
            label="Deep Work"
            value={form.deepWork}
            onChange={(v: number) =>
              handleChange("deepWork", v)
            }
            options={scaleOptions}
          />

          <ScaleInput
            label="Productividad"
            value={form.productividad}
            onChange={(v: number) =>
              handleChange("productividad", v)
            }
            options={scaleOptions}
          />
        </Section>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-black text-white py-3 rounded-xl mt-6"
        >
          {loading ? "Guardando..." : "Guardar Check-In"}
        </button>

        {success && (
          <div className="text-green-600 text-sm mt-4">
            Check-in guardado correctamente
          </div>
        )}
      </div>
    </div>
  )
}
