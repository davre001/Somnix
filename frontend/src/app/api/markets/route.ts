import { getLiveMarkets } from '@/lib/server/dreamdex';
import { apiOk, apiError, apiRoute } from '@/lib/server/http';

export const GET = apiRoute(async () => {
  try {
    const markets = await getLiveMarkets();
    return apiOk({ markets });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[${new Date().toISOString()}] [ERROR] Failed to load live markets:`, message);
    return apiError(502, 'Failed to load live markets from DreamDEX indexer', { detail: message });
  }
});
