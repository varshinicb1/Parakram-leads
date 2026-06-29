/**
 * POST /api/contact
 * Handles contact form submissions from the brand site.
 * Sends email via MailChannels (free) and WhatsApp notification.
 */
export async function onRequest(context) {
  const { request } = context;

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  try {
    const { name, email, project, message } = await request.json();

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: 'Name, email, and message are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    // 1. Send email via MailChannels (free, no API key needed from Workers IP)
    const emailBody = `
New enquiry from getparakram.in
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Date:     ${now}
Name:     ${name}
Email:    ${email}
Project:  ${project || 'Not specified'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Message:
${message}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim();

    const emailReq = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: 'cbvarshini1@gmail.com', name: 'Varshini CB' }],
            subject: `Enquiry from ${name} — ${project || 'New Project'}`,
          },
        ],
        from: { email: 'hello@getparakram.in', name: 'Parakram Contact' },
        content: [{ type: 'text/plain', value: emailBody }],
      }),
    });

    if (!emailReq.ok) {
      const errText = await emailReq.text();
      console.error('MailChannels error:', emailReq.status, errText);
    }

    // 2. Send WhatsApp notification (fire-and-forget)
    const waMessage = encodeURIComponent(
      `🔔 *New Enquiry from getparakram.in*\n\n*Name:* ${name}\n*Email:* ${email}\n*Project:* ${project || 'Not specified'}\n*Time:* ${now}\n\n*Message:* ${message.substring(0, 500)}`
    );
    fetch(`https://wa.me/917259426670?text=${waMessage}`, { method: 'GET' }).catch(() => {});

    // 3. Also POST to the leads backend for WhatsApp bridge
    const backendUrl = 'https://leads.getparakram.in/api/v1/whatsapp/send';
    fetch(backendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: '917259426670',
        message: `🔔 New enquiry from ${name} (${email})\nProject: ${project}\n\n${message.substring(0, 500)}`,
      }),
    }).catch(() => {});

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    console.error('Contact API error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
