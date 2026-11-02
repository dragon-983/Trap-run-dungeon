import { AlertTriangle, Heart, Loader2, LogIn, LogOut, Wallet } from 'lucide-react'
import { useNav } from '@/app/nav'
import { useAuth } from '@/auth/useAuth'
import { rollDay, totalHealth, FREE_HEALTH_PER_DAY } from '@/progress/health'
import { useProfile } from '@/progress/store'
import { Button, Notice, Panel } from './ui'

export const shortAddress = (a: string): string => `${a.slice(0, 6)}...${a.slice(-4)}`

/** Compact health indicator. Opens the shop. */
export function HealthPill({ onClick }: { onClick?: () => void }) {
  const p = useProfile()
  const h = rollDay(p.health)
  const total = totalHealth(h)
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      title={`${h.free} free today, ${h.bonus} earned, ${h.paid} purchased`}
      className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3 font-pixel text-sm ${total > 0 ? 'border-blood-500/40 bg-blood-500/10 text-blood-400' : 'border-ink-500 bg-ink-800 text-zinc-500'}`}
    >
      <Heart size={16} className={total > 0 ? 'fill-blood-500' : ''} />
      <span className="tabular">{total}</span>
    </Tag>
  )
}

export function AccountChip() {
  const { go } = useNav()
  const auth = useAuth()
  const p = useProfile()
  if (!auth.signedInAddress) {
    return (
      <Button size="sm" variant="volt" onClick={auth.signIn} disabled={auth.phase === 'signing'}>
        {auth.phase === 'signing' ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />} Sign in
      </Button>
    )
  }
  return (
    <button onClick={() => go({ name: 'profile' })} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-ink-500 bg-ink-800/80 px-3 text-sm transition hover:border-volt-400">
      <Wallet size={14} className="text-acid-500" />
      <span className="font-semibold">{p.displayName}</span>
      <span className="tabular hidden text-xs text-zinc-500 sm:inline">{shortAddress(auth.signedInAddress)}</span>
    </button>
  )
}

/** Explains sign up / sign in and runs it. */
export function AuthCard({ reason }: { reason?: string }) {
  const auth = useAuth()
  if (auth.signedInAddress) return null
  return (
    <Panel className="flex flex-col gap-3">
      <div>
        <div className="font-display text-lg font-bold">Sign in with your wallet</div>
        <p className="mt-1 text-sm text-zinc-400">
          {reason ?? 'Your wallet is your account.'} New wallets create a profile automatically; returning wallets pick up where they left off. Signing is free and sends no transaction. You can keep playing as a guest.
        </p>
      </div>
      {auth.error && <Notice tone="error">{auth.error}</Notice>}
      <Button variant="volt" size="lg" onClick={auth.signIn} disabled={auth.phase === 'signing'}>
        {auth.phase === 'signing' ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Confirm in your wallet
          </>
        ) : (
          <>
            <Wallet size={16} /> {auth.connected ? (auth.isNewWallet ? 'Sign up' : 'Sign in') : 'Connect wallet'}
          </>
        )}
      </Button>
    </Panel>
  )
}

export function SignedInDetails() {
  const auth = useAuth()
  const p = useProfile()
  if (!auth.signedInAddress) return null
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-zinc-400">Arc account</span>
        <span className="tabular font-mono text-xs">{shortAddress(auth.signedInAddress)}</span>
      </div>
      {auth.walletMismatch && (
        <Notice tone="error">
          <span className="flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" /> Your connected wallet is not the one you signed in with. Switch back to {shortAddress(auth.signedInAddress)} to make payments.
          </span>
        </Notice>
      )}
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>Free health: {FREE_HEALTH_PER_DAY} per day</span>
        <Button size="sm" onClick={auth.signOut}>
          <LogOut size={14} /> Sign out
        </Button>
      </div>
      <span className="sr-only">{p.displayName}</span>
    </div>
  )
}
