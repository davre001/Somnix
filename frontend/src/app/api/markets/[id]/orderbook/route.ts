import { getOrderBook } from '@/lib/server/dreamdex';
import { apiOk, apiError, apiRoute } from '@/lib/server/http';

export const GET = apiRoute(async (_req, { params }) => {
  const { id } = await params;
  try {
    const orderBook = await getOrderBook(id);
    return apiOk({ marketId: id, orderBook });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[${new Date().toISOString()}] [ERROR] Failed to load order book for market ${id}:`, message);
    return apiError(502, 'Failed to load order book from DreamDEX indexer', { marketId: id, detail: message });
  }
});
