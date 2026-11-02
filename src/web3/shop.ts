import { isAddress, keccak256, parseAbi, stringToHex, type Address, type Hex } from 'viem'
import { layoutKey } from '@/game/codec'
import type { Layout } from '@/game/codec'
import { buildTxExplorerUrl, getUsdc, requireChain } from '@/onchain-facts'
import { COSMETICS } from '@/progress/cosmetics'
import { ARC_CHAIN_ID, IS_MAINNET, NETWORK_LABEL, RAW_SHOP_ADDRESS } from './network'

export { ARC_CHAIN_ID }
export const ARC_CHAIN = requireChain(ARC_CHAIN_ID)

const usdc = getUsdc(ARC_CHAIN_ID)
if (!usdc) throw new Error(`USDC is not registered for ${NETWORK_LABEL}`)
export const USDC_ADDRESS = usdc.address as Address
export const USDC_DECIMALS = usdc.decimals

/** Null until the shop contract is deployed and its address is set in `.env`. */
export const SHOP_ADDRESS: Address | null = isAddress(RAW_SHOP_ADDRESS) ? RAW_SHOP_ADDRESS : null

export const SHOP_ABI = parseAbi([
  'function buyHealth(uint256 packs, uint256 maxTotalPrice)',
  'function buySkin(uint256 skinId, uint256 maxPrice)',
  'function registerDungeon(bytes32 dungeonHash, uint256 maxFee)',
  'function createChallenge(bytes32 dungeonHash, uint256 maxFee) returns (uint256)',
  'function healthPackPrice() view returns (uint256)',
  'function createFee() view returns (uint256)',
  'function challengeFee() view returns (uint256)',
  'function skinPrice(uint256 skinId) view returns (uint256)',
  'function healthPurchased(address buyer) view returns (uint256)',
  'function skinOwned(address buyer, uint256 skinId) view returns (bool)',
  'function dungeonRegistered(address creator, bytes32 dungeonHash) view returns (bool)',
  'function challengeCreator(uint256 challengeId) view returns (address)',
  'function challengeDungeon(uint256 challengeId) view returns (bytes32)',
  'event ChallengeCreated(address indexed creator, bytes32 indexed dungeonHash, uint256 indexed challengeId, uint256 paid)',
])

/** Shop skins, keyed by the contract's skin id. */
export const SHOP_SKINS = COSMETICS.flatMap((c) => (c.rule.kind === 'shop' ? [{ skinId: c.rule.skinId, cosmetic: c }] : []))

/** Identifier the shop contract records for a dungeon layout. */
export const dungeonHashOf = (layout: Layout): Hex => keccak256(stringToHex(layoutKey(layout)))

export const txUrl = (hash: string): string => buildTxExplorerUrl(ARC_CHAIN_ID, hash)

export function formatUsdcAmount(raw: bigint): string {
  const whole = raw / 10n ** BigInt(USDC_DECIMALS)
  const frac = (raw % 10n ** BigInt(USDC_DECIMALS)).toString().padStart(USDC_DECIMALS, '0').slice(0, 2)
  return `${whole}.${frac}`
}

export function parseOnchainError(error: unknown): string | null {
  const e = error as { code?: number; message?: string; shortMessage?: string } | null
  const message = `${e?.shortMessage ?? ''} ${e?.message ?? ''}`.toLowerCase()
  if (e?.code === 4001 || message.includes('user rejected') || message.includes('user denied')) return null
  if (message.includes('insufficient funds') || message.includes('exceeds balance')) return IS_MAINNET ? 'Not enough USDC in your wallet.' : 'Not enough USDC in your wallet. Use Get test USDC in the sidebar.'
  if (message.includes('pricetoohigh')) return 'The price changed. Refresh and try again.'
  if (message.includes('skinalreadyowned')) return 'You already own this skin.'
  if (message.includes('dungeonalreadyregistered')) return 'You already paid to register this dungeon.'
  if (message.includes('reverted')) return 'The transaction was rejected by the contract.'
  if (message.includes('network') || message.includes('timeout') || message.includes('fetch')) return 'Network issue. Check your connection and retry.'
  return 'Something went wrong. Please try again.'
}
