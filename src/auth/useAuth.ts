import { useCallback, useEffect, useRef, useState } from 'react'
import { useModal } from 'connectkit'
import { toast } from 'sonner'
import { useAccount, useDisconnect, usePublicClient, useSignMessage, useSwitchChain } from 'wagmi'
import { profileStore, useProfile } from '@/progress/store'
import { ARC_CHAIN, ARC_CHAIN_ID } from '@/web3/shop'
import { buildSignInMessage, clearSession, writeSession } from './session'

export type AuthPhase = 'idle' | 'signing' | 'error'

/** Wallet sign-up and sign-in. A new wallet creates a profile; a known wallet loads its profile. */
export function useAuth() {
  const profile = useProfile()
  const account = useAccount()
  const { setOpen } = useModal()
  const { signMessageAsync } = useSignMessage()
  const { switchChainAsync } = useSwitchChain()
  const { disconnect } = useDisconnect()
  const client = usePublicClient({ chainId: ARC_CHAIN_ID })
  const [phase, setPhase] = useState<AuthPhase>('idle')
  const [error, setError] = useState<string | null>(null)
  const wantSignIn = useRef(false)

  const signedInAddress = profile.wallets.find((w) => w.chain === 'arc' && w.verified)?.accountId ?? null
  const connected = account.isConnected && account.address ? account.address : null
  const walletMismatch = Boolean(signedInAddress && connected && connected.toLowerCase() !== signedInAddress.toLowerCase())

  const complete = useCallback(
    async (address: `0x${string}`) => {
      setError(null)
      try {
        if (account.chainId !== ARC_CHAIN_ID) await switchChainAsync({ chainId: ARC_CHAIN_ID })
        setPhase('signing')
        const isNew = !profileStore.hasAccount(address)
        const { message, issuedAt, expiresAt } = buildSignInMessage(address, ARC_CHAIN.name, ARC_CHAIN_ID)
        const signature = await signMessageAsync({ message })
        if (client) {
          const ok = await client.verifyMessage({ address, message, signature })
          if (!ok) throw new Error('The signature could not be verified.')
        }
        writeSession({ address, message, signature, issuedAt, expiresAt })
        profileStore.switchTo(address)
        toast.success(isNew ? 'Account created. Welcome to TRAP//RUN.' : 'Signed in.')
        setPhase('idle')
      } catch (err) {
        const e = err as { code?: number; message?: string; shortMessage?: string }
        const rejected = e.code === 4001 || /user rejected|user denied/i.test(`${e.shortMessage ?? ''} ${e.message ?? ''}`)
        setPhase(rejected ? 'idle' : 'error')
        if (!rejected) setError(err instanceof Error ? err.message : 'Sign-in failed.')
      }
    },
    [account.chainId, client, signMessageAsync, switchChainAsync],
  )

  // After the wallet modal connects, finish signing in.
  useEffect(() => {
    if (wantSignIn.current && connected) {
      wantSignIn.current = false
      void complete(connected)
    }
  }, [connected, complete])

  const signIn = useCallback(() => {
    setError(null)
    if (connected) {
      void complete(connected)
      return
    }
    wantSignIn.current = true
    setOpen(true)
  }, [connected, complete, setOpen])

  const signOut = useCallback(() => {
    clearSession()
    profileStore.switchTo(null)
    disconnect()
    setPhase('idle')
  }, [disconnect])

  return { signedInAddress, connected, walletMismatch, phase: signedInAddress ? 'idle' : phase, error, signIn, signOut, isNewWallet: connected ? !profileStore.hasAccount(connected) : true }
}
