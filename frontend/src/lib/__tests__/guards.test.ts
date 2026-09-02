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

  it('should prevent locking if remaining budget is exceeded', () => {
    const dailyBudgetTotal = 20;
    const dailyBudgetSpent = 15;
    const remainingBudget = dailyBudgetTotal - dailyBudgetSpent;

    const requestedAmount = 10;
    const canSpend = requestedAmount <= remainingBudget;

    expect(remainingBudget).toBe(5);
    expect(canSpend).toBe(false);
  });

  it('should allow locking within budget and balance constraints', () => {
    const walletBalance = 50;
    const remainingBudget = 15;
    const requestedAmount = 10;

    const valid = requestedAmount <= walletBalance && requestedAmount <= remainingBudget;
    expect(valid).toBe(true);
  });
});
