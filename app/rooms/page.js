'use client';
import { useEffect, useState } from 'react';
import SiteNav from '@/components/SiteNav.js';
import { fetchUnits } from '@/lib/booking-client.js';

export default function RoomsPage() {
  const [units, setUnits] = useState(null);
  useEffect(() => { fetchUnits().then(setUnits).catch(() => {}); }, []);

  const villa = units?.['entire-villa'];
  const room = units?.['room-1'];

  const card = {
    border: '1px solid #e6d9a8', borderRadius: 12, padding: 24, textAlign: 'center',
    background: '#fff', display: 'grid', gap: 12, alignContent: 'start',
  };

  return (
    <>
      <SiteNav />
      <main className="section">
        <div className="container" style={{ textAlign: 'center', padding: '32px 16px' }}>
          <h1 className="heading">Choose Your Stay</h1>
          <p className="paragraph">Book the whole villa or a single room — pay securely online.</p>
        </div>
        <div className="container" style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24,
          maxWidth: 900, margin: '0 auto', padding: '0 16px 48px',
        }}>
          <div style={card}>
            <h2 className="heading-2">Entire Villa</h2>
            <div className="text-block-11" style={{ fontWeight: 700 }}>
              US ${villa ? Number(villa.nightly_rate).toFixed(0) : '600'} <span style={{ fontWeight: 400 }}>/ night</span>
            </div>
            <p className="paragraph">Sleeps 8 · 4 en-suite bedrooms · private pool · 2-night minimum.</p>
            <a href="/entire-villa" className="button button-primary w-button">Book Entire Villa</a>
          </div>
          <div style={card}>
            <h2 className="heading-2">Single Room</h2>
            <div className="text-block-11" style={{ fontWeight: 700 }}>
              US ${room ? Number(room.nightly_rate).toFixed(0) : '160'} <span style={{ fontWeight: 400 }}>/ night</span>
            </div>
            <p className="paragraph">Private en-suite bedroom · shared pool &amp; amenities · 2-night minimum.</p>
            <a href="/book-room" className="button button-primary w-button">Book a Room</a>
          </div>
        </div>
      </main>
    </>
  );
}
