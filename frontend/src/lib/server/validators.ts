import 'server-only';
import type { WindowPair, WindowLength, MarketSide } from '../types';
import type { ClaimRecord } from '../apiTypes';

export function isValidPair(value: unknown): value is WindowPair {
  return value === 'BTC' || value === 'ETH';
}

export function isValidLength(value: unknown): value is WindowLength {
  return value === '1m' || value === '3m' || value === '5m' || value === '15m' || value === '1h';
}

export function isValidSide(value: unknown): value is MarketSide {
  return value === 'green' || value === 'red';
}

export function isValidClaimStatus(value: unknown): value is ClaimRecord['status'] {
  return value === 'pending' || value === 'claimed' || value === 'failed';
}

export function parsePositiveNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

const WALLET_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

/** Returns the trimmed address only if it's a well-formed 0x + 40-hex-char EVM address, else null. */
export function validateWalletAddress(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return WALLET_ADDRESS_RE.test(trimmed) ? trimmed : null;
}
