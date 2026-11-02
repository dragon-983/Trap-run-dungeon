import { dateKey } from '@/game/daily'

export const FREE_HEALTH_PER_DAY = 5
export const DAILY_CLEAR_BONUS = 2
export const HEALTH_PER_PACK = 5

/**
 * Health is the cost of starting a run. Spend order: today's free health, then earned bonus,
 * then purchased health. Free health resets each UTC day and does not stack.
 */
export interface HealthState {
  day: string
  free: number
  /** Earned by clearing the daily challenge. Never expires. */
  bonus: number
  /** Purchased with USDC. Never expires. */
  paid: number
  /** Lifetime purchased health points from the shop contract already credited into `paid`. */
  credited: number
}

export const newHealth = (today: string = dateKey()): HealthState => ({ day: today, free: FREE_HEALTH_PER_DAY, bonus: 0, paid: 0, credited: 0 })

export function rollDay(h: HealthState, today: string = dateKey()): HealthState {
  return h.day === today ? h : { ...h, day: today, free: FREE_HEALTH_PER_DAY }
}

export const totalHealth = (h: HealthState): number => h.free + h.bonus + h.paid

export function spendOne(h: HealthState): HealthState | null {
  if (totalHealth(h) <= 0) return null
  if (h.free > 0) return { ...h, free: h.free - 1 }
  if (h.bonus > 0) return { ...h, bonus: h.bonus - 1 }
  return { ...h, paid: h.paid - 1 }
}

/** Credit newly purchased health reported by the shop contract (lifetime total, in health points). */
export function creditPurchased(h: HealthState, lifetimeTotal: number): HealthState {
  if (lifetimeTotal <= h.credited) return h
  const delta = lifetimeTotal - h.credited
  return { ...h, paid: h.paid + delta, credited: lifetimeTotal }
}
