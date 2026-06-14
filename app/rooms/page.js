'use client';
import { useEffect, useState } from 'react';
import SiteNav from '@/components/SiteNav.js';
import { fetchUnits } from '@/lib/booking-client.js';

const GOLD = '#d4af37';

const OPTIONS = [
  {
    slug: 'entire-villa',
    href: '/entire-villa',
    name: 'Entire Villa',
    tag: 'Whole property',
    img: '/images/DJI_20250418_135147_358.avif',
    blurb: 'The whole estate to yourself — ideal for families and groups.',
    rateKey: 'nightly_rate', rateFallback: 600, rateUnit: '/ night',
    features: ['Sleeps 8', '4 en-suite bedrooms', 'Private pool & gardens', '2-night minimum'],
    cta: 'Book Entire Villa',
  },
  {
    slug: 'room-1',
    href: '/book-room',
    name: 'Single Room',
    tag: 'Best value',
    img: '/images/DJI_20250418_132609_428.avif',
    blurb: 'A private en-suite bedroom with full access to shared amenities.',
    rateKey: 'nightly_rate', rateFallback: 160, rateUnit: '/ night',
    features: ['Sleeps 2', 'En-suite bathroom', 'Shared pool access', '2-night minimum'],
    cta: 'Book a Room',
  },
  {
    slug: 'ballroom',
    href: '/ballroom',
    name: 'The Ballroom',
    tag: 'Events',
    img: '/images/DJI_20250418_165327_3.avif',
    blurb: 'An air-conditioned venue for weddings, parties, and celebrations.',
    rateKey: 'flat_day_rate', rateFallback: 1500, rateUnit: '/ day',
    features: ['100+ guests', 'Air-conditioned hall', 'Lawn, garden & gazebo', 'Full-day exclusive'],
    cta: 'Book the Ballroom',
  },
];

export default function RoomsPage() {
  const [units, setUnits] = useState(null);
  useEffect(() => { fetchUnits().then(setUnits).catch(() => {}); }, []);

  const rate = (o) => {
    const u = units?.[o.slug];
    const v = u ? Number(u[o.rateKey]) : o.rateFallback;
    return Number.isFinite(v) ? v : o.rateFallback;
  };

  return (
    <>
      <SiteNav />
      <main className="rooms-main">
        <header className="rooms-hero">
          <h1 className="heading rooms-title">Choose Your Stay</h1>
          <p className="paragraph rooms-sub">
            Book the whole villa, a single room, or our event ballroom — reserve instantly and pay securely online.
          </p>
        </header>

        <div className="room-grid">
          {OPTIONS.map((o) => (
            <article key={o.slug} className="room-card">
              <div className="room-img" style={{ backgroundImage: `url(${o.img})` }}>
                <span className="room-tag">{o.tag}</span>
                <span className="room-price">
                  <em>US ${rate(o).toLocaleString()}</em> {o.rateUnit}
                </span>
              </div>
              <div className="room-body">
                <h2 className="room-name">{o.name}</h2>
                <p className="room-blurb">{o.blurb}</p>
                <ul className="room-feats">
                  {o.features.map((f) => <li key={f}>{f}</li>)}
                </ul>
                <a href={o.href} className="button button-primary w-button room-cta">{o.cta}</a>
              </div>
            </article>
          ))}
        </div>

        <p className="rooms-foot">
          Questions before booking? <a href="/contact-us.html">Contact us</a> ·{' '}
          <a href="/cancellation-refund-policy.html">Cancellation policy</a>
        </p>
      </main>

      <style jsx>{`
        .rooms-main { padding: 8px 16px 64px; }
        .rooms-hero { text-align: center; max-width: 720px; margin: 0 auto; padding: 32px 8px 8px; }
        .rooms-title { margin-bottom: 8px; }
        .rooms-sub { color: #555; }
        .room-grid {
          display: grid; gap: 28px; max-width: 1080px; margin: 32px auto 0;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        }
        .room-card {
          display: flex; flex-direction: column; background: #fff; border-radius: 16px;
          overflow: hidden; box-shadow: 0 6px 24px rgba(0,0,0,.08);
          border: 1px solid #eee; transition: transform .2s ease, box-shadow .2s ease;
        }
        .room-card:hover { transform: translateY(-6px); box-shadow: 0 16px 40px rgba(0,0,0,.16); }
        .room-img {
          position: relative; height: 210px; background-size: cover; background-position: center;
        }
        .room-tag {
          position: absolute; top: 12px; left: 12px; background: rgba(0,0,0,.6); color: #fff;
          font-size: 12px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase;
          padding: 5px 10px; border-radius: 999px;
        }
        .room-price {
          position: absolute; bottom: 12px; right: 12px; background: ${GOLD}; color: #1a1a1a;
          font-size: 14px; padding: 6px 12px; border-radius: 999px; font-weight: 500;
          box-shadow: 0 2px 8px rgba(0,0,0,.2);
        }
        .room-price em { font-style: normal; font-weight: 800; }
        .room-body { display: flex; flex-direction: column; gap: 12px; padding: 22px; flex: 1; }
        .room-name { margin: 0; font-size: 24px; }
        .room-blurb { margin: 0; color: #555; font-size: 15px; line-height: 1.5; }
        .room-feats { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
        .room-feats li { position: relative; padding-left: 26px; font-size: 14px; color: #333; }
        .room-feats li::before {
          content: "✓"; position: absolute; left: 0; top: 0; color: ${GOLD}; font-weight: 800;
        }
        .room-cta { margin-top: auto; text-align: center; }
        .rooms-foot { text-align: center; margin: 40px auto 0; color: #666; }
        @media (max-width: 600px) { .room-img { height: 180px; } }
      `}</style>
    </>
  );
}
