import { sendEmail } from "@/lib/email/resend";
import { emailBase, emailBlock } from "@/lib/email/base";

/** E10 — Accreditation deadline approaching */
export async function sendDeadlineWarning(
  to: string,
  startupName: string,
  requestId: string,
  daysRemaining: number
): Promise<void> {
  const html = emailBase(`
    <p style="font-size:12px;color:#cccccc;margin:0 0 12px">
      Hi <strong style="color:#ffffff">${startupName}</strong>,
    </p>
    <div style="background:#1A1A1A;border-left:3px solid #CC0000;padding:12px 16px;margin:0 0 16px">
      <div style="font-size:8px;color:#6B6B6B;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:4px">Action Required</div>
      <div style="font-size:13px;font-weight:bold;color:#FF9999">
        ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} remaining
      </div>
    </div>
    <p style="font-size:12px;color:#cccccc;margin:0 0 12px">
      Your accreditation evaluation has a pending deadline. Please ensure
      your evaluator has everything they need to complete the review.
    </p>
    ${emailBlock("Request ID", requestId)}
    <p style="font-size:10px;color:#6B6B6B;margin:0">
      Contact your evaluator or
      <a href="mailto:${process.env.SUPPORT_EMAIL ?? "support@startupboss.org"}"
         style="color:#D9D3FA">${process.env.SUPPORT_EMAIL ?? "support@startupboss.org"}</a>
      if you need assistance.
    </p>
  `);

  await sendEmail({
    to,
    subject: "StartupBoss.org — Action required: accreditation deadline approaching",
    html,
  });
}
