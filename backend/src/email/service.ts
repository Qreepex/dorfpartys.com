import nodemailer from "nodemailer";

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;
let emailConfigError: Error | null = null;

function getTransporter() {
  if (transporter) return transporter;
  if (emailConfigError) return null;

  try {
    // Only create transporter if email config is present
    if (!process.env.MAIL_HOST || !process.env.MAIL_USERNAME || !process.env.MAIL_PASSWORD) {
      emailConfigError = new Error(
        "Email configuration incomplete. Set MAIL_HOST, MAIL_USERNAME, MAIL_PASSWORD in .env"
      );
      return null;
    }

    transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: parseInt(process.env.MAIL_PORT || "587"),
      secure: process.env.MAIL_PORT === "465",
      auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
      },
    });
    return transporter;
  } catch (error) {
    emailConfigError = error as Error;
    console.error("Failed to create email transporter:", error);
    return null;
  }
}

export async function sendReportNotification(
  reportType: string,
  reporterEmail: string | undefined,
  url: string,
  description: string,
) {
  const recipients = process.env.MAIL_REPORT_RECIPIENT?.split(",").map((r) => r.trim()) || [];
  if (recipients.length === 0) {
    console.warn("No MAIL_REPORT_RECIPIENT configured");
    return;
  }

  const mailer = getTransporter();
  if (!mailer) {
    console.warn("Email service not available:", emailConfigError?.message);
    return;
  }

  try {
    await mailer.sendMail({
      from: process.env.MAIL_FROM || "noreply@dorfpartys.com",
      to: recipients,
      subject: `[dorfpartys.com Report] New ${reportType} report submitted`,
      html: `
        <h2>New Report Submitted</h2>
        <p><strong>Report Type:</strong> ${reportType}</p>
        ${reporterEmail ? `<p><strong>Reporter Email:</strong> ${reporterEmail}</p>` : ""}
        <p><strong>URL:</strong> <a href="${url}">${url}</a></p>
        <p><strong>Description:</strong></p>
        <p>${description.replace(/\n/g, "<br>")}</p>
      `,
    });
  } catch (error) {
    console.error("Failed to send report notification email:", error);
    // Don't throw - allow report submission to proceed even if email fails
  }
}

export async function sendReportConfirmation(
  reporterEmail: string,
  reportType: string,
  ticketNumber: string,
) {
  const mailer = getTransporter();
  if (!mailer) {
    console.warn("Email service not available - confirmation email not sent");
    return;
  }

  try {
    await mailer.sendMail({
      from: process.env.MAIL_FROM || "noreply@dorfpartys.com",
      to: reporterEmail,
      subject: `Report Confirmation - Ticket #${ticketNumber}`,
      html: `
        <h2>Your Report Has Been Received</h2>
        <p>Thank you for reporting this content to dorfpartys.com.</p>
        <p><strong>Ticket Number:</strong> ${ticketNumber}</p>
        <p><strong>Report Type:</strong> ${reportType}</p>
        <p>Our moderation team will review your report and take appropriate action within the timeframe required by law.</p>
        <p>If you have any questions, please reply to this email.</p>
        <p>Best regards,<br>dorfpartys.com Moderation Team</p>
      `,
    });
  } catch (error) {
    console.error("Failed to send report confirmation email:", error);
    // Don't throw - allow report submission to proceed even if email fails
  }
}
