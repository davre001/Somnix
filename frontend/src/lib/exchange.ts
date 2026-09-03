'use client';

import {
  SomniaMarkets,
  SOMNIA_TESTNET_ADDRESSES,
  SomniaMarketsError,
  SignerRequiredError,
  InvalidInputError,
  ContractRevertError,
  IndexerError,
  RpcError,
  NotConfiguredError,
  isBinaryMarket,
  fromHuman,
  type UnifiedMarket,
} from '@somnia-chain/markets-sdk';
import { somniaShannon } from '@somnia-chain/markets-sdk/chains';
import type { WalletClient } from 'viem';
import { MarketSide, WindowLength, WindowPair, PendingLockIntent } from './types';
import { savePendingLockIntent, clearPendingLockIntent } from './marketService';

// Real testnet Hasura indexer, per the SDK's own README (§ "Create an
// exchange") — not a domain we picked; `indexer-testnet.somnia.network` (the
// old default here) never existed in DNS. Verified live via a `{ __typename }`
// probe before wiring in.
const INDEXER_URL = process.env.NEXT_PUBLIC_DREAMDEX_INDEXER_URL || 'https://dev.smk.somnia.host/v1/graphql';

let exchange: SomniaMarkets | null = null;

function getExchange(): SomniaMarkets {
  if (!exchange) {
    exchange = new SomniaMarkets({
      chain: somniaShannon,
      indexerUrl: INDEXER_URL,
      addresses: SOMNIA_TESTNET_ADDRESSES,
    });
  }
  return exchange;
}

/** Binds (or, called with undefined, clears) the signer used for locks, claims and the faucet. */
export function bindExchangeSigner(walletClient: WalletClient | undefined): void {
  getExchange().setSigner(walletClient ? { walletClient } : {});
}

// Known on-chain revert reasons, translated to plain language. Anything not
// listed here falls back to a generic message rather than showing the raw
// PascalCase Solidity error name.
const CONTRACT_REVERT_MESSAGES: Record<string, string> = {
  InsufficientBalance: "You don't have enough balance for this.",
  SlippageExceeded: 'The price moved too much before this could go through — try again.',
  MarketClosed: 'This window has already closed.',
  MarketNotResolved: "This window hasn't resolved yet — check back shortly.",
};

/**
 * The SDK's InvalidInputError carries genuinely useful detail (which side has
 * no liquidity, which amount is too small) but phrases it in internal terms —
 * raw market-symbol notation like "BTC-8079813-03SEP26-1551/tUSDC#YES" is not
 * something a trader should ever see. Recognize the common real cases and
 * translate them; anything unrecognized still gets a safe, plain fallback
 * instead of the raw internal string.
 */
function describeInvalidInput(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('opposite side of the book is empty') || lower.includes('cannot price')) {
    return "No one's currently offering the other side of this bet — try a different window, or wait a moment.";
  }
  if (lower.includes('minimum') || lower.includes('too small')) {
    return 'That amount is too small for this market — try a larger amount.';
  }
  if (lower.includes('has no') && lower.includes('outcome')) {
    return "This window isn't available to lock right now — try a different one.";
  }
  return "That amount or window isn't valid right now — try adjusting it.";
}

/** Turns any error the exchange throws into a message safe to show a user. */
export function describeExchangeError(err: unknown): string {
  if (err instanceof SignerRequiredError) return 'Connect your wallet to continue.';
  if (err instanceof ContractRevertError) {
    const code = err.errorName || err.reason || '';
    return CONTRACT_REVERT_MESSAGES[code] ?? 'The network rejected this transaction. Please try again.';
  }
  if (err instanceof InvalidInputError) return describeInvalidInput(err.message);
  if (err instanceof IndexerError) return 'Somnia indexer is unreachable right now — try again shortly.';
  if (err instanceof RpcError) return 'Could not reach the Somnia network — check your connection and try again.';
  if (err instanceof NotConfiguredError) return "Somnix isn't set up correctly right now — please try again later.";
  if (err instanceof SomniaMarketsError) return 'Something went wrong on the Somnia network. Please try again.';
  const rejected = err as { code?: number };
  if (rejected?.code === 4001) return 'Rejected in wallet.';
  return 'Something went wrong. Please try again.';
}

/**
 * Three-state read on a failed lock/claim attempt: does this error prove the
 * transaction never reached the chain (safe to discard), or is it genuinely
 * unknown whether it landed (a timeout, a dropped connection — must be
 * reconciled later, never treated as "it didn't happen")?
 *
 * - InvalidInputError / SignerRequiredError / NotConfiguredError: never left the client.
 * - ContractRevertError: reverted — chain-confirmed it did NOT happen.
 * - IndexerError while placing an order: the read needed to price/send the order
 *   never completed, so nothing was sent.
 * - Wallet rejection (code 4001): the user declined — nothing was sent.
 * - RpcError, or anything else unrecognized (a raw fetch/network failure): the
 *   request may have reached the node with no answer coming back — ambiguous.
 */
export function isAmbiguousTxError(err: unknown): boolean {
  if (
    err instanceof SignerRequiredError ||
    err instanceof InvalidInputError ||
    err instanceof NotConfiguredError ||
    err instanceof ContractRevertError ||
    err instanceof IndexerError
  ) {
    return false;
  }
  const rejected = err as { code?: number };
  if (rejected?.code === 4001) return false;
  return true;
}

// Real on-chain BinaryMarket series run at these cadences; the picker's window
// lengths map onto them 1:1 by label, so no separate lookup table is needed.
const OUTCOME_LABEL: Record<MarketSide, 'YES' | 'NO'> = { green: 'YES', red: 'NO' };

/** The live, currently-tradable BinaryMarket for this pair + window length, or null if the venue has none right now. */
export async function findLiveMarket(pair: WindowPair, length: WindowLength): Promise<UnifiedMarket | null> {
  const ex = getExchange();
  await ex.loadMarkets();
  for (const market of Object.values(ex.markets)) {
    if (market.type !== 'binary') continue;
    const info = market.info as { asset?: string; interval?: string | null };
    if (info.asset === pair && info.interval === length) return market;
  }
  return null;
}

export interface LockResult {
  hash: string;
  filled: number;
  price: number;
}

/** Buys the outcome token for `side` on `market` with `amount` collateral (a real market order against the live book). */
export async function lockPosition(market: UnifiedMarket, side: MarketSide, amount: number): Promise<LockResult> {
  const ex = getExchange();
  const label = OUTCOME_LABEL[side];
  const outcome = market.outcomes?.find((o) => o.label === label);
  if (!outcome) throw new InvalidInputError(`${market.symbol} has no ${label} outcome`);
  const order = await ex.createOrder(outcome.symbol, 'market', 'buy', amount, undefined, { slippage: 0.03 });
  return { hash: order.txHash ?? '', filled: order.filled, price: order.price ?? 0 };
}

/**
 * The reliability-critical wrapper around a lock send: persists the pending
 * intent BEFORE `send()` runs, and only ever clears it once we can PROVE the
 * order didn't reach the chain (see isAmbiguousTxError) — an ambiguous
 * failure leaves it in place for reconcilePendingLock to resolve later.
 *
 * `send` is injected rather than calling lockPosition directly so this
 * ordering guarantee is unit-testable without a live SDK/wallet — see
 * __tests__/exchange.test.ts.
 */
export async function lockWithIntent(intent: PendingLockIntent, send: () => Promise<LockResult>): Promise<LockResult> {
  savePendingLockIntent(intent);
  try {
    const result = await send();
    clearPendingLockIntent();
    return result;
  } catch (err) {
    if (!isAmbiguousTxError(err)) clearPendingLockIntent();
    throw err;
  }
}

/**
 * How much of `side`'s outcome token the connected wallet actually holds on
 * `marketId` — the ground truth used to reconcile a lock intent whose result
 * was never confirmed (see useSomnix#reconcilePendingLock). Requires a signer.
 */
export async function checkFilledAmount(marketId: string, side: MarketSide): Promise<number> {
  const ex = getExchange();
  await ex.loadMarkets();
  const market = Object.values(ex.markets).find((m) => m.id === marketId);
  if (!market) return 0;
  const outcome = market.outcomes?.find((o) => o.label === OUTCOME_LABEL[side]);
  if (!outcome) return 0;
  const balances = await ex.fetchBalance();
  return balances[outcome.symbol]?.total ?? 0;
}

// A same-block/just-broadcast reconciliation check can read a real order's
// balance as 0 before it mines — that's "unknown," not "didn't happen," so a
// pending intent isn't discarded until it's been given this long to land.
const RECONCILE_GRACE_MS = 30_000;

export type ReconcileOutcome = 'recovered' | 'discarded' | 'pending';

/**
 * What to do with a pending lock intent given the wallet's real outcome-token
 * balance for it: promote it to a real lock (filled), discard it (confirmed
 * zero, and old enough that "still pending on-chain" isn't a plausible
 * explanation anymore), or leave it alone (too recent to be conclusive).
 */
export function reconcileOutcome(intent: PendingLockIntent, filledAmount: number, now: number = Date.now()): ReconcileOutcome {
  if (filledAmount > 0) return 'recovered';
  return now - intent.createdAt > RECONCILE_GRACE_MS ? 'discarded' : 'pending';
}

export interface MarketResolution {
  resolved: boolean;
  voided: boolean;
  winningSide?: MarketSide;
  /** Settlement price of the underlying asset at market close, if available. */
  endPrice?: number;
}

/** Whether `marketId` has resolved on-chain yet, and which side won. */
export async function getResolution(marketId: string): Promise<MarketResolution> {
  const ex = getExchange();
  const market = await ex.client.getMarket(marketId);
  if (!market || market.marketType !== 'BINARY') return { resolved: false, voided: false };
  const endPrice: number | undefined =
    typeof (market as { closingPrice?: number }).closingPrice === 'number'
      ? (market as { closingPrice?: number }).closingPrice
      : undefined;
  if (market.voided) return { resolved: true, voided: true, endPrice };
  if (market.winningOutcome == null) return { resolved: false, voided: false, endPrice };
  return { resolved: true, voided: false, winningSide: market.winningOutcome === 0 ? 'green' : 'red', endPrice };
}

/**
 * Redeems `amount` of the winning outcome token on `marketId` for collateral.
 *
 * Deliberately does NOT use the SDK's `exchange.redeem(ref, amount)` convenience
 * method: that resolves `ref` through the exchange's live-markets registry
 * (populated by `loadMarkets()`), and per the SDK's own source, that registry
 * sweep excludes finalized (resolved) binary markets by design — "Finalized
 * series accumulate without bound and would swamp the symbol registry ... resolve
 * those by pool via the raw-tier lookups instead." A market only becomes
 * claimable AFTER it resolves, so by the time this runs the registry has almost
 * always already dropped it. Confirmed against a real testnet claim: it threw
 * "unknown market ref ... call loadMarkets() first" even immediately after
 * calling loadMarkets(). Instead: read the market directly by id (a plain
 * indexer primary-key lookup — works regardless of finalized status) and call
 * the raw, module-routed `trader.redeem()`, which only needs the market's
 * on-chain address and winning outcome, not the registry.
 */
export async function claimWinnings(marketId: string, amount: number): Promise<{ hash: string }> {
  const ex = getExchange();
  const market = await ex.client.getMarket(marketId);
  if (!market || !isBinaryMarket(market)) {
    throw new InvalidInputError(`Unknown or non-binary market: ${marketId}`);
  }
  if (market.winningOutcome == null && !market.voided) {
    throw new InvalidInputError('Market has not resolved on-chain yet');
  }
  const res = await ex.trader.redeem({
    marketId: market.marketId,
    market: market.marketAddress,
    outcomeIdx: market.winningOutcome == null ? undefined : (market.winningOutcome as 0 | 1),
    amount: fromHuman(amount, market.baseDecimals),
  });
  return { hash: res.hash };
}

/** Mints test collateral to the connected signer (testnet faucet — no-op on mainnet). */
export async function requestFaucet(): Promise<{ hash: string }> {
  const res = await getExchange().trader.faucet({});
  return { hash: res.hash };
}
