import { sendEmail } from "@/lib/email/resend";
import { emailBase } from "@/lib/email/base";

/** E5 — Accreditation request not approved */
export async function sendRejected(
  to: string,
  startupName: string,
  reason?: string
): Promise<void> {
  const html = emailBase(`
    <p style="font-size:12px;color:#cccccc;margin:0 0 12px">
      Hi <strong style="color:#ffffff">${startupName}</strong>,
    </p>
    <p style="font-size:12px;color:#cccccc;margin:0 0 12px">
      After careful review, your accreditation request was not approved at this time.
    </p>
    ${reason ? `
    <div style="background:#1A1A1A;border-left:3px solid #CC0000;padding:12px 16px;margin:16px 0">
      <div style="font-size:8px;color:#6B6B6B;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:4px">Feedback</div>
      <div style="font-size:12px;color:#FF9999">${reason}</div>
    </div>
    ` : ""}
    <p style="font-size:12px;color:#cccccc;margin:0">
      You are welcome to re-apply after addressing the feedback above.
      If you have questions, contact
      <a href="mailto:${process.env.SUPPORT_EMAIL ?? "support@startupboss.org"}"
         style="color:#D9D3FA">${process.env.SUPPORT_EMAIL ?? "support@startupboss.org"}</a>.
    </p>
  `);

  await sendEmail({
    to,
    subject: "StartupBoss.org — Accreditation request update",
    html,
  });
}
