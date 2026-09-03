#!/usr/bin/env node
// Live lock -> resolve -> claim cycle against REAL Somnia testnet + a REAL
// funded wallet. Never run in CI or by a cold clone — see the `live:` name
// prefix convention in CLAUDE.md. Mirrors the exact SDK calls
// frontend/src/lib/exchange.ts makes (createOrder, client.getMarket, redeem,
// trader.faucet) so a successful run is real evidence the app's trading path
// works end to end, not just that this script's own logic works.
//
// Usage:
//   node scripts/live-cycle.mjs faucet
//   node scripts/live-cycle.mjs lock [--pair=BTC] [--length=15m] [--amount=5] [--side=green]
//   node scripts/live-cycle.mjs claim
//
// Reads the wallet from ../../.testnet-wallet (gitignored — generate with a
// throwaway viem keypair, see docs/LIMITATIONS.md). Persists the pending
// lock's state to ../../.testnet-wallet-state.json (also gitignored) so
// `lock` and `claim` can run as two separate invocations, since a window
// can take minutes to resolve.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { SomniaMarkets, SOMNIA_TESTNET_ADDRESSES, InvalidInputError } from '@somnia-chain/markets-sdk';
import { somniaShannon } from '@somnia-chain/markets-sdk/chains';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const WALLET_FILE = join(REPO_ROOT, '.testnet-wallet');
const STATE_FILE = join(REPO_ROOT, '.testnet-wallet-state.json');
const INDEXER_URL = process.env.NEXT_PUBLIC_DREAMDEX_INDEXER_URL || 'https://dev.smk.somnia.host/v1/graphql';
const OUTCOME_LABEL = { green: 'YES', red: 'NO' };

function loadWalletFile() {
  if (!existsSync(WALLET_FILE)) {
    throw new Error(`No wallet file at ${WALLET_FILE}. Generate a throwaway testnet keypair first.`);
  }
  return JSON.parse(readFileSync(WALLET_FILE, 'utf8'));
}

async function buildExchange() {
  const { privateKey, address } = loadWalletFile();
  const account = privateKeyToAccount(privateKey);
  const walletClient = createWalletClient({ account, chain: somniaShannon, transport: http() });
  const exchange = new SomniaMarkets({ chain: somniaShannon, indexerUrl: INDEXER_URL, addresses: SOMNIA_TESTNET_ADDRESSES });
  exchange.setSigner({ walletClient });
  return { exchange, address };
}

async function doFaucet() {
  const { exchange, address } = await buildExchange();
  console.log('Wallet:', address);
  console.log('Requesting testnet collateral faucet...');
  const res = await exchange.trader.faucet({});
  console.log('Faucet tx:', res.hash);
}

async function doLock({ pair, length, amount, side }) {
  const { exchange, address } = await buildExchange();
  console.log('Wallet:', address);

  await exchange.loadMarkets();
  const candidates = Object.values(exchange.markets).filter(
    (m) => m.type === 'binary' && m.info?.asset === pair && m.info?.interval === length
  );
  if (candidates.length === 0) {
    throw new Error(`No live ${pair} ${length} market right now — try a different --pair/--length.`);
  }
  const market = candidates[0];
  console.log('Found live market:', market.id, market.symbol);

  const label = OUTCOME_LABEL[side];
  const outcome = market.outcomes?.find((o) => o.label === label);
  if (!outcome) throw new Error(`${market.symbol} has no ${label} outcome`);

  console.log(`Locking ${amount} on ${side.toUpperCase()} (${outcome.symbol})...`);

  let order;
  try {
    order = await exchange.createOrder(outcome.symbol, 'market', 'buy', amount, undefined, { slippage: 0.03 });
  } catch (err) {
    if (err instanceof InvalidInputError) {
      console.error('Order failed — likely a thin/empty testnet order book (expected sometimes, not a bug):', err.message);
      console.error('Try a different --pair/--length, or a window with recent trade volume.');
      process.exit(1);
    }
    throw err;
  }

  console.log('LOCKED:', { txHash: order.txHash, filled: order.filled, price: order.price });

  const expiry = Number(market.info?.expiry);
  const hidePriceUntil = Number.isFinite(expiry) && expiry > 0 ? expiry * 1000 : Date.now() + 15 * 60 * 1000;

  writeFileSync(
    STATE_FILE,
    JSON.stringify({ marketId: market.id, side, amount: order.filled, lockedAt: Date.now(), hidePriceUntil }, null, 2)
  );
  console.log('Saved state to', STATE_FILE);
  console.log('Window resolves at', new Date(hidePriceUntil).toISOString());
  console.log('Run `pnpm live:claim` after that time to check resolution and claim.');
}

async function doClaim() {
  if (!existsSync(STATE_FILE)) {
    throw new Error(`No pending lock state at ${STATE_FILE} — run \`pnpm live:lock\` first.`);
  }
  const state = JSON.parse(readFileSync(STATE_FILE, 'utf8'));
  const { exchange, address } = await buildExchange();
  console.log('Wallet:', address);
  console.log('Checking resolution for market', state.marketId, '...');

  const market = await exchange.client.getMarket(state.marketId);
  if (!market || market.marketType !== 'BINARY') {
    throw new Error('Could not read market resolution from indexer.');
  }
  if (market.winningOutcome == null && !market.voided) {
    console.log('Not resolved on-chain yet. The window closing does not mean the oracle has settled it — try again shortly.');
    return;
  }

  const winningSide = market.voided ? null : market.winningOutcome === 0 ? 'green' : 'red';
  console.log('Resolved. Voided:', market.voided, '| Winning side:', winningSide ?? 'n/a');

  if (!market.voided && winningSide !== state.side) {
    console.log(`Your side (${state.side}) lost this window. Nothing to claim — that's correct, not a bug.`);
    return;
  }

  console.log(`Claiming ${state.amount}...`);
  await exchange.loadMarkets();
  const res = await exchange.redeem(state.marketId, state.amount);
  console.log('CLAIMED:', res.hash);
}

const [, , cmd, ...rest] = process.argv;
const getArg = (name, fallback) => rest.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] || fallback;

try {
  if (cmd === 'faucet') {
    await doFaucet();
  } else if (cmd === 'lock') {
    await doLock({
      pair: getArg('pair', 'BTC'),
      length: getArg('length', '15m'),
      amount: Number(getArg('amount', '5')),
      side: getArg('side', 'green'),
    });
  } else if (cmd === 'claim') {
    await doClaim();
  } else {
    console.error('Usage: node scripts/live-cycle.mjs <faucet|lock|claim> [--pair=BTC] [--length=15m] [--amount=5] [--side=green]');
    process.exit(1);
  }
} catch (err) {
  console.error('FAILED:', err instanceof Error ? err.message : err);
  process.exit(1);
}
