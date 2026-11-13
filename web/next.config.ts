import path from "path";
import type { NextConfig } from "next";

const backendBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1')
  .replace(/\/api\/v1\/?$/, '')
  .replace(/\/+$/, '');

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendBase}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
