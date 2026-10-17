'use client';
import { useCallback, useEffect, useState } from 'react';
import SiteNav from '@/components/SiteNav.js';
import QuoteModal from '@/components/QuoteModal.js';

const FLIPBOOK_URL = 'https://heyzine.com/flip-book/94dc3da9d5.html';
const FONTS = 'https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Montserrat:wght@400;500;600;700&display=swap';

const STEPS = [
  { h: 'Request a quote', p: 'Pick a package, your guest count, date and extras. You’ll see an estimate before you send anything.' },
  { h: 'Walk the grounds', p: 'Tour the lawn, ballroom and pool deck with us and bring every question you have.' },
  { h: 'Hold your date', p: 'A 50% deposit secures the day once you’re happy with the final quote.' },
  { h: 'Settle the balance', p: 'Full payment is due one month before the wedding. Then the day is yours.' },
];

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
  const [quoteOpen, setQuoteOpen] = useState(false);
  const openQuote = () => setQuoteOpen(true);
  const closeQuote = useCallback(() => setQuoteOpen(false), []);

  // /packages?quote=1 opens the quote popup directly.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('quote') === '1') setQuoteOpen(true);
  }, []);

  return (
    <>
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href={FONTS} />
      <SiteNav />
      <main className="wp">
        <header className="wp-hero">
          <div className="wp-hero-in">
            <h1 className="wp-title">Say “I do” on the lawn at Soon Come Villa</h1>
            <p className="wp-lede">
              Ceremony under the gazebo, dinner in the ballroom, and rooms at the villa for the people you love most.
              Three wedding packages in Runaway Bay, shaped around your guest list.
            </p>
            <div className="wp-actions">
              <button className="wp-btn wp-btn-gold" onClick={openQuote}>Request a quote</button>
              <a className="wp-btn wp-btn-ghost" href="#brochure">See the brochure</a>
            </div>
          </div>
        </header>

        <section id="brochure" className="wp-book" aria-labelledby="wp-book-h">
          <div className="wp-wrap">
            <div className="wp-book-head">
              <h2 id="wp-book-h" className="wp-h2 wp-on-ink">The wedding brochure</h2>
              <p className="wp-book-sub">Every package, what’s included and the spaces you’ll use. Turn the pages here or open it full screen.</p>
            </div>
            <div className="wp-book-frame">
              <iframe
                src={FLIPBOOK_URL}
                title="Soon Come Villa wedding brochure"
                loading="lazy"
                allow="clipboard-write"
                allowFullScreen
              />
            </div>
            <div className="wp-book-foot">
              <a className="wp-book-link" href={FLIPBOOK_URL} target="_blank" rel="noopener">Open the brochure full screen</a>
              <button className="wp-btn wp-btn-gold" onClick={openQuote}>Request a quote</button>
            </div>
          </div>
        </section>

        <section className="wp-steps" aria-labelledby="wp-steps-h">
          <div className="wp-wrap">
            <h2 id="wp-steps-h" className="wp-h2">From first message to wedding day</h2>
            <ol className="wp-step-list">
              {STEPS.map((s, i) => (
                <li key={s.h} className="wp-step">
                  <span className="wp-step-n" aria-hidden="true">{i + 1}</span>
                  <h3 className="wp-step-h">{s.h}</h3>
                  <p className="wp-step-p">{s.p}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="wp-terms" aria-labelledby="wp-terms-h">
          <div className="wp-wrap wp-terms-grid">
            <h2 id="wp-terms-h" className="wp-h2">Good to know</h2>
            <ul className="wp-term-list">{TERMS.map((t, i) => <li key={i}>{t}</li>)}</ul>
          </div>
        </section>

        <section className="wp-close">
          <div className="wp-wrap wp-close-in">
            <p className="wp-close-line">Tell us your date and guest count, and we’ll come back with a full quote.</p>
            <button className="wp-btn wp-btn-gold" onClick={openQuote}>Request a quote</button>
          </div>
        </section>
      </main>

      <QuoteModal open={quoteOpen} onClose={closeQuote} />

      <style jsx>{`
        .wp { --ink: #13302d; --sea: #2f6f68; --sand: #ece3cf; --gold: #c9a227; --text: #1c2b29; --muted: #4d5f5c;
              font-family: Montserrat, sans-serif; color: var(--text); background: #fff; }
        .wp-wrap { max-width: 1120px; margin: 0 auto; padding: 0 24px; }
        .wp :global(:focus-visible) { outline: 2px solid var(--sea); outline-offset: 3px; }

        .wp-hero { position: relative; min-height: min(78vh, 680px); display: flex; align-items: flex-end; color: #fff;
                   background: #13302d url(/images/lawn-gazebo-full.avif) center 60% / cover no-repeat; }
        .wp-hero::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(10,28,26,.82) 0%, rgba(10,28,26,.45) 55%, rgba(10,28,26,.1) 100%); }
        .wp-hero-in { position: relative; z-index: 1; max-width: 1120px; width: 100%; margin: 0 auto; padding: 64px 24px 72px; }
        .wp-title { margin: 0; max-width: 15ch; font-family: 'Libre Baskerville', Georgia, serif; font-weight: 400; font-size: 56px; line-height: 1.12; letter-spacing: -.01em; color: #fff; }
        .wp-lede { margin: 20px 0 0; max-width: 52ch; font-size: 18px; line-height: 1.6; color: rgba(255,255,255,.9); }
        .wp-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 32px; }

        .wp-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 48px; padding: 0 26px; border-radius: 999px; font: 700 15px Montserrat, sans-serif; text-decoration: none; cursor: pointer; border: 1px solid transparent; }
        .wp-btn-gold { background: var(--gold); color: var(--ink); }
        .wp-btn-gold:hover { background: #d9b43a; }
        .wp-btn-ghost { background: transparent; color: #fff; border-color: rgba(255,255,255,.7); }
        .wp-btn-ghost:hover { background: rgba(255,255,255,.12); }

        .wp-h2 { margin: 0; font-family: 'Libre Baskerville', Georgia, serif; font-weight: 400; font-size: 36px; line-height: 1.18; color: var(--ink); }
        .wp-on-ink { color: #fff; }

        .wp-book { background: var(--ink); color: #fff; padding: 88px 0 80px; }
        .wp-book-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px 48px; flex-wrap: wrap; margin-bottom: 32px; }
        .wp-book-sub { margin: 0; max-width: 46ch; font-size: 16px; line-height: 1.6; color: rgba(255,255,255,.75); }
        .wp-book-frame { aspect-ratio: 16 / 10; max-height: 82vh; width: 100%; background: #0d2422; border-radius: 4px; overflow: hidden; box-shadow: 0 40px 80px rgba(0,0,0,.35); }
        .wp-book-frame iframe { display: block; width: 100%; height: 100%; border: 0; }
        .wp-book-foot { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; margin-top: 24px; }
        .wp-book-link { color: #fff; font-weight: 600; text-decoration: underline; text-decoration-color: var(--gold); text-underline-offset: 5px; text-decoration-thickness: 2px; }
        .wp-book-link:hover { color: var(--sand); }

        .wp-steps { padding: 96px 0 40px; }
        .wp-step-list { list-style: none; margin: 40px 0 0; padding: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 32px; }
        .wp-step { border-top: 1px solid var(--sand); padding-top: 20px; }
        .wp-step-n { display: block; font-family: 'Libre Baskerville', Georgia, serif; font-size: 40px; line-height: 1; color: var(--gold); }
        .wp-step-h { margin: 16px 0 8px; font-family: Montserrat, sans-serif; font-size: 18px; font-weight: 700; line-height: 1.3; color: var(--ink); }
        .wp-step-p { margin: 0; font-size: 15px; line-height: 1.6; color: var(--muted); }

        .wp-terms { padding: 72px 0 88px; }
        .wp-terms-grid { display: grid; grid-template-columns: 280px 1fr; gap: 48px; border-top: 1px solid var(--sand); padding-top: 56px; }
        .wp-term-list { margin: 0; padding: 0 0 0 20px; columns: 2; column-gap: 40px; }
        .wp-term-list li { break-inside: avoid; margin: 0 0 14px; font-size: 14px; line-height: 1.6; color: var(--muted); }
        .wp-term-list li::marker { color: var(--gold); }

        .wp-close { background: var(--sand); padding: 56px 0; }
        .wp-close-in { display: flex; justify-content: space-between; align-items: center; gap: 24px; flex-wrap: wrap; }
        .wp-close-line { margin: 0; max-width: 34ch; font-family: 'Libre Baskerville', Georgia, serif; font-size: 24px; line-height: 1.35; color: var(--ink); }

        @media (max-width: 900px) {
          .wp-step-list { grid-template-columns: 1fr 1fr; }
          .wp-terms-grid { grid-template-columns: 1fr; gap: 24px; }
        }
        @media (max-width: 600px) {
          .wp-wrap, .wp-hero-in { padding-left: 16px; padding-right: 16px; }
          .wp-hero { min-height: 560px; }
          .wp-hero::after { background: linear-gradient(180deg, rgba(10,28,26,.2) 0%, rgba(10,28,26,.85) 70%); }
          .wp-hero-in { padding-top: 48px; padding-bottom: 48px; }
          .wp-title { font-size: 36px; }
          .wp-lede { font-size: 16px; }
          .wp-actions .wp-btn { flex: 1 1 100%; }
          .wp-h2 { font-size: 28px; }
          .wp-book { padding: 64px 0 56px; }
          .wp-book-frame { aspect-ratio: 3 / 4; }
          .wp-book-foot .wp-btn { width: 100%; }
          .wp-steps { padding-top: 64px; }
          .wp-step-list { grid-template-columns: 1fr; gap: 24px; }
          .wp-term-list { columns: 1; }
          .wp-close-line { font-size: 20px; }
          .wp-close-in .wp-btn { width: 100%; }
        }
      `}</style>
    </>
  );
}
