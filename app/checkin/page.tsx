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
  <div className="space-y-8 pb-24">

    {/* =========================
        ESTADO MENTAL
    ========================== */}
    <div className="bg-rose-50 rounded-2xl p-6 space-y-6">
      <h2 className="text-lg font-semibold text-rose-600">
        Estado Mental
      </h2>

      {[
        { label: "Sueño", key: "sueno" },
        { label: "Energía", key: "energia" },
        { label: "Ansiedad", key: "ansiedad" },
        { label: "Estado ánimo", key: "estadoAnimo" },
      ].map((item) => (
        <div key={item.key} className="space-y-2">
          <p className="text-sm text-gray-600">{item.label}</p>
          <input
            type="range"
            min="1"
            max="10"
            className="w-full accent-rose-500"
          />
        </div>
      ))}
    </div>

    {/* =========================
        FÍSICO
    ========================== */}
    <div className="bg-emerald-50 rounded-2xl p-6 space-y-6">
      <h2 className="text-lg font-semibold text-emerald-600">
        Físico
      </h2>

      <div className="flex items-center gap-3">
        <input type="checkbox" />
        <span className="text-sm text-gray-600">
          Hoy entrené
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <input
          type="number"
          placeholder="Peso (kg)"
          className="input"
        />
        <input
          type="number"
          placeholder="Cintura (cm)"
          className="input"
        />
      </div>
    </div>

    {/* =========================
        PROFESIONAL
    ========================== */}
    <div className="bg-orange-50 rounded-2xl p-6 space-y-6">
      <h2 className="text-lg font-semibold text-orange-500">
        Profesional
      </h2>

      {[
        { label: "Deep Work", key: "deepWork" },
        { label: "Productividad", key: "productividad" },
      ].map((item) => (
        <div key={item.key} className="space-y-2">
          <p className="text-sm text-gray-600">{item.label}</p>
          <input
            type="range"
            min="1"
            max="10"
            className="w-full accent-orange-500"
          />
        </div>
      ))}
    </div>

    {/* =========================
        CONEXIÓN
    ========================== */}
    <div className="bg-indigo-50 rounded-2xl p-6 space-y-6">
      <h2 className="text-lg font-semibold text-indigo-600">
        Conexión
      </h2>

      <div className="space-y-2">
        <p className="text-sm text-gray-600">
          Calidad conexión
        </p>
        <input
          type="range"
          min="1"
          max="10"
          className="w-full accent-indigo-500"
        />
      </div>
    </div>

    {/* =========================
        BOTÓN GUARDAR
    ========================== */}
    <button className="w-full py-4 rounded-2xl text-white font-medium bg-gradient-to-r from-teal-400 to-indigo-500 shadow-md">
      Guardar Check-In
    </button>
  </div>
)
