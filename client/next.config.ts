import type { NextConfig } from "next";

// Backend URLs live in SERVER-ONLY env vars (API_URL, PDF_API_URL) — set them
// in the Vercel dashboard. They are never prefixed with NEXT_PUBLIC_, so they
// never appear in the browser bundle. The browser talks to same-origin paths
// and Next.js rewrites proxy the requests server-side.
const API_URL = process.env.API_URL ;
const PDF_API_URL = process.env.PDF_API_URL ;

// Production-only headers. X-Frame-Options DENY stops clickjacking and
// third-party embedding; the rest is standard hardening. (A full CSP is
// intentionally not set yet — inline scripts from AdSense/Analytics make
// nonce-based CSP fiddly; revisit if those are ever removed.)
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  // Don't advertise the framework version (X-Powered-By: Next.js).
  poweredByHeader: false,

  // Strip console.* from the production browser bundle (keeps error/warn so
  // real issues still surface) — shrinks output and removes dev chatter.
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? { exclude: ['error', 'warn'] }
        : undefined,
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
  async rewrites() {
    return [
      // /backend/* → main API server (auth, departments, syllabus, …)
      { source: '/backend/:path*', destination: `${API_URL}/:path*` },
      // /pdfapi/* → PDF microservice (PYQ CRUD, watermarked PDFs)
      { source: '/pdfapi/:path*', destination: `${PDF_API_URL}/:path*` },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
