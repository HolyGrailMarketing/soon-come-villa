import BookingPage from '@/components/BookingPage.js';
import BookingWidget from '@/components/BookingWidget.js';

export const metadata = { title: 'Book the Ballroom — Soon Come Villa' };

export default function BallroomPage() {
  return (
    <BookingPage
      slug="ballroom"
      rateKey="flat_day_rate"
      rateUnit="/ day"
      rateFallback={1500}
      heroImg="/images/DJI_20250418_165327_3.avif"
      title="The Ballroom"
      subtitle="An air-conditioned event space for 100+ guests, with lawn, garden, and gazebo. Reserve an exclusive event day below."
      features={['100+ guests', 'Air-conditioned hall', 'Lawn, garden & gazebo', 'Full-day exclusive']}
    >
      <BookingWidget kind="ballroom" unit="ballroom" />
    </BookingPage>
  );
}
