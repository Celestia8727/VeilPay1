'use client';

import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, getDefaultConfig, darkTheme } from '@rainbow-me/rainbowkit';
import { injected } from 'wagmi/connectors';
import { farcasterConnector } from '@farcaster/miniapp-wagmi-connector';
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

// Create wagmi config with Farcaster connector for mini app
const config = createConfig({
    chains: [monadTestnet, sepolia],
    connectors: [
        farcasterConnector(), // Farcaster wallet for mini app
        injected(), // Browser wallets (MetaMask, etc.) for web
    ],
    transports: {
        [monadTestnet.id]: http('https://testnet-rpc.monad.xyz'),
        [sepolia.id]: http(),
    },
    ssr: true,
});

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: React.ReactNode }) {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider
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
