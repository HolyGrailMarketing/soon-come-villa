'use client';
import { useEffect, useRef, useState } from 'react';
import SiteNav from '@/components/SiteNav.js';
import PackageQuote from '@/components/PackageQuote.js';

const GOLD = '#d4af37';
const jmd = (n) => 'J$' + Math.round(Number(n) || 0).toLocaleString();

const TERMS = [
  'Packages exclude decorations and unique amenities (tents, cake, garments, guest books, flowers, games, fireworks, security). We recommend our preferred vendors for your decor.',
  'Videography, online streaming, and photography are not included, but we can recommend preferred vendors.',
  'Wines, champagne, and liquors are not included; a bar is available with a bartender at an additional rate.',
  'The PA and music system are included; the DJ and team are contracted at an additional rate.',
  'Additional rooms after the event are charged at the standard room rate of US$150.00 per room per night — book ahead.',
  'Support personnel (makeup artists, decorators, musicians) count toward your guest list if present; share their details in advance for clearance.',
  'Your guest list must include the members of your bridal party.',
  'A 50% deposit is encouraged once you choose your package and receive the quotation; full payment is due one month before the event.',
  'In the event of a natural disaster or act of God, we will gladly help you reschedule at no additional cost.',
  'We recommend scheduling a venue walk-through so we can address all your questions as we coordinate your perfect day.',
];

export default function PackagesPage() {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const quoteRef = useRef(null);

  useEffect(() => {
    fetch('/api/packages').then((r) => r.json()).then(setData).catch(() => {});
  }, []);

  const packages = data?.packages || [];
  const addons = data?.addons || [];
  const selPkg = packages.find((p) => p.slug === selected);

  function choose(slug) {
    setSelected(slug);
    setTimeout(() => quoteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  return (
    <>
      <SiteNav />
      <main className="pk-main">
        <header className="pk-hero" style={{ backgroundImage: 'url(/images/DJI_20250418_165327_3.avif)' }}>
          <div className="pk-hero-in">
            <span className="pk-eyebrow">Weddings at Soon Come Villa</span>
            <h1 className="pk-title">“I Do” Packages</h1>
            <p className="pk-sub">Three curated wedding experiences in Runaway Bay — select a package, customize it, and request your quote.</p>
          </div>
        </header>

        <div className="pk-cards">
          {packages.map((p) => {
            const from = p.tiers?.[0]?.venueCost;
            return (
              <article key={p.slug} className={`pk-card ${selected === p.slug ? 'pk-active' : ''}`}>
                <div className="pk-card-head">
                  <h2 className="pk-name">{p.name}</h2>
                  <p className="pk-tag">{p.tagline}</p>
                  {from != null && <div className="pk-from">from <strong>{jmd(from)}</strong></div>}
                </div>
                <ul className="pk-feats">
                  {(p.highlights || []).map((h) => <li key={h}>{h}</li>)}
                </ul>
                <button className="button button-primary w-button pk-cta" onClick={() => choose(p.slug)}>
                  {selected === p.slug ? 'Selected ✓' : 'Request a quote'}
                </button>
              </article>
            );
          })}
          {packages.length === 0 && <p className="pk-loading">Loading packages…</p>}
        </div>

        {selPkg && (
          <section ref={quoteRef} className="pk-quote">
            <PackageQuote pkg={selPkg} addons={addons} />
          </section>
        )}

        <section className="pk-terms">
          <h2 className="pk-terms-h">Terms &amp; Conditions</h2>
          <ul>{TERMS.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </section>
      </main>

      <style jsx>{`
        .pk-main { padding-bottom: 64px; }
        .pk-hero { position: relative; min-height: 360px; display: flex; align-items: flex-end; background-size: cover; background-position: center; color: #fff; }
        .pk-hero::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,.15), rgba(0,0,0,.75)); }
        .pk-hero-in { position: relative; z-index: 1; max-width: 1080px; width: 100%; margin: 0 auto; padding: 32px 24px 40px; }
        .pk-eyebrow { display: inline-block; background: ${GOLD}; color: #1a1a1a; font-size: 13px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; padding: 5px 12px; border-radius: 999px; margin-bottom: 12px; }
        .pk-title { margin: 0 0 8px; font-size: 42px; color: #fff; }
        .pk-sub { margin: 0; max-width: 640px; font-size: 17px; color: rgba(255,255,255,.92); }
        .pk-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); gap: 28px; max-width: 1080px; margin: 40px auto 0; padding: 0 16px; align-items: start; }
        .pk-card { background: #fff; border: 1px solid #eee; border-radius: 16px; box-shadow: 0 6px 24px rgba(0,0,0,.08); padding: 26px; display: flex; flex-direction: column; gap: 16px; transition: transform .2s, box-shadow .2s, border-color .2s; }
        .pk-card:hover { transform: translateY(-6px); box-shadow: 0 16px 40px rgba(0,0,0,.16); }
        .pk-active { border-color: ${GOLD}; box-shadow: 0 0 0 2px ${GOLD}33, 0 16px 40px rgba(0,0,0,.16); }
        .pk-name { margin: 0; font-size: 26px; }
        .pk-tag { margin: 2px 0 0; color: #777; font-style: italic; }
        .pk-from { margin-top: 10px; font-size: 15px; color: #333; }
        .pk-from strong { font-size: 20px; color: ${GOLD}; }
        .pk-feats { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; flex: 1; }
        .pk-feats li { position: relative; padding-left: 24px; font-size: 14px; color: #333; }
        .pk-feats li::before { content: "✓"; position: absolute; left: 0; color: ${GOLD}; font-weight: 800; }
        .pk-cta { margin-top: auto; }
        .pk-loading { color: #888; padding: 20px; }
        .pk-quote { max-width: 1080px; margin: 40px auto 0; padding: 24px 16px 0; }
        .pk-terms { max-width: 880px; margin: 48px auto 0; padding: 24px 16px; }
        .pk-terms-h { font-size: 22px; }
        .pk-terms ul { padding-left: 20px; }
        .pk-terms li { margin: 8px 0; color: #555; font-size: 14px; line-height: 1.5; }
        @media (max-width: 600px) { .pk-hero { min-height: 280px; } .pk-title { font-size: 30px; } }
      `}</style>
    </>
  );
}
