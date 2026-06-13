'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import SiteNav from '@/components/SiteNav.js';

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
    <main className="section">
      <div className="container" style={{ maxWidth: 640, margin: '0 auto', padding: '40px 16px', textAlign: 'center' }}>
        {error && <p className="paragraph" style={{ color: '#b00' }}>{error}</p>}
        {!error && !booking && <p className="paragraph">Loading your booking…</p>}
        {booking && (
          <>
            <h1 className="heading">{paid ? 'Booking Confirmed 🎉' : 'Finalizing your booking…'}</h1>
            <p className="paragraph">
              {paid
                ? 'Thank you! Your payment was received and your reservation is confirmed.'
                : 'We are waiting for payment confirmation. This page updates automatically.'}
            </p>
            <div style={{
              textAlign: 'left', display: 'inline-block', border: '1px solid #e6d9a8',
              borderRadius: 12, padding: 24, marginTop: 16,
            }}>
              <p><strong>Confirmation #:</strong> {booking.order_id?.slice(0, 12)}…</p>
              <p><strong>Booking:</strong> {booking.unit}</p>
              <p><strong>Dates:</strong> {ymd(booking.checkIn)} → {ymd(booking.checkOut)}</p>
              <p><strong>Guests:</strong> {booking.guests}</p>
              <p><strong>Total:</strong> US ${Number(booking.amount).toFixed(2)} {booking.currency}</p>
              <p><strong>Status:</strong> {booking.status}</p>
            </div>
            <p className="paragraph" style={{ marginTop: 24 }}>
              <a href="/index.html" className="button button-primary w-button">Back to Home</a>
            </p>
          </>
        )}
      </div>
    </main>
  );
}

export default function ConfirmationPage() {
  return (
    <>
      <SiteNav />
      <Suspense fallback={<main className="section"><p className="paragraph" style={{ textAlign: 'center', padding: 40 }}>Loading…</p></main>}>
        <Confirmation />
      </Suspense>
    </>
  );
}
