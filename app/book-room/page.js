import SiteNav from '@/components/SiteNav.js';
import BookingWidget from '@/components/BookingWidget.js';

export const metadata = { title: 'Book a Room — Soon Come Villa' };

export default function BookRoomPage() {
  return (
    <>
      <SiteNav />
      <main className="section">
        <div className="container" style={{ textAlign: 'center', padding: '32px 16px 0' }}>
          <h1 className="heading">Single Room</h1>
          <p className="paragraph">
            A private en-suite bedroom with shared pool and villa amenities.
            $160/night, 2-night minimum.
          </p>
        </div>
        <BookingWidget kind="stay" roomSelector />
        <p className="paragraph" style={{ textAlign: 'center' }}>
          <a href="/house-rules.html">House Rules</a> ·{' '}
          <a href="/cancellation-refund-policy.html">Cancellation Policy</a>
        </p>
      </main>
    </>
  );
}
