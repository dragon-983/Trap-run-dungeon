import { useState } from 'react'
import { Check, Heart, Shirt } from 'lucide-react'
import { TokenUSDC } from '@web3icons/react'
import { toast } from 'sonner'
import { useNav } from '@/app/nav'
import { AuthCard, HealthPill, SignedInDetails } from '@/components/AccountPanel'
import { PayStatus } from '@/components/PayStatus'
import { SkinPreview } from '@/components/SkinPreview'
import { Button, Label, Notice, Panel, Screen } from '@/components/ui'
import { DAILY_CLEAR_BONUS, FREE_HEALTH_PER_DAY, HEALTH_PER_PACK, rollDay } from '@/progress/health'
import { profileStore, useProfile } from '@/progress/store'
import { sfx } from '@/lib/audio'
import { IS_MAINNET } from '@/web3/network'
import { SHOP_ADDRESS, SHOP_SKINS, formatUsdcAmount } from '@/web3/shop'
import { useAccountChainData, useShopPrices } from '@/web3/useShopData'
import { usePurchase } from '@/web3/usePurchase'

const PACK_OPTIONS = [1, 2, 4]

export function ShopScreen() {
  const { go } = useNav()
  const p = useProfile()
  const address = p.wallets.find((w) => w.chain === 'arc')?.accountId ?? null
  const prices = useShopPrices()
  const chain = useAccountChainData(address)
  const pay = usePurchase()
  const [lastHash, setLastHash] = useState<string | null>(null)
  const h = rollDay(p.health)
  const live = Boolean(SHOP_ADDRESS)
  const canBuy = live && Boolean(address) && Boolean(prices.data)
  const owned = new Set(p.ownedSkins)

  const buyHealth = async (packs: number) => {
    if (!prices.data) return
    const res = await pay.run({
      kind: 'health',
      label: `${packs * HEALTH_PER_PACK} health`,
      price: prices.data.healthPack * BigInt(packs),
      call: { fn: 'buyHealth', packs: BigInt(packs) },
    })
    if (res) {
      setLastHash(res.hash)
      sfx.play('levelup')
      toast.success(`+${packs * HEALTH_PER_PACK} health`)
      void chain.refetch()
    }
  }

  const buySkin = async (skinId: number, name: string) => {
    const price = prices.data?.skins[skinId]
    if (!price) return
    const res = await pay.run({ kind: 'skin', label: name, price, call: { fn: 'buySkin', skinId: BigInt(skinId) } })
    if (res) {
      setLastHash(res.hash)
      sfx.play('levelup')
      toast.success(`${name} unlocked`)
      void chain.refetch()
    }
  }

  return (
    <Screen title="Shop" onBack={() => go({ name: 'menu' })} right={<HealthPill />}>
      <div className="flex flex-col gap-4">
        {IS_MAINNET && live && <Notice tone="error">Mainnet: purchases use real USDC and cannot be reversed.</Notice>}
        {!live && <Notice tone="error">The shop contract is not live yet, so purchases are switched off. You still get {FREE_HEALTH_PER_DAY} free health every day.</Notice>}
        {live && !address && <AuthCard reason="Buying health and skins needs an account." />}

        {address && (
          <Panel className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Label>Wallet</Label>
              <div className="tabular flex items-center gap-1.5 font-pixel text-sm">
                <TokenUSDC variant="branded" size={18} />
                {chain.data ? formatUsdcAmount(chain.data.usdc) : chain.isError ? 'unavailable' : '...'}
              </div>
            </div>
            <SignedInDetails />
            {chain.data && chain.data.usdc === 0n && <p className="text-xs text-zinc-500">{IS_MAINNET ? 'No USDC yet. Add USDC to your wallet first.' : 'No USDC yet. Tap Get test USDC in the sidebar.'} On Arc, USDC also pays network fees.</p>}
          </Panel>
        )}

        <Panel>
          <div className="mb-3 flex items-center gap-2">
            <Heart size={18} className="fill-blood-500 text-blood-500" />
            <h2 className="font-display text-lg font-bold">Health</h2>
          </div>
          <p className="mb-3 text-sm text-zinc-400">Each run costs 1 health. You get {FREE_HEALTH_PER_DAY} free every day, and clearing the daily challenge earns +{DAILY_CLEAR_BONUS}. Health never changes how a dungeon plays.</p>
          <div className="mb-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-ink-900/70 p-2">
              <div className="tabular font-pixel text-xl">{h.free}</div>
              <Label>Free today</Label>
            </div>
            <div className="rounded-xl bg-ink-900/70 p-2">
              <div className="tabular font-pixel text-xl text-ember-400">{h.bonus}</div>
              <Label>Earned</Label>
            </div>
            <div className="rounded-xl bg-ink-900/70 p-2">
              <div className="tabular font-pixel text-xl text-acid-500">{h.paid}</div>
              <Label>Bought</Label>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {PACK_OPTIONS.map((n) => (
              <Button key={n} variant="ember" disabled={!canBuy || pay.busy} onClick={() => void buyHealth(n)} className="!h-auto flex-col !py-3">
                <span>+{n * HEALTH_PER_PACK}</span>
                <span className="tabular text-[11px] font-medium opacity-80">{prices.data ? `${formatUsdcAmount(prices.data.healthPack * BigInt(n))} USDC` : '...'}</span>
              </Button>
            ))}
          </div>
        </Panel>

        <Panel>
          <div className="mb-3 flex items-center gap-2">
            <Shirt size={18} className="text-volt-400" />
            <h2 className="font-display text-lg font-bold">Skins</h2>
          </div>
          <p className="mb-3 text-sm text-zinc-400">Cosmetic only. Owned skins are recorded onchain, so they follow your wallet.</p>
          <div className="grid grid-cols-2 gap-3">
            {SHOP_SKINS.map(({ skinId, cosmetic }) => {
              const has = owned.has(skinId)
              const price = prices.data?.skins[skinId]
              const equipped = p.equipped.skin === cosmetic.id
              return (
                <div key={cosmetic.id} className="flex flex-col items-center gap-2 rounded-2xl border border-ink-500 bg-ink-900/50 p-3">
                  <SkinPreview cosmetic={cosmetic} />
                  <div className="text-center text-sm font-semibold">{cosmetic.name}</div>
                  {has ? (
                    <Button size="sm" variant={equipped ? 'primary' : 'ghost'} className="w-full" onClick={() => profileStore.equip('skin', cosmetic.id)}>
                      {equipped ? (
                        <>
                          <Check size={14} /> Equipped
                        </>
                      ) : (
                        'Equip'
                      )}
                    </Button>
                  ) : (
                    <Button size="sm" variant="volt" className="w-full" disabled={!canBuy || pay.busy || !price} onClick={() => void buySkin(skinId, cosmetic.name)}>
                      {price ? `${formatUsdcAmount(price)} USDC` : price === 0n ? 'Not for sale' : '...'}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </Panel>

        <PayStatus step={pay.step} error={pay.error} hash={lastHash} />
        <p className="text-xs text-zinc-500">
          {IS_MAINNET ? 'Payments are sent in real USDC on Arc and cannot be reversed.' : 'Payments are sent on Arc Testnet in test USDC, which has no real value.'} Health you buy is tracked in this browser, so it is not tamper-proof until a game server exists.
        </p>
      </div>
    </Screen>
  )
}
