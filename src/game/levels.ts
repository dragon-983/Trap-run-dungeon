import { parseAscii } from './codec'
import { layoutId } from './codec'
import type { CreatorAttribution, Dungeon } from './types'

const SYSTEM: CreatorAttribution = { profileId: 'system', displayName: 'TRAP//RUN' }

interface LevelDef {
  name: string
  difficulty: number
  tip: string
  rows: string[]
}

/**
 * Legend: # wall, . floor, S start, E exit, ^ spike, P pulse trap, > horizontal sentry,
 * v vertical sentry, K key, D locked door, W switch, G gate.
 */
export const LEVEL_DEFS: LevelDef[] = [
  {
    name: 'First Steps',
    difficulty: 1,
    tip: 'Reach the glowing exit. Move with WASD or the arrow keys.',
    rows: [
      '..#.....E',
      '..#.###..',
      '..#...#..',
      '..###.#..',
      '......#..',
      '.####.#.#',
      '.#....#..',
      '.#.####..',
      'S#.......',
    ],
  },
  {
    name: 'Spike Garden',
    difficulty: 1,
    tip: 'Spikes always hurt. Walk around them.',
    rows: [
      '..^...^.E',
      '..^.#.^..',
      '..^.#.^..',
      '....#....',
      '.^^^#.^^.',
      '.^..#..^.',
      '.^.^^^.^.',
      '.^.....^.',
      'S^.^^^^^.',
    ],
  },
  {
    name: 'Pulse Alley',
    difficulty: 2,
    tip: 'Pulse plates glow orange one turn before they fire. Hazards move when you move. Press Space to wait.',
    rows: [
      '........E',
      '.########',
      '..P...P..',
      '########.',
      '..P...P..',
      '.########',
      '..P...P..',
      '########.',
      'S..P...P.',
    ],
  },
  {
    name: 'Lock & Key',
    difficulty: 2,
    tip: 'Grab the key, then walk into the locked door to open it.',
    rows: [
      '.....#.DE',
      '.###.#.##',
      '.#K#.#...',
      '.#.#.#.#.',
      '.#.#...#.',
      '.#.#####.',
      '.#.......',
      '.#######.',
      'S........',
    ],
  },
  {
    name: 'Switchback',
    difficulty: 2,
    tip: 'Step on the switch to open every gate for good.',
    rows: [
      '.....#.GE',
      '.###.#.##',
      '.#W#.#...',
      '.#.#.#.#.',
      '.#.#...#.',
      '.#.#####.',
      '.#.......',
      '.#######.',
      'S...P....',
    ],
  },
  {
    name: 'Sentry Garden',
    difficulty: 3,
    tip: 'Sentries patrol back and forth. Their path is marked on the floor.',
    rows: [
      '........E',
      '.#.#.#.#.',
      '.........',
      '.#.#.#.#.',
      '..>......',
      '.#.#.#.#.',
      '.........',
      '.#.#.#.#.',
      'S........',
    ],
  },
  {
    name: 'Rhythm Section',
    difficulty: 3,
    tip: 'Pulses out of sync create a rhythm. Count the glow.',
    rows: [
      '...#...#E',
      '.#.#.#.#.',
      'P#.#P#.#P',
      '.#P#.#P#.',
      '.#.#.#.#.',
      'P#.#P#.#P',
      '.#P#.#P#.',
      '.#.#.#.#.',
      'S#...#...',
    ],
  },
  {
    name: 'Double Lock',
    difficulty: 3,
    tip: 'Two doors, two keys. Do not waste a key.',
    rows: [
      '........E',
      '.########',
      '..P...P..',
      '########.',
      '....D....',
      '.########',
      '.K..D....',
      '########.',
      'S...K....',
    ],
  },
  {
    name: 'Crossfire',
    difficulty: 4,
    tip: 'Two sentries, two directions. Find the gap.',
    rows: [
      '........E',
      '#######.#',
      '..>......',
      '#.#######',
      '....P....',
      '#######.#',
      '...>.....',
      '#.#######',
      'S........',
    ],
  },
  {
    name: 'Gatekeeper',
    difficulty: 4,
    tip: 'The switch is guarded. The gate is waiting.',
    rows: [
      '.....#.GE',
      '.###.#.##',
      '.#W#.#...',
      '.#P#.#.#.',
      '.#.#.>.#.',
      '.#.#####.',
      '.#.......',
      '.#######.',
      'S...P....',
    ],
  },
  {
    name: 'Gauntlet',
    difficulty: 5,
    tip: 'Everything at once. Plan the route before you commit.',
    rows: [
      '..W.#..GE',
      '.##.#.###',
      '.#..#.#..',
      '.#.##.#..',
      '..D...>..',
      '.#.##.#.#',
      '.#..K.P..',
      '.#.####..',
      'S.P......',
    ],
  },
  {
    name: 'Final Trial',
    difficulty: 5,
    tip: 'No more tips. Good luck.',
    rows: [
      'K.#W.#.GE',
      '.##.#...#',
      '...P#.#..',
      '.#v.#.#..',
      '.#...D>..',
      '.#.##.#.#',
      '.#..^.P..',
      '.#.####..',
      'S.P......',
    ],
  },
]

export interface PracticeLevel {
  index: number
  dungeon: Dungeon
  tip: string
}

export const PRACTICE_LEVELS: PracticeLevel[] = LEVEL_DEFS.map((def, index) => {
  const layout = parseAscii(def.rows)
  return {
    index,
    tip: def.tip,
    dungeon: {
      id: `p${index + 1}-${layoutId(layout)}`,
      name: def.name,
      ...layout,
      creator: SYSTEM,
      source: 'practice',
      difficulty: def.difficulty,
      createdAt: 0,
    },
  }
})
