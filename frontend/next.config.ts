import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize for faster development builds
  experimental: {
    // Enable optimized package imports - reduces bundle parsing time
    optimizePackageImports: [
      'lucide-react',
      '@rainbow-me/rainbowkit',
      'wagmi',
      'viem',
      'ethers'
    ],
  },

  // Skip type checking during dev (faster HMR)
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },
};

export default nextConfig;
