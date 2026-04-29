export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/contact' && request.method === 'POST') {
      return handleContact(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleContact(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid request' }, 400);
  }

  const { name, company, email, phone, message } = body;

  if (!name || !email || !message) {
    return jsonResponse({ error: 'Missing required fields' }, 400);
  }

  const html = `
    <table style="font-family:sans-serif;font-size:15px;color:#222;max-width:600px;width:100%">
      <tr><td style="padding:24px 24px 0">
        <h2 style="margin:0 0 20px;font-size:20px;color:#1a2b3c">New Contact Form Submission</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px 0;border-bottom:1px solid #eee;width:120px;color:#666;vertical-align:top">Name</td>
              <td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:600">${esc(name)}</td></tr>
          ${company ? `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#666;vertical-align:top">Company</td>
              <td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:600">${esc(company)}</td></tr>` : ''}
          <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#666;vertical-align:top">Email</td>
              <td style="padding:8px 0;border-bottom:1px solid #eee"><a href="mailto:${esc(email)}" style="color:#1fada1">${esc(email)}</a></td></tr>
          ${phone ? `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#666;vertical-align:top">Phone</td>
              <td style="padding:8px 0;border-bottom:1px solid #eee">${esc(phone)}</td></tr>` : ''}
        </table>
        <div style="margin-top:20px">
          <div style="color:#666;margin-bottom:6px">Message</div>
          <div style="background:#f7f8fa;border-radius:6px;padding:14px;white-space:pre-wrap">${esc(message)}</div>
        </div>
        <p style="margin:24px 0 0;font-size:13px;color:#999">Sent from the Plus Opto website contact form</p>
      </td></tr>
    </table>`;

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'website@plusopto.co.uk',
      to: 'sales@plusopto.co.uk',
      reply_to: email,
      subject: `Contact Form: ${name}${company ? ` — ${company}` : ''}`,
      html,
    }),
  });

  const data = await resendRes.json();
  return jsonResponse(data, resendRes.status);
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
