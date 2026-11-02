import { useEffect, useRef } from 'react'
import { Eraser } from 'lucide-react'
import {
  drawDoor,
  drawFloor,
  drawGate,
  drawKey,
  drawPulse,
  drawSentry,
  drawSpike,
  drawSwitch,
  drawWall,
} from '@/render/sprites'
import type { Tool } from './tools'

export function ToolIcon({ tool, px = 40 }: { tool: Tool; px?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx || tool === 'erase') return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    c.width = px * dpr
    c.height = px * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawFloor(ctx, 0, 0, px, 1, 0)
    const h = px / 2
    switch (tool) {
      case 'wall':
        drawWall(ctx, 0, 0, px, 1, 1)
        break
      case 'spike':
        drawSpike(ctx, 0, 0, px)
        break
      case 'pulse':
        drawPulse(ctx, 0, 0, px, 3, 0)
        break
      case 'sentryH':
      case 'sentryV':
        drawSentry(ctx, h, h, px, 400)
        ctx.fillStyle = '#ecebf5'
        ctx.font = `700 ${px * 0.22}px Silkscreen, monospace`
        ctx.textAlign = 'center'
        ctx.fillText(tool === 'sentryH' ? '<>' : '^v', h, px * 0.95)
        break
      case 'key':
        drawKey(ctx, h, h, px, 0)
        break
      case 'door':
        drawDoor(ctx, 0, 0, px, false)
        break
      case 'switch':
        drawSwitch(ctx, 0, 0, px, false)
        break
      case 'gate':
        drawGate(ctx, 0, 0, px, false)
        break
    }
  }, [tool, px])
  if (tool === 'erase') {
    return (
      <div style={{ width: px, height: px }} className="grid place-items-center rounded-md bg-ink-600 text-zinc-200">
        <Eraser size={px * 0.5} />
      </div>
    )
  }
  return <canvas ref={ref} style={{ width: px, height: px }} className="rounded-md" aria-hidden />
}
