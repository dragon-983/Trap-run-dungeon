import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { erc20Abi, type Address } from 'viem'
import { usePublicClient } from 'wagmi'
import { profileStore } from '@/progress/store'
import { ARC_CHAIN_ID, SHOP_ABI, SHOP_ADDRESS, SHOP_SKINS, USDC_ADDRESS } from './shop'

export interface ShopPrices {
  healthPack: bigint
  createFee: bigint
  challengeFee: bigint
  skins: Record<number, bigint>
}

export function useShopPrices() {
  const client = usePublicClient({ chainId: ARC_CHAIN_ID })
  return useQuery({
    queryKey: ['shop-prices', SHOP_ADDRESS],
    enabled: Boolean(client && SHOP_ADDRESS),
    staleTime: 15_000,
    queryFn: async (): Promise<ShopPrices> => {
      if (!client || !SHOP_ADDRESS) throw new Error('Shop is not configured')
      const read = <F extends 'healthPackPrice' | 'createFee' | 'challengeFee'>(functionName: F) => client.readContract({ address: SHOP_ADDRESS as Address, abi: SHOP_ABI, functionName })
      const [healthPack, createFee, challengeFee, skinList] = await Promise.all([
        read('healthPackPrice'),
        read('createFee'),
        read('challengeFee'),
        Promise.all(SHOP_SKINS.map((s) => client.readContract({ address: SHOP_ADDRESS as Address, abi: SHOP_ABI, functionName: 'skinPrice', args: [BigInt(s.skinId)] }))),
      ])
      const skins: Record<number, bigint> = {}
      SHOP_SKINS.forEach((s, i) => (skins[s.skinId] = skinList[i]))
      return { healthPack, createFee, challengeFee, skins }
    },
  })
}

export interface AccountChainData {
  usdc: bigint
  healthPurchased: bigint
  ownedSkins: number[]
}

/** Reads a player's USDC balance, lifetime purchased health and owned skins. Works without a connected wallet. */
export function useAccountChainData(address: string | null) {
  const client = usePublicClient({ chainId: ARC_CHAIN_ID })
  return useQuery({
    queryKey: ['account-chain', address, SHOP_ADDRESS],
    enabled: Boolean(client && address),
    refetchInterval: 20_000,
    queryFn: async (): Promise<AccountChainData> => {
      if (!client || !address) throw new Error('No account')
      const who = address as Address
      const usdcBalance = client.readContract({ address: USDC_ADDRESS, abi: erc20Abi, functionName: 'balanceOf', args: [who] })
      if (!SHOP_ADDRESS) return { usdc: await usdcBalance, healthPurchased: 0n, ownedSkins: [] }
      const shop = SHOP_ADDRESS
      const [usdc, healthPurchased, owned] = await Promise.all([
        usdcBalance,
        client.readContract({ address: shop, abi: SHOP_ABI, functionName: 'healthPurchased', args: [who] }),
        Promise.all(SHOP_SKINS.map((s) => client.readContract({ address: shop, abi: SHOP_ABI, functionName: 'skinOwned', args: [who, BigInt(s.skinId)] }))),
      ])
      return { usdc, healthPurchased, ownedSkins: SHOP_SKINS.filter((_, i) => owned[i]).map((s) => s.skinId) }
    },
  })
}

/** Mirrors onchain purchases (health credits, skins) into the local profile. Mounted once at the app root. */
export function ChainSync({ address }: { address: string | null }) {
  const { data } = useAccountChainData(address)
  useEffect(() => {
    if (!data || !address || profileStore.address() !== address.toLowerCase()) return
    profileStore.syncPurchasedHealth(Number(data.healthPurchased))
    profileStore.setOwnedSkins(data.ownedSkins)
  }, [data, address])
  return null
}
