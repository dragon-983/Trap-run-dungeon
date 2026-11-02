import type { PlayMode } from '@/game/result'
import type { Dungeon } from '@/game/types'
import type { Route } from './nav'

export function playRoute(dungeon: Dungeon, mode: PlayMode, back: Route, next: Dungeon | null = null, tip?: string): Route {
  return { name: 'play', dungeon, mode, back, next, tip, attempt: Date.now() }
}
