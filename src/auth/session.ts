/** Wallet sign-in session. Holds only public data: the address and the signed proof. */

import { NETWORK_STORAGE_SUFFIX } from '@/web3/network'

const KEY = `trap-run:session:v1${NETWORK_STORAGE_SUFFIX}`
const TTL_MS = 7 * 24 * 60 * 60 * 1000

export interface Session {
  address: string
  message: string
  signature: string
  issuedAt: number
  expiresAt: number
}

export function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as Partial<Session>
    if (typeof s.address !== 'string' || typeof s.signature !== 'string' || typeof s.expiresAt !== 'number') return null
    if (s.expiresAt < Date.now()) return null
    return s as Session
  } catch {
    return null
  }
}

export function writeSession(s: Session): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* storage unavailable: sign-in lasts for this tab only */
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

export function buildSignInMessage(address: string, chainName: string, chainId: number, now = Date.now()): { message: string; issuedAt: number; expiresAt: number } {
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, '0')).join('')
  const expiresAt = now + TTL_MS
  const message = [
    'TRAP//RUN wants you to sign in with your wallet.',
    '',
    `Account: ${address}`,
    `Network: ${chainName} (${chainId})`,
    `Nonce: ${nonce}`,
    `Issued: ${new Date(now).toISOString()}`,
    `Expires: ${new Date(expiresAt).toISOString()}`,
    '',
    'Signing costs nothing and sends no transaction.',
  ].join('\n')
  return { message, issuedAt: now, expiresAt }
}
