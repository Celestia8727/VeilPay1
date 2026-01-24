import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},

  webpack: (config, { isServer }) => {
    // Ignore test files in node_modules
    config.resolve.alias = {
      ...config.resolve.alias,
      // Prevent importing test files
      'thread-stream/test': false,
      'pino/test': false,
    };

    // Add fallbacks for Node.js modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }

    return config;
  },

  // Transpile problematic packages
  transpilePackages: ['@walletconnect/ethereum-provider', '@walletconnect/universal-provider'],
};

export default nextConfig;
