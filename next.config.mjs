/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['images.unsplash.com', 'localhost'],
    unoptimized: true
  },
  async rewrites() {
    const railsApiUrl = process.env.RAILS_API_URL || 'http://127.0.0.1:3001';
    return [
      {
        source: '/rails-api/:path*',
        destination: `${railsApiUrl}/api/:path*`,
      },
    ];
  }
};

export default nextConfig;
