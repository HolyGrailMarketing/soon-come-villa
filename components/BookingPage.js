'use client';
// Shared shell for the booking pages: a hero image with a live price chip, a
// feature strip, and a card that frames the BookingWidget. Matches the /rooms look.
import { useEffect, useState } from 'react';
import SiteNav from '@/components/SiteNav.js';
import { fetchUnits } from '@/lib/booking-client.js';

const GOLD = '#d4af37';

export default function BookingPage({
  slug,                 // unit slug to read the rate from (room-1 for single rooms)
  rateKey = 'nightly_rate',
  rateUnit = '/ night',
  rateFallback,
  heroImg,
  title,
  subtitle,
  features = [],
  children,             // the <BookingWidget />
}) {
  const [rate, setRate] = useState(rateFallback);
  useEffect(() => {
    fetchUnits().then((u) => {
      const v = u?.[slug] ? Number(u[slug][rateKey]) : NaN;
      if (Number.isFinite(v)) setRate(v);
    }).catch(() => {});
  }, [slug, rateKey]);

  return (
    <>
      <SiteNav />
      <main className="bp-main">
        <header className="bp-hero" style={{ backgroundImage: `url(${heroImg})` }}>
          <div className="bp-hero-inner">
            {rate != null && (
              <span className="bp-price"><em>US ${Number(rate).toLocaleString()}</em> {rateUnit}</span>
            )}
            <h1 className="bp-title">{title}</h1>
            <p className="bp-sub">{subtitle}</p>
          </div>
        </header>

        {features.length > 0 && (
          <ul className="bp-features">
            {features.map((f) => <li key={f}>{f}</li>)}
          </ul>
        )}

        <div className="bp-card">{children}</div>

        <p className="bp-foot">
          <a href="/rooms">← All stays</a> · <a href="/house-rules.html">House rules</a> ·{' '}
          <a href="/cancellation-refund-policy.html">Cancellation policy</a>
        </p>
      </main>

      <style jsx>{`
        .bp-main { padding-bottom: 64px; }
        .bp-hero {
          position: relative; min-height: 360px; display: flex; align-items: flex-end;
          background-size: cover; background-position: center; color: #fff;
        }
        .bp-hero::after {
          content: ""; position: absolute; inset: 0;
          background: linear-gradient(180deg, rgba(0,0,0,.15) 0%, rgba(0,0,0,.75) 100%);
        }
        .bp-hero-inner {
          position: relative; z-index: 1; max-width: 1080px; width: 100%;
          margin: 0 auto; padding: 32px 24px 40px;
        }
        .bp-price {
          display: inline-block; background: ${GOLD}; color: #1a1a1a; font-size: 15px;
          padding: 6px 14px; border-radius: 999px; margin-bottom: 14px; font-weight: 500;
        }
        .bp-price em { font-style: normal; font-weight: 800; }
        .bp-title { margin: 0 0 8px; font-size: 40px; line-height: 1.1; color: #fff; }
        .bp-sub { margin: 0; font-size: 17px; max-width: 620px; color: rgba(255,255,255,.92); }
        .bp-features {
          list-style: none; display: flex; flex-wrap: wrap; gap: 10px 22px; justify-content: center;
          max-width: 1080px; margin: 0 auto; padding: 22px 24px; border-bottom: 1px solid #eee;
        }
        .bp-features li { position: relative; padding-left: 24px; font-size: 14px; color: #333; }
        .bp-features li::before { content: "✓"; position: absolute; left: 0; color: ${GOLD}; font-weight: 800; }
        .bp-card {
          max-width: 680px; margin: 32px auto 0; background: #fff; border: 1px solid #eee;
          border-radius: 16px; box-shadow: 0 6px 24px rgba(0,0,0,.08); overflow: hidden;
        }
        .bp-foot { text-align: center; margin: 32px auto 0; color: #666; }
        @media (max-width: 600px) {
          .bp-hero { min-height: 280px; }
          .bp-title { font-size: 30px; }
        }
      `}</style>
    </>
  );
}
