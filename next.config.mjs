/** @type {import('next').NextConfig} */
const nextConfig = {
  // Preserve every existing link with zero edits to the static marketing HTML:
  //  - `/` serves the static homepage from /public (no app/page.js owns `/`).
  //  - legacy `*.html` links resolve to the new React routes.
  async rewrites() {
    return [
      { source: '/', destination: '/index.html' },
      { source: '/rooms.html', destination: '/rooms' },
      { source: '/entire-villa.html', destination: '/entire-villa' },
      { source: '/ballroom.html', destination: '/ballroom' },
      { source: '/book-room.html', destination: '/book-room' },
      { source: '/confirmation.html', destination: '/confirmation' },
      { source: '/admin.html', destination: '/admin' },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
      {
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
      // Long-cache immutable static assets (served from /public).
      ...['images', 'css', 'videos', 'fonts'].map((dir) => ({
        source: `/${dir}/:path*`,
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      })),
    ];
  },
};

export default nextConfig;
