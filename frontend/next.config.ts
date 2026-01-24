import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},

  webpack: (config, { isServer, webpack }) => {
    // Completely ignore problematic packages
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^(bench|test)\.js$/,
        contextRegExp: /thread-stream|pino/,
      })
    );

    // Add fallbacks for Node.js modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        'pino-pretty': false,
      };
    }

    return config;
  },

  // Transpile problematic packages
  transpilePackages: ['@walletconnect/ethereum-provider', '@walletconnect/universal-provider'],
};

export default nextConfig;
