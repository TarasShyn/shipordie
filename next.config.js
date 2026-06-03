import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

// Exposes the Cloudflare bindings (the KV namespace) to `next dev` via Miniflare,
// so the live-posts store works the same locally as in production.
initOpenNextCloudflareForDev();

/** @type {import('next').NextConfig} */
const nextConfig = {
  // The r3f game components rely on JSX intrinsics three.js adds at runtime; the
  // strict TS check runs via `pnpm check-types`, so don't block builds on it.
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizePackageImports: ['@react-three/drei', '@react-three/fiber'],
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
