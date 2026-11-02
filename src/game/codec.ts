import { CELL_COUNT, GRID, idx, type CellType, type CreatorAttribution, type Dungeon, type Point } from './types'

const ORDER: CellType[] = ['empty', 'wall', 'spike', 'pulse', 'sentryH', 'sentryV', 'key', 'door', 'switch', 'gate']
const CHAR: Record<CellType, string> = {
  empty: '.',
  wall: '#',
  spike: '^',
  pulse: 'P',
  sentryH: '>',
  sentryV: 'v',
  key: 'K',
  door: 'D',
  switch: 'W',
  gate: 'G',
}
const FROM_CHAR = new Map<string, CellType>(Object.entries(CHAR).map(([k, v]) => [v, k as CellType]))

export interface Layout {
  cells: CellType[]
  start: Point
  exit: Point
}

/** Parse a 9-row ASCII map. `S` is the start, `E` the exit. Throws on malformed input. */
export function parseAscii(rows: string[]): Layout {
  if (rows.length !== GRID) throw new Error(`Expected ${GRID} rows, got ${rows.length}`)
  const cells: CellType[] = []
  let start: Point | null = null
  let exit: Point | null = null
  rows.forEach((row, y) => {
    if (row.length !== GRID) throw new Error(`Row ${y} must be ${GRID} wide`)
    for (let x = 0; x < GRID; x++) {
      const ch = row[x]
      if (ch === 'S') {
        start = { x, y }
        cells.push('empty')
      } else if (ch === 'E') {
        exit = { x, y }
        cells.push('empty')
      } else {
        const t = FROM_CHAR.get(ch)
        if (!t) throw new Error(`Unknown tile "${ch}" at ${x},${y}`)
        cells.push(t)
      }
    }
  })
  if (!start || !exit) throw new Error('Map needs S and E')
  return { cells, start, exit }
}

// ---- hashing / ids -----------------------------------------------------------------------

export function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function layoutKey(l: Layout): string {
  return l.cells.map((c) => CHAR[c]).join('') + `${l.start.x}${l.start.y}${l.exit.x}${l.exit.y}`
}

export function layoutId(l: Layout): string {
  return hashString(layoutKey(l)).toString(36)
}

const ROOM_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

/** Short, human-friendly room code derived from the layout. Resolved locally until a backend exists. */
export function roomCodeFor(l: Layout): string {
  let h = hashString('room:' + layoutKey(l))
  let out = ''
  for (let i = 0; i < 6; i++) {
    out += ROOM_ALPHABET[h % ROOM_ALPHABET.length]
    h = Math.floor(h / ROOM_ALPHABET.length) || hashString(out + i)
  }
  return out
}

// ---- share codes -------------------------------------------------------------------------

const toB64 = (bytes: Uint8Array): string => {
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const fromB64 = (s: string): Uint8Array => {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad)
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

const textToB64 = (t: string) => toB64(new TextEncoder().encode(t))
const b64ToText = (s: string) => new TextDecoder().decode(fromB64(s))

export function encodeDungeon(d: Pick<Dungeon, 'cells' | 'start' | 'exit' | 'name'> & { creator: CreatorAttribution }, challengeId?: number): string {
  const nibbles = [...d.cells.map((c) => ORDER.indexOf(c)), d.start.x, d.start.y, d.exit.x, d.exit.y]
  const bytes = new Uint8Array(Math.ceil(nibbles.length / 2))
  nibbles.forEach((n, i) => {
    bytes[i >> 1] |= i % 2 === 0 ? n << 4 : n
  })
  const name = textToB64(d.name.slice(0, 24))
  const creator = textToB64(d.creator.displayName.slice(0, 16))
  return `TR1.${toB64(bytes)}.${name}.${creator}${challengeId ? `.${challengeId}` : ''}`
}

/** The onchain challenge id carried by a share code, if any. */
export function decodeChallengeId(code: string): number | null {
  const id = Number(code.split('.')[4])
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

/** Pull a share code out of a pasted code, or a full link containing `?c=`. */
export function extractCode(input: string): string | null {
  const m = /TR1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*(?:\.\d+)?/.exec(input.trim())
  return m ? m[0] : null
}

export function decodeDungeon(code: string): Dungeon | null {
  try {
    const [tag, grid, name, creator] = code.split('.')
    if (tag !== 'TR1' || !grid) return null
    const bytes = fromB64(grid)
    const nibbles: number[] = []
    bytes.forEach((b) => nibbles.push(b >> 4, b & 15))
    const cells: CellType[] = []
    for (let i = 0; i < CELL_COUNT; i++) {
      const t = ORDER[nibbles[i]]
      if (!t) return null
      cells.push(t)
    }
    const [sx, sy, ex, ey] = nibbles.slice(CELL_COUNT, CELL_COUNT + 4)
    if ([sx, sy, ex, ey].some((n) => n === undefined || n >= GRID)) return null
    const layout: Layout = { cells, start: { x: sx, y: sy }, exit: { x: ex, y: ey } }
    if (cells[idx(sx, sy)] !== 'empty' || cells[idx(ex, ey)] !== 'empty') return null
    const displayName = (creator ? b64ToText(creator) : '').slice(0, 16) || 'Unknown'
    return {
      id: `f-${layoutId(layout)}`,
      name: (name ? b64ToText(name) : '').slice(0, 24) || 'Friend Dungeon',
      ...layout,
      creator: { profileId: `remote:${layoutId(layout)}`, displayName },
      source: 'friend',
      difficulty: 3,
      createdAt: Date.now(),
    }
  } catch {
    return null
  }
}
