import { useEffect, useRef } from 'react'
import type { Cosmetic } from '@/progress/cosmetics'
import { drawFloor, drawPlayer } from '@/render/sprites'

export function SkinPreview({ cosmetic, px = 72 }: { cosmetic: Cosmetic; px?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    c.width = px * dpr
    c.height = px * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawFloor(ctx, 0, 0, px, 1, 0)
    drawPlayer(ctx, px / 2, px / 2, px, cosmetic, 0, 1)
  }, [cosmetic, px])
  return <canvas ref={ref} style={{ width: px, height: px }} className="rounded-xl" aria-hidden />
}
