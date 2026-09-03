import { describe, it, expect } from 'vitest';
import { verifyOnChainTx } from '../chainVerify';

describe('verifyOnChainTx', () => {
  it('rejects a malformed hash without making a network call', async () => {
    const result = await verifyOnChainTx('0xnotarealtxhash');
    expect(result).toEqual({ ok: false, reason: 'txHash is not a well-formed transaction hash' });
  });

  it('rejects an empty string', async () => {
    const result = await verifyOnChainTx('');
    expect(result.ok).toBe(false);
  });
});
