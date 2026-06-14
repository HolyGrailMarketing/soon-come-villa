'use client';
// Self-contained responsive nav for the React pages. Does NOT depend on
// webflow.js (which isn't loaded here) — the mobile menu toggles via React state.
import { useState } from 'react';

const GOLD = '#d4af37';
const LINKS = [
  { href: '/index.html', label: 'Home' },
  { href: '/packages', label: 'Weddings' },
  { href: '/ballroom', label: 'Events' },
  { href: '/contact-us.html', label: 'Contact' },
];

export default function SiteNav() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="snav">
      <div className="snav-in">
        <a href="/index.html" className="snav-brand" onClick={close}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/SOON-COME-logo2.avif" alt="Soon Come Villa" />
        </a>

        <button
          className="snav-burger"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <span className={open ? 'x1' : ''} />
          <span className={open ? 'x2' : ''} />
          <span className={open ? 'x3' : ''} />
        </button>

        <nav className={`snav-links ${open ? 'snav-open' : ''}`}>
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="snav-link" onClick={close}>{l.label}</a>
          ))}
          <a href="/rooms" className="snav-cta" onClick={close}>Book Now</a>
        </nav>
      </div>

      <style jsx>{`
        .snav { position: sticky; top: 0; z-index: 50; background: #fff; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
        .snav-in { max-width: 1100px; margin: 0 auto; padding: 10px 20px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
        .snav-brand { display: inline-flex; align-items: center; }
        .snav-brand img { height: 44px; width: auto; }
        .snav-links { display: flex; align-items: center; gap: 22px; }
        .snav-link { color: #2a2a2a; font-weight: 600; font-size: 15px; text-decoration: none; }
        .snav-link:hover { color: ${GOLD}; }
        .snav-cta { background: ${GOLD}; color: #1a1a1a; font-weight: 700; padding: 9px 18px; border-radius: 999px; text-decoration: none; }
        .snav-cta:hover { filter: brightness(1.05); }
        .snav-burger { display: none; flex-direction: column; gap: 5px; background: none; border: 0; padding: 8px; cursor: pointer; }
        .snav-burger span { display: block; width: 24px; height: 2px; background: #1a1a1a; transition: transform .2s, opacity .2s; }
        .snav-burger .x1 { transform: translateY(7px) rotate(45deg); }
        .snav-burger .x2 { opacity: 0; }
        .snav-burger .x3 { transform: translateY(-7px) rotate(-45deg); }

        @media (max-width: 820px) {
          .snav-burger { display: flex; }
          .snav-links {
            position: absolute; top: 100%; left: 0; right: 0; background: #fff;
            flex-direction: column; align-items: stretch; gap: 0;
            box-shadow: 0 12px 20px rgba(0,0,0,.12); border-top: 1px solid #eee;
            max-height: 0; overflow: hidden; transition: max-height .25s ease;
          }
          .snav-open { max-height: 380px; }
          .snav-link { padding: 14px 22px; border-bottom: 1px solid #f0f0f0; }
          .snav-cta { margin: 14px 22px 18px; text-align: center; }
        }
      `}</style>
    </header>
  );
}
