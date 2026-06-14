'use client';
import { useCallback, useEffect, useState } from 'react';

const ymd = (d) => (d ? String(d).slice(0, 10) : '');

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
      // Transient network error (e.g. ERR_NETWORK_CHANGED) — don't crash the page.
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
    // Preview the policy-computed amount first.
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

  if (authed === null) return <main className="section"><p style={{ padding: 40, textAlign: 'center' }}>Loading…</p></main>;

  if (!authed) {
    return (
      <main className="section">
        <form onSubmit={login} className="container" style={{ maxWidth: 360, margin: '0 auto', padding: 40, display: 'grid', gap: 12 }}>
          <h1 className="heading">Admin Login</h1>
          <input className="w-input" type="email" placeholder="Email" value={creds.email}
            onChange={(e) => setCreds({ ...creds, email: e.target.value })} required />
          <input className="w-input" type="password" placeholder="Password" value={creds.password}
            onChange={(e) => setCreds({ ...creds, password: e.target.value })} required />
          <button className="button button-primary w-button" type="submit">Sign in</button>
          {note && <p style={{ color: '#b00' }}>{note}</p>}
        </form>
      </main>
    );
  }

  const badge = (s) => {
    const colors = { paid: '#0a7', pending: '#a80', cancelled: '#888', refunded: '#06c', expired: '#aaa' };
    return <span style={{ color: colors[s] || '#333', fontWeight: 600 }}>{s}</span>;
  };

  return (
    <main className="section" style={{ padding: '24px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1100, margin: '0 auto' }}>
        <h1 className="heading">Bookings</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="button w-button" onClick={setBallroomRate}>Set ballroom rate</button>
          <button className="button w-button" onClick={load}>Refresh</button>
          <button className="button w-button" onClick={logout}>Log out</button>
        </div>
      </div>
      {note && <p style={{ maxWidth: 1100, margin: '8px auto', color: '#06c' }}>{note}</p>}
      <div style={{ maxWidth: 1100, margin: '0 auto', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid #e6d9a8' }}>
              <th>Created</th><th>Guest</th><th>Unit</th><th>Dates</th><th>Guests</th>
              <th>Amount</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} style={{ borderBottom: '1px solid #eee' }}>
                <td>{ymd(b.created_at)}</td>
                <td>{b.first_name} {b.last_name}<br /><small>{b.email}</small></td>
                <td>{b.unit_slug}</td>
                <td>{ymd(b.check_in)} → {ymd(b.check_out)}</td>
                <td>{b.guests}</td>
                <td>US ${Number(b.amount).toFixed(2)}</td>
                <td>{badge(b.status)}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {b.status === 'paid' && <button className="button w-button" onClick={() => refund(b)}>Refund</button>}
                  {['pending', 'paid'].includes(b.status) && (
                    <button className="button w-button" style={{ marginLeft: 6 }} onClick={() => cancel(b)}>Cancel</button>
                  )}
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#888' }}>No bookings yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
