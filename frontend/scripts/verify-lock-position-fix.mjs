#!/usr/bin/env node
// Closes the loop on the bug found via verify-order-amount-semantics.mjs:
// the unified `exchange.createOrder(...)` treated `amount` as a TOKEN
// QUANTITY, so a $5 lock actually spent $2.575. `lockPosition` in
// src/lib/exchange.ts was rewritten to use `client.quoteBinaryStake` +
// `trader.placeOrder` instead — this script re-runs the SAME empirical
// check (real testnet order, real balance diff) against that new code path
// to confirm the requested dollar amount now matches the real collateral
// spent. Mirrors the fixed lockPosition() line-for-line rather than
// importing it, since exchange.ts pulls in browser-only marketService
// (localStorage) that isn't available in a plain node script.
//
// Usage: node scripts/verify-lock-position-fix.mjs [--pair=BTC] [--length=5m] [--amount=5] [--side=green]

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { SomniaMarkets, SOMNIA_TESTNET_ADDRESSES, ORDER_TYPE, fromHuman, toHuman } from '@somnia-chain/markets-sdk';
import { somniaShannon } from '@somnia-chain/markets-sdk/chains';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const WALLET_FILE = join(REPO_ROOT, '.testnet-wallet');
const INDEXER_URL = process.env.NEXT_PUBLIC_DREAMDEX_INDEXER_URL || 'https://dev.smk.somnia.host/v1/graphql';
const BUY_SIDE = { green: 'BUY_YES', red: 'BUY_NO' };

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
    (m) => m.info?.marketType === 'BINARY' && m.info?.asset === pair && m.info?.interval === length
  );
  if (candidates.length === 0) {
    throw new Error(`No live ${pair} ${length} market right now.`);
  }
  const info = candidates[0].info;
  const buySide = BUY_SIDE[side];

  const balBefore = await exchange.fetchBalance();
  console.log('\nFull balance BEFORE:', JSON.stringify(balBefore, null, 2));

  const stakeRaw = fromHuman(amount, info.quoteDecimals);
  console.log(`\nRequesting a $${amount} stake on ${side} (${buySide})...`);
  const quote = await exchange.client.quoteBinaryStake({ marketId: info.id, side: buySide, stake: stakeRaw });
  if (!quote) throw new Error('quoteBinaryStake returned null — opposite side of the book is empty.');
  console.log('Quote:', {
    yesPrice: quote.yesPrice.toString(),
    quantity: quote.quantity.toString(),
    escrow: quote.escrow.toString(),
    escrowHuman: toHuman(quote.escrow, info.quoteDecimals),
  });

  const result = await exchange.trader.placeOrder({
    pool: info.poolAddress,
    side: quote.side,
    price: quote.yesPrice,
    quantity: quote.quantity,
    orderType: ORDER_TYPE.MARKET,
  });
  const filled = result.fills.reduce((sum, f) => sum + toHuman(f.quantityFilled, info.baseDecimals), 0);
  console.log('Order result:', { hash: result.hash, filled, fills: result.fills.length });

  const balAfter = await exchange.fetchBalance();
  console.log('\nFull balance AFTER:', JSON.stringify(balAfter, null, 2));

  const collateralCode = Object.keys(balBefore).find(
    (code) => !code.includes('#') && balBefore[code]?.total !== undefined && balAfter[code]?.total !== undefined
  );

  if (collateralCode) {
    const before = balBefore[collateralCode].total;
    const after = balAfter[collateralCode].total;
    const spent = before - after;
    console.log(`\n--- Collateral (${collateralCode}) ---`);
    console.log('Before:', before, '| After:', after, '| Spent:', spent.toFixed(6));
    console.log(`Fix check (spent should equal requested $${amount}): actual ${spent.toFixed(6)}, match = ${Math.abs(spent - amount) < 0.01}`);
    console.log('(A small positive gap under the stake is expected/safe — quoteBinaryStake never overspends past a lot boundary.)');
  } else {
    console.log('\nCould not auto-identify the collateral currency code — inspect the two balance dumps above manually.');
  }
}

main().catch((err) => {
  console.error('FAILED:', err instanceof Error ? err.stack : err);
  process.exit(1);
});
