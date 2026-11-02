import { CheckCircle2, ExternalLink, Loader2 } from 'lucide-react'
import { STEP_TEXT, type PayStep } from '@/web3/usePurchase'
import { txUrl } from '@/web3/shop'
import { Notice } from './ui'

export function PayStatus({ step, error, hash }: { step: PayStep; error: string | null; hash?: string | null }) {
  if (step === 'idle') return null
  if (step === 'error') return <Notice tone="error">{error ?? 'Payment failed.'}</Notice>
  if (step === 'done') {
    return (
      <Notice tone="ok">
        <span className="flex flex-wrap items-center gap-2">
          <CheckCircle2 size={16} /> {STEP_TEXT.done}
          {hash && (
            <a href={txUrl(hash)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">
              View transaction <ExternalLink size={12} />
            </a>
          )}
        </span>
      </Notice>
    )
  }
  return (
    <Notice>
      <span className="flex items-center gap-2" role="status">
        <Loader2 size={16} className="animate-spin" /> {STEP_TEXT[step]}
      </span>
    </Notice>
  )
}
