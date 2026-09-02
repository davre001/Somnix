import { defineChain } from 'viem';

export const somniaTestnet = defineChain({
  id: 50312,
  name: 'Somnia Shannon Testnet',
  nativeCurrency: {
    name: 'Somnia Testnet Token',
    symbol: 'STT',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://dream-rpc.somnia.network'],
    },
    public: {
      http: ['https://dream-rpc.somnia.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Somnia Explorer',
      url: 'https://shannon-explorer.somnia.network',
    },
  },
  testnet: true,
});

export const SOMNIA_CONFIG = {
  chainId: 50312,
  chainName: 'Somnia Testnet',
  rpcUrl: 'https://dream-rpc.somnia.network',
  symbol: 'STT',
  explorerUrl: 'https://shannon-explorer.somnia.network',
  dreamDexRouter: '0x16b0F9f24E6b9df2f6B58F2e434E0a382Da42e1e',
  mockEventContract: '0x87aC81C06d15dBeFF89c37264aD14532B84C82eD',
};

export function shortenAddress(address?: string | null): string {
  if (!address) return '';
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatSTT(amount: number): string {
  return `${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} STT`;
}
