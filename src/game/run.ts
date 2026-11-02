import { analyze, initialState, keysHeld, stepGame, type Analysis } from './engine'
import { computeScore, type PlayMode, type RunResult } from './result'
import { CELL_COUNT, GRID, idx, type Action, type Dungeon, type GameEvent, type HazardCause, type RunState } from './types'

export const START_LIVES = 3
const COMBO_WINDOW = 8
const NEAR_MISS_BONUS_CAP = 6

export type RunPhase = 'countdown' | 'running' | 'won' | 'lost'

export interface EventBatch {
  id: number
  list: GameEvent[]
}

export interface RunSnapshot {
  phase: RunPhase
  countdown: number
  state: RunState
  prev: RunState
  /** Wall-clock (performance.now) of the last state change, used to tween movement. */
  changedAt: number
  /** True when the player teleported (respawn) and should not tween. */
  snap: boolean
  lives: number
  moves: number
  livesLost: number
  elapsedMs: number
  combo: number
  bestCombo: number
  comboBonus: number
  nearMisses: number
  keysCollected: number
  keysHeld: number
  progress: number
  events: EventBatch
  lastHit: { cause: HazardCause; x: number; y: number } | null
}

/** Shortest walking distance to the exit ignoring hazards (doors and gates count as open). */
export function distanceToExit(d: Dungeon): Int16Array {
  const dist = new Int16Array(CELL_COUNT).fill(-1)
  const queue: number[] = [idx(d.exit.x, d.exit.y)]
  dist[queue[0]] = 0
  for (let h = 0; h < queue.length; h++) {
    const cur = queue[h]
    const x = cur % GRID
    const y = Math.floor(cur / GRID)
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx
      const ny = y + dy
      if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) continue
      const n = idx(nx, ny)
      if (dist[n] !== -1 || d.cells[n] === 'wall') continue
      dist[n] = dist[cur] + 1
      queue.push(n)
    }
  }
  return dist
}

export interface RunOptions {
  /** Milliseconds per countdown step. 0 skips the countdown (replays). */
  countdownStepMs?: number
}

/** Owns one escape attempt. Framework-free so it can be driven by input, a replay, or tests. */
export class RunController {
  private readonly analysis: Analysis
  private readonly dist: Int16Array
  private readonly startDist: number
  private listeners = new Set<() => void>()
  private snapshot: RunSnapshot
  private timers: ReturnType<typeof setTimeout>[] = []
  private ticker: ReturnType<typeof setInterval> | null = null
  private runStart = 0
  private frozenElapsed = 0
  private eventId = 0
  private lastComboTurn = -999
  private actions = ''
  private nearMissBonuses = 0
  private killedBy: Record<HazardCause, number> = { spike: 0, pulse: 0, sentry: 0 }

  constructor(
    private readonly dungeon: Dungeon,
    private readonly opts: RunOptions = {},
  ) {
    this.analysis = analyze(dungeon)
    this.dist = distanceToExit(dungeon)
    this.startDist = Math.max(1, this.dist[idx(dungeon.start.x, dungeon.start.y)])
    this.snapshot = this.fresh()
  }

  private fresh(): RunSnapshot {
    const state = initialState(this.dungeon)
    return {
      phase: 'countdown',
      countdown: 3,
      state,
      prev: state,
      changedAt: performance.now(),
      snap: true,
      lives: START_LIVES,
      moves: 0,
      livesLost: 0,
      elapsedMs: 0,
      combo: 0,
      bestCombo: 0,
      comboBonus: 0,
      nearMisses: 0,
      keysCollected: 0,
      keysHeld: 0,
      progress: 0,
      events: { id: 0, list: [] },
      lastHit: null,
    }
  }

  subscribe = (l: () => void): (() => void) => {
    this.listeners.add(l)
    return () => this.listeners.delete(l)
  }

  getSnapshot = (): RunSnapshot => this.snapshot

  private set(patch: Partial<RunSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch }
    this.listeners.forEach((l) => l())
  }

  private clearTimers(): void {
    this.timers.forEach(clearTimeout)
    this.timers = []
    if (this.ticker) clearInterval(this.ticker)
    this.ticker = null
  }

  /** Begin (or restart from scratch) with a visible countdown. */
  start(): void {
    this.clearTimers()
    this.actions = ''
    this.lastComboTurn = -999
    this.nearMissBonuses = 0
    this.killedBy = { spike: 0, pulse: 0, sentry: 0 }
    this.snapshot = this.fresh()
    const step = this.opts.countdownStepMs ?? 650
    if (step <= 0) {
      this.begin()
      return
    }
    this.listeners.forEach((l) => l())
    for (let n = 3; n >= 0; n--) {
      this.timers.push(
        setTimeout(() => {
          if (n === 0) this.begin()
          else this.set({ countdown: n })
        }, (3 - n) * step),
      )
    }
    // the first tick (3) is already showing; schedule the rest relative to it
  }

  private begin(): void {
    this.runStart = performance.now()
    this.set({ phase: 'running', countdown: 0, changedAt: performance.now(), snap: true })
    this.ticker = setInterval(() => {
      if (this.snapshot.phase === 'running') this.set({ elapsedMs: performance.now() - this.runStart })
    }, 80)
  }

  dispose(): void {
    this.clearTimers()
    this.listeners.clear()
  }

  restart(): void {
    this.start()
  }

  input(action: Action): void {
    const s = this.snapshot
    if (s.phase !== 'running') return
    const res = stepGame(this.dungeon, this.analysis, s.state, action, true)
    const now = performance.now()
    const events: GameEvent[] = res.events
    const batch = (list: GameEvent[]): EventBatch => ({ id: ++this.eventId, list })

    if (res.status === 'blocked') {
      this.set({ events: batch(events) })
      return
    }
    this.actions += action

    if (res.status === 'hit') {
      const hit = events.find((e) => e.type === 'hit')
      const cause = hit && hit.type === 'hit' ? hit.cause : 'spike'
      this.killedBy[cause]++
      const lives = s.lives - 1
      const livesLost = s.livesLost + 1
      if (lives <= 0) {
        this.finish('lost', { state: res.state, lives: 0, livesLost, events: batch(events), lastHit: { cause, x: res.state.x, y: res.state.y } }, now)
        return
      }
      // Respawn at the start with a fresh dungeon state; the clock keeps running.
      const reset = initialState(this.dungeon)
      this.lastComboTurn = -999
      this.set({
        state: reset,
        prev: s.state,
        changedAt: now,
        snap: true,
        lives,
        livesLost,
        moves: s.moves + 1,
        combo: 0,
        keysHeld: 0,
        events: batch(events),
        lastHit: { cause, x: res.state.x, y: res.state.y },
      })
      return
    }

    // Combo bookkeeping for interactions.
    let { combo, bestCombo, comboBonus, nearMisses } = s
    let keysCollected = s.keysCollected
    for (const e of events) {
      if (e.type === 'key') keysCollected++
      if (e.type === 'key' || e.type === 'door' || e.type === 'lever' || e.type === 'near') {
        if (e.type === 'near') {
          nearMisses++
          if (this.nearMissBonuses >= NEAR_MISS_BONUS_CAP) continue
          this.nearMissBonuses++
        }
        combo = res.state.turn - this.lastComboTurn <= COMBO_WINDOW && combo > 0 ? combo + 1 : 1
        this.lastComboTurn = res.state.turn
        comboBonus += 25 * combo
        bestCombo = Math.max(bestCombo, combo)
      }
    }
    if (res.state.turn - this.lastComboTurn > COMBO_WINDOW) combo = 0

    const d = this.dist[idx(res.state.x, res.state.y)]
    const progress = Math.max(s.progress, d < 0 ? 0 : 1 - d / this.startDist)
    const patch: Partial<RunSnapshot> = {
      state: res.state,
      prev: s.state,
      changedAt: now,
      snap: false,
      moves: s.moves + 1,
      combo,
      bestCombo,
      comboBonus,
      nearMisses,
      keysCollected,
      keysHeld: keysHeld(res.state),
      progress,
      events: batch(events),
    }
    if (res.status === 'won') this.finish('won', { ...patch, progress: 1 }, now)
    else this.set(patch)
  }

  private finish(phase: 'won' | 'lost', patch: Partial<RunSnapshot>, now: number): void {
    this.frozenElapsed = now - this.runStart
    if (this.ticker) clearInterval(this.ticker)
    this.ticker = null
    const prev = this.snapshot.state
    this.set({ ...patch, phase, prev, changedAt: now, snap: false, elapsedMs: this.frozenElapsed })
  }

  buildResult(mode: PlayMode): RunResult {
    const s = this.snapshot
    const outcome: RunResult['outcome'] = s.phase === 'won' ? 'win' : 'loss'
    const par = this.dungeon.par ?? Math.max(1, this.startDist)
    const base = {
      outcome,
      timeMs: Math.round(s.phase === 'running' ? s.elapsedMs : this.frozenElapsed || s.elapsedMs),
      moves: s.moves,
      par,
      livesLost: s.livesLost,
      comboBonus: s.comboBonus,
    }
    return {
      dungeonId: this.dungeon.id,
      dungeonName: this.dungeon.name,
      mode,
      ...base,
      livesLeft: s.lives,
      progress: s.progress,
      bestCombo: s.bestCombo,
      nearMisses: s.nearMisses,
      keysCollected: s.keysCollected,
      difficulty: this.dungeon.difficulty,
      score: computeScore(base),
      actions: this.actions,
      killedBy: { ...this.killedBy },
    }
  }
}
