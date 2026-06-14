'use client';
// Wedding package customizer: tier + date + guests + add-ons -> live JMD estimate
// -> submit a quote request (no payment). Server recomputes on submit.
import { useEffect, useMemo, useRef, useState } from 'react';
import flatpickr from 'flatpickr';
import { computeEstimate } from '@/lib/packages.js';

const GOLD = '#d4af37';
const jmd = (n) => 'J$' + Math.round(Number(n) || 0).toLocaleString();

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
    venueCost: tier?.venueCost || 0,
    coordinationPct: pkg.coordination_pct,
    incidentalPct: pkg.incidental_pct,
    guests,
    addons: selectedAddons,
  }), [tier, pkg, guests, selectedAddons]);

  function toggleAddon(a) {
    setPicked((p) => {
      const next = { ...p };
      if (next[a.slug]) delete next[a.slug];
      else next[a.slug] = { qty: 1 };
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
                    <span>{a.name} — {jmd(a.price)}{a.pricing === 'per_guest' ? ' / guest' : a.pricing === 'per_night' ? ' / night' : ''}</span>
                  </label>
                  {picked[a.slug] && a.pricing === 'per_night' && (
                    <input className="w-input pq-qty" type="number" min={1} value={picked[a.slug].qty}
                      onChange={(e) => setPicked((p) => ({ ...p, [a.slug]: { qty: Math.max(1, parseInt(e.target.value, 10) || 1) } }))} />
                  )}
                  {a.description && <small className="pq-muted">{a.description}</small>}
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
        <button className="button button-primary w-button" type="submit" disabled={busy} style={{ background: GOLD }}>
          {busy ? 'Sending…' : 'Request a quote'}
        </button>
      </form>

      <aside className="pq-card pq-est">
        <h3 className="pq-h">Estimate</h3>
        <div className="pq-row"><span>Venue ({tier?.label} guests)</span><span>{jmd(est.venue)}</span></div>
        <div className="pq-row"><span>Coordination ({Math.round(pkg.coordination_pct * 100)}%)</span><span>{jmd(est.coordination)}</span></div>
        <div className="pq-row"><span>Refundable incidental ({Math.round(pkg.incidental_pct * 100)}%)</span><span>{jmd(est.incidental)}</span></div>
        {est.addonLines.map((l) => (
          <div className="pq-row" key={l.slug}><span>{l.name}{l.qty > 1 ? ` ×${l.qty}` : ''}</span><span>{jmd(l.line)}</span></div>
        ))}
        <div className="pq-row pq-total"><span>Estimated total</span><span>{jmd(est.estimateTotal)}</span></div>
        {tier?.cateringLow != null && (
          <p className="pq-muted pq-cater">+ Catering quoted separately: {jmd(tier.cateringLow)} – {jmd(tier.cateringHigh)} ({pkg.catering_desc})</p>
        )}
        <p className="pq-muted">This is an estimate, not a charge. We’ll confirm a final quote and a 50% deposit to secure your date.</p>
      </aside>
      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
  .pq-grid { display: grid; grid-template-columns: 1.2fr .8fr; gap: 24px; align-items: start; }
  .pq-card { background: #fff; border: 1px solid #eee; border-radius: 16px; box-shadow: 0 6px 24px rgba(0,0,0,.08); padding: 24px; }
  .pq-h { margin: 0 0 16px; font-size: 20px; }
  .pq-field { display: grid; gap: 6px; margin-bottom: 14px; font-size: 14px; color: #444; }
  .pq-label { font-size: 14px; color: #444; }
  .pq-two { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
  .pq-two + input, form textarea { margin-bottom: 14px; }
  .pq-addons { display: grid; gap: 12px; margin-top: 6px; }
  .pq-addon { display: grid; gap: 4px; padding: 10px 12px; border: 1px solid #eee; border-radius: 10px; }
  .pq-addon label { display: flex; gap: 8px; align-items: center; cursor: pointer; }
  .pq-qty { width: 90px; }
  .pq-muted { color: #888; font-size: 13px; }
  .pq-err { color: #b00; margin-bottom: 12px; }
  .pq-est { position: sticky; top: 16px; }
  .pq-row { display: flex; justify-content: space-between; gap: 12px; padding: 9px 0; border-bottom: 1px solid #f1f1f1; font-size: 14px; }
  .pq-total { font-weight: 800; font-size: 16px; border-bottom: 0; border-top: 2px solid ${GOLD}; margin-top: 4px; padding-top: 12px; }
  .pq-cater { margin: 12px 0; padding: 10px 12px; background: #faf6ea; border-radius: 8px; }
  .pq-done { text-align: center; max-width: 560px; margin: 0 auto; }
  .pq-check { width: 64px; height: 64px; border-radius: 999px; background: #e6f6ee; color: #0a7d55; font-size: 30px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
  @media (max-width: 760px) { .pq-grid { grid-template-columns: 1fr; } .pq-est { position: static; } }
`;
