import { SomniaMarkets, SOMNIA_TESTNET_ADDRESSES } from "@somnia-chain/markets-sdk";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import { serverEnv } from "./env";

const CACHE_TTL_MS = 5_000;

type CacheEntry<T> = { value: T; expiresAt: number };

const cache = new Map<string, CacheEntry<unknown>>();

let exchange: SomniaMarkets | undefined;

function getExchange() {
  if (!exchange) {
    const adminSecret = serverEnv.DREAMDEX_INDEXER_ADMIN_SECRET;
    exchange = new SomniaMarkets({
      chain: somniaShannon,
      indexerUrl: serverEnv.DREAMDEX_INDEXER_URL,
      addresses: SOMNIA_TESTNET_ADDRESSES,
      ...(adminSecret
        ? { indexerHeaders: { "x-hasura-admin-secret": adminSecret } }
        : {}),
    });
  }
  return exchange;
}

async function withCache<T>(key: string, load: () => Promise<T>): Promise<T> {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value as T;
  }

  const value = await load();
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}

export function getLiveMarkets() {
  return withCache("markets", () => getExchange().client.listLiveBinaryMarkets());
}

export async function getOrderBook(marketId: string) {
  return withCache(`orderbook:${marketId}`, async () => {
    const market = await getExchange().client.getMarket(marketId);
    if (!market) {
      throw new Error(`Unknown market: ${marketId}`);
    }
    return getExchange().client.getBinaryOrderBook(market.poolAddress);
  });
}
