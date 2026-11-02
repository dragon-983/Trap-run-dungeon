// Dev tool: solves every built-in practice level. Run with `bun scripts/verify-levels.ts`.
import { PRACTICE_LEVELS } from '../src/game/levels'
import { validateDungeon } from '../src/game/validate'

let failed = 0
for (const l of PRACTICE_LEVELS) {
  const t = performance.now()
  const r = validateDungeon(l.dungeon)
  const ms = Math.round(performance.now() - t)
  console.log(`${String(l.index + 1).padStart(2)} ${l.dungeon.name.padEnd(16)} ${r.ok ? 'OK  par=' + r.par : 'FAIL ' + r.errors.join(' ')} (${ms}ms)`)
  if (!r.ok) failed++
}
process.exit(failed ? 1 : 0)
