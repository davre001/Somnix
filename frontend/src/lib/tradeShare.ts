import { WindowPair, WindowLength, MarketSide, UserLock, RecentWindow } from './types';

export interface SharedTradeData {
  id: string;
  pair: WindowPair;
  length: WindowLength;
  side: MarketSide;
  amount: number;
  startPrice: number;
  endPrice?: number;
  lockedAt: number;
  hidePriceUntil?: number;
  status: 'locked' | 'won' | 'lost' | 'claimed' | 'resolved';
  resultSide?: MarketSide;
  userWon?: boolean;
  txHash?: string;
  payout?: number;
}

/**
 * Encodes trade data into a shareable URL
 */
export function generateTradeShareUrl(trade: SharedTradeData): string {
  if (typeof window === 'undefined') return '';
  
  const payload = {
    id: trade.id,
    p: trade.pair,
    l: trade.length,
    s: trade.side,
    a: trade.amount,
    sp: trade.startPrice,
    ep: trade.endPrice,
    la: trade.lockedAt,
    u: trade.hidePriceUntil,
    st: trade.status,
    rs: trade.resultSide,
    w: trade.userWon,
    tx: trade.txHash,
    po: trade.payout,
  };

  try {
    const json = JSON.stringify(payload);
    const encoded = btoa(encodeURIComponent(json));
    return `${window.location.origin}/trade?data=${encoded}`;
  } catch {
    // Fallback to query params
    const params = new URLSearchParams({
      id: trade.id,
      pair: trade.pair,
      len: trade.length,
      side: trade.side,
      amt: trade.amount.toString(),
      start: trade.startPrice.toString(),
    });
    return `${window.location.origin}/trade?${params.toString()}`;
  }
}

/**
 * Decodes shared trade data from URLSearchParams
 */
export function decodeTradeShareUrl(searchParams: URLSearchParams): SharedTradeData | null {
  const dataParam = searchParams.get('data');
  if (dataParam) {
    try {
      const decoded = decodeURIComponent(atob(dataParam));
      const p = JSON.parse(decoded);
      return {
        id: p.id || 'SX-TRADE',
        pair: p.p || 'BTC',
        length: p.l || '15m',
        side: p.s || 'green',
        amount: Number(p.a) || 10,
        startPrice: Number(p.sp) || 92450,
        endPrice: p.ep ? Number(p.ep) : undefined,
        lockedAt: Number(p.la) || Date.now(),
        hidePriceUntil: p.u ? Number(p.u) : undefined,
        status: p.st || 'locked',
        resultSide: p.rs,
        userWon: p.w,
        txHash: p.tx,
        payout: p.po ? Number(p.po) : undefined,
      };
    } catch (e: unknown) {
      console.error('Failed to decode trade data:', e);
    }
  }

  // Fallback query parameters
  const pair = (searchParams.get('pair') as WindowPair) || 'BTC';
  const len = (searchParams.get('len') as WindowLength) || '15m';
  const side = (searchParams.get('side') as MarketSide) || 'green';
  const amt = Number(searchParams.get('amt')) || 10;
  const startPrice = Number(searchParams.get('start')) || 92450;
  const endPrice = searchParams.get('end') ? Number(searchParams.get('end')) : undefined;

  return {
    id: searchParams.get('id') || 'SX-TRADE',
    pair,
    length: len,
    side,
    amount: amt,
    startPrice,
    endPrice,
    lockedAt: Number(searchParams.get('lockedAt')) || Date.now(),
    status: endPrice ? ((searchParams.get('status') as SharedTradeData['status']) || 'resolved') : 'locked',
    txHash: searchParams.get('tx') || undefined,
  };
}

/**
 * Converts a UserLock into SharedTradeData
 */
export function userLockToSharedTrade(lock: UserLock, won?: boolean, resultSide?: MarketSide): SharedTradeData {
  return {
    id: lock.id,
    pair: lock.pair,
    length: lock.length,
    side: lock.side,
    amount: lock.amount,
    startPrice: lock.startPrice,
    lockedAt: lock.lockedAt,
    hidePriceUntil: lock.hidePriceUntil,
    status: lock.status,
    resultSide,
    userWon: won,
    txHash: lock.txHash,
    payout: lock.payout,
  };
}

/**
 * Converts a RecentWindow into SharedTradeData
 */
export function recentWindowToSharedTrade(recent: RecentWindow): SharedTradeData {
  return {
    id: recent.id,
    pair: recent.pair,
    length: recent.length,
    side: recent.userSide || recent.resultSide,
    amount: recent.userAmount || 10,
    startPrice: recent.startPrice,
    lockedAt: recent.startTime,
    hidePriceUntil: recent.endTime,
    status: recent.claimed ? 'claimed' : (recent.userResult === 'right' ? 'won' : 'lost'),
    resultSide: recent.resultSide,
    userWon: recent.userResult === 'right',
    txHash: recent.txHash,
    payout: recent.userPayout,
  };
}
