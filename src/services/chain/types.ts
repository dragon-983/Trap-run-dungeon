/**
 * Blockchain abstraction layer. Gameplay code never imports from here and this layer never
 * imports gameplay internals: the two meet only through the plain data types below.
 *
 * NEAR and Stellar are separate chains with separate account formats. A NEAR account and a
 * Stellar account are NEVER assumed to be the same person; a game profile may link several
 * wallet identities, each proven by its own signed challenge.
 */

export type ChainId = 'arc' | 'near' | 'stellar'
export type NetworkKind = 'mainnet' | 'testnet'

/** A wallet account on one specific chain. */
export interface WalletIdentity {
  chain: ChainId
  network: NetworkKind
  /** Chain-native account id (NEAR account id, Stellar public key). Opaque to the game. */
  accountId: string
  /** True only after the account signed a challenge issued for this profile. */
  verified: boolean
  linkedAt: number
}

export interface WalletSession {
  identity: WalletIdentity
  /** Mock sessions are only produced by development adapters. */
  mock: boolean
}

export type WalletStatus = 'unavailable' | 'disconnected' | 'connecting' | 'connected'

/** Shared interface every chain adapter implements. */
export interface WalletProvider {
  readonly chain: ChainId
  readonly displayName: string
  readonly status: WalletStatus
  isAvailable(): boolean
  connect(): Promise<WalletSession>
  disconnect(): Promise<void>
  getSession(): WalletSession | null
  /** Sign an arbitrary challenge so the account can be linked to a profile. */
  signMessage(message: string): Promise<SignedMessage>
}

export interface SignedMessage {
  chain: ChainId
  accountId: string
  message: string
  signature: string
}

// ---- chain-independent player + ownership interfaces ----------------------------------

/** Chain-independent player profile. Wallet identities are optional, additive links. */
export interface PlayerProfile {
  id: string
  displayName: string
  createdAt: number
  wallets: WalletIdentity[]
}

export interface LinkChallenge {
  profileId: string
  chain: ChainId
  nonce: string
  message: string
  expiresAt: number
}

/** Securely links a wallet identity to a profile (challenge, signature, verification). */
export interface IdentityLinkService {
  createChallenge(profileId: string, chain: ChainId): Promise<LinkChallenge>
  verify(challenge: LinkChallenge, signed: SignedMessage): Promise<WalletIdentity>
  unlink(profileId: string, identity: WalletIdentity): Promise<void>
}

export type CosmeticKind = 'skin' | 'trail'

export interface CosmeticOwnership {
  cosmeticId: string
  kind: CosmeticKind
  profileId: string
  /** 'local' for earned-in-game unlocks; a chain id once an onchain record exists. */
  source: 'local' | ChainId
  acquiredAt: number
}

export interface CosmeticOwnershipService {
  listOwned(profileId: string): Promise<CosmeticOwnership[]>
  isOwned(profileId: string, cosmeticId: string): Promise<boolean>
}

export interface AchievementRecord {
  id: string
  profileId: string
  unlockedAt: number
  /** Future onchain anchors for this achievement. Empty until a chain adapter is wired. */
  anchors: Array<{ chain: ChainId; reference: string }>
}

export interface AchievementService {
  list(profileId: string): Promise<AchievementRecord[]>
  record(profileId: string, achievementId: string): Promise<AchievementRecord>
}

export interface DungeonAttributionRecord {
  dungeonId: string
  creatorProfileId: string
  publishedAt: number
  anchors: Array<{ chain: ChainId; reference: string }>
}

// ---- transactions ---------------------------------------------------------------------

export type TransactionKind = 'record-achievement' | 'record-dungeon' | 'claim-cosmetic'

export interface TransactionRequest {
  kind: TransactionKind
  chain: ChainId
  profileId: string
  payload: Record<string, string | number | boolean>
}

export interface TransactionReceipt {
  chain: ChainId
  kind: TransactionKind
  status: 'confirmed' | 'rejected'
  reference: string
  mock: boolean
}

/** Chain-specific submit logic behind the router. */
export interface TransactionAdapter {
  readonly chain: ChainId
  submit(request: TransactionRequest): Promise<TransactionReceipt>
}

/** Routes requests to the adapter for `request.chain`. */
export interface TransactionService {
  register(adapter: TransactionAdapter): void
  submit(request: TransactionRequest): Promise<TransactionReceipt>
  supportedChains(): ChainId[]
}
