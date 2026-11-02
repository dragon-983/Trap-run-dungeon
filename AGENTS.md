# TRAP//RUN

> Built with Arc Studio - money-powered apps in minutes

This is the **project memory** - what Arc Studio remembers about building this app. It helps future agents (or humans) understand and extend the project.

---

## What This App Does

Dungeon-building and escape game. Hazards advance one step per player turn, so every dungeon is solvable by search and runs are replayable. No blockchain is integrated; `src/services/chain` holds wallet/transaction/ownership interfaces with NEAR and Stellar mock adapters.

## Tech Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS
- Web3: wagmi v2, viem v2, ConnectKit
- Contracts: Solidity 0.8.28 + Foundry. Sources in `contracts/`, unit tests in `contracts/test/*.t.sol`. Build with `bun run contracts:build` (`forge build`), test with `bun run contracts:test` (`forge test`).
- Wallet: injected (MetaMask, etc.)
- Chain: Arc Testnet (Chain ID: 5042002, imported from `viem/chains`)
- Token: USDC (6 decimals) (Address: 0x3600000000000000000000000000000000000000, Chain: Arc Testnet)
- Toasts: Sonner

## Key Files

- `src/game/` - pure rules (engine, solver, validator, codec, levels, daily generator, run controller)
- `src/render/` - canvas renderer
- `src/progress/` - profile store (localStorage), XP, cosmetics, achievements
- `src/services/chain/` - multi-chain abstraction (mock only)
- `src/screens/` - one file per screen
- `src/App.tsx` - route switch
- `src/components/` - UI components
- `src/config.ts` - wagmi config (chains, connectors, transports)

## Share links

- Starter apps already ship `getShareBase`, `buildShareLink` and `installShareSync` in `src/lib/share.ts`; import them instead of rewriting them.
- Keep shareable state in the URL path or query, not in the `#fragment`.
- Never put a secret (private key, claim secret, seed phrase, session token, API key) in the URL path or query, encoded or not: every in-app path and query is mirrored to the visitor's studio.arc.io address bar and browser history and reaches servers. A bearer claim secret goes only in the `#fragment` appended to the share link (`` `${await buildShareLink('/claim')}#${secret}` ``) and is read from `location.hash` on load. A link to the app's own share URL shown inside the app must be copy-only or open in a new tab with `target="_blank" rel="noopener noreferrer"`.
- Build every link a user copies or sends with `buildShareLink()` from `src/lib/share.ts`.
- Keep the `installShareSync()` call in `src/main.tsx` when editing it; it keeps the Studio address bar in step with in-app navigation.
- Navigate inside the app with relative links.

## To Run

```bash
bun install
bun run dev
```

## Deployed contracts

- TrapRunShop (Arc Testnet): 0x4c6bb6e388eb48e420e331ac241626ad145cbc9d. Owner and treasury: 0xC8e6049A3Edb583cac5C8D90047f14C32fFcE716. USDC: 0x3600000000000000000000000000000000000000. Address is read by the app from `VITE_SHOP_ADDRESS` in `.env`.

- TrapRunShop (Arc mainnet, deployed by the user outside Arc Studio, unverified by Arc Studio): 0x859B7e8E31996b7559774A0662a78C1D81D418E1, tx 0x99867cc06bcd7eac166abcc9afd713f4e5977ea3ac38501b46cfa4dce1eaac2d. The app reads it from `VITE_SHOP_ADDRESS_MAINNET` when `VITE_NETWORK=mainnet`; the sandbox preview stays on testnet.
