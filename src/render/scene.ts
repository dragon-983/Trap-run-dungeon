import { pulsePhase, sentryCell, type Analysis } from '@/game/engine'
import { GRID, idx, type Dungeon, type RunState } from '@/game/types'
import type { Cosmetic } from '@/progress/cosmetics'
import {
  COLORS,
  drawDoor,
  drawExit,
  drawFloor,
  drawGate,
  drawKey,
  drawPlayer,
  drawPulse,
  drawSentry,
  drawSpike,
  drawStart,
  drawSwitch,
  drawWall,
} from './sprites'

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  color: string
  size: number
}

export interface FloatText {
  text: string
  x: number
  y: number
  life: number
  max: number
  color: string
}

export interface Fx {
  particles: Particle[]
  texts: FloatText[]
  shake: number
  flash: number
  flashColor: string
}

export interface SceneModel {
  dungeon: Dungeon
  analysis: Analysis
  state: RunState | null
  prev: RunState | null
  /** Eased 0..1 progress between prev and state. */
  tween: number
  snap: boolean
  /** Continuous turn counter used when no run is active (editor / menu preview). */
  ambientTurn: number
  now: number
  skin: Cosmetic
  hover: { x: number; y: number; ok: boolean; color: string } | null
  showPlayer: boolean
  facing: number
  dim: boolean
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export function renderScene(ctx: CanvasRenderingContext2D, size: number, m: SceneModel, fx: Fx): void {
  const c = size / GRID
  const { dungeon: d, analysis: a, state, now } = m
  ctx.clearRect(0, 0, size, size)
  ctx.save()
  if (fx.shake > 0.1) ctx.translate((Math.random() - 0.5) * fx.shake, (Math.random() - 0.5) * fx.shake)

  const turn = state ? state.turn : Math.floor(m.ambientTurn)

  // --- terrain ---
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const px = x * c
      const py = y * c
      const cell = d.cells[idx(x, y)]
      if (cell === 'wall') {
        drawWall(ctx, px, py, c, x, y)
        continue
      }
      drawFloor(ctx, px, py, c, x, y)
      const i = idx(x, y)
      switch (cell) {
        case 'spike':
          drawSpike(ctx, px, py, c)
          break
        case 'pulse':
          drawPulse(ctx, px, py, c, pulsePhase(turn, x, y), now)
          break
        case 'key':
          if (!(state && (state.keys >> a.keyBit[i]) & 1)) drawKey(ctx, px + c / 2, py + c / 2, c, now)
          break
        case 'door':
          drawDoor(ctx, px, py, c, Boolean(state && (state.doors >> a.doorBit[i]) & 1))
          break
        case 'switch':
          drawSwitch(ctx, px, py, c, Boolean(state?.lever))
          break
        case 'gate':
          drawGate(ctx, px, py, c, Boolean(state?.lever))
          break
        default:
          break
      }
    }
  }
  drawStart(ctx, (d.start.x + 0.5) * c, (d.start.y + 0.5) * c, c, now)
  drawExit(ctx, (d.exit.x + 0.5) * c, (d.exit.y + 0.5) * c, c, now)

  // --- sentry patrol hints (clear visual warning of where they travel) ---
  ctx.fillStyle = 'rgba(181,123,255,0.28)'
  for (const s of a.sentries) {
    for (const cellIndex of new Set(s.path)) {
      const sx = (cellIndex % GRID) * c + c / 2
      const sy = Math.floor(cellIndex / GRID) * c + c / 2
      ctx.fillRect(sx - c * 0.05, sy - c * 0.05, c * 0.1, c * 0.1)
    }
  }

  // --- entities ---
  let turnA = turn
  let turnB = turn
  let f = 0
  if (state && m.prev && !m.snap && m.prev.turn !== state.turn) {
    turnA = m.prev.turn
    turnB = state.turn
    f = m.tween
  } else if (!state) {
    turnA = Math.floor(m.ambientTurn)
    turnB = turnA + 1
    const frac = m.ambientTurn - turnA
    f = frac * frac * (3 - 2 * frac)
  }
  for (let k = 0; k < a.sentries.length; k++) {
    const p0 = sentryCell(a, k, turnA)
    const p1 = sentryCell(a, k, turnB)
    const x = lerp(p0 % GRID, p1 % GRID, f)
    const y = lerp(Math.floor(p0 / GRID), Math.floor(p1 / GRID), f)
    drawSentry(ctx, (x + 0.5) * c, (y + 0.5) * c, c, now)
  }

  if (m.showPlayer && state) {
    const from = m.prev && !m.snap ? m.prev : state
    const px = lerp(from.x, state.x, m.tween)
    const py = lerp(from.y, state.y, m.tween)
    drawPlayer(ctx, (px + 0.5) * c, (py + 0.5) * c, c, m.skin, now, m.facing)
  }

  // --- particles & text ---
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const p of fx.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max)
    ctx.fillStyle = p.color
    const s = p.size * c
    ctx.fillRect(p.x * c - s / 2, p.y * c - s / 2, s, s)
  }
  ctx.restore()
  ctx.textAlign = 'center'
  ctx.font = `700 ${Math.max(11, c * 0.28)}px Silkscreen, monospace`
  for (const t of fx.texts) {
    ctx.globalAlpha = Math.min(1, (t.life / t.max) * 1.6)
    ctx.fillStyle = '#0b0b10'
    ctx.fillText(t.text, t.x * c + 1.5, t.y * c + 1.5)
    ctx.fillStyle = t.color
    ctx.fillText(t.text, t.x * c, t.y * c)
  }
  ctx.globalAlpha = 1

  // --- editor hover ---
  if (m.hover) {
    const { x, y, ok, color } = m.hover
    ctx.fillStyle = ok ? color : 'rgba(255,61,90,0.28)'
    ctx.globalAlpha = ok ? 0.28 : 1
    ctx.fillRect(x * c, y * c, c, c)
    ctx.globalAlpha = 1
    ctx.strokeStyle = ok ? color : COLORS.blood
    ctx.lineWidth = 2
    ctx.strokeRect(x * c + 1, y * c + 1, c - 2, c - 2)
  }

  // --- light: vignette ---
  const v = ctx.createRadialGradient(size / 2, size / 2, size * 0.32, size / 2, size / 2, size * 0.78)
  v.addColorStop(0, 'rgba(5,5,10,0)')
  v.addColorStop(1, 'rgba(5,5,10,0.55)')
  ctx.fillStyle = v
  ctx.fillRect(0, 0, size, size)
  if (m.dim) {
    ctx.fillStyle = 'rgba(8,8,14,0.55)'
    ctx.fillRect(0, 0, size, size)
  }
  if (fx.flash > 0.01) {
    ctx.globalAlpha = fx.flash
    ctx.fillStyle = fx.flashColor
    ctx.fillRect(0, 0, size, size)
    ctx.globalAlpha = 1
  }
  ctx.restore()
}
