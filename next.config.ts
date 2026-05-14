import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.API_URL,
  },
  // Exclude Node.js-only packages from bundling (pulled in by WalletConnect)
  serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream'],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.API_URL}/api/:path*`,
      },
    ];
  },
  // Turbopack config (Next.js 16+ default bundler)
  turbopack: {
    resolveAlias: {
      "react-native": "react-native-web",
      "@react-native-async-storage/async-storage": { browser: "" },
      "react-native-keychain": { browser: "" },
      // Stub out pino for browser builds
      "pino": { browser: "" },
      "thread-stream": { browser: "" },
    },
  },
  // Webpack fallback (for compatibility)
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "react-native$": "react-native-web",
      "@react-native-async-storage/async-storage": false,
      "react-native-keychain": false,
    };
    return config;
  },
};

export default nextConfig;
