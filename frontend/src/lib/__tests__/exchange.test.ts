import { describe, it, expect } from 'vitest';
import {
  SignerRequiredError,
  InvalidInputError,
  NotConfiguredError,
  ContractRevertError,
  IndexerError,
  RpcError,
} from '@somnia-chain/markets-sdk';
import { isAmbiguousTxError } from '../exchange';

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
