import { solve } from './solver'
import {
  BUDGET,
  CELL_COUNT,
  GRID,
  LIMITS,
  budgetSpent,
  countOf,
  idx,
  type Action,
  type Dungeon,
} from './types'

export interface ValidationResult {
  ok: boolean
  errors: string[]
  /** Length of the shortest hazard-free route, when one exists. */
  par: number | null
  path: Action[]
}

export interface ValidateOptions {
  enforceBudget?: boolean
}

export function validateDungeon(d: Dungeon, opts: ValidateOptions = {}): ValidationResult {
  const errors: string[] = []
  if (d.cells.length !== CELL_COUNT) {
    return { ok: false, errors: ['Dungeon grid must be 9 by 9.'], par: null, path: [] }
  }
  const inside = (p: { x: number; y: number }) => p.x >= 0 && p.y >= 0 && p.x < GRID && p.y < GRID
  if (!inside(d.start) || !inside(d.exit)) errors.push('Start and exit must be inside the grid.')
  else {
    if (d.start.x === d.exit.x && d.start.y === d.exit.y) errors.push('Start and exit cannot share a tile.')
    if (d.cells[idx(d.start.x, d.start.y)] !== 'empty') errors.push('The start tile must be clear.')
    if (d.cells[idx(d.exit.x, d.exit.y)] !== 'empty') errors.push('The exit tile must be clear.')
  }

  const keys = countOf(d.cells, 'key')
  const doors = countOf(d.cells, 'door')
  const switches = countOf(d.cells, 'switch')
  const gates = countOf(d.cells, 'gate')
  const sentries = countOf(d.cells, 'sentryH', 'sentryV')
  if (keys > LIMITS.key) errors.push(`At most ${LIMITS.key} keys.`)
  if (doors > LIMITS.door) errors.push(`At most ${LIMITS.door} locked doors.`)
  if (switches > LIMITS.switch) errors.push('Only one switch is allowed.')
  if (gates > LIMITS.gate) errors.push(`At most ${LIMITS.gate} gates.`)
  if (sentries > LIMITS.sentry) errors.push(`At most ${LIMITS.sentry} sentries.`)
  if (doors > keys) errors.push('Every locked door needs its own key.')
  if (gates > 0 && switches === 0) errors.push('Gates need a switch to open them.')
  if (opts.enforceBudget && budgetSpent(d.cells) > BUDGET) errors.push('Over budget.')

  if (errors.length > 0) return { ok: false, errors, par: null, path: [] }

  const res = solve(d)
  if (!res.solvable) {
    return { ok: false, errors: ['No hazard-free route from the start to the exit.'], par: null, path: [] }
  }
  return { ok: true, errors: [], par: res.path.length, path: res.path }
}
