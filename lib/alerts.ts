import { sendEmail } from "./sendMail";

function getAlertRecipients(): string[] {
  const configured =
    process.env.ALERT_EMAILS ||
    process.env.ADMIN_EMAILS ||
    "";

  return configured
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export type AlertType =
  | "DATABASE_ERROR"
  | "REPORT_FAILURE"
  | "EMAIL_FAILURE"
  | "AUTHENTICATION_ERROR"
  | "CRITICAL_ERROR";

interface AlertOptions {
  type: AlertType;
  title: string;
  message: string;
  error?: Error | unknown;
  context?: Record<string, any>;
}

export async function sendAlert(options: AlertOptions): Promise<void> {
  const { type, title, message, error, context } = options;

  try {
    const timestamp = new Date().toISOString();
    const errorDetails = error instanceof Error
      ? `${error.name}: ${error.message}\n\nStack Trace:\n${error.stack}`
      : String(error);

    const contextDetails = context
      ? `\n\nContext:\n${JSON.stringify(context, null, 2)}`
      : '';

    const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #dc2626; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; }
    .alert-type { display: inline-block; background-color: #fef2f2; color: #dc2626; padding: 5px 10px; border-radius: 3px; font-weight: bold; margin-bottom: 10px; }
    .timestamp { color: #666; font-size: 0.9em; margin-bottom: 15px; }
    .section { margin-bottom: 20px; }
    .section-title { font-weight: bold; color: #0A66C2; margin-bottom: 5px; }
    .error-box { background-color: #fee; border-left: 4px solid #dc2626; padding: 10px; font-family: monospace; font-size: 0.85em; white-space: pre-wrap; overflow-x: auto; }
    .context-box { background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 10px; font-family: monospace; font-size: 0.85em; white-space: pre-wrap; overflow-x: auto; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">🚨 CKA Cashups Alert</h1>
    </div>
    <div class="content">
      <div class="alert-type">${type.replace(/_/g, ' ')}</div>
      <div class="timestamp">Timestamp: ${timestamp}</div>

      <div class="section">
        <div class="section-title">Alert Title:</div>
        <p><strong>${title}</strong></p>
      </div>

      <div class="section">
        <div class="section-title">Message:</div>
        <p>${message}</p>
      </div>

      ${error ? `
      <div class="section">
        <div class="section-title">Error Details:</div>
        <div class="error-box">${errorDetails}</div>
      </div>
      ` : ''}

      ${contextDetails ? `
      <div class="section">
        <div class="section-title">Additional Context:</div>
        <div class="context-box">${contextDetails}</div>
      </div>
      ` : ''}

      <div class="section" style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #ddd;">
        <p style="color: #666; font-size: 0.9em; margin: 0;">
          This is an automated alert from the CKA Cashups system.
          Please investigate and resolve the issue as soon as possible.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();

    const recipients = getAlertRecipients();
    if (!recipients.length) {
      console.warn("[ALERT] No ALERT_EMAILS or ADMIN_EMAILS configured; skipping alert email");
    } else {
      await sendEmail({
        to: recipients,
        subject: `🚨 CKA Alert: ${type.replace(/_/g, ' ')} - ${title}`,
        html: emailBody
      });
      console.log(`[ALERT SENT] ${type}: ${title}`);
    }
  } catch (alertError) {
    // If sending alert fails, log to console as fallback
    console.error('[ALERT SYSTEM FAILURE] Could not send alert email:', alertError);
    console.error('Original alert details:', { type, title, message, error, context });
  }
}

// Specialized alert functions for common scenarios
export async function alertDatabaseError(error: unknown, operation: string, context?: Record<string, any>): Promise<void> {
  await sendAlert({
    type: "DATABASE_ERROR",
    title: "Database Connection or Query Failed",
    message: `A database error occurred during: ${operation}`,
    error,
    context: {
      operation,
      ...context
    }
  });
}

export async function alertReportFailure(reportType: string, error: unknown, context?: Record<string, any>): Promise<void> {
  await sendAlert({
    type: "REPORT_FAILURE",
    title: `${reportType} Report Generation Failed`,
    message: `Failed to generate or send ${reportType} report`,
    error,
    context: {
      reportType,
      ...context
    }
  });
}

export async function alertEmailFailure(recipient: string, error: unknown, context?: Record<string, any>): Promise<void> {
  await sendAlert({
    type: "EMAIL_FAILURE",
    title: "Email Delivery Failed",
    message: `Failed to send email to ${recipient}`,
    error,
    context: {
      recipient,
      ...context
    }
  });
}
