import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Offline connectivity detection: failed navigations, prefetches, and
    // Server Actions stay pending and retry when the connection returns,
    // and Client Components can read the state via useOffline().
    useOffline: true,
    // Keep fully-prefetched static pages in the client cache long enough to
    // cover a flight; the default 5 minutes makes offline navigation break
    // as soon as prefetches expire.
    staleTimes: {
      static: 60 * 60 * 24,
    },
  },
};

export default nextConfig;
