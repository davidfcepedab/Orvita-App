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
  <div className="space-y-10 pb-32">

    {/* ========================= FECHA ========================== */}
    <div className="bg-gradient-to-br from-indigo-50 to-slate-100 rounded-2xl p-6 space-y-4 shadow-sm">
      <h2 className="text-lg font-semibold text-indigo-700">
        Fecha
      </h2>

      <div className="flex gap-6 items-center text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.hoy}
            onChange={() => {
              const today = new Date().toISOString().split("T")[0]
              handleChange("fecha", today)
              handleChange("hoy", true)
              handleChange("ayer", false)
            }}
          />
          Hoy
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.ayer}
            onChange={() => {
              const d = new Date()
              d.setDate(d.getDate() - 1)
              handleChange("fecha", d.toISOString().split("T")[0])
              handleChange("ayer", true)
              handleChange("hoy", false)
            }}
          />
          Ayer
        </label>
      </div>

      <input
        type="date"
        value={form.fecha}
        onChange={(e) => {
          handleChange("fecha", e.target.value)
          handleChange("hoy", false)
          handleChange("ayer", false)
        }}
        className="w-full p-2 rounded-lg border border-gray-300"
      />
    </div>

    {/* ========================= ESTADO MENTAL ========================== */}
    <div className="bg-[#F4E4ED] rounded-2xl p-6 space-y-6">
      <h2 className="text-lg font-semibold text-[#D34A8C]">
        Estado Mental
      </h2>

      {[
        { label: "Sueño", key: "calidadSueno" },
        { label: "Descanso", key: "descanso" },
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
            value={form[item.key]}
            onChange={(e) =>
              handleChange(item.key, Number(e.target.value))
            }
            className="w-full accent-indigo-500"
          />

          <div className="flex justify-between text-xs text-gray-400 px-1">
            {scaleOptions.map((n) => (
              <span key={n}>{n}</span>
            ))}
          </div>
        </div>
      ))}
    </div>

    {/* ========================= HÁBITOS ========================== */}
    <div className="bg-amber-50 rounded-2xl p-6 space-y-6">
      <h2 className="text-lg font-semibold text-amber-700">
        Hábitos
      </h2>

      <div className="grid grid-cols-2 gap-4">
        <input type="time" value={form.horaDespertar} onChange={(e)=>handleChange("horaDespertar", e.target.value)} className="p-2 rounded-lg border border-gray-300"/>
        <input type="time" value={form.horaDormir} onChange={(e)=>handleChange("horaDormir", e.target.value)} className="p-2 rounded-lg border border-gray-300"/>
        <input type="number" placeholder="Agua (L)" value={form.agua} onChange={(e)=>handleChange("agua", e.target.value)} className="p-2 rounded-lg border border-gray-300"/>
        <input type="number" placeholder="Meditación (min)" value={form.meditacion} onChange={(e)=>handleChange("meditacion", e.target.value)} className="p-2 rounded-lg border border-gray-300"/>
        <input type="number" placeholder="Lectura (pág)" value={form.lectura} onChange={(e)=>handleChange("lectura", e.target.value)} className="p-2 rounded-lg border border-gray-300"/>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        {[
          ["dietaCumplida","Dieta cumplida"],
          ["avanceProyecto","Avance proyecto"],
          ["tiempoPareja","Tiempo pareja"],
          ["interaccionSocial","Interacción social"]
        ].map(([key,label])=>(
          <label key={key} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form[key]}
              onChange={(e)=>handleChange(key, e.target.checked ? 1 : 0)}
            />
            {label}
          </label>
        ))}
      </div>
    </div>

<div className="space-y-2 pt-2">
  <p className="text-sm text-gray-600">
    Calidad Conexión (1-10)
  </p>

  <input
    type="range"
    min="1"
    max="10"
    value={form.calidadConexion}
    onChange={(e) =>
      handleChange("calidadConexion", Number(e.target.value))
    }
    className="w-full accent-[#D34A8C]"
  />

  <div className="flex justify-between text-xs text-gray-400 px-1">
    {scaleOptions.map((n) => (
      <span key={n}>{n}</span>
    ))}
  </div>
</div>


    {/* ========================= ENTRENAMIENTO ========================== */}
    <div className="bg-[#E3F2EE] rounded-2xl p-6 space-y-6">
      <h2 className="text-lg font-semibold text-[#4CA79C]">
        Entrenamiento
      </h2>

      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={form.entreno}
          onChange={(e)=>handleChange("entreno", e.target.checked)}
        />
        Hoy entrené
      </label>

      {form.entreno && (
        <>
          <select
            value={form.tipoEntreno}
            onChange={(e)=>{
              const value = e.target.value
              handleChange("tipoEntreno", value)
              if(value==="Dia de descanso"){
                handleChange("minutosEntreno", 0)
              }
            }}
            className="w-full p-2 rounded-lg border border-gray-300"
          >
            <option value="">Seleccionar</option>
            <option>Push Volumen</option>
            <option>Upper Pesado</option>
            <option>Upper Metabolico</option>
            <option>Pull Espalda Dominante</option>
            <option>Deltoide Especializacion</option>
            <option>Lower Mantenimiento</option>
            <option>Natacion</option>
            <option>Dia de descanso</option>
          </select>

          <input
            type="number"
            placeholder="Minutos entrenados"
            value={form.minutosEntreno}
            disabled={form.tipoEntreno==="Dia de descanso"}
            onChange={(e)=>handleChange("minutosEntreno", e.target.value)}
            className="w-full p-2 rounded-lg border border-gray-300"
          />
        </>
      )}
    </div>

    {/* ========================= ANTROPOMETRÍA ========================== */}
    <div className="bg-[#EAF4F1] rounded-2xl p-6 space-y-6">
      <h2 className="text-lg font-semibold text-[#4CA79C]">
        Medidas Corporales
      </h2>

      <div className="grid grid-cols-2 gap-4">
        {[
          ["peso","Peso (kg)"],
          ["cintura","Cintura (cm)"],
          ["pecho","Pecho (cm)"],
          ["hombros","Ancho Hombros (cm)"],
          ["bicepsDer","Bíceps Derecho (cm)"],
          ["bicepsIzq","Bíceps Izquierdo (cm)"],
          ["cuadricepsDer","Cuádriceps Derecho (cm)"],
          ["cuadricepsIzq","Cuádriceps Izquierdo (cm)"],
          ["gluteos","Glúteos (cm)"],
        ].map(([key,label])=>(
          <input
            key={key}
            type="number"
            placeholder={label}
            value={form[key]}
            onChange={(e)=>handleChange(key, e.target.value)}
            className="p-2 rounded-lg border border-gray-300"
          />
        ))}
      </div>
    </div>

    {/* ========================= PRODUCTIVIDAD ========================== */}
    <div className="bg-emerald-50 rounded-2xl p-6 space-y-6">
      <h2 className="text-lg font-semibold text-emerald-700">
        Productividad
      </h2>

      <input
        type="number"
        placeholder="Deep Work (horas)"
        value={form.deepWork}
        onChange={(e)=>handleChange("deepWork", e.target.value)}
        className="w-full p-2 rounded-lg border border-gray-300"
      />

      <input
        type="range"
        min="1"
        max="10"
        value={form.productividad}
        onChange={(e)=>handleChange("productividad", Number(e.target.value))}
        className="w-full accent-emerald-500"
      />

      <div className="flex justify-between text-xs text-gray-400 px-1">
        {scaleOptions.map((n)=>(
          <span key={n}>{n}</span>
        ))}
      </div>
    </div>

{/* ========================= BOTÓN ========================== */}
<div className="pt-4">
  <button
    onClick={handleSubmit}
    disabled={loading}
    className="w-full bg-gradient-to-r from-[#6D6BCB] to-[#66B6A9] text-white py-3 rounded-xl font-medium shadow-md"
  >
    {loading ? "Guardando..." : "Guardar Check-in"}
  </button>
</div>
