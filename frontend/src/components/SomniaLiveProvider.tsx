'use client';

import { useMemo } from 'react';
import { SomniaMarketsProvider } from '@somnia-chain/markets-sdk/react';
import { getExchangeClient } from '@/lib/exchange';

/**
 * Supplies the shared SomniaMarketsClient to the SDK's live-data hooks
 * (`useLiveMarkets`, `useLiveBinaryOrderBookByMarket`, ...) that
 * `lib/hooks/useMarket.ts` uses for real-time market/odds updates over the
 * chain's own WebSocket RPC — replacing what used to be a 10s REST poll.
 *
 * Must wrap `SomnixProvider` from the OUTSIDE (see `app/layout.tsx`): the
 * live-data hooks read this context via `useContext`, so they only work in a
 * descendant of this provider, not a sibling or ancestor.
 *
 * The client is created once here (constructing it does no I/O — the socket
 * opens lazily on first actual watch, see `exchange.ts#getExchangeClient`),
 * shared with every money-moving call in `exchange.ts` too.
 */
export function SomniaLiveProvider({ children }: { children: React.ReactNode }) {
  const client = useMemo(() => getExchangeClient(), []);
  return <SomniaMarketsProvider client={client}>{children}</SomniaMarketsProvider>;
}
