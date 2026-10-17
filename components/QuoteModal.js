'use client';
// "Request a quote" popup for the packages page: pick a package, then the
// existing PackageQuote customizer. Packages load on first open.
import { useEffect, useRef, useState } from 'react';
import PackageQuote from '@/components/PackageQuote.js';

const jmd = (n) => 'J$' + Math.round(Number(n) || 0).toLocaleString();
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

export default function QuoteModal({ open, onClose }) {
  const panelRef = useRef(null);
  const returnTo = useRef(null);
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [slug, setSlug] = useState(null);

  useEffect(() => {
    if (!open || data) return;
    setFailed(false);
    fetch('/api/packages')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        setData(d);
        if (d.packages?.length === 1) setSlug(d.packages[0].slug);
      })
      .catch(() => setFailed(true));
  }, [open, data]);

  // Focus in, scroll lock, Esc + Tab trap; focus back to the trigger on close.
  useEffect(() => {
    if (!open) return;
    returnTo.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    function onKey(e) {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const els = [...panelRef.current.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!els.length) return;
      const first = els[0], last = els[els.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      returnTo.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const packages = data?.packages || [];
  const addons = data?.addons || [];
  const pkg = packages.find((p) => p.slug === slug);

  return (
    <div className="qm-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={panelRef} className="qm-panel" role="dialog" aria-modal="true" aria-labelledby="qm-title" tabIndex={-1}>
        <div className="qm-head">
          <div>
            <h2 id="qm-title" className="qm-title">{pkg ? `Your ${pkg.name} wedding` : 'Request a quote'}</h2>
            <p className="qm-sub">
              {pkg ? 'Set your guest count, date and extras. You’ll see an estimate as you go.' : 'Choose the package closest to the day you have in mind. You can change everything after.'}
            </p>
          </div>
          <button className="qm-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M3 3l12 12M15 3L3 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="qm-body">
          {failed && (
            <p className="qm-note">Packages didn’t load. Check your connection and reopen this window, or email us from the contact page.</p>
          )}
          {!failed && !data && <p className="qm-note">Loading packages…</p>}

          {!pkg && packages.length > 0 && (
            <ul className="qm-list" role="list">
              {packages.map((p) => {
                const from = p.tiers?.[0]?.venueCost;
                return (
                  <li key={p.slug}>
                    <button className="qm-pick" onClick={() => setSlug(p.slug)}>
                      <span className="qm-pick-top">
                        <span className="qm-pick-name">{p.name}</span>
                        {from != null && <span className="qm-pick-from">from {jmd(from)}</span>}
                      </span>
                      {p.tagline && <span className="qm-pick-tag">{p.tagline}</span>}
                      {p.highlights?.length > 0 && (
                        <span className="qm-pick-feats">{p.highlights.slice(0, 4).join(', ')}</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {pkg && (
            <>
              {packages.length > 1 && (
                <button className="qm-back" onClick={() => setSlug(null)}>Change package</button>
              )}
              <PackageQuote key={pkg.slug} pkg={pkg} addons={addons} />
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        .qm-backdrop { position: fixed; inset: 0; z-index: 100; background: rgba(10, 30, 28, .62); display: flex; align-items: center; justify-content: center; padding: 24px; }
        .qm-panel { width: 100%; max-width: 980px; max-height: calc(100vh - 48px); display: flex; flex-direction: column; background: #fff; border-radius: 6px; box-shadow: 0 30px 80px rgba(0,0,0,.35); outline: none; animation: qm-in .22s ease-out; }
        @keyframes qm-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .qm-panel { animation: none; } }
        .qm-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding: 28px 32px 20px; border-bottom: 1px solid #e6dfcf; }
        .qm-title { margin: 0; font-family: 'Libre Baskerville', Georgia, serif; font-size: 28px; line-height: 1.2; color: #13302d; }
        .qm-sub { margin: 8px 0 0; max-width: 56ch; color: #4d5f5c; font-size: 15px; line-height: 1.55; }
        .qm-close { flex: none; width: 40px; height: 40px; display: grid; place-items: center; border: 0; border-radius: 999px; background: #f3efe4; color: #13302d; cursor: pointer; }
        .qm-close:hover { background: #ece3cf; }
        .qm-body { overflow-y: auto; padding: 24px 32px 32px; }
        .qm-note { color: #4d5f5c; }
        .qm-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
        .qm-pick { width: 100%; text-align: left; display: grid; gap: 6px; padding: 18px 20px; background: #fff; border: 1px solid #ddd5c2; border-radius: 4px; cursor: pointer; font: inherit; color: #13302d; transition: border-color .15s, background .15s; }
        .qm-pick:hover { border-color: #c9a227; background: #fbf8f0; }
        .qm-pick-top { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; flex-wrap: wrap; }
        .qm-pick-name { font-family: 'Libre Baskerville', Georgia, serif; font-size: 20px; }
        .qm-pick-from { font-size: 14px; color: #2f6f68; font-weight: 600; }
        .qm-pick-tag { font-style: italic; color: #4d5f5c; }
        .qm-pick-feats { font-size: 13px; color: #6b7a77; line-height: 1.5; }
        .qm-back { margin: 0 0 16px; padding: 0; border: 0; background: none; color: #2f6f68; font: inherit; font-weight: 600; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
        .qm-backdrop :global(:focus-visible) { outline: 2px solid #2f6f68; outline-offset: 2px; }
        @media (max-width: 640px) {
          .qm-backdrop { padding: 0; align-items: stretch; }
          .qm-panel { max-height: none; height: 100%; border-radius: 0; }
          .qm-head { padding: 20px 16px 16px; }
          .qm-title { font-size: 22px; }
          .qm-body { padding: 18px 16px 28px; }
        }
      `}</style>
    </div>
  );
}
