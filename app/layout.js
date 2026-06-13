// Root layout for the React (booking + admin) pages. Loads the same Webflow
// stylesheets the static marketing HTML uses (served from /public/css) so the
// React pages look identical, plus Flatpickr's stylesheet for the date pickers.
export const metadata = {
  title: 'Soon Come Villa',
  description: 'Luxury villa rental in Runaway Bay, Jamaica — book your stay.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/css/normalize.css" />
        <link rel="stylesheet" href="/css/webflow.css" />
        <link rel="stylesheet" href="/css/soon-come-villa-7c6e6b.webflow.css" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css"
        />
        <link rel="icon" type="image/png" href="/images/favicon.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
