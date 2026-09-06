import { describe, it, expect } from 'vitest';
import { validateWalletAddress } from '../validators';

describe('validateWalletAddress', () => {
  it('accepts a well-formed 0x + 40-hex-char address', () => {
    const addr = '0x1234567890123456789012345678901234567890';
    expect(validateWalletAddress(addr)).toBe(addr);
  });

  it('trims surrounding whitespace before validating', () => {
    const addr = '0x1234567890123456789012345678901234567890';
    expect(validateWalletAddress(`  ${addr}  `)).toBe(addr);
  });

  it('rejects a value that is too short to be an address', () => {
    expect(validateWalletAddress('0xabc123')).toBeNull();
  });

  it('rejects a value missing the 0x prefix', () => {
    expect(validateWalletAddress('1234567890123456789012345678901234567890')).toBeNull();
  });

  it('rejects non-hex characters', () => {
    expect(validateWalletAddress('0xzzzz567890123456789012345678901234567890')).toBeNull();
  });

  it('rejects an empty string', () => {
    expect(validateWalletAddress('')).toBeNull();
  });

  it('rejects non-string values', () => {
    expect(validateWalletAddress(null)).toBeNull();
    expect(validateWalletAddress(undefined)).toBeNull();
    expect(validateWalletAddress(12345)).toBeNull();
  });
});
