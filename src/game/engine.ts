import {
  GRID,
  CELL_COUNT,
  idx,
  type Action,
  type CellType,
  type Dungeon,
  type GameEvent,
  type HazardCause,
  type RunState,
  type StepResult,
} from './types'

/**
 * Pure, deterministic game rules. Hazards advance exactly one step per player turn
 * (a move or a wait), which makes every dungeon solvable by search and every run replayable.
 */

export interface SentryTrack {
  /** Cell index of the sentry at each turn, repeating with period path.length. */
  path: number[]
  axis: 'H' | 'V'
}

export interface Analysis {
  /** Key index per cell, or -1. */
  keyBit: Int8Array
  /** Door index per cell, or -1. */
  doorBit: Int8Array
  sentries: SentryTrack[]
  /** Common period of every timed hazard. */
  cycle: number
  keyCount: number
  doorCount: number
}

const cache = new WeakMap<Dungeon, Analysis>()

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
const lcm = (a: number, b: number): number => (a / gcd(a, b)) * b

function sentryPath(cells: readonly CellType[], start: number, axis: 'H' | 'V'): number[] {
  const sx = start % GRID
  const sy = Math.floor(start / GRID)
  const dx = axis === 'H' ? 1 : 0
  const dy = axis === 'V' ? 1 : 0
  const blocked = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= GRID || y >= GRID) return true
    const c = cells[idx(x, y)]
    return c === 'wall' || c === 'door' || c === 'gate'
  }
  let x = sx
  let y = sy
  let d = 1
  const path = [start]
  for (let i = 0; i < 64; i++) {
    let nx = x + dx * d
    let ny = y + dy * d
    if (blocked(nx, ny)) {
      d = -d
      nx = x + dx * d
      ny = y + dy * d
      if (blocked(nx, ny)) {
        nx = x
        ny = y
      }
    }
    x = nx
    y = ny
    if (x === sx && y === sy && d === 1) break
    path.push(idx(x, y))
  }
  return path
}

export function analyze(d: Dungeon): Analysis {
  const hit = cache.get(d)
  if (hit) return hit
  const keyBit = new Int8Array(CELL_COUNT).fill(-1)
  const doorBit = new Int8Array(CELL_COUNT).fill(-1)
  const sentries: SentryTrack[] = []
  let keyCount = 0
  let doorCount = 0
  let cycle = 4
  for (let i = 0; i < CELL_COUNT; i++) {
    const c = d.cells[i]
    if (c === 'key') keyBit[i] = keyCount++
    else if (c === 'door') doorBit[i] = doorCount++
    else if (c === 'sentryH' || c === 'sentryV') {
      const axis = c === 'sentryH' ? 'H' : 'V'
      const path = sentryPath(d.cells, i, axis)
      sentries.push({ path, axis })
      cycle = lcm(cycle, path.length)
    }
  }
  const a: Analysis = { keyBit, doorBit, sentries, cycle, keyCount, doorCount }
  cache.set(d, a)
  return a
}

export function initialState(d: Dungeon): RunState {
  return { x: d.start.x, y: d.start.y, turn: 0, keys: 0, doors: 0, lever: false }
}

export function popcount(n: number): number {
  let c = 0
  while (n) {
    c += n & 1
    n >>= 1
  }
  return c
}

export const keysHeld = (s: RunState): number => popcount(s.keys) - popcount(s.doors)

/** Pulse trap phase: 0/1 dormant, 2 warning, 3 firing. Offset by position so neighbours are out of sync. */
export const pulsePhase = (turn: number, x: number, y: number): number => (turn + x + y * 2) % 4

export function sentryCell(a: Analysis, i: number, turn: number): number {
  const p = a.sentries[i].path
  return p[turn % p.length]
}

const DX: Record<Action, number> = { U: 0, D: 0, L: -1, R: 1, W: 0 }
const DY: Record<Action, number> = { U: -1, D: 1, L: 0, R: 0, W: 0 }

export function stepGame(d: Dungeon, a: Analysis, s: RunState, act: Action, withEvents = false): StepResult {
  const events: GameEvent[] = []
  const push = (e: GameEvent) => {
    if (withEvents) events.push(e)
  }
  const moving = act !== 'W'
  const nx = s.x + DX[act]
  const ny = s.y + DY[act]
  const blocked = (type: 'bump' | 'locked'): StepResult => {
    push({ type, x: nx, y: ny })
    return { state: s, status: 'blocked', events }
  }

  if (moving) {
    if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) return blocked('bump')
    const c = d.cells[idx(nx, ny)]
    if (c === 'wall') return blocked('bump')
    if (c === 'door' && !((s.doors >> a.doorBit[idx(nx, ny)]) & 1) && keysHeld(s) <= 0) return blocked('locked')
    if (c === 'gate' && !s.lever) return blocked('locked')
  }

  const i = idx(nx, ny)
  const c = d.cells[i]
  let { keys, doors, lever } = s
  if (moving) {
    if (c === 'door' && !((doors >> a.doorBit[i]) & 1)) {
      doors |= 1 << a.doorBit[i]
      push({ type: 'door', x: nx, y: ny })
    } else if (c === 'key' && !((keys >> a.keyBit[i]) & 1)) {
      keys |= 1 << a.keyBit[i]
      push({ type: 'key', x: nx, y: ny })
    } else if (c === 'switch' && !lever) {
      lever = true
      push({ type: 'lever', x: nx, y: ny })
    }
  }

  const turn = s.turn + 1
  const next: RunState = { x: nx, y: ny, turn, keys, doors, lever }
  const from = idx(s.x, s.y)

  let cause: HazardCause | null = null
  if (moving && c === 'spike') cause = 'spike'
  else if (c === 'pulse' && pulsePhase(turn, nx, ny) === 3) cause = 'pulse'
  else {
    for (let k = 0; k < a.sentries.length; k++) {
      const now = sentryCell(a, k, turn)
      if (now === i) {
        cause = 'sentry'
        break
      }
      // Swapping places with a sentry counts as a collision.
      if (moving && sentryCell(a, k, s.turn) === i && now === from) {
        cause = 'sentry'
        break
      }
    }
  }

  if (cause) {
    push({ type: 'hit', x: nx, y: ny, cause })
    return { state: next, status: 'hit', events }
  }

  if (moving) push({ type: 'move', x: nx, y: ny })

  if (withEvents && moving) {
    let near = false
    for (let k = 0; k < a.sentries.length && !near; k++) {
      const now = sentryCell(a, k, turn)
      const before = sentryCell(a, k, s.turn)
      const dist = Math.abs((now % GRID) - nx) + Math.abs(Math.floor(now / GRID) - ny)
      const prevDist = Math.abs((before % GRID) - s.x) + Math.abs(Math.floor(before / GRID) - s.y)
      if (dist === 1 && prevDist > 1) near = true
    }
    const left = d.cells[from]
    if (!near && left === 'pulse' && pulsePhase(turn, s.x, s.y) === 3) near = true
    if (near) push({ type: 'near', x: nx, y: ny })
  }

  if (nx === d.exit.x && ny === d.exit.y) {
    push({ type: 'win', x: nx, y: ny })
    return { state: next, status: 'won', events }
  }
  return { state: next, status: 'ok', events }
}
