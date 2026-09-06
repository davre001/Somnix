import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, getClientKey, __resetRateLimitState } from '../rateLimit';

describe('checkRateLimit', () => {
  beforeEach(() => {
    __resetRateLimitState();
  });

  it('allows requests up to the limit within the window', () => {
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit('k', 5, 60_000)).toBe(true);
    }
  });

  it('rejects once the limit is exceeded within the window', () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit('k', 5, 60_000);
    }
    expect(checkRateLimit('k', 5, 60_000)).toBe(false);
  });

  it('tracks separate keys independently', () => {
    for (let i = 0; i < 5; i++) checkRateLimit('a', 5, 60_000);
    expect(checkRateLimit('a', 5, 60_000)).toBe(false);
    expect(checkRateLimit('b', 5, 60_000)).toBe(true);
  });

  it('resets the count once the window has elapsed', () => {
    for (let i = 0; i < 3; i++) checkRateLimit('k', 3, 10);
    expect(checkRateLimit('k', 3, 10)).toBe(false);
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(checkRateLimit('k', 3, 10)).toBe(true);
        resolve();
      }, 20);
    });
  });
});

describe('getClientKey', () => {
  it('uses the first entry of x-forwarded-for when present', () => {
    const req = new Request('http://localhost/', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    });
    expect(getClientKey(req)).toBe('1.2.3.4');
  });

  it('falls back to x-real-ip', () => {
    const req = new Request('http://localhost/', { headers: { 'x-real-ip': '9.9.9.9' } });
    expect(getClientKey(req)).toBe('9.9.9.9');
  });

  it('falls back to "unknown" with no identifying headers', () => {
    const req = new Request('http://localhost/');
    expect(getClientKey(req)).toBe('unknown');
  });
});
