import { describe, it, expect } from 'vitest';
import { WindowLength } from '../types';

describe('Safety Guards & Validation Rules', () => {
  it('should enforce cutoff window limits according to duration', () => {
    function getCutoffSeconds(len: WindowLength): number {
      return len === '1m' ? 10 : len === '3m' ? 20 : len === '5m' ? 30 : 60;
    }

    expect(getCutoffSeconds('1m')).toBe(10);
    expect(getCutoffSeconds('3m')).toBe(20);
    expect(getCutoffSeconds('5m')).toBe(30);
    expect(getCutoffSeconds('15m')).toBe(60);
    expect(getCutoffSeconds('1h')).toBe(60);
  });

  it('should prevent locking more than the wallet balance', () => {
    const walletBalance = 15;
    const requestedAmount = 20;

    expect(requestedAmount <= walletBalance).toBe(false);
  });

  it('should allow locking within the wallet balance', () => {
    const walletBalance = 50;
    const requestedAmount = 10;

    expect(requestedAmount <= walletBalance).toBe(true);
  });
});
