import { analyze, initialState, stepGame } from './engine'
import { GRID, type Action, type Dungeon, type RunState } from './types'

const ACTIONS: Action[] = ['U', 'D', 'L', 'R', 'W']

export interface SolveResult {
  solvable: boolean
  /** Shortest hazard-free action sequence from the start to the exit. */
  path: Action[]
  explored: number
}

/** Breadth-first search over (position, keys, doors, switch, turn mod cycle). */
export function solve(d: Dungeon): SolveResult {
  const a = analyze(d)
  const C = a.cycle
  const total = GRID * GRID * 8 * 8 * 2 * C
  const encode = (s: RunState) => ((((s.y * GRID + s.x) * 8 + s.keys) * 8 + s.doors) * 2 + (s.lever ? 1 : 0)) * C + (s.turn % C)

  const parent = new Int32Array(total).fill(-2)
  const via = new Uint8Array(total)
  const queue = new Int32Array(total)
  let head = 0
  let tail = 0

  const start = initialState(d)
  const startKey = encode(start)
  parent[startKey] = -1
  queue[tail++] = startKey

  const decode = (code: number): RunState => {
    const turn = code % C
    let rest = Math.floor(code / C)
    const lever = rest % 2 === 1
    rest = Math.floor(rest / 2)
    const doors = rest % 8
    rest = Math.floor(rest / 8)
    const keys = rest % 8
    rest = Math.floor(rest / 8)
    return { x: rest % GRID, y: Math.floor(rest / GRID), turn, keys, doors, lever }
  }

  while (head < tail) {
    const code = queue[head++]
    const s = decode(code)
    for (let k = 0; k < ACTIONS.length; k++) {
      const r = stepGame(d, a, s, ACTIONS[k])
      if (r.status === 'blocked' || r.status === 'hit') continue
      const nk = encode(r.state)
      if (parent[nk] !== -2) continue
      parent[nk] = code
      via[nk] = k
      if (r.status === 'won') {
        const path: Action[] = []
        let cur = nk
        while (parent[cur] !== -1) {
          path.push(ACTIONS[via[cur]])
          cur = parent[cur]
        }
        path.reverse()
        return { solvable: true, path, explored: head }
      }
      queue[tail++] = nk
    }
  }
  return { solvable: false, path: [], explored: head }
}
