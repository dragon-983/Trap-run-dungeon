import { MockWalletProvider } from './mockWallet'
import type { TransactionAdapter, TransactionReceipt, TransactionRequest } from '../types'

/**
 * Stellar adapter (mock). Independent of the NEAR adapter: different account format, different
 * signing flow, different transaction semantics. Swap the internals for a real integration later.
 */
export const createStellarWalletMock = () =>
  new MockWalletProvider({ chain: 'stellar', displayName: 'Stellar', network: 'testnet', accountId: 'DEV-MOCK-STELLAR' })

export const createStellarTransactionMock = (): TransactionAdapter => ({
  chain: 'stellar',
  submit(request: TransactionRequest): Promise<TransactionReceipt> {
    return Promise.resolve({ chain: 'stellar', kind: request.kind, status: 'confirmed', reference: `mock-stellar-${request.kind}`, mock: true })
  },
})
