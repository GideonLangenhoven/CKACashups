import nodemailer from 'nodemailer';
import dns from 'dns';
import { promisify } from 'util';

const resolve4 = promisify(dns.resolve4);

type Attachment = { filename: string; content: Buffer; contentType: string };

export async function sendEmail({ to, subject, html, attachments }: { to: string[]; subject: string; html: string; attachments?: Attachment[] }) {
  // Check for SMTP configuration (Gmail)
  // IMPORTANT: Trim all env vars to remove any whitespace/newlines
  const smtpHost = process.env.SMTP_HOST?.trim();
  const smtpPort = process.env.SMTP_PORT?.trim();
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();

  if (smtpHost && smtpPort && smtpUser && smtpPass) {
    // Use SMTP (Gmail or other)
    const port = parseInt(smtpPort);

    // Pre-resolve the SMTP host to IPv4 address to avoid DNS issues
    let resolvedHost = smtpHost;
    try {
      const addresses = await resolve4(smtpHost);
      if (addresses && addresses.length > 0) {
        resolvedHost = addresses[0];
        console.log(`Resolved ${smtpHost} to ${resolvedHost}`);
      }
    } catch (dnsError) {
      console.warn(`DNS resolution failed for ${smtpHost}, using hostname directly:`, dnsError);
      // Continue with hostname if DNS resolution fails
    }

    const transporter = nodemailer.createTransport({
      host: resolvedHost,
      port: port,
      secure: port === 465, // true for 465, false for other ports (use STARTTLS)
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      // Force IPv4 to avoid DNS resolution issues
      family: 4,
      dnsTimeout: 30000,
      tls: {
        rejectUnauthorized: true,
        minVersion: 'TLSv1.2',
        // Use servername for TLS if we resolved to IP
        servername: smtpHost
      },
      // Add connection timeout
      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 30000
    } as any);

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
  if (resendKey && resendKey !== 're_123YourResendAPIKey') {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'CKA Cashups <onboarding@resend.dev>', // Use Resend's default sender for testing
        to,
        subject,
        html,
        attachments: (attachments || []).map(a => ({ filename: a.filename, content: a.content.toString('base64') }))
      })
    });
    if (!res.ok) throw new Error('Failed to send via Resend: ' + (await res.text()));
    return;
  }

  // No email provider configured
  throw new Error('No email provider configured. Set either SMTP credentials (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS) or RESEND_API_KEY');
}

