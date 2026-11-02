import type { ChainId, NetworkKind, SignedMessage, WalletProvider, WalletSession, WalletStatus } from '../types'

export interface MockWalletConfig {
  chain: ChainId
  displayName: string
  network: NetworkKind
  /** Clearly fake account id so a mock can never be mistaken for a real account. */
  accountId: string
}

/** Development-only wallet. No SDK, no network, no keys. */
export class MockWalletProvider implements WalletProvider {
  readonly chain: ChainId
  readonly displayName: string
  private session: WalletSession | null = null
  private current: WalletStatus = 'disconnected'

  constructor(private readonly config: MockWalletConfig) {
    this.chain = config.chain
    this.displayName = config.displayName
  }

  get status(): WalletStatus {
    return this.current
  }

  isAvailable(): boolean {
    return true
  }

  connect(): Promise<WalletSession> {
    this.current = 'connecting'
    this.session = {
      mock: true,
      identity: {
        chain: this.config.chain,
        network: this.config.network,
        accountId: this.config.accountId,
        verified: false,
        linkedAt: Date.now(),
      },
    }
    this.current = 'connected'
    return Promise.resolve(this.session)
  }

  disconnect(): Promise<void> {
    this.session = null
    this.current = 'disconnected'
    return Promise.resolve()
  }

  getSession(): WalletSession | null {
    return this.session
  }

  signMessage(message: string): Promise<SignedMessage> {
    if (!this.session) return Promise.reject(new Error(`${this.displayName} is not connected`))
    return Promise.resolve({
      chain: this.chain,
      accountId: this.session.identity.accountId,
      message,
      signature: `mock-signature:${this.chain}:${message.length}`,
    })
  }
}
