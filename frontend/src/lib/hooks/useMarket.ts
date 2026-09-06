'use client';

import { useState, useEffect, useMemo } from 'react';
import { useLiveMarkets, useLiveBinaryOrderBookByMarket, useSomniaMarketsClient, useIsTailing } from '@somnia-chain/markets-sdk/react';
import { isBinaryMarket, markYesPrice, upPercent, type WatchHandle } from '@somnia-chain/markets-sdk';
import { WindowPair, WindowLength, MarketSide, MarketWindow } from '../types';
import { getMarketWindow, fetchLiveMarkets, fetchLiveLengths, fetchLiveOdds, getCurrentWindowBounds } from '../marketService';

const ALL_LENGTHS: WindowLength[] = ['1m', '3m', '5m', '15m', '1h'];
const REST_POLL_INTERVAL_MS = 10_000;
// How long to let the chain's own WebSocket tail try to hydrate before
// falling back to the REST proxy — a network that blocks WebSocket RPC
// (some corporate firewalls) should still get a working, if slower, app.
const TAIL_FALLBACK_GRACE_MS = 5_000;

/**
 * Owns pair/length/amount selection and live market/odds data — the slice of
 * the former `useSomnix` god hook that decides "what window are we looking
 * at and is it real." Primary source is the SDK's own live tail
 * (`watchMarkets`/`useLiveMarkets`/`useLiveBinaryOrderBookByMarket`), riding
 * the chain's own WebSocket RPC with no poll interval and no refetch lag.
 * Falls back to the REST display proxy (`/api/markets*`) only if the tail
 * hasn't hydrated within `TAIL_FALLBACK_GRACE_MS` — see
 * `docs/API_NOTES.md` for why both paths exist.
 */
export function useMarket() {
  const [selectedPair, setSelectedPair] = useState<WindowPair>('BTC');
  const [selectedLength, setSelectedLength] = useState<WindowLength>('15m');
  const [selectedAmount, setSelectedAmount] = useState<number>(10);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    const { remainingMs } = getCurrentWindowBounds('15m');
    return Math.floor(remainingMs / 1000);
  });

  // Update timer & clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      const { remainingMs } = getCurrentWindowBounds(selectedLength);
      setRemainingSeconds(Math.floor(remainingMs / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [selectedLength]);

  const client = useSomniaMarketsClient();
  const isTailing = useIsTailing();
  const liveMarketRows = useLiveMarkets();

  // Open the whole-protocol live tail once, for as long as the app is
  // mounted — a list view of a handful of BTC/ETH cadences is exactly what
  // `watchMarkets()` (vs. a per-pool `watchMarket`) is documented for.
  useEffect(() => {
    let released = false;
    let handle: WatchHandle | undefined;
    client
      .watchMarkets()
      .then((h) => {
        if (released) {
          h.stop();
          return;
        }
        handle = h;
      })
      .catch((err) => {
        console.warn('[Somnix] Could not open the live market tail — the REST fallback will take over:', err);
      });
    return () => {
      released = true;
      handle?.stop();
    };
  }, [client]);

  // Fallback activation: only engages once the tail has had a real chance to
  // hydrate. Never runs alongside a live tail — that would mean two
  // disagreeing sources of truth for "is this window live right now."
  const [fallbackActive, setFallbackActive] = useState(false);
  // The moment tailing resumes, drop back out of fallback immediately — done
  // during render (React's documented "reset state when a value changes"
  // pattern), not inside the effect below, so this transition never fires a
  // setState synchronously from an effect body.
  const [prevIsTailing, setPrevIsTailing] = useState(isTailing);
  if (isTailing !== prevIsTailing) {
    setPrevIsTailing(isTailing);
    if (isTailing) setFallbackActive(false);
  }
  useEffect(() => {
    if (isTailing) return;
    const timer = setTimeout(() => setFallbackActive(true), TAIL_FALLBACK_GRACE_MS);
    return () => clearTimeout(timer);
  }, [isTailing]);

  const [fallbackMarket, setFallbackMarket] = useState<Partial<MarketWindow> | null>(null);
  const [fallbackLengths, setFallbackLengths] = useState<WindowLength[] | null>(null);

  useEffect(() => {
    if (!fallbackActive) return;
    let isCancelled = false;
    async function loadLiveFeed() {
      const live = await fetchLiveMarkets(selectedPair, selectedLength);
      if (!isCancelled && live) {
        setFallbackMarket({ id: live.id, isLive: live.isLive });
        if (live.isLive) {
          const odds = await fetchLiveOdds(live.id);
          if (!isCancelled && odds) {
            setFallbackMarket((prev) => ({ ...prev, greenOdds: odds.greenOdds, redOdds: odds.redOdds }));
          }
        }
      }
    }
    loadLiveFeed();
    const interval = setInterval(loadLiveFeed, REST_POLL_INTERVAL_MS);
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [fallbackActive, selectedPair, selectedLength]);

  useEffect(() => {
    if (!fallbackActive) return;
    let isCancelled = false;
    async function loadLiveLengths() {
      const lens = await fetchLiveLengths(selectedPair);
      if (!isCancelled) setFallbackLengths(lens);
    }
    loadLiveLengths();
    const interval = setInterval(loadLiveLengths, REST_POLL_INTERVAL_MS);
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [fallbackActive, selectedPair]);

  // The live tail's match for the selected pair+length, if the tail is up.
  const matchedLiveMarket = useMemo(
    () => liveMarketRows.filter(isBinaryMarket).find((m) => m.asset === selectedPair && m.interval === selectedLength),
    [liveMarketRows, selectedPair, selectedLength]
  );

  // Zero-round-trip local order book for that market (empty book when unmatched/unwatched).
  const liveOrderBook = useLiveBinaryOrderBookByMarket(matchedLiveMarket?.id);

  // Mark price off the live book, then the SDK's own raw-price -> whole-percent
  // conversion (never hand-rolled math against raw bigint quote units — see
  // the SDK's `markYesPrice`/`upPercent` in `units.ts`).
  const liveOdds = useMemo(() => {
    if (!matchedLiveMarket) return null;
    const top = { bestBid: liveOrderBook.yesBids[0]?.price, bestAsk: liveOrderBook.yesAsks[0]?.price };
    const mark = markYesPrice(top, null);
    if (mark == null) return null;
    const greenOdds = upPercent(mark, matchedLiveMarket.quoteDecimals);
    return greenOdds == null ? null : { greenOdds, redOdds: 100 - greenOdds };
  }, [matchedLiveMarket, liveOrderBook]);

  const liveLengths = useMemo(() => {
    if (fallbackActive) return fallbackLengths;
    if (!isTailing) return null; // not hydrated yet — don't flash every length as dead
    const liveSet = new Set(liveMarketRows.filter(isBinaryMarket).filter((m) => m.asset === selectedPair).map((m) => m.interval));
    return ALL_LENGTHS.filter((len) => liveSet.has(len));
  }, [fallbackActive, fallbackLengths, isTailing, liveMarketRows, selectedPair]);

  // Current market window
  const currentMarket = useMemo(() => {
    const base = getMarketWindow(selectedPair, selectedLength);
    if (fallbackActive && fallbackMarket) {
      return {
        ...base,
        id: fallbackMarket.id ?? base.id,
        isLive: fallbackMarket.isLive ?? base.isLive,
        greenOdds: fallbackMarket.greenOdds ?? base.greenOdds,
        redOdds: fallbackMarket.redOdds ?? base.redOdds,
      };
    }
    if (matchedLiveMarket) {
      return {
        ...base,
        id: matchedLiveMarket.id,
        isLive: true,
        greenOdds: liveOdds?.greenOdds ?? base.greenOdds,
        redOdds: liveOdds?.redOdds ?? base.redOdds,
      };
    }
    return base;
  }, [selectedPair, selectedLength, fallbackActive, fallbackMarket, matchedLiveMarket, liveOdds]);

  // Check if one side is >= 70%
  const isExpensiveSide = useMemo((): { isExpensive: boolean; side?: MarketSide; pct?: number } => {
    if (currentMarket.greenOdds >= 70) {
      return { isExpensive: true, side: 'green', pct: currentMarket.greenOdds };
    }
    if (currentMarket.redOdds >= 70) {
      return { isExpensive: true, side: 'red', pct: currentMarket.redOdds };
    }
    return { isExpensive: false };
  }, [currentMarket]);

  return {
    selectedPair,
    setSelectedPair,
    selectedLength,
    setSelectedLength,
    selectedAmount,
    setSelectedAmount,
    liveLengths,
    currentMarket,
    remainingSeconds,
    isExpensiveSide,
  };
}
