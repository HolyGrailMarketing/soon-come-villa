import BookingPage from '@/components/BookingPage.js';
import BookingWidget from '@/components/BookingWidget.js';

export const metadata = { title: 'Book the Entire Villa — Soon Come Villa' };

export default function EntireVillaPage() {
  return (
    <BookingPage
      slug="entire-villa"
      rateKey="nightly_rate"
      rateUnit="/ night"
      rateFallback={600}
      heroImg="/images/DJI_20250418_135147_358.avif"
      title="Entire Villa"
      subtitle="Four en-suite bedrooms, a private pool, and gardens in Runaway Bay — the whole estate to yourself, sleeps 8."
      features={['Sleeps 8', '4 en-suite bedrooms', 'Private pool & gardens', 'Gourmet kitchen', '2-night minimum']}
    >
      <BookingWidget kind="stay" unit="entire-villa" />
    </BookingPage>
  );
}
