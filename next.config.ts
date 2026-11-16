import type { NextConfig } from "next";

// Scripts may only send data to Spool itself and to GitHub, and images load only from Spool, GitHub avatars and
// GSoC logos, so a pasted token can't leave by a request or an image URL.
const CSP = [
  "connect-src 'self' https://api.github.com",
  "img-src 'self' data: blob: https://avatars.githubusercontent.com https://summerofcode.withgoogle.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  async headers() {
    // Dev needs its hot-reload socket, so the policy applies to production builds only.
    if (process.env.NODE_ENV !== "production") return [];
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
