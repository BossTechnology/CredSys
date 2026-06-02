import { sendEmail } from "@/lib/email/resend";
import { emailBase } from "@/lib/email/base";

/** E2 — Accreditation request received confirmation */
export async function sendSubmissionConfirmed(
  to: string,
  startupName: string
): Promise<void> {
  const html = emailBase(`
    <p style="font-size:12px;color:#cccccc;margin:0 0 12px">
      Hi <strong style="color:#ffffff">${startupName}</strong>,
    </p>
    <p style="font-size:12px;color:#cccccc;margin:0 0 12px">
      We received your accreditation request. Our team will review it and
      assign an evaluator shortly.
    </p>
    <p style="font-size:12px;color:#cccccc;margin:0">
      You will receive an email as soon as an evaluator is assigned to your case.
    </p>
  `);

  await sendEmail({
    to,
    subject: "StartupBoss.org — Your accreditation request was received",
    html,
  });
}
