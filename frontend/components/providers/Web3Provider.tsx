'use client';

import { WagmiProvider, createConfig, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { injected } from 'wagmi/connectors';
import farcasterConnector from '@farcaster/miniapp-wagmi-connector';

// Define Monad Testnet
export const monadTestnet = {
    id: 10143,
    name: 'Monad Testnet',
    nativeCurrency: {
        decimals: 18,
        name: 'Monad',
        symbol: 'MON',
    },
    rpcUrls: {
        default: { http: ['https://testnet-rpc.monad.xyz'] },
        public: { http: ['https://testnet-rpc.monad.xyz'] },
    },
    blockExplorers: {
        default: { name: 'Monad Explorer', url: 'https://explorer.testnet.monad.xyz' },
    },
    testnet: true,
} as const;

// Create wagmi config WITHOUT RainbowKit to avoid WalletConnect issues
const config = createConfig({
    chains: [monadTestnet],
    connectors: [
        farcasterConnector(), // Farcaster wallet for mini app
        injected(), // Browser wallets (MetaMask, etc.) for web
    ],
    transports: {
        [monadTestnet.id]: http('https://testnet-rpc.monad.xyz'),
    },
    ssr: true,
});

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: React.ReactNode }) {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </WagmiProvider>
    );
}
