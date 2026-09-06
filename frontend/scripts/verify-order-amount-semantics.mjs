#!/usr/bin/env node
// Read-only-except-one-real-order diagnostic against REAL Somnia testnet + a
// REAL funded wallet (see live-cycle.mjs's wallet-file convention). Answers a
// precise question empirically instead of trusting a docstring reading: when
// SOMNIX calls `exchange.createOrder(symbol, 'market', 'buy', amount, ...)`
// with `amount` = the number the user typed into "Lock Amount", does the SDK
// spend `amount` collateral, or buy `amount` OUTCOME TOKENS (costing
// `amount * price` collateral)? Reads the real collateral balance immediately
// before and after one small real order and compares both hypotheses against
// the actual balance delta.
//
// Usage: node scripts/verify-order-amount-semantics.mjs [--pair=BTC] [--length=5m] [--amount=5] [--side=green]

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { SomniaMarkets, SOMNIA_TESTNET_ADDRESSES } from '@somnia-chain/markets-sdk';
import { somniaShannon } from '@somnia-chain/markets-sdk/chains';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const WALLET_FILE = join(REPO_ROOT, '.testnet-wallet');
const INDEXER_URL = process.env.NEXT_PUBLIC_DREAMDEX_INDEXER_URL || 'https://dev.smk.somnia.host/v1/graphql';
const OUTCOME_LABEL = { green: 'YES', red: 'NO' };

const [, , ...args] = process.argv;
const getArg = (name, fallback) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback;

async function main() {
  const pair = getArg('pair', 'BTC');
  const length = getArg('length', '5m');
  const amount = Number(getArg('amount', '5'));
  const side = getArg('side', 'green');

  if (!existsSync(WALLET_FILE)) {
    throw new Error(`No wallet file at ${WALLET_FILE}.`);
  }
  const { privateKey, address } = JSON.parse(readFileSync(WALLET_FILE, 'utf8'));
  const account = privateKeyToAccount(privateKey);
  const walletClient = createWalletClient({ account, chain: somniaShannon, transport: http() });
  const exchange = new SomniaMarkets({ chain: somniaShannon, indexerUrl: INDEXER_URL, addresses: SOMNIA_TESTNET_ADDRESSES });
  exchange.setSigner({ walletClient });

  console.log('Wallet:', address);

  await exchange.loadMarkets();
  const candidates = Object.values(exchange.markets).filter(
    (m) => m.type === 'binary' && m.info?.asset === pair && m.info?.interval === length
  );
  if (candidates.length === 0) {
    throw new Error(`No live ${pair} ${length} market right now.`);
  }
  const market = candidates[0];
  const outcome = market.outcomes?.find((o) => o.label === OUTCOME_LABEL[side]);
  if (!outcome) throw new Error(`${market.symbol} has no ${OUTCOME_LABEL[side]} outcome`);

  const balBefore = await exchange.fetchBalance();
  console.log('\nFull balance BEFORE:', JSON.stringify(balBefore, null, 2));

  console.log(`\nPlacing MARKET BUY: amount=${amount} on ${outcome.symbol}...`);
  const order = await exchange.createOrder(outcome.symbol, 'market', 'buy', amount, undefined, { slippage: 0.03 });
  console.log('Order result:', { txHash: order.txHash, filled: order.filled, price: order.price, cost: order.cost, amount: order.amount });

  const balAfter = await exchange.fetchBalance();
  console.log('\nFull balance AFTER:', JSON.stringify(balAfter, null, 2));

  // Find the collateral currency (the one that's a plain number code, not the outcome token codes).
  const collateralCode = Object.keys(balBefore).find(
    (code) => !code.includes('#') && balBefore[code]?.total !== undefined && balAfter[code]?.total !== undefined
  );

  if (collateralCode) {
    const before = balBefore[collateralCode].total;
    const after = balAfter[collateralCode].total;
    const spent = before - after;
    console.log(`\n--- Collateral (${collateralCode}) ---`);
    console.log('Before:', before, '| After:', after, '| Spent:', spent.toFixed(6));
    console.log(`Hypothesis A (amount == collateral spent): expected ${amount}, actual ${spent.toFixed(6)}, match = ${Math.abs(spent - amount) < 0.01}`);
    const expectedB = amount * (order.price ?? 0);
    console.log(`Hypothesis B (amount == token quantity, cost = amount * price): expected ${expectedB.toFixed(6)}, actual ${spent.toFixed(6)}, match = ${Math.abs(spent - expectedB) < 0.05}`);
  } else {
    console.log('\nCould not auto-identify the collateral currency code — inspect the two balance dumps above manually.');
  }
}

main().catch((err) => {
  console.error('FAILED:', err instanceof Error ? err.stack : err);
  process.exit(1);
});
