import { describe, it, expect } from 'vitest';
import {
  SignerRequiredError,
  InvalidInputError,
  NotConfiguredError,
  ContractRevertError,
  IndexerError,
  RpcError,
} from '@somnia-chain/markets-sdk';
import type { UnifiedMarket } from '@somnia-chain/markets-sdk';
import { isAmbiguousTxError, getRealStartPrice } from '../exchange';

describe('isAmbiguousTxError — the reconciliation guard', () => {
  it('treats errors that prove nothing was sent as NOT ambiguous (safe to discard the pending lock)', () => {
    expect(isAmbiguousTxError(new SignerRequiredError('createOrder'))).toBe(false);
    expect(isAmbiguousTxError(new InvalidInputError('bad amount'))).toBe(false);
    expect(isAmbiguousTxError(new NotConfiguredError('addresses.binaryModule', 'set it'))).toBe(false);
    expect(isAmbiguousTxError(new ContractRevertError({ errorName: 'InsufficientBalance' }))).toBe(false);
    expect(isAmbiguousTxError(new IndexerError('listLiveBinaryMarkets', 'timeout'))).toBe(false);
    expect(isAmbiguousTxError(Object.assign(new Error('rejected'), { code: 4001 }))).toBe(false);
  });

  it('treats a dropped/unanswered request as ambiguous — must be reconciled, never assumed failed', () => {
    expect(isAmbiguousTxError(new RpcError('eth_sendRawTransaction', 'no response'))).toBe(true);
    expect(isAmbiguousTxError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isAmbiguousTxError('a raw string throw')).toBe(true);
  });
});

function unifiedMarketWithStrike(strike: string | undefined, marketType: 'BINARY' | 'SPOT' = 'BINARY'): UnifiedMarket {
  return { info: { marketType, strike } } as unknown as UnifiedMarket;
}

describe('getRealStartPrice — empirically-verified oracle price scale', () => {
  // Verified against real BTC/ETH spot price across 11 live samples —
  // see scripts/inspect-oracle-price.mjs. `strike` is raw at 2 decimals.
  it('scales a real BTC strike to its dollar value (e.g. 7962895 -> $79,628.95)', () => {
    expect(getRealStartPrice(unifiedMarketWithStrike('7962895'))).toBe(79628.95);
  });

  it('scales a real ETH strike to its dollar value (e.g. 245577 -> $2,455.77)', () => {
    expect(getRealStartPrice(unifiedMarketWithStrike('245577'))).toBe(2455.77);
  });

  it('returns null for a non-binary market', () => {
    expect(getRealStartPrice(unifiedMarketWithStrike('7962895', 'SPOT'))).toBeNull();
  });

  it('returns null when strike is missing, zero, or unparseable', () => {
    expect(getRealStartPrice(unifiedMarketWithStrike(undefined))).toBeNull();
    expect(getRealStartPrice(unifiedMarketWithStrike('0'))).toBeNull();
    expect(getRealStartPrice(unifiedMarketWithStrike('not-a-number'))).toBeNull();
  });
});
