#!/usr/bin/env node
// Read-only diagnostic — no wallet needed, every read here is public. Compares
// a resolved binary market's real oracle-posted opening/closing prices
// (client.getMarketResolution) against a real BTC/ETH spot price, to
// empirically determine the oracle's numeric price scale (decimals) before
// wiring openingAnswer/closingAnswer into the UI. Today's "Start Price" in
// RevealPanel is a synthetic placeholder (see docs/LIMITATIONS.md §5), not
// real oracle data — this script is step one of replacing it with the real
// thing, the same way this repo already verified its indexer URL empirically
// (see docs/API_NOTES.md §1) rather than trusting an assumption.
//
// Usage:
//   node scripts/inspect-oracle-price.mjs [--asset=BTC] [--intervalSec=300] [--marketId=0x...]

import { SomniaMarkets, SOMNIA_TESTNET_ADDRESSES, isBinaryMarket } from '@somnia-chain/markets-sdk';
import { somniaShannon } from '@somnia-chain/markets-sdk/chains';

const INDEXER_URL = process.env.NEXT_PUBLIC_DREAMDEX_INDEXER_URL || 'https://dev.smk.somnia.host/v1/graphql';
const COINGECKO_IDS = { BTC: 'bitcoin', ETH: 'ethereum' };

async function fetchRealPrice(asset) {
  const id = COINGECKO_IDS[asset];
  if (!id) return null;
  const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`);
  if (!res.ok) return null;
  const body = await res.json();
  return body?.[id]?.usd ?? null;
}

function inferDecimals(raw, realPrice) {
  if (raw == null || realPrice == null || realPrice <= 0) return null;
  const rawNum = Number(raw);
  if (!Number.isFinite(rawNum) || rawNum <= 0) return null;
  const ratio = rawNum / realPrice;
  const decimals = Math.round(Math.log10(ratio));
  const reconstructed = rawNum / 10 ** decimals;
  const pctError = Math.abs(reconstructed - realPrice) / realPrice;
  return { decimals, reconstructed, pctError };
}

const [, , ...args] = process.argv;
const getArg = (name, fallback) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback;

async function main() {
  const asset = getArg('asset', 'BTC');
  const intervalSec = Number(getArg('intervalSec', '300'));
  let marketId = getArg('marketId', null);

  const exchange = new SomniaMarkets({ chain: somniaShannon, indexerUrl: INDEXER_URL, addresses: SOMNIA_TESTNET_ADDRESSES });
  const client = exchange.client;

  const realPrice = await fetchRealPrice(asset);
  console.log(`Real ${asset} spot price right now (CoinGecko): $${realPrice}\n`);

  const wantLive = args.includes('--live');
  let candidates;
  if (marketId) {
    candidates = [{ id: marketId }];
  } else if (wantLive) {
    console.log(`Checking currently LIVE ${asset} markets at ${intervalSec}s cadence (does strike exist before resolution?)...\n`);
    const live = await client.listLiveBinaryMarkets({ asset, intervalSec });
    candidates = live.slice(0, 5);
    if (candidates.length === 0) {
      console.error(`No live ${asset} market at that cadence right now.`);
      process.exit(1);
    }
  } else {
    console.log(`No --marketId given — checking the last several resolved ${asset} markets at ${intervalSec}s cadence...\n`);
    const past = await client.listPastBinaryMarkets({ asset, intervalSec, limit: 10 });
    candidates = past.filter((m) => m.winningOutcome != null || m.voided).slice(0, 5);
    if (candidates.length === 0) {
      console.error(`No recently-resolved ${asset} market found at that cadence in the last ${past.length} past markets.`);
      console.error('Try a different --intervalSec (60=1m, 180=3m, 300=5m, 900=15m, 3600=1h), or pass --marketId explicitly.');
      process.exit(1);
    }
  }

  for (const candidate of candidates) {
    const market = await client.getMarket(candidate.id);
    const resolution = await client.getMarketResolution(candidate.id);
    const expiry = market && isBinaryMarket(market) ? new Date(Number(market.expiry) * 1000).toISOString() : 'n/a';

    console.log(`--- ${candidate.id}  (expiry ${expiry}) ---`);
    const rows = [
      ['strike', market && isBinaryMarket(market) ? market.strike : null],
      ['openingAnswer', resolution.openingAnswer?.numericValue],
      ['closingAnswer', resolution.closingAnswer?.numericValue],
    ];
    for (const [label, raw] of rows) {
      const inferred = inferDecimals(raw, realPrice);
      if (!inferred) {
        console.log(`  ${label}: raw = ${raw ?? 'null'} → no comparison possible`);
        continue;
      }
      console.log(
        `  ${label}: raw = ${raw} → decimals ≈ ${inferred.decimals} ($${inferred.reconstructed.toFixed(2)}, ${(inferred.pctError * 100).toFixed(2)}% off current spot)`
      );
    }
    console.log('');
  }
}

main().catch((err) => {
  console.error('FAILED:', err instanceof Error ? err.stack : err);
  process.exit(1);
});
