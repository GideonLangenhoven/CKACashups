import nodemailer from 'nodemailer';

type Attachment = { filename: string; content: Buffer; contentType: string };

export async function sendEmail({ to, subject, html, attachments }: { to: string[]; subject: string; html: string; attachments?: Attachment[] }) {
  // Check for SMTP configuration (Gmail)
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost && smtpPort && smtpUser && smtpPass) {
    // Use Gmail SMTP
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: false, // Use TLS
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const mailOptions = {
      from: `"CKA Cash Ups" <${smtpUser}>`,
      to: to.join(', '),
      subject,
      html,
      attachments: (attachments || []).map(a => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType
      }))
    };

    await transporter.sendMail(mailOptions);
    return;
  }

  // Fallback to Resend if configured
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'reports@cashups.local', to, subject, html, attachments: (attachments || []).map(a => ({ filename: a.filename, content: a.content.toString('base64') })) })
    });
    if (!res.ok) throw new Error('Failed to send via Resend: ' + (await res.text()));
    return;
  }

  // No email provider configured
  throw new Error('No email provider configured. Set either SMTP credentials (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS) or RESEND_API_KEY');
}

