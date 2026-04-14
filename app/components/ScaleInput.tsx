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
      <label className="text-sm text-orbita-primary">{label}</label>
      <div className="flex gap-2 flex-wrap">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`rounded-lg border border-orbita-border px-3 py-1 transition ${
              value === opt
                ? "bg-[var(--color-accent-primary)] text-white"
                : "bg-orbita-surface text-orbita-primary hover:bg-orbita-surface-alt"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}
