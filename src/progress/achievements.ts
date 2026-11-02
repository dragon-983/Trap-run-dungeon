import { PRACTICE_LEVELS } from '@/game/levels'
import { levelFromXp, type Profile } from './profile'

export interface AchievementDef {
  id: string
  title: string
  description: string
  test: (p: Profile) => boolean
}

const practiceCleared = (p: Profile) => PRACTICE_LEVELS.filter((l) => (p.clears[l.dungeon.id] ?? 0) > 0).length

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-escape', title: 'First Escape', description: 'Escape your first dungeon.', test: (p) => p.wins >= 1 },
  { id: 'flawless', title: 'Flawless', description: 'Escape without losing a life.', test: (p) => p.flawlessRuns >= 1 },
  { id: 'combo-5', title: 'Combo Runner', description: 'Chain a x5 combo.', test: (p) => p.bestCombo >= 5 },
  { id: 'near-miss-10', title: 'Too Close', description: 'Score 10 near misses.', test: (p) => p.nearMisses >= 10 },
  { id: 'streak-3', title: 'On a Roll', description: 'Reach a 3-day daily streak.', test: (p) => p.streak.best >= 3 },
  { id: 'streak-7', title: 'Dedicated', description: 'Reach a 7-day daily streak.', test: (p) => p.streak.best >= 7 },
  { id: 'builder', title: 'Dungeon Master', description: 'Publish your first dungeon.', test: (p) => p.published.length >= 1 },
  { id: 'architect', title: 'Architect', description: 'Publish three dungeons.', test: (p) => p.published.length >= 3 },
  { id: 'practice-half', title: 'Getting Warm', description: 'Clear 6 practice dungeons.', test: (p) => practiceCleared(p) >= 6 },
  { id: 'practice-all', title: 'Trial Survivor', description: 'Clear every practice dungeon.', test: (p) => practiceCleared(p) >= PRACTICE_LEVELS.length },
  { id: 'level-5', title: 'Veteran', description: 'Reach level 5.', test: (p) => levelFromXp(p.xp) >= 5 },
]

export const getAchievement = (id: string): AchievementDef | undefined => ACHIEVEMENTS.find((a) => a.id === id)
