'use client';
import { useCallback, useEffect, useState } from 'react';

const GOLD = '#d4af37';
const ymd = (d) => (d ? String(d).slice(0, 10) : '');
const STATUS_COLORS = {
  paid: { fg: '#0a7d55', bg: '#e6f6ee' },
  pending: { fg: '#a8780a', bg: '#fbf2d8' },
  refunded: { fg: '#0a66c2', bg: '#e6f0fb' },
  cancelled: { fg: '#666', bg: '#eee' },
  expired: { fg: '#999', bg: '#f2f2f2' },
  new: { fg: '#a8780a', bg: '#fbf2d8' },
  quoted: { fg: '#0a66c2', bg: '#e6f0fb' },
  closed: { fg: '#666', bg: '#eee' },
};
const jmd = (n) => 'J$' + Math.round(Number(n) || 0).toLocaleString();

export default function AdminPage() {
  const [authed, setAuthed] = useState(null); // null=unknown, false=login, true=in
  const [creds, setCreds] = useState({ email: '', password: '' });
  const [bookings, setBookings] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [pkgData, setPkgData] = useState({ packages: [], addons: [] });
  const [tab, setTab] = useState('bookings');
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/bookings');
      if (res.status === 401) { setAuthed(false); return; }
      if (!res.ok) { setNote('Could not load bookings — retry.'); setAuthed(true); return; }
      const { bookings } = await res.json();
      setBookings(bookings || []);
      setAuthed(true);
      // Wedding quotes + package pricing (best-effort; don't block the dashboard).
      fetch('/api/admin/quotes').then((r) => r.ok ? r.json() : { quotes: [] }).then((d) => setQuotes(d.quotes || [])).catch(() => {});
      fetch('/api/admin/packages').then((r) => r.ok ? r.json() : null).then((d) => d && setPkgData(d)).catch(() => {});
    } catch {
      setNote('Network error loading bookings — click Refresh to retry.');
      setAuthed((a) => (a === null ? false : a));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function login(e) {
    e.preventDefault();
    setNote('');
    const res = await fetch('/api/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(creds),
    });
    if (res.ok) { setCreds({ email: '', password: '' }); load(); }
    else setNote('Invalid credentials.');
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    setAuthed(false); setBookings([]);
  }

  async function cancel(b) {
    if (!confirm(`Cancel booking for ${b.first_name} ${b.last_name}? (no refund)`)) return;
    const res = await fetch('/api/admin/cancel', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: b.id }),
    });
    setNote((await res.json()).error ? 'Cancel failed.' : 'Booking cancelled.');
    load();
  }

  async function refund(b) {
    const pre = await fetch(`/api/admin/refund?id=${b.id}`);
    const { computed } = await pre.json();
    if (!computed) { setNote('Could not compute refund.'); return; }
    const override = prompt(
      `Policy refund: US $${computed.amount} (${computed.reason}).\n` +
      `Enter an amount to override, or leave as-is to use the policy amount:`,
      String(computed.amount)
    );
    if (override === null) return;
    const res = await fetch('/api/admin/refund', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: b.id, override: override === String(computed.amount) ? undefined : override }),
    });
    const out = await res.json();
    setNote(out.error ? `Refund failed: ${out.error}` : `Refunded US $${out.refunded}.`);
    load();
  }

  async function setBallroomRate() {
    const v = prompt('New ballroom flat day rate (USD):');
    if (!v) return;
    const res = await fetch('/api/admin/set-rate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unit: 'ballroom', flatDayRate: v }),
    });
    setNote((await res.json()).error ? 'Set-rate failed.' : `Ballroom rate set to $${v}.`);
  }

  async function setQuoteStatus(id, status) {
    const res = await fetch('/api/admin/quotes', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }),
    });
    setNote((await res.json()).error ? 'Status update failed.' : `Quote marked ${status}.`);
    load();
  }

  async function editAddon(a) {
    const price = prompt(`Price for "${a.name}" in JMD (${a.pricing}). Empty to keep:`, String(a.price || ''));
    if (price === null) return;
    const activate = confirm(`Make "${a.name}" visible on the packages page? OK = active, Cancel = hidden.`);
    const res = await fetch('/api/admin/package-rate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addon: a.slug, price: price === '' ? undefined : price, active: activate }),
    });
    setNote((await res.json()).error ? 'Add-on update failed.' : `Updated "${a.name}".`);
    load();
  }

  async function editVenue(pkgSlug, tier) {
    const v = prompt(`Venue cost for ${pkgSlug} ${tier.label} guests (JMD):`, String(tier.venueCost));
    if (v === null || v === '') return;
    const res = await fetch('/api/admin/package-rate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ package: pkgSlug, tier: tier.label, venueCost: v }),
    });
    setNote((await res.json()).error ? 'Venue update failed.' : `Updated ${pkgSlug} ${tier.label}.`);
    load();
  }

  const Badge = ({ s }) => {
    const c = STATUS_COLORS[s] || { fg: '#333', bg: '#eee' };
    return <span className="badge" style={{ color: c.fg, background: c.bg }}>{s}</span>;
  };

  // ---- loading ----
  if (authed === null) {
    return <main className="ad-center"><p>Loading…</p><style jsx>{`.ad-center{display:flex;justify-content:center;padding:80px}`}</style></main>;
  }

  // ---- login ----
  if (!authed) {
    return (
      <main className="ad-login">
        <form onSubmit={login} className="ad-login-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/SOON-COME-logo2.avif" alt="Soon Come Villa" className="ad-logo" />
          <h1 className="ad-login-title">Admin Login</h1>
          <input className="w-input" type="email" placeholder="Email" value={creds.email}
            onChange={(e) => setCreds({ ...creds, email: e.target.value })} required />
          <input className="w-input" type="password" placeholder="Password" value={creds.password}
            onChange={(e) => setCreds({ ...creds, password: e.target.value })} required />
          <button className="button button-primary w-button" type="submit">Sign in</button>
          {note && <p className="ad-err">{note}</p>}
        </form>
        <style jsx>{`
          .ad-login { display: flex; justify-content: center; padding: 72px 16px; background: #faf8f2; min-height: 100vh; }
          .ad-login-card {
            width: 100%; max-width: 380px; background: #fff; border: 1px solid #eee; border-radius: 16px;
            box-shadow: 0 6px 24px rgba(0,0,0,.08); padding: 36px 28px; display: grid; gap: 14px; text-align: center;
          }
          .ad-logo { width: 160px; margin: 0 auto 4px; }
          .ad-login-title { margin: 0 0 4px; font-size: 22px; }
          .ad-err { color: #b00; margin: 0; }
        `}</style>
      </main>
    );
  }

  // ---- dashboard ----
  const money = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const stats = {
    total: bookings.length,
    paid: bookings.filter((b) => b.status === 'paid').length,
    pending: bookings.filter((b) => b.status === 'pending').length,
    revenue: bookings.filter((b) => b.status === 'paid').reduce((s, b) => s + Number(b.amount), 0),
  };

  return (
    <main className="ad">
      <header className="ad-header">
        <div className="ad-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/SOON-COME-logo2.avif" alt="Soon Come Villa" />
          <span>Admin</span>
        </div>
        <div className="ad-actions">
          <button className="button w-button" onClick={setBallroomRate}>Set ballroom rate</button>
          <button className="button w-button" onClick={load}>Refresh</button>
          <button className="button w-button ad-logout" onClick={logout}>Log out</button>
        </div>
      </header>

      <div className="ad-body">
        <div className="ad-stats">
          <div className="stat"><span className="stat-n">{stats.total}</span><span className="stat-l">Bookings</span></div>
          <div className="stat"><span className="stat-n" style={{ color: '#0a7d55' }}>{stats.paid}</span><span className="stat-l">Paid</span></div>
          <div className="stat"><span className="stat-n" style={{ color: '#a8780a' }}>{stats.pending}</span><span className="stat-l">Pending</span></div>
          <div className="stat"><span className="stat-n">US ${money(stats.revenue)}</span><span className="stat-l">Revenue (paid)</span></div>
        </div>

        <div className="ad-tabs">
          {['bookings', 'quotes', 'pricing'].map((t) => (
            <button key={t} className={`ad-tab ${tab === t ? 'ad-tab-on' : ''}`} onClick={() => setTab(t)}>
              {t === 'bookings' ? 'Bookings' : t === 'quotes' ? `Wedding quotes (${quotes.length})` : 'Package pricing'}
            </button>
          ))}
        </div>

        {note && <div className="ad-note">{note}</div>}

        {tab === 'bookings' && (
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th>Created</th><th>Guest</th><th>Unit</th><th>Dates</th><th>Guests</th>
                <th>Amount</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td>{ymd(b.created_at)}</td>
                  <td><div className="ad-guest">{b.first_name} {b.last_name}</div><small>{b.email}</small></td>
                  <td>{b.unit_slug}</td>
                  <td>{ymd(b.check_in)} → {ymd(b.check_out)}</td>
                  <td>{b.guests}</td>
                  <td>US ${money(b.amount)}</td>
                  <td><Badge s={b.status} /></td>
                  <td className="ad-rowact">
                    {b.status === 'paid' && <button className="button w-button" onClick={() => refund(b)}>Refund</button>}
                    {['pending', 'paid'].includes(b.status) && (
                      <button className="button w-button ad-cancel" onClick={() => cancel(b)}>Cancel</button>
                    )}
                  </td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr><td colSpan={8} className="ad-empty">No bookings yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        )}

        {tab === 'quotes' && (
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead>
                <tr><th>Created</th><th>Ref</th><th>Couple</th><th>Package</th><th>Tier</th><th>Date</th><th>Guests</th><th>Estimate</th><th>Status</th></tr>
              </thead>
              <tbody>
                {quotes.map((q) => (
                  <tr key={q.id}>
                    <td>{ymd(q.created_at)}</td>
                    <td>{q.ref}</td>
                    <td><div className="ad-guest">{q.first_name} {q.last_name}</div><small>{q.email}{q.phone ? ` · ${q.phone}` : ''}</small>
                      {q.special_requests && <div className="ad-req">“{q.special_requests}”</div>}</td>
                    <td style={{ textTransform: 'capitalize' }}>{q.package_slug}</td>
                    <td>{q.tier_label}</td>
                    <td>{ymd(q.event_date) || '—'}</td>
                    <td>{q.guests}</td>
                    <td>{jmd(q.estimate_total)}<br /><small>+ catering {jmd(q.catering_low)}–{jmd(q.catering_high)}</small></td>
                    <td>
                      <Badge s={q.status} />
                      <select className="ad-statussel" value={q.status} onChange={(e) => setQuoteStatus(q.id, e.target.value)}>
                        <option value="new">new</option><option value="quoted">quoted</option><option value="closed">closed</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {quotes.length === 0 && <tr><td colSpan={9} className="ad-empty">No quote requests yet.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'pricing' && (
          <div className="ad-pricing">
            <section className="ad-pcard">
              <h3>Add-ons <small>(set a JMD price and activate to show on the packages page)</small></h3>
              <table className="ad-table">
                <thead><tr><th>Add-on</th><th>Pricing</th><th>Price (JMD)</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {pkgData.addons.map((a) => (
                    <tr key={a.slug}>
                      <td><div className="ad-guest">{a.name}</div><small>{a.description}</small></td>
                      <td>{a.pricing}</td>
                      <td>{a.price ? jmd(a.price) : '—'}</td>
                      <td><Badge s={a.active ? 'quoted' : 'closed'} />{a.active ? ' active' : ' hidden'}</td>
                      <td><button className="button w-button" onClick={() => editAddon(a)}>Edit</button></td>
                    </tr>
                  ))}
                  {pkgData.addons.length === 0 && <tr><td colSpan={5} className="ad-empty">No add-ons.</td></tr>}
                </tbody>
              </table>
            </section>
            <section className="ad-pcard">
              <h3>Venue costs <small>(coordination 35% + refundable incidental 20% are applied automatically)</small></h3>
              <table className="ad-table">
                <thead><tr><th>Package</th><th>Tier</th><th>Venue (JMD)</th><th>Catering range</th><th></th></tr></thead>
                <tbody>
                  {pkgData.packages.flatMap((p) => p.tiers.map((t) => (
                    <tr key={p.slug + t.label}>
                      <td style={{ textTransform: 'capitalize' }}>{p.name}</td>
                      <td>{t.label}</td>
                      <td>{jmd(t.venueCost)}</td>
                      <td>{t.cateringLow != null ? `${jmd(t.cateringLow)}–${jmd(t.cateringHigh)}` : '—'}</td>
                      <td><button className="button w-button" onClick={() => editVenue(p.slug, t)}>Edit</button></td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </section>
          </div>
        )}
      </div>

      <style jsx>{`
        .ad { min-height: 100vh; background: #faf8f2; }
        .ad-tabs { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
        .ad-tab { padding: 9px 16px; border: 1px solid #e6d9a8; background: #fff; border-radius: 999px; cursor: pointer; font-size: 14px; font-weight: 600; color: #555; }
        .ad-tab-on { background: ${GOLD}; color: #1a1a1a; border-color: ${GOLD}; }
        .ad-statussel { margin-left: 8px; }
        .ad-req { color: #777; font-size: 12px; margin-top: 4px; font-style: italic; }
        .ad-pricing { display: grid; gap: 24px; }
        .ad-pcard { background: #fff; border: 1px solid #eee; border-radius: 14px; overflow: auto; box-shadow: 0 2px 10px rgba(0,0,0,.04); }
        .ad-pcard h3 { margin: 0; padding: 16px; border-bottom: 1px solid #f0f0f0; font-size: 16px; }
        .ad-pcard h3 small { color: #999; font-weight: 400; }
        .ad-header {
          display: flex; justify-content: space-between; align-items: center; gap: 12px;
          padding: 14px 24px; background: #1a1a1a; color: #fff; flex-wrap: wrap;
        }
        .ad-brand { display: flex; align-items: center; gap: 12px; font-weight: 700; letter-spacing: .04em; }
        .ad-brand img { height: 34px; }
        .ad-brand span { color: ${GOLD}; text-transform: uppercase; font-size: 14px; }
        .ad-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .ad-logout { background: #fff; }
        .ad-body { max-width: 1140px; margin: 0 auto; padding: 24px 16px 64px; }
        .ad-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-bottom: 20px; }
        .stat {
          background: #fff; border: 1px solid #eee; border-radius: 12px; padding: 18px 20px;
          display: flex; flex-direction: column; gap: 4px; box-shadow: 0 2px 10px rgba(0,0,0,.04);
        }
        .stat-n { font-size: 26px; font-weight: 800; }
        .stat-l { font-size: 13px; color: #777; }
        .ad-note { background: #e6f0fb; color: #0a66c2; border-radius: 10px; padding: 12px 16px; margin-bottom: 16px; }
        .ad-table-wrap { background: #fff; border: 1px solid #eee; border-radius: 14px; overflow: auto; box-shadow: 0 2px 10px rgba(0,0,0,.04); }
        .ad-table { width: 100%; border-collapse: collapse; font-size: 14px; min-width: 880px; }
        .ad-table thead th {
          text-align: left; padding: 14px 16px; background: #faf6ea; color: #555;
          font-size: 12px; text-transform: uppercase; letter-spacing: .04em; border-bottom: 2px solid ${GOLD};
        }
        .ad-table tbody td { padding: 14px 16px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
        .ad-table tbody tr:hover { background: #fcfaf3; }
        .ad-table small { color: #999; }
        .ad-guest { font-weight: 600; }
        .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; text-transform: capitalize; }
        .ad-rowact { white-space: nowrap; display: flex; gap: 6px; }
        .ad-cancel { background: #fff; border: 1px solid #ddd; }
        .ad-empty { padding: 32px; text-align: center; color: #999; }
      `}</style>
    </main>
  );
}
