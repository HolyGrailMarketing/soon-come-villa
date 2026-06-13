import SiteNav from '@/components/SiteNav.js';
import BookingWidget from '@/components/BookingWidget.js';

export const metadata = { title: 'Book the Ballroom — Soon Come Villa' };

export default function BallroomPage() {
  return (
    <>
      <SiteNav />
      <main className="section">
        <div className="container" style={{ textAlign: 'center', padding: '32px 16px 0' }}>
          <h1 className="heading">The Ballroom</h1>
          <p className="paragraph">
            An air-conditioned event space for 100+ guests, with lawn, garden, and gazebo.
            Reserve an exclusive event day below.
          </p>
        </div>
        <BookingWidget kind="ballroom" unit="ballroom" />
        <p className="paragraph" style={{ textAlign: 'center' }}>
          Have questions about your event? <a href="/contact-us.html">Contact us</a>.
        </p>
      </main>
    </>
  );
}
