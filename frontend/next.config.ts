import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config, { isServer }) => {
    // Exclude test files from the build
    config.module.rules.push({
      test: /\.test\.(js|jsx|ts|tsx)$/,
      loader: 'ignore-loader'
    });

    // Exclude node_modules test directories
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push({
        'tap': 'commonjs tap',
        'jest': 'commonjs jest',
      });
    }

    return config;
  },
  // Ignore test files during build
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'].filter(ext => !ext.includes('test')),
};

export default nextConfig;
