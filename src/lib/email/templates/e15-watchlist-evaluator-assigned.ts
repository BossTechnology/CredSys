import { sendEmail } from "@/lib/email/resend";
import { emailBase, emailBlock } from "@/lib/email/base";

/** E15 — Investor: a watched startup has been assigned an evaluator */
export async function sendWatchlistEvaluatorAssigned(
  to: string,
  startupName: string
): Promise<void> {
  const html = emailBase(`
    <p style="font-size:12px;color:#cccccc;margin:0 0 12px">
      An update on a startup you&apos;re watching.
    </p>
    ${emailBlock("Startup", startupName, "accent")}
    <p style="font-size:12px;color:#cccccc;margin:0">
      An evaluator has been assigned to review their accreditation request.
      The evaluation process is now underway.
    </p>
  `);

  await sendEmail({
    to,
    subject: `${startupName} has been assigned an Evaluator`,
    html,
  });
}
