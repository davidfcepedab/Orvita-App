"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog"
import { Button } from "@/src/components/ui/Button"

type Dims = { cw: number; ch: number; nw: number; nh: number; base: number }

function clampPos(x: number, y: number, scale: number, d: Dims) {
  const iw = d.nw * scale
  const ih = d.nh * scale
  const minX = d.cw - iw
  const minY = d.ch - ih
  return {
    x: Math.min(0, Math.max(minX, x)),
    y: Math.min(0, Math.max(minY, y)),
  }
}

function centerPos(scale: number, d: Dims) {
  const iw = d.nw * scale
  const ih = d.nh * scale
  return { x: (d.cw - iw) / 2, y: (d.ch - ih) / 2 }
}

export type OrbitaImageCropDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  file: File | null
  /** Relación ancho / alto del encuadre (p. ej. 2.4 para banner, 1 para avatar). */
  aspect: number
  title: string
  /** Máximo ancho del JPEG de salida (mantiene proporción del encuadre). */
  outputMaxWidth: number
  outputQuality?: number
  onCropped: (file: File) => void
}

export function OrbitaImageCropDialog({
  open,
  onOpenChange,
  file,
  aspect,
  title,
  outputMaxWidth,
  outputQuality = 0.88,
  onCropped,
}: OrbitaImageCropDialogProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [dim, setDim] = useState<Dims | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const dragRef = useRef({ active: false, lx: 0, ly: 0 })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open || !file) {
      setObjectUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      setDim(null)
      setZoom(1)
      setPos({ x: 0, y: 0 })
      return
    }
    const url = URL.createObjectURL(file)
    setObjectUrl(url)
    return () => {
      URL.revokeObjectURL(url)
    }
  }, [open, file])

  const measure = useCallback(() => {
    const vp = viewportRef.current
    const img = imgRef.current
    if (!vp || !img?.naturalWidth) return
    const cw = vp.clientWidth
    const ch = vp.clientHeight
    const nw = img.naturalWidth
    const nh = img.naturalHeight
    if (cw < 2 || ch < 2) return
    const base = Math.max(cw / nw, ch / nh)
    const next: Dims = { cw, ch, nw, nh, base }
    setDim(next)
    setZoom(1)
    setPos(centerPos(base, next))
  }, [])

  const onImageLoad = () => {
    window.requestAnimationFrame(() => measure())
  }

  useEffect(() => {
    if (!open) return
    const id = window.setTimeout(() => measure(), 200)
    const onResize = () => measure()
    window.addEventListener("resize", onResize)
    return () => {
      window.clearTimeout(id)
      window.removeEventListener("resize", onResize)
    }
  }, [open, measure])

  const scale = dim ? dim.base * zoom : 1
  const handleZoomChange = (nextZoom: number) => {
    if (!dim) {
      setZoom(nextZoom)
      return
    }
    const oldScale = dim.base * zoom
    const newScale = dim.base * nextZoom
    setPos((p) => {
      const ix = (dim.cw / 2 - p.x) / oldScale
      const iy = (dim.ch / 2 - p.y) / oldScale
      const nx = dim.cw / 2 - ix * newScale
      const ny = dim.ch / 2 - iy * newScale
      return clampPos(nx, ny, newScale, dim)
    })
    setZoom(nextZoom)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = { active: true, lx: e.clientX, ly: e.clientY }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.active || !dim) return
    const dx = e.clientX - dragRef.current.lx
    const dy = e.clientY - dragRef.current.ly
    dragRef.current.lx = e.clientX
    dragRef.current.ly = e.clientY
    const sc = dim.base * zoom
    setPos((p) => clampPos(p.x + dx, p.y + dy, sc, dim))
  }

  const onPointerUp = (e: React.PointerEvent) => {
    dragRef.current.active = false
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  const handleConfirm = async () => {
    const img = imgRef.current
    if (!img || !dim) return
    setBusy(true)
    try {
      const sc = dim.base * zoom
      let sx = -pos.x / sc
      let sy = -pos.y / sc
      let sw = dim.cw / sc
      let sh = dim.ch / sc

      sx = Math.max(0, Math.min(dim.nw - 0.5, sx))
      sy = Math.max(0, Math.min(dim.nh - 0.5, sy))
      sw = Math.min(sw, dim.nw - sx)
      sh = Math.min(sh, dim.nh - sy)

      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
      const outW = Math.min(outputMaxWidth, Math.max(480, Math.round(dim.cw * Math.min(2, dpr))))
      const outH = Math.round(outW / (dim.cw / dim.ch))

      const canvas = document.createElement("canvas")
      canvas.width = outW
      canvas.height = outH
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("Canvas no disponible")
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH)

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", outputQuality),
      )
      if (!blob) throw new Error("No se pudo generar la imagen")

      onCropped(new File([blob], "recorte.jpg", { type: "image/jpeg" }))
      onOpenChange(false)
    } catch {
      /* silencioso: el padre puede añadir toast */
    } finally {
      setBusy(false)
    }
  }

  const imgW = dim ? dim.nw * scale : undefined
  const imgH = dim ? dim.nh * scale : undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(96vw,42rem)] gap-0 p-0 sm:max-w-2xl" showClose={!busy}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Arrastra la imagen para encuadrarla. Ajusta el zoom si necesitas más detalle.
          </p>
        </DialogHeader>

        <div className="space-y-4 px-6 pb-2">
          <div
            ref={viewportRef}
            className="relative mx-auto w-full max-w-xl touch-none overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] shadow-inner"
            style={{ aspectRatio: aspect }}
          >
            {objectUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={imgRef}
                src={objectUrl}
                alt=""
                draggable={false}
                onLoad={onImageLoad}
                className="absolute cursor-grab select-none active:cursor-grabbing"
                style={{
                  width: imgW ?? "auto",
                  height: imgH ?? "auto",
                  left: pos.x,
                  top: pos.y,
                  maxWidth: "none",
                }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              />
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-[var(--color-text-secondary)]" htmlFor="orbita-crop-zoom">
              Zoom
            </label>
            <input
              id="orbita-crop-zoom"
              type="range"
              min={1}
              max={3}
              step={0.02}
              value={zoom}
              onChange={(e) => handleZoomChange(Number(e.target.value))}
              className="w-full cursor-pointer accent-[var(--color-accent-health)]"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" variant="primary" disabled={busy || !dim} onClick={() => void handleConfirm()}>
            {busy ? "Procesando…" : "Usar recorte"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
