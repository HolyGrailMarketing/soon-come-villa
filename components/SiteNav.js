// Shared top navigation for the React pages, reusing the Webflow navbar classes
// so it matches the static marketing pages. Marketing links point at the static
// HTML in /public; booking links point at the React routes.
export default function SiteNav() {
  return (
    <div className="navbar-logo-center">
      <div role="banner" className="navbar-logo-center-container shadow-three w-nav">
        <div className="navbar-wrapper-three">
          <a href="/index.html" className="navbar-brand-three w-nav-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/SOON-COME-logo2.avif" width="360" alt="Soon Come Villa Logo" className="image-2" />
          </a>
          <nav role="navigation" className="nav-menu-wrapper-three w-nav-menu">
            <div className="nav-menu-three">
              <ul role="list" className="nav-menu-block w-list-unstyled">
                <li><a href="/index.html" className="nav-link">Home</a></li>
                <li><a href="/packages" className="nav-link">Weddings</a></li>
                <li><a href="/ballroom" className="nav-link">Events</a></li>
                <li><a href="/contact-us.html" className="nav-link">Contact</a></li>
              </ul>
              <ul role="list" className="nav-menu-block w-list-unstyled">
                <li><a href="/rooms" className="button button-primary w-button">Book Now</a></li>
              </ul>
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}
