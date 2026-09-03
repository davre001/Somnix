import { describe, it, expect } from 'vitest';
import { POST as lockPost } from '../lock/route';
import { GET as catchAllGet } from '../[...catchAll]/route';

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

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

  it('rejects a txHash that is not a real on-chain transaction', async () => {
    const req = jsonRequest('http://localhost/api/lock', {
      marketId: 'BTC-15m-123',
      pair: 'BTC',
      length: '15m',
      side: 'green',
      amount: 10,
      filledAmount: 9.6,
      fillPrice: 0.52,
      hidePriceUntil: Date.now() + 60_000,
      txHash: '0xnotarealtxhash',
    });

    const res = await lockPost(req, emptyParams);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toMatch(/Could not verify txHash on-chain/);
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
