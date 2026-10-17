'use client';
// Wedding package customizer: tier + date + guests + add-ons -> live JMD estimate range
// -> submit a quote request (no payment). Server recomputes on submit.
import { useEffect, useMemo, useRef, useState } from 'react';
import flatpickr from 'flatpickr';
import { computeEstimate } from '@/lib/packages.js';

const GOLD = '#c9a227';
const jmd = (n) => 'J$' + Math.round(Number(n) || 0).toLocaleString();
const jmdRange = ({ low, high }) => (low === high ? jmd(low) : `${jmd(low)} – ${jmd(high)}`);
const UNIT = { per_guest: ' / guest', per_night: ' / night' };
const hasQty = (a) => a.pricing === 'per_night' || a.pricing === 'per_unit';
const unitLabel = (a) => UNIT[a.pricing] || (a.pricing === 'per_unit' && a.description ? ` (${a.description.replace(/^Priced /, '')})` : '');

export default function PackageQuote({ pkg, addons = [] }) {
  const dateRef = useRef(null);
  const [tierLabel, setTierLabel] = useState(pkg.tiers[0]?.label || '');
  const [guests, setGuests] = useState(pkg.tiers[0]?.minGuests || 1);
  const [eventDate, setEventDate] = useState('');
  const [picked, setPicked] = useState({});      // slug -> { qty }
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', specialRequests: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState(null);         // { ref }

  const tier = pkg.tiers.find((t) => t.label === tierLabel) || pkg.tiers[0];

  // Reset guests into range when the tier changes.
  useEffect(() => { if (tier) setGuests(tier.minGuests); }, [tierLabel]); // eslint-disable-line

  useEffect(() => {
    if (!dateRef.current) return;
    const fp = flatpickr(dateRef.current, {
      mode: 'single', minDate: 'today', dateFormat: 'Y-m-d',
      onChange: (d) => setEventDate(d[0] ? d[0].toISOString().slice(0, 10) : ''),
    });
    return () => fp.destroy();
  }, []);

  const selectedAddons = useMemo(() =>
    addons.filter((a) => picked[a.slug]).map((a) => ({ ...a, qty: picked[a.slug].qty || 1 })),
    [addons, picked]);

  const est = useMemo(() => computeEstimate({
    priceLow: tier?.priceLow || 0,
    priceHigh: tier?.priceHigh,
    coordinationPct: pkg.coordination_pct,
    incidentalPct: pkg.incidental_pct,
    guests,
    addons: selectedAddons,
  }), [tier, pkg, guests, selectedAddons]);

  function toggleAddon(a) {
    setPicked((p) => {
      const next = { ...p };
      if (next[a.slug]) delete next[a.slug];
      else next[a.slug] = { qty: a.pricing === 'per_unit' ? Math.max(1, Number(guests) || 1) : 1 };
      return next;
    });
  }

  async function submit(e) {
    e.preventDefault();
    setMsg('');
    if (!form.firstName || !form.lastName || !form.email) { setMsg('Please add your name and email.'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/packages/quote', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          package: pkg.slug, tierLabel, guests: Number(guests), eventDate,
          addons: selectedAddons.map((a) => ({ slug: a.slug, qty: a.qty })),
          ...form,
        }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || 'could not submit');
      setDone({ ref: out.ref });
    } catch (err) {
      setMsg(err.message || 'Could not submit your request.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="pq-card pq-done">
        <div className="pq-check">✓</div>
        <h3>Quote request received</h3>
        <p>Thank you! Your reference is <strong>{done.ref}</strong>. Our team will reach out shortly with a
          detailed quote for your <strong>{pkg.name}</strong> wedding.</p>
        <p className="pq-muted">A 50% deposit secures your date; the balance is due one month before the event.</p>
        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <div className="pq-grid">
      <form className="pq-card" onSubmit={submit}>
        <h3 className="pq-h">Customize your {pkg.name} package</h3>

        <label className="pq-field">Guest count
          <select className="w-input" value={tierLabel} onChange={(e) => setTierLabel(e.target.value)}>
            {pkg.tiers.map((t) => <option key={t.label} value={t.label}>{t.label} guests</option>)}
          </select>
        </label>

        <label className="pq-field">Exact number of guests
          <input className="w-input" type="number" min={tier?.minGuests} max={tier?.maxGuests}
            value={guests} onChange={(e) => setGuests(e.target.value)} />
        </label>

        <label className="pq-field">Preferred event date
          <input ref={dateRef} className="w-input" placeholder="Select a date" readOnly />
        </label>

        {addons.length > 0 && (
          <div className="pq-field">
            <span className="pq-label">Add-ons</span>
            <div className="pq-addons">
              {addons.map((a) => (
                <div key={a.slug} className="pq-addon">
                  <label>
                    <input type="checkbox" checked={!!picked[a.slug]} onChange={() => toggleAddon(a)} />
                    <span>{a.name} — {jmd(a.price)}{unitLabel(a)}</span>
                  </label>
                  {picked[a.slug] && hasQty(a) && (
                    <label className="pq-qty-row">Quantity
                      <input className="w-input pq-qty" type="number" min={1} value={picked[a.slug].qty}
                        onChange={(e) => setPicked((p) => ({ ...p, [a.slug]: { qty: Math.max(1, parseInt(e.target.value, 10) || 1) } }))} />
                    </label>
                  )}
                  {a.description && a.pricing !== 'per_unit' && <small className="pq-muted">{a.description}</small>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pq-two">
          <input className="w-input" placeholder="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
          <input className="w-input" placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
        </div>
        <input className="w-input" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <input className="w-input" type="tel" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <textarea className="w-input" rows={3} placeholder="Special requests (decor, vendors, timing…)"
          value={form.specialRequests} onChange={(e) => setForm({ ...form, specialRequests: e.target.value })} />

        {msg && <div className="pq-err">{msg}</div>}
        <button className="pq-submit" type="submit" disabled={busy}>
          {busy ? 'Sending…' : 'Request a quote'}
        </button>
      </form>

      <aside className="pq-card pq-est">
        <h3 className="pq-h">Estimate</h3>
        <div className="pq-row"><span>{pkg.name} package ({tier?.label} guests)</span><span>{jmdRange(est.pkg)}</span></div>
        <div className="pq-row"><span>Coordination &amp; professional services ({Math.round(pkg.coordination_pct * 100)}%)</span><span>{jmdRange(est.coordination)}</span></div>
        <div className="pq-row"><span>Refundable incidental ({Math.round(pkg.incidental_pct * 100)}%)</span><span>{jmdRange(est.incidental)}</span></div>
        {est.addonLines.map((l) => (
          <div className="pq-row" key={l.slug}><span>{l.name}{l.qty > 1 ? ` ×${l.qty}` : ''}</span><span>{jmd(l.line)}</span></div>
        ))}
        <div className="pq-row pq-total"><span>Estimated total</span><span>{jmdRange(est.total)}</span></div>
        {pkg.catering_desc && <p className="pq-muted pq-cater">Includes {pkg.catering_desc}.</p>}
        <p className="pq-muted">This is an estimate, not a charge. Your final price depends on your menu choices, and prices may change with inflation. We’ll send a pro forma invoice; a 50% deposit secures your date.</p>
      </aside>
      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
  .pq-grid { display: grid; grid-template-columns: 1.25fr .75fr; gap: 28px; align-items: start; }
  .pq-card { background: #fff; padding: 0; }
  .pq-h { margin: 0 0 16px; font-family: 'Libre Baskerville', Georgia, serif; font-size: 19px; color: #13302d; }
  .pq-field { display: grid; gap: 6px; margin-bottom: 16px; font-size: 14px; font-weight: 600; color: #13302d; }
  .pq-label { font-size: 14px; font-weight: 600; color: #13302d; }
  .pq-card .w-input { border: 1px solid #d8d0bd; border-radius: 4px; font-family: Montserrat, sans-serif; font-weight: 400; font-size: 15px; color: #1c2b29; height: auto; padding: 10px 12px; }
  .pq-card .w-input[readonly] { background: #fff; cursor: pointer; }
  .pq-card .w-input:focus { border-color: #2f6f68; outline: 2px solid #2f6f6833; }
  .pq-two { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
  .pq-two + input, form textarea { margin-bottom: 12px; }
  .pq-addons { display: grid; gap: 8px; margin-top: 4px; }
  .pq-addon { display: grid; gap: 4px; padding: 10px 12px; border: 1px solid #e6dfcf; border-radius: 4px; font-weight: 400; }
  .pq-addon label { display: flex; gap: 10px; align-items: center; cursor: pointer; color: #1c2b29; font-weight: 500; }
  .pq-addon input[type=checkbox] { accent-color: #2f6f68; width: 16px; height: 16px; }
  .pq-qty-row { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #4d5f5c; }
  .pq-qty { width: 100px; margin: 0; }
  .pq-muted { color: #6b7a77; font-size: 13px; font-weight: 400; line-height: 1.5; }
  .pq-err { color: #a3261b; margin-bottom: 12px; }
  .pq-submit { width: 100%; margin-top: 4px; padding: 14px 20px; border: 0; border-radius: 999px; background: ${GOLD}; color: #13302d; font: 700 15px Montserrat, sans-serif; cursor: pointer; }
  .pq-submit:hover { background: #d9b43a; }
  .pq-submit:disabled { opacity: .6; cursor: progress; }
  .pq-est { position: sticky; top: 0; background: #f6f2e8; border-radius: 4px; padding: 20px; }
  .pq-row { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; padding: 9px 0; border-bottom: 1px solid #e6dfcf; font-size: 14px; color: #1c2b29; }
  .pq-row span:last-child { text-align: right; white-space: nowrap; }
  .pq-total { font-weight: 800; font-size: 16px; border-bottom: 0; border-top: 2px solid #13302d; margin-top: 4px; padding-top: 12px; }
  .pq-cater { margin: 12px 0; padding: 10px 12px; background: #fff; border-radius: 4px; }
  .pq-done { text-align: center; max-width: 520px; margin: 12px auto; color: #1c2b29; }
  .pq-done h3 { font-family: 'Libre Baskerville', Georgia, serif; color: #13302d; }
  .pq-check { width: 64px; height: 64px; border-radius: 999px; background: #e3efe9; color: #2f6f68; font-size: 30px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
  @media (max-width: 760px) { .pq-grid { grid-template-columns: 1fr; } .pq-est { position: static; } }
`;
