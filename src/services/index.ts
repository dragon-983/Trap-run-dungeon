import { profileStore } from '@/progress/store'
import { createNearTransactionMock, createNearWalletMock } from './chain/adapters/near'
import { createStellarTransactionMock, createStellarWalletMock } from './chain/adapters/stellar'
import { MockIdentityLinkService, RoutingTransactionService, WalletRegistry } from './chain/registry'
import type {
  AchievementRecord,
  AchievementService,
  CosmeticOwnership,
  CosmeticOwnershipService,
  PlayerProfile,
} from './chain/types'
import { COSMETICS } from '@/progress/cosmetics'

/**
 * Local implementations of the chain-independent services. They read the same profile store the
 * game writes to, so swapping in an onchain-backed implementation later changes nothing in gameplay.
 */
class LocalCosmeticOwnership implements CosmeticOwnershipService {
  listOwned(profileId: string): Promise<CosmeticOwnership[]> {
    const p = profileStore.get()
    if (p.id !== profileId) return Promise.resolve([])
    const owned = COSMETICS.filter((c) => p.unlocked.includes(c.id)).map((c) => ({
      cosmeticId: c.id,
      kind: c.kind,
      profileId,
      source: 'local' as const,
      acquiredAt: p.createdAt,
    }))
    return Promise.resolve(owned)
  }
  isOwned(profileId: string, cosmeticId: string): Promise<boolean> {
    const p = profileStore.get()
    return Promise.resolve(p.id === profileId && p.unlocked.includes(cosmeticId))
  }
}

class LocalAchievements implements AchievementService {
  list(profileId: string): Promise<AchievementRecord[]> {
    const p = profileStore.get()
    return Promise.resolve(p.id === profileId ? p.achievements : [])
  }
  record(profileId: string, achievementId: string): Promise<AchievementRecord> {
    const existing = profileStore.get().achievements.find((a) => a.id === achievementId)
    return Promise.resolve(existing ?? { id: achievementId, profileId, unlockedAt: Date.now(), anchors: [] })
  }
}

const wallets = new WalletRegistry()
wallets.register(createNearWalletMock())
wallets.register(createStellarWalletMock())

const transactions = new RoutingTransactionService()
transactions.register(createNearTransactionMock())
transactions.register(createStellarTransactionMock())

export const services = {
  wallets,
  transactions,
  identityLink: new MockIdentityLinkService(),
  cosmetics: new LocalCosmeticOwnership(),
  achievements: new LocalAchievements(),
}

/** Chain-independent view of the local player. Wallet identities are optional additions. */
export function currentPlayer(): PlayerProfile {
  const p = profileStore.get()
  return { id: p.id, displayName: p.displayName, createdAt: p.createdAt, wallets: p.wallets }
}
