import {
  BUDGET,
  COSTS,
  LIMITS,
  budgetSpent,
  countOf,
  type CellType,
  type Dungeon,
} from '@/game/types'

export type Tool = Exclude<CellType, 'empty'> | 'erase'

export interface ToolInfo {
  id: Tool
  label: string
  hint: string
  color: string
}

export const TOOLS: ToolInfo[] = [
  { id: 'wall', label: 'Wall', hint: 'Blocks movement.', color: '#9d4dff' },
  { id: 'spike', label: 'Spikes', hint: 'Always deadly. Cannot be crossed.', color: '#ff3d5a' },
  { id: 'pulse', label: 'Pulse', hint: 'Glows, then fires every 4th turn.', color: '#ff8a1f' },
  { id: 'sentryH', label: 'Sentry H', hint: 'Patrols left and right, one step per turn.', color: '#b57bff' },
  { id: 'sentryV', label: 'Sentry V', hint: 'Patrols up and down, one step per turn.', color: '#b57bff' },
  { id: 'key', label: 'Key', hint: 'Opens one locked door.', color: '#b9ff3b' },
  { id: 'door', label: 'Door', hint: 'Needs a key to open.', color: '#ff8a1f' },
  { id: 'switch', label: 'Switch', hint: 'Opens every gate for good.', color: '#d4b0ff' },
  { id: 'gate', label: 'Gate', hint: 'Closed until the switch is pressed.', color: '#9d4dff' },
  { id: 'erase', label: 'Erase', hint: 'Remove a piece and refund it.', color: '#ecebf5' },
]

export const toolCost = (t: Tool): number => (t === 'erase' ? 0 : COSTS[t])

/** How many of a tool are placed and the cap, or null when uncapped. */
export function toolUsage(cells: readonly CellType[], t: Tool): { used: number; cap: number } | null {
  switch (t) {
    case 'key':
      return { used: countOf(cells, 'key'), cap: LIMITS.key }
    case 'door':
      return { used: countOf(cells, 'door'), cap: LIMITS.door }
    case 'switch':
      return { used: countOf(cells, 'switch'), cap: LIMITS.switch }
    case 'gate':
      return { used: countOf(cells, 'gate'), cap: LIMITS.gate }
    case 'sentryH':
    case 'sentryV':
      return { used: countOf(cells, 'sentryH', 'sentryV'), cap: LIMITS.sentry }
    default:
      return null
  }
}

export type PlaceResult = { ok: true; cells: CellType[] } | { ok: false; reason: string }

/** Pure placement rule: budget and per-piece caps. */
export function place(cells: readonly CellType[], index: number, tool: Tool): PlaceResult {
  const next = cells.slice()
  next[index] = tool === 'erase' ? 'empty' : tool
  if (next[index] === cells[index]) return { ok: false, reason: '' }
  if (tool !== 'erase') {
    if (budgetSpent(next) > BUDGET) return { ok: false, reason: 'Out of budget. Erase something first.' }
    const u = toolUsage(next, tool)
    if (u && u.used > u.cap) return { ok: false, reason: `You can only place ${u.cap} of those.` }
  }
  return { ok: true, cells: next }
}

export function estimateDifficulty(d: Pick<Dungeon, 'cells'>, par: number): number {
  const c = d.cells
  const score = countOf(c, 'spike') + 2 * countOf(c, 'pulse') + 3 * countOf(c, 'sentryH', 'sentryV') + 2 * countOf(c, 'door', 'gate') + par / 12
  return Math.max(1, Math.min(5, Math.round(score / 4)))
}
