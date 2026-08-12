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
      // Cache static assets from /public, but NOT as `immutable`: these are
      // Webflow-exported filenames without a content hash, so a URL's bytes can
      // change (asset swapped) and — critically — Next applies these headers to
      // 404s too. `immutable` pinned missing-image 404s in the CDN and in every
      // visitor's browser for a year, so an asset added later never loaded.
      // max-age + ETag revalidation keeps it fast and lets mistakes self-heal.
      ...['images', 'css', 'videos', 'fonts'].map((dir) => ({
        source: `/${dir}/:path*`,
        headers: [{ key: 'Cache-Control', value: 'public, max-age=3600, must-revalidate' }],
      })),
    ];
  },
};

export default nextConfig;
