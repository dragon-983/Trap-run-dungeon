import { useCallback, useState } from 'react'
import { erc20Abi, parseEventLogs, type Hash, type Hex, type TransactionReceipt } from 'viem'
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from 'wagmi'
import { profileStore } from '@/progress/store'
import type { PaymentRecord } from '@/progress/profile'
import { IS_MAINNET, NETWORK_LABEL } from './network'
import { ARC_CHAIN_ID, SHOP_ABI, SHOP_ADDRESS, USDC_ADDRESS, parseOnchainError } from './shop'

export type PayStep = 'idle' | 'switching' | 'approving' | 'approval-confirming' | 'paying' | 'confirming' | 'done' | 'error'

export type ShopCall =
  | { fn: 'buyHealth'; packs: bigint }
  | { fn: 'buySkin'; skinId: bigint }
  | { fn: 'registerDungeon'; hash: Hex }
  | { fn: 'createChallenge'; hash: Hex }

export interface PurchaseRequest {
  kind: PaymentRecord['kind']
  label: string
  /** Total price in USDC base units. Also used as the contract's max-price guard. */
  price: bigint
  call: ShopCall
}

export interface PurchaseResult {
  hash: Hash
  receipt: TransactionReceipt
  challengeId: bigint | null
}

export const STEP_TEXT: Record<PayStep, string> = {
  idle: '',
  switching: `Switching to ${NETWORK_LABEL}`,
  approving: 'Approve USDC in your wallet',
  'approval-confirming': 'Waiting for the approval to confirm',
  paying: 'Confirm the payment in your wallet',
  confirming: 'Waiting for the payment to confirm',
  done: 'Payment confirmed',
  error: '',
}

/** Approve-then-pay flow against the shop contract. Every state shown comes from a real wallet or chain event. */
export function usePurchase() {
  const { address, chainId } = useAccount()
  const client = usePublicClient({ chainId: ARC_CHAIN_ID })
  const { switchChainAsync } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()
  const [step, setStep] = useState<PayStep>('idle')
  const [error, setError] = useState<string | null>(null)

  const reset = useCallback(() => {
    setStep('idle')
    setError(null)
  }, [])

  const run = useCallback(
    async (req: PurchaseRequest): Promise<PurchaseResult | null> => {
      setError(null)
      const shop = SHOP_ADDRESS
      try {
        if (!shop) throw new Error('The shop is not live yet.')
        if (!client) throw new Error(`No connection to ${NETWORK_LABEL}.`)
        if (!address) throw new Error('Connect your wallet first.')
        if (profileStore.address() !== address.toLowerCase()) throw new Error('Connect the wallet you signed in with, or sign in again.')

        if (chainId !== ARC_CHAIN_ID) {
          setStep('switching')
          await switchChainAsync({ chainId: ARC_CHAIN_ID })
        }

        const balance = await client.readContract({ address: USDC_ADDRESS, abi: erc20Abi, functionName: 'balanceOf', args: [address] })
        if (balance < req.price) throw new Error(IS_MAINNET ? 'Not enough USDC in your wallet.' : 'Not enough USDC in your wallet. Use Get test USDC in the sidebar.')

        const allowance = await client.readContract({ address: USDC_ADDRESS, abi: erc20Abi, functionName: 'allowance', args: [address, shop] })
        if (allowance < req.price) {
          setStep('approving')
          const approveHash = await writeContractAsync({ address: USDC_ADDRESS, abi: erc20Abi, functionName: 'approve', args: [shop, req.price], chainId: ARC_CHAIN_ID })
          setStep('approval-confirming')
          const approval = await client.waitForTransactionReceipt({ hash: approveHash })
          if (approval.status !== 'success') throw new Error('The USDC approval failed.')
        }

        setStep('paying')
        const base = { address: shop, abi: SHOP_ABI, chainId: ARC_CHAIN_ID } as const
        let hash: Hash
        switch (req.call.fn) {
          case 'buyHealth':
            hash = await writeContractAsync({ ...base, functionName: 'buyHealth', args: [req.call.packs, req.price] })
            break
          case 'buySkin':
            hash = await writeContractAsync({ ...base, functionName: 'buySkin', args: [req.call.skinId, req.price] })
            break
          case 'registerDungeon':
            hash = await writeContractAsync({ ...base, functionName: 'registerDungeon', args: [req.call.hash, req.price] })
            break
          case 'createChallenge':
            hash = await writeContractAsync({ ...base, functionName: 'createChallenge', args: [req.call.hash, req.price] })
            break
        }
        setStep('confirming')
        const receipt = await client.waitForTransactionReceipt({ hash })
        if (receipt.status !== 'success') throw new Error('The payment was rejected by the contract.')

        const logs = parseEventLogs({ abi: SHOP_ABI, logs: receipt.logs, eventName: 'ChallengeCreated' })
        const challengeId = logs[0]?.args.challengeId ?? null
        profileStore.recordPayment({ kind: req.kind, label: req.label, amount: req.price.toString(), txHash: hash, at: Date.now() })
        setStep('done')
        return { hash, receipt, challengeId }
      } catch (err) {
        const friendly = parseOnchainError(err)
        if (friendly === null) {
          setStep('idle')
          return null
        }
        const own = err instanceof Error && !('shortMessage' in err) ? err.message : null
        setError(own ?? friendly)
        setStep('error')
        return null
      }
    },
    [address, chainId, client, switchChainAsync, writeContractAsync],
  )

  return { step, error, run, reset, busy: step !== 'idle' && step !== 'done' && step !== 'error' }
}
