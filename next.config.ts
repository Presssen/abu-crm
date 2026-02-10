import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['openai'],
  async headers() {
    return [
      {
        source: '/chat-widget',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors *",
          },
        ],
      },
      {
        source: '/embed.js',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
