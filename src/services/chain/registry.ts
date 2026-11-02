import type {
  ChainId,
  IdentityLinkService,
  LinkChallenge,
  SignedMessage,
  TransactionAdapter,
  TransactionReceipt,
  TransactionRequest,
  TransactionService,
  WalletIdentity,
  WalletProvider,
} from './types'

/** Holds one wallet provider per chain. The game asks the registry, never an SDK. */
export class WalletRegistry {
  private providers = new Map<ChainId, WalletProvider>()

  register(provider: WalletProvider): void {
    this.providers.set(provider.chain, provider)
  }

  get(chain: ChainId): WalletProvider | undefined {
    return this.providers.get(chain)
  }

  list(): WalletProvider[] {
    return [...this.providers.values()]
  }

  connectedIdentities(): WalletIdentity[] {
    return this.list()
      .map((p) => p.getSession()?.identity)
      .filter((i): i is WalletIdentity => Boolean(i))
  }
}

/** Routes transaction requests to the adapter of the requested chain. */
export class RoutingTransactionService implements TransactionService {
  private adapters = new Map<ChainId, TransactionAdapter>()

  register(adapter: TransactionAdapter): void {
    this.adapters.set(adapter.chain, adapter)
  }

  supportedChains(): ChainId[] {
    return [...this.adapters.keys()]
  }

  submit(request: TransactionRequest): Promise<TransactionReceipt> {
    const adapter = this.adapters.get(request.chain)
    if (!adapter) return Promise.reject(new Error(`No transaction adapter registered for ${request.chain}`))
    return adapter.submit(request)
  }
}

/** Development link service. A real one verifies the chain-specific signature server-side. */
export class MockIdentityLinkService implements IdentityLinkService {
  createChallenge(profileId: string, chain: ChainId): Promise<LinkChallenge> {
    const nonce = crypto.randomUUID()
    return Promise.resolve({
      profileId,
      chain,
      nonce,
      message: `Link ${chain} account to TRAP//RUN profile ${profileId}. Nonce ${nonce}`,
      expiresAt: Date.now() + 5 * 60_000,
    })
  }

  verify(challenge: LinkChallenge, signed: SignedMessage): Promise<WalletIdentity> {
    if (Date.now() > challenge.expiresAt) return Promise.reject(new Error('Challenge expired'))
    if (signed.chain !== challenge.chain || signed.message !== challenge.message) return Promise.reject(new Error('Signature does not match challenge'))
    return Promise.resolve({ chain: signed.chain, network: 'testnet', accountId: signed.accountId, verified: true, linkedAt: Date.now() })
  }

  unlink(): Promise<void> {
    /* nothing persisted in the mock */
    return Promise.resolve()
  }
}
