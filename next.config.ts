import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.API_URL,
  },
  // Exclude Node.js-only packages from bundling (pulled in by WalletConnect)
  serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream'],
  async rewrites() {
    const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) return [];
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
  // Turbopack config (Next.js 16+ default bundler)
  turbopack: {
    resolveAlias: {
      "react-native": "react-native-web",
      "@react-native-async-storage/async-storage": { browser: "" } as any,
      "react-native-keychain": { browser: "" } as any,
      "pino": { browser: "" } as any,
      "pino-pretty": { browser: "" } as any,
      "thread-stream": { browser: "" } as any,
    },
  },
  // Webpack fallback (for compatibility)
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "react-native$": "react-native-web",
      "@react-native-async-storage/async-storage": false,
      "react-native-keychain": false,
      "pino": false,
      "pino-pretty": false,
      "thread-stream": false,
    };
    return config;
  },
};

export default nextConfig;
