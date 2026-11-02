import { createContext, useContext } from 'react'
import type { PlayMode, RunResult } from '@/game/result'
import type { Dungeon } from '@/game/types'
import type { ProgressReport } from '@/progress/progression'

export type Route =
  | { name: 'menu' }
  | { name: 'modes' }
  | { name: 'practice' }
  | { name: 'daily' }
  | { name: 'friend' }
  | { name: 'editor' }
  | { name: 'profile' }
  | { name: 'settings' }
  | { name: 'shop' }
  | { name: 'play'; dungeon: Dungeon; mode: PlayMode; back: Route; next: Dungeon | null; tip?: string; attempt: number }
  | { name: 'result'; result: RunResult; report: ProgressReport; dungeon: Dungeon; back: Route; next: Dungeon | null; tip?: string }
  | { name: 'replay'; dungeon: Dungeon; actions: string; back: Route }

export interface Nav {
  route: Route
  go: (r: Route) => void
}

export const NavContext = createContext<Nav | null>(null)

export function useNav(): Nav {
  const n = useContext(NavContext)
  if (!n) throw new Error('useNav outside provider')
  return n
}
