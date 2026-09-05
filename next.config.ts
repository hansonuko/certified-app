import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Certificate PDFs are re-encoded server-side (CLAUDE.md rule #8) and served
  // through app routes, not next/image — no remote image domains needed yet.
};

export default nextConfig;
