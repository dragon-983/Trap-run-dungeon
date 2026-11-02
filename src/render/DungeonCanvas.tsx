import { useEffect, useMemo, useRef, useState } from 'react'
import { analyze } from '@/game/engine'
import type { RunSnapshot } from '@/game/run'
import { GRID, type Action, type Dungeon, type GameEvent } from '@/game/types'
import { getCosmetic } from '@/progress/cosmetics'
import { renderScene, type Fx } from './scene'

export interface EditorHooks {
  onDown: (x: number, y: number, button: number) => void
  onMove: (x: number, y: number) => void
  onUp: () => void
  /** Whether a tile can be edited (false for the start and exit tiles). */
  canEdit: (x: number, y: number) => boolean
  hoverColor: string
  locked: boolean
}

interface Props {
  dungeon: Dungeon
  snapshot?: RunSnapshot | null
  skinId: string
  trailId: string
  reduceMotion: boolean
  editor?: EditorHooks
  onSwipe?: (a: Action) => void
  dim?: boolean
  className?: string
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
const TWEEN_MS = 105

export function DungeonCanvas({ dungeon, snapshot = null, skinId, trailId, reduceMotion, editor, onSwipe, dim = false, className = '' }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState(0)
  const analysis = useMemo(() => analyze(dungeon), [dungeon])

  const live = useRef({ dungeon, analysis, snapshot, skinId, trailId, reduceMotion, editor, dim, size })
  useEffect(() => {
    live.current = { dungeon, analysis, snapshot, skinId, trailId, reduceMotion, editor, dim, size }
  })
  const hover = useRef<{ x: number; y: number } | null>(null)
  const pressed = useRef(false)
  const swipeStart = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize(Math.floor(el.clientWidth)))
    ro.observe(el)
    setSize(Math.floor(el.clientWidth))
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || size <= 0) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.floor(size * dpr)
    canvas.height = Math.floor(size * dpr)
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const fx: Fx = { particles: [], texts: [], shake: 0, flash: 0, flashColor: '#ff3d5a' }
    let lastEvent = live.current.snapshot?.events.id ?? 0
    let lastCombo = 0
    let facing = 1
    let lastTurn = live.current.snapshot?.state.turn ?? 0
    let raf = 0
    let last = performance.now()

    const burst = (x: number, y: number, color: string, n: number, speed = 3) => {
      const count = live.current.reduceMotion ? Math.ceil(n / 3) : n
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2
        const sp = (0.4 + Math.random()) * speed
        fx.particles.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 0.6 + Math.random() * 0.4, max: 1, color, size: 0.06 + Math.random() * 0.07 })
      }
    }
    const text = (t: string, x: number, y: number, color: string) => fx.texts.push({ text: t, x, y, life: 1, max: 1, color })

    const handle = (e: GameEvent) => {
      const cx = e.x + 0.5
      const cy = e.y + 0.5
      const calm = live.current.reduceMotion
      switch (e.type) {
        case 'key':
          burst(cx, cy, '#b9ff3b', 16)
          text('KEY', cx, cy - 0.5, '#b9ff3b')
          break
        case 'door':
          burst(cx, cy, '#ff8a1f', 18)
          text('UNLOCKED', cx, cy - 0.5, '#ff8a1f')
          break
        case 'lever':
          burst(cx, cy, '#b57bff', 20)
          text('GATES OPEN', cx, cy - 0.5, '#d4b0ff')
          break
        case 'near':
          burst(cx, cy, '#5bf0ff', 10, 2)
          text('NEAR MISS', cx, cy - 0.6, '#5bf0ff')
          break
        case 'hit':
          burst(cx, cy, '#ff3d5a', 34, 4.5)
          burst(cx, cy, '#ff8a1f', 14, 3)
          if (!calm) fx.shake = 16
          fx.flash = 0.45
          fx.flashColor = '#ff3d5a'
          text('OUCH', cx, cy - 0.5, '#ff6b82')
          break
        case 'win': {
          const colors = ['#b9ff3b', '#b57bff', '#ff8a1f', '#ffffff']
          for (let i = 0; i < (calm ? 20 : 70); i++) burst(cx, cy, colors[i % colors.length], 1, 5)
          text('ESCAPED', cx, cy + 0.9, '#b9ff3b')
          break
        }
        case 'bump':
          if (!calm) fx.shake = Math.max(fx.shake, 3)
          break
        case 'locked':
          text('LOCKED', cx, cy - 0.4, '#ff8a1f')
          if (!calm) fx.shake = Math.max(fx.shake, 4)
          break
        default:
          break
      }
    }

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const L = live.current
      const snap = L.snapshot
      const state = snap?.state ?? null

      if (snap && snap.events.id !== lastEvent) {
        lastEvent = snap.events.id
        snap.events.list.forEach(handle)
      }
      if (snap && snap.combo >= 2 && snap.combo !== lastCombo) text(`COMBO x${snap.combo}`, snap.state.x + 0.5, snap.state.y - 0.1, '#b57bff')
      if (snap) lastCombo = snap.combo
      if (snap && snap.state.turn !== lastTurn) {
        lastTurn = snap.state.turn
        const dx = snap.state.x - snap.prev.x
        if (dx !== 0) facing = Math.sign(dx)
        if (!L.reduceMotion && !snap.snap) {
          const cos = getCosmetic(L.trailId)
          const n = L.trailId === 'trail-comet' ? 2 : 4
          for (let i = 0; i < n; i++) {
            fx.particles.push({
              x: snap.prev.x + 0.5 + (Math.random() - 0.5) * 0.3,
              y: snap.prev.y + 0.5 + (Math.random() - 0.5) * 0.3,
              vx: (Math.random() - 0.5) * 0.8,
              vy: L.trailId === 'trail-embers' || L.trailId === 'trail-forge' ? -Math.random() * 1.4 : (Math.random() - 0.5) * 0.8,
              life: 0.5,
              max: 0.5,
              color: i % 2 ? cos.color : cos.accent,
              size: L.trailId === 'trail-glitch' ? 0.14 : 0.07,
            })
          }
        }
      }

      for (const p of fx.particles) {
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vx *= 0.96
        p.vy *= 0.96
        p.life -= dt
      }
      fx.particles = fx.particles.filter((p) => p.life > 0)
      for (const t of fx.texts) {
        t.y -= dt * 0.9
        t.life -= dt * 0.9
      }
      fx.texts = fx.texts.filter((t) => t.life > 0)
      fx.shake *= 0.86
      fx.flash *= 0.9

      const tween = snap && !snap.snap ? easeOut(Math.min(1, (now - snap.changedAt) / TWEEN_MS)) : 1
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const h = hover.current
      renderScene(
        ctx,
        L.size,
        {
          dungeon: L.dungeon,
          analysis: L.analysis,
          state,
          prev: snap?.prev ?? null,
          tween,
          snap: snap?.snap ?? true,
          ambientTurn: L.reduceMotion ? 0 : now / 650,
          now,
          skin: getCosmetic(L.skinId),
          hover: h && L.editor && !L.editor.locked ? { x: h.x, y: h.y, ok: L.editor.canEdit(h.x, h.y), color: L.editor.hoverColor } : null,
          showPlayer: Boolean(snap) && snap?.phase !== 'lost',
          facing,
          dim: L.dim,
        },
        fx,
      )
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [size])

  const cellAt = (e: React.PointerEvent): { x: number; y: number } | null => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return null
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * GRID)
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * GRID)
    if (x < 0 || y < 0 || x >= GRID || y >= GRID) return null
    return { x, y }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (editor) {
      const cell = cellAt(e)
      if (!cell) return
      e.currentTarget.setPointerCapture(e.pointerId)
      pressed.current = true
      hover.current = cell
      editor.onDown(cell.x, cell.y, e.button)
    } else if (onSwipe && e.pointerType !== 'mouse') {
      swipeStart.current = { x: e.clientX, y: e.clientY }
    }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!editor) return
    const cell = cellAt(e)
    hover.current = cell
    if (cell && pressed.current) editor.onMove(cell.x, cell.y)
  }
  const endPress = (e: React.PointerEvent) => {
    if (editor && pressed.current) {
      pressed.current = false
      editor.onUp()
    }
    const s = swipeStart.current
    if (s && onSwipe) {
      const dx = e.clientX - s.x
      const dy = e.clientY - s.y
      if (Math.max(Math.abs(dx), Math.abs(dy)) > 24) {
        onSwipe(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : dy > 0 ? 'D' : 'U')
      }
      swipeStart.current = null
    }
  }

  return (
    <div ref={wrapRef} className={`relative aspect-square w-full ${className}`}>
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className={`block rounded-xl ${editor || onSwipe ? 'touch-none-all' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPress}
        onPointerCancel={endPress}
        onPointerLeave={() => {
          hover.current = null
        }}
        onContextMenu={(e) => e.preventDefault()}
        role="img"
        aria-label={`Dungeon ${dungeon.name}`}
      />
    </div>
  )
}
