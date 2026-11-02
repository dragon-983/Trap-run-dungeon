import { previousDateKey } from '@/game/daily'
import type { RunResult } from '@/game/result'
import type { Dungeon } from '@/game/types'
import { PRACTICE_LEVELS } from '@/game/levels'
import { ACHIEVEMENTS } from './achievements'
import { COSMETICS, type UnlockRule } from './cosmetics'
import { DAILY_CLEAR_BONUS, rollDay } from './health'
import { levelFromXp, type BestRun, type Profile } from './profile'

export interface ProgressReport {
  xpGained: number
  breakdown: Array<{ label: string; xp: number }>
  levelBefore: number
  levelAfter: number
  newCosmetics: string[]
  newAchievements: string[]
  isBest: boolean
  previousBest: BestRun | null
  streak: number | null
  unlockedNextLevel: boolean
  healthGained: number
}

export const emptyReport = (p: Profile): ProgressReport => ({
  xpGained: 0,
  breakdown: [],
  levelBefore: levelFromXp(p.xp),
  levelAfter: levelFromXp(p.xp),
  newCosmetics: [],
  newAchievements: [],
  isBest: false,
  previousBest: null,
  streak: null,
  unlockedNextLevel: false,
  healthGained: 0,
})

function ruleMet(rule: UnlockRule, p: Profile): boolean {
  switch (rule.kind) {
    case 'default':
      return true
    case 'level':
      return levelFromXp(p.xp) >= rule.n
    case 'streak':
      return p.streak.best >= rule.n
    case 'wins':
      return p.wins >= rule.n
    case 'flawless':
      return p.flawlessRuns >= rule.n
    case 'daily':
      return Object.keys(p.daily).length >= rule.n
    case 'built':
      return p.published.length >= rule.n
    case 'shop':
      return p.ownedSkins.includes(rule.skinId)
  }
}

/** Grants any cosmetics / achievements the profile now qualifies for. */
function grantEarned(p: Profile, report: ProgressReport): Profile {
  const newCosmetics = COSMETICS.filter((c) => !p.unlocked.includes(c.id) && ruleMet(c.rule, p)).map((c) => c.id)
  let next: Profile = newCosmetics.length ? { ...p, unlocked: [...p.unlocked, ...newCosmetics] } : p
  const newAch = ACHIEVEMENTS.filter((a) => !next.achievements.some((r) => r.id === a.id) && a.test(next))
  if (newAch.length) {
    const now = Date.now()
    next = {
      ...next,
      achievements: [...next.achievements, ...newAch.map((a) => ({ id: a.id, profileId: next.id, unlockedAt: now, anchors: [] }))],
    }
  }
  report.newCosmetics = newCosmetics
  report.newAchievements = newAch.map((a) => a.id)
  return next
}

export function applyRun(profile: Profile, r: RunResult): { profile: Profile; report: ProgressReport } {
  const report = emptyReport(profile)
  if (r.mode === 'test') return { profile, report }

  const breakdown: ProgressReport['breakdown'] = []
  let p: Profile = {
    ...profile,
    runs: profile.runs + 1,
    playMs: profile.playMs + r.timeMs,
    keysCollected: profile.keysCollected + r.keysCollected,
    nearMisses: profile.nearMisses + r.nearMisses,
    bestCombo: Math.max(profile.bestCombo, r.bestCombo),
    livesLost: profile.livesLost + r.livesLost,
    attempts: { ...profile.attempts, [r.dungeonId]: (profile.attempts[r.dungeonId] ?? 0) + 1 },
  }

  if (r.outcome === 'loss') {
    p = { ...p, losses: p.losses + 1 }
    breakdown.push({ label: 'Attempt', xp: 8 })
    const progressXp = Math.round(r.progress * 14)
    if (progressXp > 0) breakdown.push({ label: 'Progress', xp: progressXp })
  } else {
    const firstClear = (profile.clears[r.dungeonId] ?? 0) === 0
    const flawless = r.livesLost === 0
    p = {
      ...p,
      wins: p.wins + 1,
      flawlessRuns: p.flawlessRuns + (flawless ? 1 : 0),
      clears: { ...p.clears, [r.dungeonId]: (profile.clears[r.dungeonId] ?? 0) + 1 },
    }
    breakdown.push({ label: 'Escape', xp: 40 + r.difficulty * 12 })
    const skill = Math.min(50, Math.round(r.score / 40))
    breakdown.push({ label: 'Skill', xp: skill })
    if (flawless) breakdown.push({ label: 'Flawless', xp: 20 })
    if (firstClear) breakdown.push({ label: 'First clear', xp: 25 })

    const prev = profile.bests[r.dungeonId] ?? null
    report.previousBest = prev
    if (!prev || r.timeMs < prev.timeMs) {
      report.isBest = true
      const best: BestRun = { timeMs: r.timeMs, moves: r.moves, score: r.score, actions: r.actions, at: Date.now() }
      p = { ...p, bests: { ...p.bests, [r.dungeonId]: best } }
      if (prev) breakdown.push({ label: 'New best time', xp: 15 })
    }

    if (r.mode === 'practice') {
      const index = PRACTICE_LEVELS.findIndex((l) => l.dungeon.id === r.dungeonId)
      if (index >= 0) {
        const open = Math.min(PRACTICE_LEVELS.length, index + 3)
        if (open > p.practiceUnlocked) {
          p = { ...p, practiceUnlocked: open }
          report.unlockedNextLevel = true
        }
      }
    }

    if (r.mode === 'daily') {
      const key = r.dungeonId.replace(/^daily-/, '')
      breakdown.push({ label: 'Daily challenge', xp: 50 })
      const existing = p.daily[key]
      if (!existing || r.timeMs < existing.timeMs) {
        p = { ...p, daily: { ...p.daily, [key]: { timeMs: r.timeMs, moves: r.moves, score: r.score } } }
      }
      if (!existing) {
        p = { ...p, health: { ...rollDay(p.health), bonus: rollDay(p.health).bonus + DAILY_CLEAR_BONUS } }
        report.healthGained = DAILY_CLEAR_BONUS
        const continues = p.streak.last === previousDateKey(key)
        const current = continues ? p.streak.current + 1 : 1
        p = { ...p, streak: { current, best: Math.max(p.streak.best, current), last: key } }
        if (current > 1) breakdown.push({ label: `${current}-day streak`, xp: Math.min(60, current * 8) })
      }
      report.streak = p.streak.current
    }
  }

  const xpGained = breakdown.reduce((n, b) => n + b.xp, 0)
  p = { ...p, xp: p.xp + xpGained }
  report.xpGained = xpGained
  report.breakdown = breakdown
  report.levelAfter = levelFromXp(p.xp)
  p = grantEarned(p, report)
  return { profile: p, report }
}

/** Publishing a validated dungeon earns XP once per dungeon. */
export function applyPublish(profile: Profile, dungeon: Dungeon): { profile: Profile; report: ProgressReport } {
  const report = emptyReport(profile)
  let p: Profile = { ...profile, published: [dungeon, ...profile.published.filter((d) => d.id !== dungeon.id)].slice(0, 24) }
  const isNew = !profile.published.some((d) => d.id === dungeon.id)
  if (isNew) {
    report.breakdown = [{ label: 'Published dungeon', xp: 40 }]
    report.xpGained = 40
    p = { ...p, xp: p.xp + 40 }
  }
  report.levelAfter = levelFromXp(p.xp)
  p = grantEarned(p, report)
  return { profile: p, report }
}
