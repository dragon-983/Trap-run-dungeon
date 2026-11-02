# TRAP//RUN: Arc mainnet launch guide

Arc Studio does not deploy to or transact on mainnet. You run every step below yourself, from your own wallet, outside Arc Studio. Mainnet moves real USDC and every transaction is irreversible. Review all of this independently before you continue.

## 1. Before you start

- [ ] Get an independent professional audit of `contracts/TrapRunShop.sol`. It has only had an automated review, one fix round, and a static-analysis pass. There are no unit tests yet.
- [ ] Decide the prices. Defaults are set in the constructor: health pack 0.50 USDC, dungeon fee 0.25 USDC, challenge fee 0.10 USDC, skins 1, 1, 2 and 3 USDC. The owner can change them after launch.
- [ ] Confirm the owner and payout address: `0xC8e6049A3Edb583cac5C8D90047f14C32fFcE716` (the same address is used for both). Payments are sent straight to it, and it can change prices and the payout address. Use a hardware wallet or a multisig for a real launch. Ownership moves in two steps and cannot be renounced.
- [ ] Understand the limits: purchased health is tracked in the browser, so clearing browser data can restore it. Treat the health system as honour-based until a game server exists.
- [ ] Fund the deploying wallet with a little mainnet USDC. On Arc, USDC pays network fees.

## 2. Deploy the contract yourself

Download the project (Code panel, Download Code), then in the project folder:

```bash
bun install
forge build
export PRIVATE_KEY=...        # your deployer key. Never paste it into chat or commit it.
forge create contracts/TrapRunShop.sol:TrapRunShop \
  --rpc-url https://rpc.mainnet.arc.io \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --constructor-args \
    0x3600000000000000000000000000000000000000 \
    0xC8e6049A3Edb583cac5C8D90047f14C32fFcE716 \
    0xC8e6049A3Edb583cac5C8D90047f14C32fFcE716
```

Constructor arguments, in order: the USDC token, the owner, the payout address. The USDC address above is the Arc USDC predeploy. Check it against the Arc docs before you deploy.

Prefer an encrypted keystore (`cast wallet import`) over `--private-key` for anything beyond a quick test.

## 3. Verify what you deployed

- [ ] Open the new address on https://explorer.arc.io and confirm the creation transaction succeeded.
- [ ] Read `owner()` and `treasury()` and confirm both are your address.
- [ ] Read `usdc()` and confirm it is the USDC address above.
- [ ] Read `healthPackPrice()`, `createFee()`, `challengeFee()` and `skinPrice(1..4)` and confirm the prices.
- [ ] Make one small purchase with a second wallet and confirm the USDC reaches your payout address.

## 4. Point the app at mainnet

Set these where you host the app (or in `.env` for a local build), then rebuild:

```
VITE_NETWORK=mainnet
VITE_SHOP_ADDRESS_MAINNET=<the address from step 2>
```

With `VITE_NETWORK=mainnet` the app uses Arc (chain 5042), the mainnet shop address, and separate saved profiles, so testnet progress never mixes with mainnet purchases. Leave `VITE_NETWORK` unset to stay on testnet.

## 5. After launch

- [ ] Keep the testnet build running as a staging copy.
- [ ] Watch the shop's `HealthPurchased`, `SkinPurchased`, `DungeonRegistered` and `ChallengeCreated` events.
- [ ] Plan a game server that tracks health, so purchases cannot be reset from the browser.
