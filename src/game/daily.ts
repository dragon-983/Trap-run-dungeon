import { hashString } from './codec'
import { PRACTICE_LEVELS } from './levels'
import { validateDungeon } from './validate'
import { CELL_COUNT, emptyCells, idx, type CellType, type Dungeon, type Point } from './types'

/** Deterministic PRNG so every player receives the same dungeon for a given day. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Daily boundaries use UTC so the challenge rolls over at the same moment for everyone. */
export function dateKey(d: Date = new Date()): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

export function previousDateKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  return dateKey(new Date(Date.UTC(y, m - 1, d - 1)))
}

export function msUntilNextDaily(now: Date = new Date()): number {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  return Math.max(0, next - now.getTime())
}

const WEEKDAY_DIFFICULTY = [4, 2, 3, 3, 4, 4, 5]

const CORNERS: Array<[Point, Point]> = [
  [{ x: 0, y: 8 }, { x: 8, y: 0 }],
  [{ x: 8, y: 8 }, { x: 0, y: 0 }],
  [{ x: 0, y: 0 }, { x: 8, y: 8 }],
  [{ x: 8, y: 0 }, { x: 0, y: 8 }],
]

function attempt(rng: () => number, difficulty: number): { cells: CellType[]; start: Point; exit: Point } {
  const cells = emptyCells()
  const [start, exit] = CORNERS[Math.floor(rng() * CORNERS.length)]
  const reserved = new Set([idx(start.x, start.y), idx(exit.x, exit.y)])
  const free = () => {
    for (let n = 0; n < 200; n++) {
      const i = Math.floor(rng() * CELL_COUNT)
      if (!reserved.has(i) && cells[i] === 'empty') return i
    }
    return -1
  }
  const put = (type: CellType, count: number) => {
    for (let n = 0; n < count; n++) {
      const i = free()
      if (i >= 0) cells[i] = type
    }
  }
  put('wall', 16 + Math.floor(rng() * 8))
  put('spike', 1 + Math.floor(difficulty / 2))
  put('pulse', 1 + Math.floor(difficulty / 2) + Math.floor(rng() * 2))
  if (difficulty >= 3) put(rng() < 0.5 ? 'sentryH' : 'sentryV', 1)
  if (difficulty >= 5) put(rng() < 0.5 ? 'sentryH' : 'sentryV', 1)
  if (rng() < 0.7) {
    put('key', 1)
    put('door', 1)
  }
  if (difficulty >= 4 && rng() < 0.7) {
    put('switch', 1)
    put('gate', 1 + Math.floor(rng() * 2))
  }
  return { cells, start, exit }
}

const tick = () => new Promise<void>((r) => setTimeout(r, 0))

/** Generates (and solver-verifies) the daily dungeon. Yields to the UI between batches. */
export async function generateDaily(key: string): Promise<Dungeon> {
  const rng = mulberry32(hashString(`trap-run:${key}`))
  const [y, m, d] = key.split('-').map(Number)
  const difficulty = WEEKDAY_DIFFICULTY[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  for (let n = 0; n < 1500; n++) {
    const layout = attempt(rng, difficulty)
    const dungeon: Dungeon = {
      id: `daily-${key}`,
      name: `Daily ${key}`,
      ...layout,
      creator: { profileId: 'system', displayName: 'TRAP//RUN' },
      source: 'daily',
      difficulty,
      createdAt: Date.UTC(y, m - 1, d),
    }
    const v = validateDungeon(dungeon)
    if (v.ok && v.par !== null && v.par >= 22 && v.par <= 72) return { ...dungeon, par: v.par }
    if (n % 25 === 24) await tick()
  }
  // Extremely unlikely: fall back to a hand-built level, rotated by date, so the day never fails.
  const fallback = PRACTICE_LEVELS[hashString(key) % PRACTICE_LEVELS.length].dungeon
  return { ...fallback, id: `daily-${key}`, name: `Daily ${key}`, source: 'daily', createdAt: Date.UTC(y, m - 1, d), par: validateDungeon(fallback).par ?? undefined }
}
