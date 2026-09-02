import { createPublicClient, http, formatUnits, type Address } from 'viem';
import { somniaShannon } from '@somnia-chain/markets-sdk/chains';
import { SOMNIA_TESTNET_ADDRESSES } from '@somnia-chain/markets-sdk';

const ERC20_ABI = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'symbol', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
] as const;

export interface Erc20Meta {
  symbol: string;
  decimals: number;
}

export const somniaTestnet = somniaShannon;

export const SOMNIA_CONFIG = {
  chainId: somniaShannon.id,
  chainHexId: `0x${somniaShannon.id.toString(16)}`,
  chainName: somniaShannon.name,
  rpcUrl: somniaShannon.rpcUrls.default.http[0],
  symbol: somniaShannon.nativeCurrency.symbol,
  explorerUrl: somniaShannon.blockExplorers.default.url,
};

// Singleton public client for RPC queries (read-only)
export const somniaPublicClient = createPublicClient({
  chain: somniaShannon,
  transport: http(SOMNIA_CONFIG.rpcUrl),
});

const COLLATERAL_ADDRESS = SOMNIA_TESTNET_ADDRESSES.collateral as Address;

let collateralMetaPromise: Promise<Erc20Meta> | null = null;

/** The DreamDEX binary markets' collateral ERC-20 (symbol/decimals), fetched once. */
export function fetchCollateralMeta(): Promise<Erc20Meta> {
  if (!collateralMetaPromise) {
    collateralMetaPromise = Promise.all([
      somniaPublicClient.readContract({ address: COLLATERAL_ADDRESS, abi: ERC20_ABI, functionName: 'symbol' }),
      somniaPublicClient.readContract({ address: COLLATERAL_ADDRESS, abi: ERC20_ABI, functionName: 'decimals' }),
    ])
      .then(([symbol, decimals]) => ({ symbol, decimals }))
      .catch((err: unknown) => {
        collateralMetaPromise = null;
        throw err;
      });
  }
  return collateralMetaPromise;
}

/** Reads the real on-chain collateral balance for an address, in human units. */
export async function fetchCollateralBalance(address: string): Promise<number | null> {
  try {
    const [raw, meta] = await Promise.all([
      somniaPublicClient.readContract({
        address: COLLATERAL_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address as Address],
      }),
      fetchCollateralMeta(),
    ]);
    return Number(formatUnits(raw, meta.decimals));
  } catch (err) {
    console.warn('[Somnia] Failed to read collateral balance:', err);
    return null;
  }
}

export function shortenAddress(address?: string | null): string {
  if (!address) return '';
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatCollateral(amount: number, symbol: string): string {
  return `${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${symbol}`;
}
