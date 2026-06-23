import { sendEmail } from "@/lib/email/resend";
import { emailBase, emailBlock } from "@/lib/email/base";

/** E16a — Admin: evaluator accepted an assignment */
export async function sendEvaluatorAccepted(
  to: string,
  evaluatorOrg: string,
  startupName: string
): Promise<void> {
  const html = emailBase(`
    <p style="font-size:12px;color:#cccccc;margin:0 0 8px">
      An evaluator has <strong style="color:#ffffff">accepted</strong> an assignment.
    </p>
    ${emailBlock("Evaluator", evaluatorOrg)}
    ${emailBlock("Startup", startupName, "accent")}
    <p style="font-size:12px;color:#cccccc;margin:0">
      The evaluation will proceed as normal.
    </p>
  `);

  await sendEmail({
    to,
    subject: `StartupBoss.org — Evaluator accepted: ${startupName}`,
    html,
  });
}

/** E16b — Admin: evaluator declined an assignment (returned to queue) */
export async function sendEvaluatorDeclined(
  to: string,
  evaluatorOrg: string,
  startupName: string,
  reason: string
): Promise<void> {
  const html = emailBase(`
    <p style="font-size:12px;color:#cccccc;margin:0 0 8px">
      An evaluator has <strong style="color:#ffffff">declined</strong> an assignment.
      It has been returned to the queue for reassignment.
    </p>
    ${emailBlock("Evaluator", evaluatorOrg)}
    ${emailBlock("Startup", startupName)}
    ${emailBlock("Reason", reason, "accent")}
    <p style="font-size:12px;color:#cccccc;margin:0">
      Please assign another evaluator from the admin panel.
    </p>
  `);

  await sendEmail({
    to,
    subject: `StartupBoss.org — Evaluator declined: ${startupName}`,
    html,
  });
}
