import type { ClaimRecord, MarketLength, MarketPair, MarketSide } from "../types/api.js";

export function isValidPair(value: unknown): value is MarketPair {
  return value === "BTC" || value === "ETH";
}

export function isValidLength(value: unknown): value is MarketLength {
  return value === "1m" || value === "3m" || value === "5m" || value === "15m" || value === "1h";
}

export function isValidSide(value: unknown): value is MarketSide {
  return value === "green" || value === "red";
}

export function isValidClaimStatus(value: unknown): value is ClaimRecord["status"] {
  return value === "pending" || value === "claimed" || value === "failed";
}

export function parsePositiveNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

export function parseProbability(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return null;
  return parsed;
}

export function validateWalletAddress(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
