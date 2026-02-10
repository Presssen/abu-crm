import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['openai'],
  async headers() {
    return [
      {
        source: '/chat-widget',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors *",
          },
          // Delete X-Frame-Options by not including it, or setting it to a value that browsers willing to use CSP will likely ignore or override. 
          // However, Next.js/Vercel often injects SAMEORIGIN if missing. 
          // Setting it to ALLOWALL is a common workaround but non-standard.
          // A better approach is to rely on CSP which supersedes XFO in modern browsers.
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
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
            value: 'GET, OPTIONS',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
