import { describe, it, expect, vi } from 'vitest';
import { verifyOnChainTx } from '../chainVerify';

const VALID_WALLET = '0x1234567890123456789012345678901234567890';

describe('verifyOnChainTx', () => {
  it('rejects a malformed hash without making a network call', async () => {
    const result = await verifyOnChainTx('0xnotarealtxhash', VALID_WALLET);
    expect(result).toEqual({ ok: false, reason: 'txHash is not a well-formed transaction hash' });
  });

  it('rejects an empty string', async () => {
    const result = await verifyOnChainTx('', VALID_WALLET);
    expect(result.ok).toBe(false);
  });
});

describe('verifyOnChainTx — sender match', () => {
  const REAL_HASH = `0x${'a'.repeat(64)}`;

  it('rejects a real, successful tx sent by a different wallet than reported', async () => {
    vi.resetModules();
    vi.doMock('../../somnia', () => ({
      somniaPublicClient: {
        getTransactionReceipt: vi.fn().mockResolvedValue({
          status: 'success',
          from: '0xffffffffffffffffffffffffffffffffffffffff',
        }),
      },
    }));

    const { verifyOnChainTx: verify } = await import('../chainVerify');
    const result = await verify(REAL_HASH, VALID_WALLET);
    expect(result).toEqual({ ok: false, reason: 'transaction sender does not match the reported wallet address' });

    vi.doUnmock('../../somnia');
    vi.resetModules();
  });

  it('accepts a real, successful tx whose sender matches the reported wallet (case-insensitive)', async () => {
    vi.resetModules();
    vi.doMock('../../somnia', () => ({
      somniaPublicClient: {
        getTransactionReceipt: vi.fn().mockResolvedValue({
          status: 'success',
          from: VALID_WALLET.toUpperCase(),
        }),
      },
    }));

    const { verifyOnChainTx: verify } = await import('../chainVerify');
    const result = await verify(REAL_HASH, VALID_WALLET);
    expect(result).toEqual({ ok: true });

    vi.doUnmock('../../somnia');
    vi.resetModules();
  });
});
