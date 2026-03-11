export default function ScaleInput({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: number | string
  onChange: (v: number) => void
  options: number[]
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm">{label}</label>
      <div className="flex gap-2 flex-wrap">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`px-3 py-1 rounded-lg border ${
              value === opt
                ? "bg-black text-white"
                : "bg-white"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}
