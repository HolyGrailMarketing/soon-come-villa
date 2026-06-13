import SiteNav from '@/components/SiteNav.js';
import BookingWidget from '@/components/BookingWidget.js';

export const metadata = { title: 'Book the Entire Villa — Soon Come Villa' };

export default function EntireVillaPage() {
  return (
    <>
      <SiteNav />
      <main className="section">
        <div className="container" style={{ textAlign: 'center', padding: '32px 16px 0' }}>
          <h1 className="heading">Entire Villa</h1>
          <p className="paragraph">
            Four en-suite bedrooms, private pool, and gardens in Runaway Bay — sleeps 8.
            $600/night, 2-night minimum.
          </p>
        </div>
        <BookingWidget kind="stay" unit="entire-villa" />
        <p className="paragraph" style={{ textAlign: 'center' }}>
          <a href="/house-rules.html">House Rules</a> ·{' '}
          <a href="/cancellation-refund-policy.html">Cancellation Policy</a>
        </p>
      </main>
    </>
  );
}
