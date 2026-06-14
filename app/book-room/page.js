import BookingPage from '@/components/BookingPage.js';
import BookingWidget from '@/components/BookingWidget.js';

export const metadata = { title: 'Book a Room — Soon Come Villa' };

export default function BookRoomPage() {
  return (
    <BookingPage
      slug="room-1"
      rateKey="nightly_rate"
      rateUnit="/ night"
      rateFallback={160}
      heroImg="/images/DJI_20250418_132609_428.avif"
      title="Single Room"
      subtitle="A private en-suite bedroom with full access to the pool and shared villa amenities."
      features={['Sleeps 2', 'En-suite bathroom', 'Shared pool access', 'High-speed WiFi', '2-night minimum']}
    >
      <BookingWidget kind="stay" roomSelector />
    </BookingPage>
  );
}
