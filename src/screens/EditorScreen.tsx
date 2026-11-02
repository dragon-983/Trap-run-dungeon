import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Eraser, FlaskConical, Hammer, Loader2, Timer, Trash2, Undo2, Upload, Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import { useNav } from '@/app/nav'
import { Bar, Button, Label, Notice, Panel, Screen } from '@/components/ui'
import { ToolIcon } from '@/editor/ToolIcon'
import { TOOLS, estimateDifficulty, place, toolCost, toolUsage, type Tool } from '@/editor/tools'
import { encodeDungeon, layoutId, roomCodeFor } from '@/game/codec'
import { validateDungeon, type ValidationResult } from '@/game/validate'
import {
  BUDGET,
  CREATOR_EXIT,
  CREATOR_START,
  budgetSpent,
  emptyCells,
  idx,
  type CellType,
  type Dungeon,
} from '@/game/types'
import { sfx } from '@/lib/audio'
import { DungeonCanvas } from '@/render/DungeonCanvas'
import { profileStore, useProfile } from '@/progress/store'
import { AuthCard } from '@/components/AccountPanel'
import { PayStatus } from '@/components/PayStatus'
import { SHOP_ADDRESS, dungeonHashOf, formatUsdcAmount } from '@/web3/shop'
import { usePurchase } from '@/web3/usePurchase'
import { useShopPrices } from '@/web3/useShopData'
import { PlayScreen } from './PlayScreen'

const BUILD_MS = 30_000
const isFixed = (x: number, y: number) => (x === CREATOR_START.x && y === CREATOR_START.y) || (x === CREATOR_EXIT.x && y === CREATOR_EXIT.y)

export function EditorScreen() {
  const nav = useNav()
  const profile = useProfile()
  const timed = profile.settings.buildTimer
  const [draft] = useState(() => profile.draft)

  const [cells, setCells] = useState<CellType[]>(() => draft?.cells ?? emptyCells())
  const [started, setStarted] = useState(draft?.started ?? false)
  const [locked, setLocked] = useState(draft?.locked ?? false)
  const [remaining, setRemaining] = useState(draft?.remainingMs ?? BUILD_MS)
  const [tool, setTool] = useState<Tool>('wall')
  const [msg, setMsg] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)
  const [cleared, setCleared] = useState<string | null>(null)
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState(() => `Dungeon #${profile.published.length + 1}`)
  const prices = useShopPrices()
  const pay = usePurchase()
  const address = profile.wallets.find((w) => w.chain === 'arc')?.accountId ?? null
  const [val, setVal] = useState<{ for: CellType[]; result: ValidationResult } | null>(null)

  const cellsRef = useRef(cells)
  const orderRef = useRef<number[]>(draft?.order ?? [])
  const remRef = useRef(remaining)
  const stroke = useRef<Tool | null>(null)
  const skipSave = useRef(false)
  const flags = useRef({ started, locked })
  const [pieces, setPieces] = useState(() => draft?.order.length ?? 0)
  useEffect(() => {
    flags.current = { started, locked }
    remRef.current = remaining
  })

  const editable = !(timed && locked) && !testing

  const dungeon = useMemo<Dungeon>(
    () => ({
      id: 'draft',
      name: 'Untitled',
      cells,
      start: CREATOR_START,
      exit: CREATOR_EXIT,
      creator: { profileId: profile.id, displayName: profile.displayName },
      source: 'creator',
      difficulty: 1,
      createdAt: 0,
    }),
    [cells, profile.id, profile.displayName],
  )

  // --- build clock ---
  useEffect(() => {
    if (!timed || !started || locked || testing) return
    let last = performance.now()
    const t = setInterval(() => {
      const now = performance.now()
      const left = Math.max(0, remRef.current - (now - last))
      last = now
      remRef.current = left
      setRemaining(left)
      if (left <= 0) {
        setLocked(true)
        sfx.play('lose')
      }
    }, 100)
    return () => clearInterval(t)
  }, [timed, started, locked, testing])

  // --- live validation ---
  useEffect(() => {
    const t = setTimeout(() => setVal({ for: cells, result: validateDungeon(dungeon, { enforceBudget: true }) }), 180)
    return () => clearTimeout(t)
  }, [cells, dungeon])

  // --- keep the draft so testing / leaving never loses work ---
  const saveDraft = useCallback(() => {
    if (skipSave.current) return
    profileStore.saveDraft({ cells: cellsRef.current, order: orderRef.current, remainingMs: remRef.current, started: flags.current.started, locked: flags.current.locked })
  }, [])
  useEffect(() => {
    saveDraft()
  }, [cells, started, locked, saveDraft])
  useEffect(() => saveDraft, [saveDraft])

  const apply = useCallback(
    (x: number, y: number, t: Tool) => {
      if (!editable) return
      if (isFixed(x, y)) {
        setMsg('The entrance and exit are protected.')
        sfx.play('error')
        return
      }
      const i = idx(x, y)
      const r = place(cellsRef.current, i, t)
      if (!r.ok) {
        if (r.reason) {
          setMsg(r.reason)
          sfx.play('error')
        }
        return
      }
      cellsRef.current = r.cells
      orderRef.current = t === 'erase' ? orderRef.current.filter((o) => o !== i) : [...orderRef.current.filter((o) => o !== i), i]
      setCells(r.cells)
      setPieces(orderRef.current.length)
      setStarted(true)
      setMsg(null)
      sfx.play(t === 'erase' ? 'erase' : 'place')
    },
    [editable],
  )

  // number keys pick tools quickly
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      const n = e.key === '0' || e.key.toLowerCase() === 'e' ? TOOLS.length : Number(e.key)
      if (n >= 1 && n <= TOOLS.length) setTool(TOOLS[n - 1].id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const reset = (newCells: CellType[], order: number[]) => {
    cellsRef.current = newCells
    orderRef.current = order
    setCells(newCells)
    setPieces(order.length)
  }

  const clearAll = () => {
    reset(emptyCells(), [])
    setStarted(false)
    setLocked(false)
    setRemaining(BUILD_MS)
    setCleared(null)
    setMsg(null)
    sfx.play('erase')
  }

  const undo = () => {
    if (!editable) return
    const last = orderRef.current[orderRef.current.length - 1]
    if (last === undefined) return
    const next = cellsRef.current.slice()
    next[last] = 'empty'
    reset(next, orderRef.current.slice(0, -1))
    sfx.play('erase')
  }

  const autoRepair = () => {
    const next = cellsRef.current.slice()
    const order = orderRef.current.slice()
    while (order.length > 0) {
      const i = order.pop() as number
      next[i] = 'empty'
      if (validateDungeon({ ...dungeon, cells: next }, { enforceBudget: true }).ok) break
    }
    reset(next, order)
    setMsg('Removed your latest pieces until an escape route existed.')
    sfx.play('click')
  }

  const result = val && val.for === cells ? val.result : null
  const checking = !result
  const spent = budgetSpent(cells)
  const layoutKey = cells.join(',')
  const clearedByYou = cleared === layoutKey
  const seconds = (remaining / 1000).toFixed(1)
  const urgent = timed && started && !locked && remaining < 8000

  const onTestFinish = useCallback((won: boolean) => {
    setTesting(false)
    if (won) {
      setCleared(cellsRef.current.join(','))
      toast.success('You cleared your own dungeon.')
    }
  }, [])
  const onTestExit = useCallback(() => setTesting(false), [])

  if (testing && result?.ok) {
    const testDungeon: Dungeon = { ...dungeon, name: 'Test Run', par: result.par ?? undefined, difficulty: estimateDifficulty(dungeon, result.par ?? 0) }
    return <PlayScreen dungeon={testDungeon} mode="test" back={{ name: 'editor' }} next={null} tip="Test run: no XP, no stats. Prove it is fair." onFinish={onTestFinish} onExit={onTestExit} />
  }

  const publish = async () => {
    if (!result?.ok || !prices.data) return
    const layout = { cells, start: CREATOR_START, exit: CREATOR_EXIT }
    const id = `c-${layoutId(layout)}`
    // Creating costs a fee, paid onchain once per dungeon. Re-publishing the same layout is free.
    if (!profile.published.some((d) => d.id === id)) {
      const paid = await pay.run({ kind: 'dungeon', label: name.trim() || 'Untitled', price: prices.data.createFee, call: { fn: 'registerDungeon', hash: dungeonHashOf(layout) } })
      if (!paid) return
    }
    const final: Dungeon = {
      ...dungeon,
      id,
      name: name.trim().slice(0, 24) || 'Untitled',
      par: result.par ?? undefined,
      difficulty: estimateDifficulty(dungeon, result.par ?? 0),
      createdAt: Date.now(),
    }
    const code = encodeDungeon(final)
    profileStore.saveRoom(roomCodeFor(final), code)
    const report = profileStore.publishDungeon(final)
    skipSave.current = true
    profileStore.saveDraft(null)
    sfx.play(report.levelAfter > report.levelBefore ? 'levelup' : 'win')
    toast.success(`Published "${final.name}"${report.xpGained ? ` (+${report.xpGained} XP)` : ''}`)
    nav.go({ name: 'friend' })
  }

  return (
    <Screen
      title="Creator Mode"
      wide
      onBack={() => nav.go({ name: 'modes' })}
      right={
        <Button size="sm" onClick={clearAll}>
          <Trash2 size={14} /> Clear
        </Button>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,560px)_1fr]">
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <Panel className="!p-3">
              <Label className="flex items-center gap-1">
                <Timer size={11} /> Build clock
              </Label>
              <div className={`tabular font-pixel text-3xl ${locked && timed ? 'text-blood-500' : urgent ? 'animate-glow text-ember-500' : 'text-zinc-50'}`}>
                {timed ? (locked ? 'TIME UP' : `${seconds}s`) : 'OFF'}
              </div>
              <div className="text-xs text-zinc-500">{!timed ? 'Untimed in settings' : started ? (locked ? 'Board locked' : 'Hurry!') : 'Starts on your first piece'}</div>
            </Panel>
            <Panel className="!p-3">
              <Label>Budget</Label>
              <div className="tabular font-pixel text-3xl text-zinc-50">
                {BUDGET - spent}
                <span className="text-sm text-zinc-500"> / {BUDGET} left</span>
              </div>
              <div className="mt-1">
                <Bar ratio={spent / BUDGET} color={spent > BUDGET - 4 ? 'bg-ember-500' : 'bg-volt-500'} />
              </div>
            </Panel>
          </div>

          <DungeonCanvas
            dungeon={dungeon}
            skinId={profile.equipped.skin}
            trailId={profile.equipped.trail}
            reduceMotion={profile.settings.reducedMotion}
            dim={!editable}
            className="overflow-hidden rounded-xl shadow-volt"
            editor={{
              canEdit: (x, y) => !isFixed(x, y),
              hoverColor: TOOLS.find((t) => t.id === tool)?.color ?? '#9d4dff',
              locked: !editable,
              onDown: (x, y, button) => {
                stroke.current = button === 2 ? 'erase' : tool
                apply(x, y, stroke.current)
              },
              onMove: (x, y) => stroke.current && apply(x, y, stroke.current),
              onUp: () => {
                stroke.current = null
              },
            }}
          />
          <p className="text-xs text-zinc-500">Click or drag to paint. Right-click erases. Keys 1 to 9 pick a piece, E erases. Start (bottom left) and exit (top right) are fixed.</p>
        </div>

        <div className="flex flex-col gap-3">
          <Panel>
            <Label className="mb-3">Pieces</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 lg:grid-cols-2 xl:grid-cols-5">
              {TOOLS.map((t, i) => {
                const u = toolUsage(cells, t.id)
                const full = u ? u.used >= u.cap && t.id !== 'erase' : false
                const broke = t.id !== 'erase' && spent + toolCost(t.id) > BUDGET
                return (
                  <button
                    key={t.id}
                    disabled={!editable}
                    onClick={() => {
                      setTool(t.id)
                      sfx.play('click')
                    }}
                    title={t.hint}
                    className={`relative flex min-h-[84px] flex-col items-center justify-center gap-1 rounded-xl border p-2 text-center transition active:scale-95 disabled:opacity-40 ${
                      tool === t.id ? 'border-volt-400 bg-volt-500/15 shadow-volt' : 'border-ink-500 bg-ink-900/60 hover:border-ink-400'
                    } ${(full || broke) && t.id !== 'erase' ? 'opacity-50' : ''}`}
                  >
                    <span className="absolute left-1.5 top-1 font-pixel text-[9px] text-zinc-500">{i === TOOLS.length - 1 ? 'E' : i + 1}</span>
                    <ToolIcon tool={t.id} />
                    <span className="text-[11px] font-semibold leading-tight text-zinc-200">{t.label}</span>
                    <span className="tabular font-pixel text-[9px] text-zinc-500">
                      {t.id === 'erase' ? 'refund' : `${toolCost(t.id)} pt${u ? ` · ${u.used}/${u.cap}` : ''}`}
                    </span>
                  </button>
                )
              })}
            </div>
            <p className="mt-3 text-sm text-zinc-400">{TOOLS.find((t) => t.id === tool)?.hint}</p>
          </Panel>

          <div aria-live="polite" className="flex flex-col gap-2">
            {msg && <Notice tone="error">{msg}</Notice>}
            {checking ? (
              <Notice>
                <span className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" /> Checking for an escape route
                </span>
              </Notice>
            ) : result.ok ? (
              <Notice tone="ok">
                <span className="flex items-center gap-2">
                  <CheckCircle2 size={16} /> Valid. Shortest escape is {result.par} turns.{clearedByYou && ' You cleared it yourself.'}
                </span>
              </Notice>
            ) : (
              <Notice tone="error">
                <span className="flex items-start gap-2">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {result.errors.join(' ')}
                </span>
              </Notice>
            )}
            {timed && locked && result && !result.ok && (
              <Notice>
                Time is up and the dungeon has no escape route. Auto-repair removes your latest pieces until it works, or clear the board and try again.
              </Notice>
            )}
          </div>

          {naming && result?.ok ? (
            <Panel>
              <Label className="mb-2">Name your dungeon</Label>
              {!SHOP_ADDRESS && <Notice tone="error">Publishing needs the shop contract, which is not live yet. You can still build and test.</Notice>}
              {SHOP_ADDRESS && !address && <AuthCard reason="Publishing a dungeon costs a small USDC fee, so you need an account." />}
              <input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 24))}
                maxLength={24}
                autoFocus
                className="mb-3 h-11 w-full rounded-xl border border-ink-500 bg-ink-900 px-3 text-zinc-50 outline-none focus:border-volt-400"
                aria-label="Dungeon name"
              />
              <div className="grid grid-cols-2 gap-2">
                <Button variant="primary" onClick={() => void publish()} disabled={!SHOP_ADDRESS || !address || !prices.data || pay.busy}>
                  <Upload size={16} /> {prices.data && !profile.published.some((d) => d.id === `c-${layoutId({ cells, start: CREATOR_START, exit: CREATOR_EXIT })}`) ? `Pay ${formatUsdcAmount(prices.data.createFee)} and publish` : 'Publish'}
                </Button>
                <Button onClick={() => setNaming(false)} disabled={pay.busy}>
                  Cancel
                </Button>
              </div>
              <div className="mt-3">
                <PayStatus step={pay.step} error={pay.error} />
              </div>
            </Panel>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="volt" disabled={!result?.ok} onClick={() => setTesting(true)}>
                <FlaskConical size={16} /> Test run
              </Button>
              <Button variant="primary" disabled={!result?.ok} onClick={() => setNaming(true)}>
                <Hammer size={16} /> Publish
              </Button>
              <Button onClick={undo} disabled={!editable || pieces === 0}>
                <Undo2 size={16} /> Undo
              </Button>
              <Button onClick={autoRepair} disabled={!result || result.ok || cells.every((c) => c === 'empty')}>
                <Wand2 size={16} /> Auto-repair
              </Button>
            </div>
          )}
          <p className="flex items-center gap-1 text-xs text-zinc-500">
            <Eraser size={12} /> Every dungeon is solver-checked before it can be published, so a valid escape always exists.
          </p>
        </div>
      </div>
    </Screen>
  )
}
