// Emails Austin when the Sterns lock in their billing choices on quotes.gosafeshield.com/stern/.
// Uses the same setup as glasspearl-payment: RESEND_API_KEY on the Netlify site.
// Optional: NOTIFY_FROM (defaults below), NOTIFY_TO (defaults to austin@gosafeshield.com)

const FROM = process.env.NOTIFY_FROM || 'Safeshield Quotes <quotes@gosafeshield.com>';
const TO = process.env.NOTIFY_TO || 'austin@gosafeshield.com';

const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function row(label, value, opts = {}) {
  if (!value) return '';
  const strong = opts.strong ? 'font-weight:600;color:#12294a;' : 'font-weight:400;color:#1d2b3e;';
  const size = opts.big ? 'font-size:19px;' : 'font-size:15px;';
  return `
    <tr>
      <td style="padding:11px 0;border-bottom:1px solid #e6e9ee;font-size:12px;letter-spacing:.1em;
                 text-transform:uppercase;color:#6b7a8f;white-space:nowrap;">${esc(label)}</td>
      <td style="padding:11px 0 11px 24px;border-bottom:1px solid #e6e9ee;${size}${strong}
                 text-align:right;">${esc(value)}</td>
    </tr>`;
}

function buildHtml(d) {
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:28px 16px;background:#eef1f5;
  font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1d2b3e;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"
         style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e6e9ee;border-radius:14px;">
    <tr>
      <td style="padding:26px 30px 20px;border-bottom:1px solid #e6e9ee;">
        <div style="display:inline-block;background:#12294a;color:#ffffff;font-size:10px;letter-spacing:.14em;
                    text-transform:uppercase;padding:5px 12px;border-radius:99px;">Locked in</div>
        <div style="font-size:23px;font-weight:600;color:#12294a;margin-top:14px;">
          ${esc(d.client || 'Client')} locked in their plan
        </div>
      </td>
    </tr>

    <tr>
      <td style="padding:22px 30px 6px;">
        <div style="background:#f6f8fa;border-left:3px solid #f0a63c;border-radius:0 10px 10px 0;
                    padding:16px 20px;font-size:15px;">
          <span style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#6b7a8f;
                       display:block;margin-bottom:5px;">Next step</span>
          <b style="font-size:16px;color:#12294a;">Reach out, grab the payment details, and handle the cancellations.</b>
          <span style="display:block;font-size:13px;color:#6b7a8f;margin-top:5px;">
            They were told someone from the team will contact them shortly.
          </span>
        </div>
      </td>
    </tr>

    <tr>
      <td style="padding:18px 30px 4px;">
        <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#12294a;
                    font-weight:700;padding-bottom:6px;">Billing they picked</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${row('Home', d.home_billing, { strong: true })}
          ${row('Auto', d.auto_billing, { strong: true })}
          ${row('Umbrella', d.umbrella_billing, { strong: true })}
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:18px 30px 4px;">
        <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#12294a;
                    font-weight:700;padding-bottom:6px;">The numbers</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${row('Total for the year', d.year_total, { strong: true, big: true })}
          ${row('Savings vs renewal', d.savings_vs_renewal, { strong: true })}
          ${row('Paying from', d.paying_from)}
        </table>
      </td>
    </tr>

    ${d.note ? `
    <tr>
      <td style="padding:18px 30px 4px;">
        <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#12294a;
                    font-weight:700;padding-bottom:6px;">Their note</div>
        <div style="background:#f6f8fa;border-radius:10px;padding:14px 18px;font-size:14.5px;
                    line-height:1.6;color:#1d2b3e;">${esc(d.note)}</div>
      </td>
    </tr>` : ''}

    <tr>
      <td style="padding:22px 30px 26px;font-size:12px;color:#6b7a8f;line-height:1.6;">
        Sent from quotes.gosafeshield.com/stern/. A copy is also stored in Netlify Forms
        under stern-payment-choice.
      </td>
    </tr>
  </table>
</body></html>`;
}

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  if (!process.env.RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY is not set on this site' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let d;
  try {
    d = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const subject = `${d.client || 'Stern'} locked in: ${d.year_total || 'billing choices'}, reach out for payment info`;

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: [TO],
      subject,
      html: buildHtml(d),
    }),
  });

  if (!r.ok) {
    const t = await r.text();
    return new Response(JSON.stringify({ error: 'Resend failed', detail: t }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
