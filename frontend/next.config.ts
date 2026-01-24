import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},

  webpack: (config, { isServer }) => {
    // Ignore test files in node_modules
    config.resolve.alias = {
      ...config.resolve.alias,
      // Prevent importing test and bench files
      'thread-stream/test': false,
      'thread-stream/bench': false,
      'thread-stream/bench.js': false,
      'pino/test': false,
      'pino/bench': false,
      'pino/bench.js': false,
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
