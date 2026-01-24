'use client';

import { WagmiProvider, createConfig, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, getDefaultWallets, darkTheme } from '@rainbow-me/rainbowkit';
import farcasterConnector from '@farcaster/miniapp-wagmi-connector';
import '@rainbow-me/rainbowkit/styles.css';

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

// Get default wallets from RainbowKit v1
const { connectors } = getDefaultWallets({
    appName: 'PrivateVeil',
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
    chains: [monadTestnet],
});

// Create wagmi config with RainbowKit v1 + Farcaster connector
const config = createConfig({
    chains: [monadTestnet],
    connectors: [
        farcasterConnector(), // Farcaster wallet for mini app
        ...connectors, // RainbowKit default wallets
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
                <RainbowKitProvider
                    chains={[monadTestnet]}
                    theme={darkTheme({
                        accentColor: '#00F5FF',
                        accentColorForeground: '#0A0A0F',
                        borderRadius: 'medium',
                    })}
                >
                    {children}
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
