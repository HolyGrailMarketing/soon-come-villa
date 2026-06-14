// Branded HTML email layout for Soon Come Villa. Table-based + inline styles for
// broad email-client support; gold/charcoal brand palette, serif wordmark header.
const GOLD = '#d4af37';
const INK = '#1a1a1a';

/**
 * @param {object} a
 * @param {string} a.heading
 * @param {string} a.intro           lead paragraph (HTML allowed)
 * @param {Array<[string,string]>} [a.detailRows]  label/value pairs
 * @param {string} [a.note]          muted footnote (HTML allowed)
 * @param {{text:string,url:string}} [a.cta]
 * @param {string} [a.preheader]     hidden inbox-preview text
 */
export function brandedEmail({ heading, intro, detailRows = [], note, cta, preheader = '' }) {
  const rows = detailRows.map(([label, value], i) => `
    <tr>
      <td style="padding:11px 0;border-bottom:${i === detailRows.length - 1 ? '0' : '1px solid #efece3'};color:#80796a;font-size:14px;">${label}</td>
      <td style="padding:11px 0;border-bottom:${i === detailRows.length - 1 ? '0' : '1px solid #efece3'};color:${INK};font-size:14px;font-weight:600;text-align:right;">${value}</td>
    </tr>`).join('');

  const detailBlock = detailRows.length ? `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
      style="margin:18px 0;background:#faf8f2;border:1px solid #efece3;border-radius:12px;padding:6px 18px;">
      ${rows}
    </table>` : '';

  const ctaBlock = cta ? `
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin:8px 0 4px;"><tr><td>
      <a href="${cta.url}" style="background:${GOLD};color:${INK};text-decoration:none;font-weight:700;
        font-size:15px;padding:13px 26px;border-radius:999px;display:inline-block;">${cta.text}</a>
    </td></tr></table>` : '';

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f4f1ea;">
  <span style="display:none!important;opacity:0;color:#f4f1ea;height:0;width:0;overflow:hidden;">${preheader}</span>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f4f1ea;padding:28px 12px;font-family:Helvetica,Arial,sans-serif;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" role="presentation"
        style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,.07);">
        <tr><td style="background:${INK};padding:30px 32px;text-align:center;">
          <div style="font-family:Georgia,'Times New Roman',serif;color:#ffffff;font-size:25px;letter-spacing:3px;">SOON&nbsp;COME&nbsp;VILLA</div>
          <div style="color:${GOLD};font-size:11px;letter-spacing:4px;text-transform:uppercase;margin-top:8px;">Runaway Bay &middot; Jamaica</div>
        </td></tr>
        <tr><td style="height:4px;background:${GOLD};line-height:4px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="padding:34px 32px 30px;">
          <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:${INK};margin:0 0 14px;font-weight:400;">${heading}</h1>
          <p style="color:#46443d;font-size:15px;line-height:1.65;margin:0;">${intro}</p>
          ${detailBlock}
          ${ctaBlock}
          ${note ? `<p style="color:#9a9384;font-size:13px;line-height:1.55;margin:18px 0 0;">${note}</p>` : ''}
        </td></tr>
        <tr><td style="background:#faf8f2;padding:22px 32px;border-top:1px solid #efece3;color:#9a9384;font-size:12px;line-height:1.7;text-align:center;">
          43 Edward Drive, Runaway Bay, St Ann, Jamaica<br>
          <a href="tel:+18762355881" style="color:#9a9384;text-decoration:none;">(876) 235-5881</a> &middot;
          <a href="mailto:reservations@sooncomevilla.com" style="color:#9a9384;text-decoration:none;">reservations@sooncomevilla.com</a> &middot;
          <a href="https://sooncomevilla.com" style="color:${GOLD};text-decoration:none;">sooncomevilla.com</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
