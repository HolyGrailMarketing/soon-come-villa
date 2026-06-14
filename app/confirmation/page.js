'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import SiteNav from '@/components/SiteNav.js';

const GOLD = '#d4af37';
const STATUS_COLORS = { paid: '#0a7d55', pending: '#a8780a', refunded: '#0a66c2', cancelled: '#888', expired: '#999' };

function Confirmation() {
  const params = useSearchParams();
  const orderId = params.get('order_id');
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orderId) { setError('Missing order reference.'); return; }
    let tries = 0;
    let timer;
    const poll = async () => {
      try {
        const res = await fetch(`/api/booking/${encodeURIComponent(orderId)}`);
        if (res.ok) {
          const b = await res.json();
          setBooking(b);
          if (b.status === 'paid' || b.status === 'refunded' || b.status === 'cancelled') return;
        }
      } catch { /* keep polling */ }
      if (tries++ < 20) timer = setTimeout(poll, 3000);
    };
    poll();
    return () => clearTimeout(timer);
  }, [orderId]);

  const ymd = (d) => (d ? String(d).slice(0, 10) : '');
  const paid = booking?.status === 'paid';

  return (
    <main className="cf-main">
      <div className="cf-card">
        {error && <p className="cf-msg cf-err">{error}</p>}
        {!error && !booking && (
          <>
            <div className="cf-icon cf-wait">⏳</div>
            <h1 className="cf-title">Loading your booking…</h1>
          </>
        )}
        {booking && (
          <>
            <div className={`cf-icon ${paid ? 'cf-ok' : 'cf-wait'}`}>{paid ? '✓' : '⏳'}</div>
            <h1 className="cf-title">{paid ? 'Booking Confirmed' : 'Finalizing your booking…'}</h1>
            <p className="cf-sub">
              {paid
                ? 'Thank you! Your payment was received and your reservation is confirmed.'
                : 'We’re waiting for payment confirmation — this page updates automatically.'}
            </p>

            <dl className="cf-summary">
              <div><dt>Confirmation #</dt><dd>{booking.order_id?.slice(0, 12)}…</dd></div>
              <div><dt>Booking</dt><dd>{booking.unit}</dd></div>
              <div><dt>Dates</dt><dd>{ymd(booking.checkIn)} → {ymd(booking.checkOut)}</dd></div>
              <div><dt>Guests</dt><dd>{booking.guests}</dd></div>
              <div><dt>Total</dt><dd>US ${Number(booking.amount).toFixed(2)} {booking.currency}</dd></div>
              <div><dt>Status</dt><dd><span className="cf-badge" style={{ color: STATUS_COLORS[booking.status] || '#333' }}>{booking.status}</span></dd></div>
            </dl>

            <div className="cf-actions">
              <a href="/index.html" className="button button-primary w-button">Back to Home</a>
              <a href="/rooms" className="button w-button cf-secondary">Browse stays</a>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .cf-main { display: flex; justify-content: center; padding: 56px 16px 72px; }
        .cf-card {
          width: 100%; max-width: 560px; background: #fff; border: 1px solid #eee;
          border-radius: 16px; box-shadow: 0 6px 24px rgba(0,0,0,.08);
          padding: 40px 32px; text-align: center;
        }
        .cf-icon {
          width: 72px; height: 72px; border-radius: 999px; margin: 0 auto 20px;
          display: flex; align-items: center; justify-content: center; font-size: 34px;
        }
        .cf-ok { background: #e6f6ee; color: #0a7d55; }
        .cf-wait { background: #fbf2d8; color: ${GOLD}; }
        .cf-title { margin: 0 0 8px; font-size: 28px; }
        .cf-sub { margin: 0 auto 24px; color: #555; max-width: 420px; }
        .cf-summary {
          text-align: left; border: 1px solid #eee; border-radius: 12px; padding: 6px 18px; margin: 0 0 24px;
        }
        .cf-summary > div {
          display: flex; justify-content: space-between; gap: 16px;
          padding: 12px 0; border-bottom: 1px solid #f0f0f0;
        }
        .cf-summary > div:last-child { border-bottom: 0; }
        .cf-summary dt { margin: 0; color: #777; font-size: 14px; }
        .cf-summary dd { margin: 0; font-weight: 600; text-align: right; }
        .cf-badge { text-transform: capitalize; font-weight: 700; }
        .cf-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
        .cf-secondary { background: #fff; border: 1px solid ${GOLD}; color: #1a1a1a; }
        .cf-msg { padding: 12px; }
        .cf-err { color: #b00; }
      `}</style>
    </main>
  );
}

export default function ConfirmationPage() {
  return (
    <>
      <SiteNav />
      <Suspense fallback={<main className="cf-main"><p style={{ padding: 40 }}>Loading…</p></main>}>
        <Confirmation />
      </Suspense>
    </>
  );
}
