export default function Section({
  title,
  color,
  children,
}: {
  title: string
  color: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-4 mb-8">
      <h2
        className="text-lg font-semibold"
        style={{ color }}
      >
        {title}
      </h2>
      {children}
    </div>
  )
}
