import { sendEmail } from "@/lib/email/resend";
import { emailBase } from "@/lib/email/base";

/** E6 — Application is now under active review */
export async function sendUnderReview(
  to: string,
  startupName: string
): Promise<void> {
  const html = emailBase(`
    <p style="font-size:12px;color:#cccccc;margin:0 0 12px">
      Hi <strong style="color:#ffffff">${startupName}</strong>,
    </p>
    <p style="font-size:12px;color:#cccccc;margin:0 0 8px">
      Your accreditation application is now
      <strong style="color:#D9D3FA">under active review</strong>.
    </p>
    <p style="font-size:12px;color:#cccccc;margin:0">
      Your evaluator will reach out to schedule an interview. The full
      process typically takes 5–10 business days.
    </p>
  `);

  await sendEmail({
    to,
    subject: "StartupBoss.org — Your application is under review",
    html,
  });
}
