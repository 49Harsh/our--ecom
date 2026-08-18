/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'placehold.co' },
    ],
  },
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  // Skip static optimization — all pages are dynamic (API-driven)
  staticPageGenerationTimeout: 10,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'https://roshe-api.onrender.com/api/v1'}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
