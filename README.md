# TRAP//RUN

A dungeon-building and escape game for the browser. Build a 9x9 dungeon of traps, doors and switches, then race to escape dungeons made by the game, the daily challenge, or your friends.

Built with [Arc Studio](https://studio.arc.io)

## Features

- Practice: 12 handmade dungeons that get harder as you go.
- Daily Challenge: one dungeon per day for everyone, with a streak.
- Challenge a Friend: share a code or link that opens your dungeon (local demo leaderboard until a backend exists).
- Creator Mode: 30 second build clock, resource budget, test run, and a solver check so every published dungeon can be escaped.
- XP, levels, best times, achievements and unlockable cosmetics, all earned through play.
- Wallet sign-up and sign-in on Arc Testnet (guests can still play). Each run costs 1 health: 5 free per day, +2 for clearing the daily challenge, more from the shop.
- Shop: buy health packs and cosmetic skins with test USDC. Creators pay a small USDC fee to publish a dungeon and to create a friend challenge; friends play free.
- Keyboard, touch pad and swipe controls, sound effects, replays of your runs.

The game is fully playable with no wallet. NEAR and Stellar support is not implemented; `src/services/chain` holds interfaces and mock adapters for future integration.

## Tech stack

React, TypeScript, Vite, Tailwind CSS, wagmi and viem, canvas rendering, Web Audio, Solidity (Foundry) for the shop contract in `contracts/`.

## Development

Prerequisites: [Bun](https://bun.sh).

```bash
bun install
bun run dev      # start the dev server
bun run check    # lint and typecheck
bun scripts/verify-levels.ts   # solve every built-in level
```

### Environment variables

- `VITE_SHOP_ADDRESS`: address of the deployed `TrapRunShop` contract on Arc Testnet (public). Shop features are switched off while it is unset.
- `VITE_NETWORK`: set to `mainnet` to use Arc mainnet. Leave unset for testnet.
- `VITE_SHOP_ADDRESS_MAINNET`: address of the `TrapRunShop` contract on Arc mainnet (public). Only read when `VITE_NETWORK=mainnet`.

For mainnet, follow `docs/mainnet-launch.md`. You deploy and operate it yourself.
