import type { HazardCause } from './types'

export type PlayMode = 'practice' | 'daily' | 'friend' | 'test'

export interface RunResult {
  dungeonId: string
  dungeonName: string
  mode: PlayMode
  outcome: 'win' | 'loss'
  timeMs: number
  moves: number
  livesLost: number
  livesLeft: number
  /** Furthest progress towards the exit, 0 to 1. */
  progress: number
  bestCombo: number
  comboBonus: number
  nearMisses: number
  keysCollected: number
  par: number
  difficulty: number
  score: number
  /** Compact action log, replayable with the engine. */
  actions: string
  killedBy: Record<HazardCause, number>
}

export function computeScore(r: Pick<RunResult, 'outcome' | 'timeMs' | 'moves' | 'par' | 'livesLost' | 'comboBonus'>): number {
  if (r.outcome !== 'win') return 0
  const seconds = Math.floor(r.timeMs / 1000)
  const overPar = Math.max(0, r.moves - r.par)
  const score = 1000 + r.comboBonus - seconds * 8 - overPar * 4 - r.livesLost * 150
  return Math.max(100, Math.round(score))
}

export function formatTime(ms: number): string {
  const total = Math.max(0, ms)
  const s = Math.floor(total / 1000)
  const m = Math.floor(s / 60)
  const hundredths = Math.floor((total % 1000) / 10)
  return `${m}:${String(s % 60).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`
}
