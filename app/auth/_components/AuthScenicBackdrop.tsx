/**
 * Capas decorativas inspiradas en el punto y la marca Órvita (teal suave + textura).
 * No sustituye al fondo global del body: complementa cuando el shell es transparente en /auth.
 */
export function AuthScenicBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Resplandor central tipo “marca” */}
      <div
        className="absolute -top-[18%] left-1/2 h-[min(72vh,560px)] w-[min(92vw,680px)] -translate-x-1/2 rounded-full opacity-50 motion-reduce:opacity-40"
        style={{
          background:
            "radial-gradient(closest-side, color-mix(in srgb, var(--color-accent-primary) 26%, transparent), transparent 72%)",
          filter: "blur(44px)",
        }}
      />
      {/* Segundo halo (esquina) — eco del punto del logo */}
      <div
        className="absolute -bottom-[8%] -right-[6%] h-[min(42vh,360px)] w-[min(42vh,360px)] rounded-full opacity-40 motion-reduce:opacity-30"
        style={{
          background:
            "radial-gradient(closest-side, color-mix(in srgb, var(--color-accent-primary) 20%, transparent), transparent 68%)",
          filter: "blur(48px)",
        }}
      />
      <div
        className="absolute left-[8%] top-[32%] h-2 w-2 rounded-full opacity-50 shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-accent-primary)_35%,transparent)]"
        style={{
          background:
            "linear-gradient(145deg, color-mix(in srgb, var(--color-accent-primary) 88%, #fff), var(--color-accent-primary))",
        }}
      />
      <div
        className="absolute bottom-[22%] right-[14%] h-1.5 w-1.5 rounded-full opacity-35"
        style={{
          background: "var(--color-accent-primary)",
          boxShadow: "0 0 0 1px color-mix(in srgb, var(--color-accent-primary) 30%, transparent)",
        }}
      />
      {/* Malla de puntos muy suave */}
      <div
        className="absolute inset-0 opacity-[0.22]"
        style={{
          backgroundImage: `radial-gradient(circle at center, color-mix(in srgb, var(--color-accent-primary) 28%, transparent) 0.85px, transparent 1.1px)`,
          backgroundSize: "26px 26px",
        }}
      />
      {/* Velo para separar card del fondo sin otro bloque gris plano */}
      <div
        className="absolute inset-0 opacity-[0.5]"
        style={{
          background:
            "linear-gradient(165deg, color-mix(in srgb, var(--color-background) 22%, transparent) 0%, transparent 45%, color-mix(in srgb, var(--color-accent-primary) 6%, var(--color-background)) 100%)",
        }}
      />
    </div>
  )
}
