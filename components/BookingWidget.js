'use client';
// Reusable two-step booking flow:
//   Step 1 (details): dates (Flatpickr) -> availability check -> guest details.
//   Step 2 (payment): order summary + the mounted DimePay widget.
// Used by the villa, single-room, and ballroom pages.
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import flatpickr from 'flatpickr';
import { fetchUnits, checkAvailability, createBooking, mountDimePay, formatYMD } from '@/lib/booking-client.js';

const GOLD = '#d4af37';

export default function BookingWidget({
  kind = 'stay',          // 'stay' | 'ballroom'
  unit,                   // fixed slug, or undefined to use the room selector
  roomSelector = false,   // show room-1..4 / any picker
}) {
  const router = useRouter();
  const dateRef = useRef(null);
  const [step, setStep] = useState('details'); // 'details' | 'payment'
  const [units, setUnits] = useState(null);
  const [selUnit, setSelUnit] = useState(unit || (roomSelector ? 'room' : ''));
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [avail, setAvail] = useState(null);   // null | true | false
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [paying, setPaying] = useState(false);
  const [booking, setBooking] = useState(null);  // create-booking result
  const [bookedSig, setBookedSig] = useState(''); // signature the booking was made for

  useEffect(() => { fetchUnits().then(setUnits).catch(() => {}); }, []);

  const rateUnit = units && (units[selUnit] || (selUnit === 'room' && units['room-1']) || (unit && units[unit]));
  const maxGuests = rateUnit?.max_guests ?? (kind === 'ballroom' ? 150 : 8);

  // Init Flatpickr whenever we're on the details step.
  useEffect(() => {
    if (step !== 'details' || !dateRef.current) return;
    const fp = flatpickr(dateRef.current, {
      mode: kind === 'ballroom' ? 'single' : 'range',
      minDate: 'today',
      dateFormat: 'Y-m-d',
      showMonths: typeof window !== 'undefined' && window.innerWidth > 768 ? 2 : 1,
      defaultDate: kind === 'ballroom' ? (checkIn || undefined) : (checkIn && checkOut ? [checkIn, checkOut] : undefined),
      onChange: (dates) => {
        setAvail(null); setMsg('');
        if (kind === 'ballroom') {
          if (dates[0]) { setCheckIn(formatYMD(dates[0])); setCheckOut(''); }
        } else if (dates.length === 2) {
          const ci = formatYMD(dates[0]); const co = formatYMD(dates[1]);
          const nights = Math.round((dates[1] - dates[0]) / 86400000);
          const min = rateUnit?.min_nights ?? 2;
          if (nights < min) { setMsg(`Minimum ${min} nights.`); setCheckIn(''); setCheckOut(''); return; }
          setCheckIn(ci); setCheckOut(co);
        }
      },
    });
    return () => fp.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, kind, rateUnit?.min_nights]);

  // Availability check when dates are set (details step only).
  useEffect(() => {
    if (step !== 'details') return;
    const ready = kind === 'ballroom' ? checkIn : (checkIn && checkOut);
    if (!ready) return;
    let cancelled = false;
    (async () => {
      setBusy(true);
      try {
        const r = await checkAvailability(
          kind === 'ballroom' ? { unit: 'ballroom', date: checkIn } : { unit: selUnit, checkIn, checkOut }
        );
        if (!cancelled) {
          setAvail(r.available);
          setMsg(r.available ? '' : 'Sorry, those dates are not available.');
        }
      } catch {
        if (!cancelled) setMsg('Could not check availability.');
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => { cancelled = true; };
  }, [step, checkIn, checkOut, selUnit, kind]);

  // Mount the DimePay widget each time we enter the payment step.
  useEffect(() => {
    if (step !== 'payment' || !booking) return;
    mountDimePay({
      ...booking,
      onSuccess: (orderId) => router.push(`/confirmation?order_id=${encodeURIComponent(orderId)}`),
    }).catch((err) => { setMsg(err.message || 'Could not load payment.'); setStep('details'); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, booking]);

  const nights = checkIn && checkOut ? Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000) : 0;
  const total = kind === 'ballroom'
    ? (rateUnit?.flat_day_rate ? Number(rateUnit.flat_day_rate) : null)
    : (rateUnit?.nightly_rate ? nights * Number(rateUnit.nightly_rate) : null);

  function signature() {
    return JSON.stringify({
      unit: kind === 'ballroom' ? 'ballroom' : selUnit,
      checkIn, checkOut, guests: Number(guests), ...form,
    });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setMsg('');
    if (!avail) { setMsg('Please pick available dates first.'); return; }
    if (!form.firstName || !form.lastName || !form.email) { setMsg('Name and email are required.'); return; }

    // Reuse the existing hold if nothing changed (avoids a duplicate hold that
    // would otherwise conflict with itself on the same dates).
    if (booking && bookedSig === signature()) { setStep('payment'); return; }

    setPaying(true);
    try {
      const payload = {
        unit: kind === 'ballroom' ? 'ballroom' : selUnit,
        guests: Number(guests),
        ...form,
        ...(kind === 'ballroom' ? { date: checkIn } : { checkIn, checkOut }),
      };
      const result = await createBooking(payload);
      setBooking(result);
      setBookedSig(signature());
      setStep('payment');
    } catch (err) {
      setMsg(err.message || 'Could not start booking.');
    } finally {
      setPaying(false);
    }
  }

  const Steps = () => (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20, fontWeight: 600 }}>
      <span style={{ color: step === 'details' ? GOLD : '#999' }}>1. Details</span>
      <span style={{ color: '#ccc' }}>→</span>
      <span style={{ color: step === 'payment' ? GOLD : '#999' }}>2. Payment</span>
    </div>
  );

  return (
    <div className="container" style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
      <Steps />

      {step === 'details' && (
        <form onSubmit={onSubmit} className="w-form" style={{ display: 'grid', gap: 14 }}>
          {roomSelector && units && (
            <label>Room
              <select className="w-input" value={selUnit} onChange={(e) => { setSelUnit(e.target.value); setAvail(null); }}>
                <option value="room">Any available room</option>
                {['room-1', 'room-2', 'room-3', 'room-4'].map((r) => (
                  <option key={r} value={r}>{units[r]?.name || r}</option>
                ))}
              </select>
            </label>
          )}

          <label>{kind === 'ballroom' ? 'Event date' : 'Check-in → Check-out'}
            <input ref={dateRef} className="w-input" placeholder="Select dates" readOnly />
          </label>

          <label>Guests
            <input className="w-input" type="number" min={1} max={maxGuests} value={guests}
              onChange={(e) => setGuests(e.target.value)} />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <input className="w-input" placeholder="First name" value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
            <input className="w-input" placeholder="Last name" value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
          </div>
          <input className="w-input" type="email" placeholder="Email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input className="w-input" type="tel" placeholder="Phone" value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })} />

          {total != null && avail && (
            <div className="text-block-11" style={{ fontWeight: 700 }}>
              Total: US ${total.toFixed(2)}
              {kind !== 'ballroom' && nights ? ` (${nights} night${nights > 1 ? 's' : ''})` : ''}
            </div>
          )}

          {msg && <div role="alert" style={{ color: '#b00' }}>{msg}</div>}
          {busy && <div>Checking availability…</div>}

          <button type="submit" className="button button-primary w-button"
            disabled={!avail || paying} style={{ opacity: !avail || paying ? 0.6 : 1, background: GOLD }}>
            {paying ? 'Reserving…' : 'Continue to payment'}
          </button>
        </form>
      )}

      {step === 'payment' && booking && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ border: '1px solid #e6d9a8', borderRadius: 12, padding: 16, display: 'grid', gap: 4 }}>
            <strong>Order summary</strong>
            <div>{(rateUnit?.name) || selUnit}</div>
            <div>
              {kind === 'ballroom'
                ? `Event date: ${checkIn}`
                : `${checkIn} → ${checkOut}${nights ? ` (${nights} night${nights > 1 ? 's' : ''})` : ''}`}
            </div>
            <div>{guests} guest{Number(guests) > 1 ? 's' : ''}</div>
            <div className="text-block-11" style={{ fontWeight: 700, marginTop: 4 }}>
              Total: US ${Number(booking.total).toFixed(2)} {booking.currency}
            </div>
          </div>

          {msg && <div role="alert" style={{ color: '#b00' }}>{msg}</div>}

          <div id="dimepay-widget" />

          <button type="button" className="button w-button"
            onClick={() => { setMsg(''); setStep('details'); }}>
            ← Back to details
          </button>
        </div>
      )}
    </div>
  );
}
