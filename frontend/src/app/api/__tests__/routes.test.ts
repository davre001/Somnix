import { describe, it, expect, beforeEach } from 'vitest';
import { POST as lockPost } from '../lock/route';
import { POST as claimPost } from '../claim/route';
import { GET as catchAllGet } from '../[...catchAll]/route';
import { __resetRateLimitState } from '@/lib/server/rateLimit';

const VALID_WALLET = '0x1234567890123456789012345678901234567890';

function jsonRequest(url: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  __resetRateLimitState();
});

const emptyParams = { params: Promise.resolve({}) };

describe('POST /api/lock', () => {
  it("requires the order's real fill, not a pre-trade estimate", async () => {
    const req = jsonRequest('http://localhost/api/lock', {
      marketId: 'BTC-15m-123',
      pair: 'BTC',
      length: '15m',
      side: 'green',
      amount: 10,
    });

    const res = await lockPost(req, emptyParams);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("filledAmount must be a positive number (the order's real fill)");
  });

  it('rejects a missing walletAddress before ever checking the txHash', async () => {
    const req = jsonRequest('http://localhost/api/lock', {
      marketId: 'BTC-15m-123',
      pair: 'BTC',
      length: '15m',
      side: 'green',
      amount: 10,
      filledAmount: 9.6,
      fillPrice: 0.52,
      hidePriceUntil: Date.now() + 60_000,
      txHash: `0x${'a'.repeat(64)}`,
    });

    const res = await lockPost(req, emptyParams);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/walletAddress must be a valid/);
  });

  it('rejects a malformed walletAddress (not 0x + 40 hex chars)', async () => {
    const req = jsonRequest('http://localhost/api/lock', {
      marketId: 'BTC-15m-123',
      pair: 'BTC',
      length: '15m',
      side: 'green',
      amount: 10,
      filledAmount: 9.6,
      fillPrice: 0.52,
      walletAddress: '0xnotawallet',
      hidePriceUntil: Date.now() + 60_000,
      txHash: `0x${'a'.repeat(64)}`,
    });

    const res = await lockPost(req, emptyParams);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/walletAddress must be a valid/);
  });

  it('rejects a txHash that is not a real on-chain transaction, given a valid walletAddress', async () => {
    const req = jsonRequest('http://localhost/api/lock', {
      marketId: 'BTC-15m-123',
      pair: 'BTC',
      length: '15m',
      side: 'green',
      amount: 10,
      filledAmount: 9.6,
      fillPrice: 0.52,
      walletAddress: VALID_WALLET,
      hidePriceUntil: Date.now() + 60_000,
      txHash: '0xnotarealtxhash',
    });

    const res = await lockPost(req, emptyParams);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toMatch(/Could not verify txHash on-chain/);
  });
});

describe('POST /api/claim', () => {
  it('requires lockId', async () => {
    const req = jsonRequest('http://localhost/api/claim', {
      walletAddress: VALID_WALLET,
      filledAmount: 5,
      txHash: `0x${'a'.repeat(64)}`,
    });

    const res = await claimPost(req, emptyParams);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('lockId is required');
  });

  it('rejects a missing walletAddress before looking up the lock', async () => {
    const req = jsonRequest('http://localhost/api/claim', {
      lockId: 'lock_123',
      filledAmount: 5,
      txHash: `0x${'a'.repeat(64)}`,
    });

    const res = await claimPost(req, emptyParams);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/walletAddress must be a valid/);
  });

  it('rejects a malformed walletAddress', async () => {
    const req = jsonRequest('http://localhost/api/claim', {
      lockId: 'lock_123',
      walletAddress: 'not-an-address',
      filledAmount: 5,
      txHash: `0x${'a'.repeat(64)}`,
    });

    const res = await claimPost(req, emptyParams);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/walletAddress must be a valid/);
  });

  it('404s for a lock that does not exist, given a valid walletAddress', async () => {
    const req = jsonRequest('http://localhost/api/claim', {
      lockId: 'lock_does_not_exist_xyz',
      walletAddress: VALID_WALLET,
      filledAmount: 5,
      txHash: `0x${'a'.repeat(64)}`,
    });

    const res = await claimPost(req, emptyParams);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Lock not found');
  });
});

describe('rate limiting', () => {
  it('returns 429 once a caller exceeds the per-IP lock limit', async () => {
    const req = () => jsonRequest('http://localhost/api/lock', {}, { 'x-forwarded-for': '203.0.113.5' });

    let lastStatus = 0;
    for (let i = 0; i < 11; i++) {
      const res = await lockPost(req(), emptyParams);
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });

  it('tracks lock and claim limits independently, even from the same caller', async () => {
    const lockReq = () => jsonRequest('http://localhost/api/lock', {}, { 'x-forwarded-for': '203.0.113.9' });
    const claimReq = () => jsonRequest('http://localhost/api/claim', {}, { 'x-forwarded-for': '203.0.113.9' });

    for (let i = 0; i < 10; i++) {
      await lockPost(lockReq(), emptyParams);
    }
    expect((await lockPost(lockReq(), emptyParams)).status).toBe(429);

    // The claim route's own bucket for the same caller is untouched.
    const claimRes = await claimPost(claimReq(), emptyParams);
    expect(claimRes.status).not.toBe(429);
  });
});

describe('unmatched /api/* routes', () => {
  it('use the API error shape instead of a plain 404 page', async () => {
    const res = await catchAllGet();
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ ok: false, error: 'Route not found' });
  });
});
