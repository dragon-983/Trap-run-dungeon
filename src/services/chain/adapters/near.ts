import { MockWalletProvider } from './mockWallet'
import type { TransactionAdapter, TransactionReceipt, TransactionRequest } from '../types'

/**
 * NEAR adapter (mock). Replace the internals with a real NEAR wallet selector integration later;
 * the WalletProvider and TransactionAdapter contracts stay the same.
 */
export const createNearWalletMock = () =>
  new MockWalletProvider({ chain: 'near', displayName: 'NEAR', network: 'testnet', accountId: 'dev-mock.testnet' })

export const createNearTransactionMock = (): TransactionAdapter => ({
  chain: 'near',
  submit(request: TransactionRequest): Promise<TransactionReceipt> {
    return Promise.resolve({ chain: 'near', kind: request.kind, status: 'confirmed', reference: `mock-near-${request.kind}`, mock: true })
  },
})
