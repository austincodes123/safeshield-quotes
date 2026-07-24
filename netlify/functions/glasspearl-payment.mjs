// Emails Austin when a client picks payment plans on a quotes.gosafeshield.com page.
// Needs one environment variable on the Netlify site: RESEND_API_KEY
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
  const when = d.call_date && d.call_time ? `${d.call_date.replace(/\s*\(.*\)$/, '')} at ${d.call_time}` : 'not selected';
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:28px 16px;background:#eef1f5;
  font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1d2b3e;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"
         style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e6e9ee;border-radius:14px;">
    <tr>
      <td style="padding:26px 30px 20px;border-bottom:1px solid #e6e9ee;">
        <div style="display:inline-block;background:#12294a;color:#ffffff;font-size:10px;letter-spacing:.14em;
                    text-transform:uppercase;padding:5px 12px;border-radius:99px;">Payment selection</div>
        <div style="font-size:23px;font-weight:600;color:#12294a;margin-top:14px;">
          ${esc(d.client || 'Client')} picked their plans
        </div>
      </td>
    </tr>

    <tr>
      <td style="padding:22px 30px 6px;">
        <div style="background:#f6f8fa;border-left:3px solid #f0a63c;border-radius:0 10px 10px 0;
                    padding:16px 20px;font-size:15px;">
          <span style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#6b7a8f;
                       display:block;margin-bottom:5px;">Call them</span>
          <b style="font-size:18px;color:#12294a;">${esc(when)}</b>
          <span style="display:block;font-size:13px;color:#6b7a8f;margin-top:5px;">
            Send the calendar invite when you get a moment.
          </span>
        </div>
      </td>
    </tr>

    <tr>
      <td style="padding:18px 30px 4px;">
        <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#12294a;
                    font-weight:700;padding-bottom:6px;">Chubb</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${row('Plan', d.chubb_plan, { strong: true })}
          ${row('Due at binding', d.chubb_due)}
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:18px 30px 4px;">
        <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#12294a;
                    font-weight:700;padding-bottom:6px;">The Hartford</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${row('Plan', d.hartford_plan, { strong: true })}
          ${row('Due at binding', d.hartford_due)}
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:18px 30px 4px;">
        <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#12294a;
                    font-weight:700;padding-bottom:6px;">Combined</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${row('Due when we bind', d.due_at_binding, { strong: true, big: true })}
          ${row('Total for the year', d.year_total)}
          ${row('Billing', d.autopay)}
        </table>
      </td>
    </tr>

    ${d.note ? `
    <tr>
      <td style="padding:18px 30px 4px;">
        <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#12294a;
                    font-weight:700;padding-bottom:8px;">They added</div>
        <div style="font-size:15px;line-height:1.6;background:#f6f8fa;border-radius:10px;padding:15px 18px;">
          ${esc(d.note).replace(/\n/g, '<br>')}
        </div>
      </td>
    </tr>` : ''}

    <tr>
      <td style="padding:22px 30px 26px;font-size:12.5px;color:#6b7a8f;line-height:1.7;">
        Sent from the payment options page. Nothing was charged and nothing is bound.
      </td>
    </tr>
  </table>
</body></html>`;
}

function buildText(d) {
  const lines = [
    `${d.client || 'Client'} picked their payment plans.`,
    '',
    `Call them: ${d.call_date || '?'} at ${d.call_time || '?'}`,
    '',
    `Chubb: ${d.chubb_plan || '?'} — ${d.chubb_due || '?'} at binding`,
    `The Hartford: ${d.hartford_plan || '?'} — ${d.hartford_due || '?'} at binding`,
    '',
    `Due when we bind: ${d.due_at_binding || '?'}`,
    `Total for the year: ${d.year_total || '?'}`,
    `Billing: ${d.autopay || 'AutoPay'}`,
  ];
  if (d.note) lines.push('', `They added: ${d.note}`);
  return lines.join('\n');
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

  let data;
  try {
    data = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Body must be JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const when = data.call_date ? data.call_date.replace(/\s*\(.*\)$/, '') : 'no time picked';
  const subject = `${data.client || 'Client'} picked payment plans — call ${when}${data.call_time ? ' at ' + data.call_time : ''}`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: [TO],
      subject,
      html: buildHtml(data),
      text: buildText(data),
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    return new Response(JSON.stringify({ error: 'Resend rejected the send', detail }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
