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
};

export default function AdminPage() {
  const [authed, setAuthed] = useState(null); // null=unknown, false=login, true=in
  const [creds, setCreds] = useState({ email: '', password: '' });
  const [bookings, setBookings] = useState([]);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/bookings');
      if (res.status === 401) { setAuthed(false); return; }
      if (!res.ok) { setNote('Could not load bookings — retry.'); setAuthed(true); return; }
      const { bookings } = await res.json();
      setBookings(bookings || []);
      setAuthed(true);
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

        {note && <div className="ad-note">{note}</div>}

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
      </div>

      <style jsx>{`
        .ad { min-height: 100vh; background: #faf8f2; }
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
