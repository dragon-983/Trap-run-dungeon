import type { Cosmetic } from '@/progress/cosmetics'

export const COLORS = {
  floorA: '#151520',
  floorB: '#191927',
  wall: '#2d2d48',
  wallHi: '#42426a',
  wallLo: '#1a1a2c',
  volt: '#9d4dff',
  voltLo: '#5a1fb3',
  acid: '#b9ff3b',
  ember: '#ff8a1f',
  blood: '#ff3d5a',
}

export const rnd = (x: number, y: number, n = 0): number => {
  let h = (x * 374761393 + y * 668265263 + n * 2147483647) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

type Ctx = CanvasRenderingContext2D

const tri = (ctx: Ctx, cx: number, baseY: number, w: number, h: number, color: string) => {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(cx - w / 2, baseY)
  ctx.lineTo(cx, baseY - h)
  ctx.lineTo(cx + w / 2, baseY)
  ctx.closePath()
  ctx.fill()
}

const glow = (ctx: Ctx, cx: number, cy: number, r: number, color: string, alpha: number) => {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
  g.addColorStop(0, color)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = g
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
  ctx.restore()
}
export { glow }

export function drawFloor(ctx: Ctx, px: number, py: number, c: number, x: number, y: number): void {
  ctx.fillStyle = (x + y) % 2 ? COLORS.floorA : COLORS.floorB
  ctx.fillRect(px, py, c, c)
  ctx.strokeStyle = 'rgba(255,255,255,0.035)'
  ctx.lineWidth = 1
  ctx.strokeRect(px + 0.5, py + 0.5, c - 1, c - 1)
  const r = rnd(x, y)
  if (r > 0.55) {
    ctx.fillStyle = 'rgba(255,255,255,0.06)'
    ctx.fillRect(px + r * c * 0.8, py + rnd(x, y, 1) * c * 0.8, c * 0.05, c * 0.05)
  }
  if (r < 0.12) {
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'
    ctx.beginPath()
    ctx.moveTo(px + c * 0.2, py + c * 0.3)
    ctx.lineTo(px + c * 0.45, py + c * 0.5)
    ctx.lineTo(px + c * 0.4, py + c * 0.75)
    ctx.stroke()
  }
}

export function drawWall(ctx: Ctx, px: number, py: number, c: number, x: number, y: number): void {
  ctx.fillStyle = COLORS.wall
  ctx.fillRect(px, py, c, c)
  ctx.fillStyle = COLORS.wallHi
  ctx.fillRect(px, py, c, c * 0.13)
  ctx.fillStyle = COLORS.wallLo
  ctx.fillRect(px, py + c * 0.87, c, c * 0.13)
  ctx.strokeStyle = COLORS.wallLo
  ctx.lineWidth = Math.max(1, c * 0.035)
  ctx.beginPath()
  ctx.moveTo(px, py + c * 0.5)
  ctx.lineTo(px + c, py + c * 0.5)
  const off = rnd(x, y) > 0.5 ? 0.3 : 0.65
  ctx.moveTo(px + c * off, py + c * 0.13)
  ctx.lineTo(px + c * off, py + c * 0.5)
  ctx.moveTo(px + c * (1 - off), py + c * 0.5)
  ctx.lineTo(px + c * (1 - off), py + c * 0.87)
  ctx.stroke()
  if (rnd(x, y, 3) > 0.8) {
    ctx.fillStyle = 'rgba(157,77,255,0.18)'
    ctx.fillRect(px + c * 0.1, py + c * 0.16, c * 0.2, c * 0.08)
  }
}

export function drawStart(ctx: Ctx, cx: number, cy: number, c: number, t: number): void {
  ctx.save()
  ctx.strokeStyle = 'rgba(185,255,59,0.55)'
  ctx.lineWidth = Math.max(1.5, c * 0.04)
  ctx.setLineDash([c * 0.1, c * 0.08])
  ctx.lineDashOffset = -t / 60
  ctx.beginPath()
  ctx.arc(cx, cy, c * 0.34, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
  glow(ctx, cx, cy, c * 0.6, COLORS.acid, 0.12)
}

export function drawExit(ctx: Ctx, cx: number, cy: number, c: number, t: number): void {
  glow(ctx, cx, cy, c * 1.2, COLORS.acid, 0.5 + Math.sin(t / 300) * 0.1)
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = `rgba(185,255,59,${0.85 - i * 0.22})`
    ctx.lineWidth = Math.max(1.5, c * 0.045)
    ctx.beginPath()
    const r = c * (0.14 + i * 0.11) + Math.sin(t / 260 + i) * c * 0.015
    ctx.ellipse(cx, cy, r, r * 1.1, (t / 900) * (i % 2 ? -1 : 1), 0, Math.PI * 1.6)
    ctx.stroke()
  }
  ctx.fillStyle = '#f2ffd0'
  ctx.beginPath()
  ctx.arc(cx, cy, c * 0.07, 0, Math.PI * 2)
  ctx.fill()
}

export function drawSpike(ctx: Ctx, px: number, py: number, c: number): void {
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.fillRect(px + c * 0.08, py + c * 0.08, c * 0.84, c * 0.84)
  const w = c * 0.34
  for (const [ox, oy] of [[0.28, 0.5], [0.72, 0.5], [0.28, 0.92], [0.72, 0.92]]) {
    tri(ctx, px + ox * c, py + oy * c, w, c * 0.38, '#b8b8d6')
    tri(ctx, px + ox * c, py + oy * c - c * 0.2, w * 0.4, c * 0.18, COLORS.ember)
  }
  ctx.strokeStyle = 'rgba(255,61,90,0.45)'
  ctx.lineWidth = 1.5
  ctx.strokeRect(px + c * 0.06, py + c * 0.06, c * 0.88, c * 0.88)
}

export function drawPulse(ctx: Ctx, px: number, py: number, c: number, phase: number, t: number): void {
  ctx.fillStyle = '#1f1a2c'
  ctx.fillRect(px + c * 0.07, py + c * 0.07, c * 0.86, c * 0.86)
  const flick = 0.75 + Math.sin(t / 55) * 0.25
  ctx.lineWidth = Math.max(1.5, c * 0.035)
  ctx.strokeStyle = phase === 3 ? COLORS.blood : phase === 2 ? `rgba(255,138,31,${flick})` : 'rgba(255,138,31,0.3)'
  ctx.strokeRect(px + c * 0.07, py + c * 0.07, c * 0.86, c * 0.86)
  const spots: Array<[number, number]> = [[0.3, 0.5], [0.7, 0.5], [0.3, 0.9], [0.7, 0.9]]
  if (phase === 3) {
    glow(ctx, px + c / 2, py + c / 2, c * 0.9, COLORS.blood, 0.7)
    for (const [ox, oy] of spots) {
      tri(ctx, px + ox * c, py + oy * c, c * 0.3, c * 0.5, '#ff5a3d')
      tri(ctx, px + ox * c, py + oy * c - c * 0.3, c * 0.12, c * 0.2, '#fff4e0')
    }
  } else if (phase === 2) {
    glow(ctx, px + c / 2, py + c / 2, c * 0.8, COLORS.ember, 0.55 * flick)
    for (const [ox, oy] of spots) tri(ctx, px + ox * c, py + oy * c, c * 0.22, c * 0.16, COLORS.ember)
  } else {
    for (const [ox, oy] of spots) {
      ctx.fillStyle = phase === 1 ? '#3a2018' : '#0e0b16'
      ctx.beginPath()
      ctx.arc(px + ox * c, py + (oy - 0.2) * c, c * 0.07, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

export function drawKey(ctx: Ctx, cx: number, cy: number, c: number, t: number): void {
  const bob = Math.sin(t / 380) * c * 0.04
  glow(ctx, cx, cy, c * 0.7, COLORS.acid, 0.3)
  ctx.save()
  ctx.translate(cx, cy + bob)
  ctx.rotate(-0.6)
  ctx.strokeStyle = COLORS.acid
  ctx.fillStyle = COLORS.acid
  ctx.lineWidth = c * 0.07
  ctx.beginPath()
  ctx.arc(-c * 0.16, 0, c * 0.11, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillRect(-c * 0.05, -c * 0.035, c * 0.34, c * 0.07)
  ctx.fillRect(c * 0.16, 0, c * 0.06, c * 0.14)
  ctx.fillRect(c * 0.07, 0, c * 0.05, c * 0.1)
  ctx.restore()
}

export function drawDoor(ctx: Ctx, px: number, py: number, c: number, open: boolean): void {
  if (open) {
    ctx.strokeStyle = 'rgba(255,138,31,0.35)'
    ctx.setLineDash([c * 0.1, c * 0.08])
    ctx.lineWidth = 2
    ctx.strokeRect(px + c * 0.1, py + c * 0.1, c * 0.8, c * 0.8)
    ctx.setLineDash([])
    return
  }
  glow(ctx, px + c / 2, py + c / 2, c * 0.8, COLORS.ember, 0.25)
  ctx.fillStyle = '#4a2a10'
  ctx.fillRect(px + c * 0.06, py + c * 0.06, c * 0.88, c * 0.88)
  ctx.strokeStyle = '#2a1608'
  ctx.lineWidth = Math.max(1, c * 0.03)
  for (let i = 1; i < 4; i++) {
    ctx.beginPath()
    ctx.moveTo(px + c * (0.06 + 0.22 * i), py + c * 0.06)
    ctx.lineTo(px + c * (0.06 + 0.22 * i), py + c * 0.94)
    ctx.stroke()
  }
  ctx.strokeStyle = COLORS.ember
  ctx.lineWidth = Math.max(2, c * 0.05)
  ctx.strokeRect(px + c * 0.06, py + c * 0.06, c * 0.88, c * 0.88)
  ctx.fillStyle = COLORS.ember
  ctx.beginPath()
  ctx.arc(px + c / 2, py + c * 0.46, c * 0.09, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillRect(px + c * 0.47, py + c * 0.5, c * 0.06, c * 0.18)
}

export function drawSwitch(ctx: Ctx, px: number, py: number, c: number, on: boolean): void {
  const col = on ? COLORS.acid : COLORS.volt
  glow(ctx, px + c / 2, py + c / 2, c * 0.7, col, on ? 0.4 : 0.3)
  ctx.fillStyle = '#211a33'
  ctx.fillRect(px + c * 0.18, py + c * 0.58, c * 0.64, c * 0.22)
  ctx.strokeStyle = col
  ctx.lineWidth = Math.max(2, c * 0.06)
  ctx.beginPath()
  ctx.moveTo(px + c / 2, py + c * 0.66)
  ctx.lineTo(px + c * (on ? 0.72 : 0.28), py + c * 0.28)
  ctx.stroke()
  ctx.fillStyle = col
  ctx.beginPath()
  ctx.arc(px + c * (on ? 0.72 : 0.28), py + c * 0.28, c * 0.07, 0, Math.PI * 2)
  ctx.fill()
}

export function drawGate(ctx: Ctx, px: number, py: number, c: number, open: boolean): void {
  if (open) {
    ctx.strokeStyle = 'rgba(185,255,59,0.35)'
    ctx.setLineDash([c * 0.1, c * 0.08])
    ctx.lineWidth = 2
    ctx.strokeRect(px + c * 0.1, py + c * 0.1, c * 0.8, c * 0.8)
    ctx.setLineDash([])
    return
  }
  glow(ctx, px + c / 2, py + c / 2, c * 0.8, COLORS.volt, 0.3)
  ctx.fillStyle = '#1d1034'
  ctx.fillRect(px + c * 0.06, py + c * 0.06, c * 0.88, c * 0.88)
  ctx.strokeStyle = COLORS.volt
  ctx.lineWidth = Math.max(2, c * 0.06)
  for (let i = 0; i < 4; i++) {
    const x = px + c * (0.2 + i * 0.2)
    ctx.beginPath()
    ctx.moveTo(x, py + c * 0.1)
    ctx.lineTo(x, py + c * 0.9)
    ctx.stroke()
  }
  ctx.strokeRect(px + c * 0.06, py + c * 0.06, c * 0.88, c * 0.88)
}

export function drawSentry(ctx: Ctx, cx: number, cy: number, c: number, t: number): void {
  glow(ctx, cx, cy, c * 0.9, COLORS.volt, 0.55)
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(t / 160)
  ctx.fillStyle = '#d9c2ff'
  for (let i = 0; i < 8; i++) {
    ctx.rotate(Math.PI / 4)
    tri(ctx, 0, -c * 0.2, c * 0.2, c * 0.2, '#d9c2ff')
  }
  ctx.restore()
  ctx.fillStyle = COLORS.voltLo
  ctx.beginPath()
  ctx.arc(cx, cy, c * 0.24, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = COLORS.volt
  ctx.lineWidth = Math.max(1.5, c * 0.04)
  ctx.stroke()
  ctx.fillStyle = COLORS.ember
  ctx.beginPath()
  ctx.arc(cx, cy, c * 0.09, 0, Math.PI * 2)
  ctx.fill()
}

export function drawPlayer(ctx: Ctx, cx: number, cy: number, c: number, skin: Cosmetic, t: number, dir: number): void {
  const bob = Math.sin(t / 220) * c * 0.02
  glow(ctx, cx, cy, c * 0.95, skin.color, 0.4)
  const s = c * 0.54
  ctx.fillStyle = 'rgba(0,0,0,0.4)'
  ctx.beginPath()
  ctx.ellipse(cx, cy + c * 0.3, s * 0.45, s * 0.14, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = skin.color
  const r = c * 0.12
  const x = cx - s / 2
  const y = cy - s / 2 + bob
  ctx.beginPath()
  ctx.roundRect(x, y, s, s, r)
  ctx.fill()
  ctx.fillStyle = skin.accent
  ctx.fillRect(x + s * 0.08, y + s * 0.06, s * 0.84, s * 0.12)
  ctx.fillStyle = '#0b0b10'
  const ex = dir * s * 0.06
  ctx.fillRect(x + s * 0.24 + ex, y + s * 0.38, s * 0.16, s * 0.24)
  ctx.fillRect(x + s * 0.6 + ex, y + s * 0.38, s * 0.16, s * 0.24)
}
