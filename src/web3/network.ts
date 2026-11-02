import { arc, arcTestnet } from 'viem/chains'

/**
 * Which Arc network the app talks to. Testnet unless `VITE_NETWORK=mainnet` is set.
 * Mainnet moves real USDC and every transaction is irreversible.
 */
export const IS_MAINNET = String(import.meta.env.VITE_NETWORK ?? '') === 'mainnet'

export type ArcChainId = typeof arc.id | typeof arcTestnet.id
export const ARC_VIEM_CHAIN = IS_MAINNET ? arc : arcTestnet
export const ARC_CHAIN_ID: ArcChainId = ARC_VIEM_CHAIN.id
export const NETWORK_LABEL = IS_MAINNET ? 'Arc' : 'Arc Testnet'

/** Appended to storage keys so testnet and mainnet progress never mix. Testnet keeps the original keys. */
export const NETWORK_STORAGE_SUFFIX = IS_MAINNET ? ':mainnet' : ''

/** Shop contract address for the active network, from `.env`. */
export const RAW_SHOP_ADDRESS = String((IS_MAINNET ? import.meta.env.VITE_SHOP_ADDRESS_MAINNET : import.meta.env.VITE_SHOP_ADDRESS) ?? '')
