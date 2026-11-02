// Core, UI-independent game types. Nothing in src/game imports React or any chain SDK.

export const GRID = 9
export const CELL_COUNT = GRID * GRID

export type CellType =
  | 'empty'
  | 'wall'
  | 'spike'
  | 'pulse'
  | 'sentryH'
  | 'sentryV'
  | 'key'
  | 'door'
  | 'switch'
  | 'gate'

export interface Point {
  x: number
  y: number
}

export type Action = 'U' | 'D' | 'L' | 'R' | 'W'
/** Recorded actions also include a manual restart. */
export type RecordedAction = Action | 'X'

/** Chain-independent creator attribution. Wallet links live in the services layer, never here. */
export interface CreatorAttribution {
  profileId: string
  displayName: string
}

export type DungeonSource = 'practice' | 'daily' | 'creator' | 'friend'

export interface Dungeon {
  id: string
  name: string
  cells: CellType[]
  start: Point
  exit: Point
  creator: CreatorAttribution
  source: DungeonSource
  /** Shortest hazard-free solution, in turns. Filled by the validator. */
  par?: number
  /** 1 (easy) to 5 (brutal). */
  difficulty: number
  createdAt: number
}

export interface RunState {
  x: number
  y: number
  /** Number of turns taken. Hazards advance one step per turn. */
  turn: number
  /** Bitmask of collected keys (by key index). */
  keys: number
  /** Bitmask of opened locked doors (by door index). */
  doors: number
  /** True once the switch has been pressed. */
  lever: boolean
}

export type HazardCause = 'spike' | 'pulse' | 'sentry'

export type GameEvent =
  | { type: 'move'; x: number; y: number }
  | { type: 'bump'; x: number; y: number }
  | { type: 'locked'; x: number; y: number }
  | { type: 'key'; x: number; y: number }
  | { type: 'door'; x: number; y: number }
  | { type: 'lever'; x: number; y: number }
  | { type: 'near'; x: number; y: number }
  | { type: 'hit'; x: number; y: number; cause: HazardCause }
  | { type: 'win'; x: number; y: number }

export type StepStatus = 'ok' | 'blocked' | 'hit' | 'won'

export interface StepResult {
  state: RunState
  status: StepStatus
  events: GameEvent[]
}

export const idx = (x: number, y: number): number => y * GRID + x

export const BUDGET = 30

export const COSTS: Record<CellType, number> = {
  empty: 0,
  wall: 1,
  spike: 2,
  pulse: 2,
  sentryH: 4,
  sentryV: 4,
  key: 2,
  door: 2,
  switch: 2,
  gate: 2,
}

export const LIMITS = {
  key: 3,
  door: 3,
  switch: 1,
  gate: 4,
  sentry: 2,
} as const

export const CREATOR_START: Point = { x: 0, y: 8 }
export const CREATOR_EXIT: Point = { x: 8, y: 0 }

export function emptyCells(): CellType[] {
  return Array.from({ length: CELL_COUNT }, () => 'empty')
}

export function budgetSpent(cells: readonly CellType[]): number {
  let total = 0
  for (const c of cells) total += COSTS[c]
  return total
}

export function countOf(cells: readonly CellType[], ...types: CellType[]): number {
  let n = 0
  for (const c of cells) if (types.includes(c)) n++
  return n
}
