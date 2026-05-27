import { sendEmail } from "@/lib/email/resend";
import { emailBase, emailBlock } from "@/lib/email/base";

/** E3 — Startup: evaluator has been assigned to your request */
export async function sendEvaluatorAssigned(
  to: string,
  startupName: string,
  evaluatorOrg: string
): Promise<void> {
  const html = emailBase(`
    <p style="font-size:12px;color:#cccccc;margin:0 0 12px">
      Hi <strong style="color:#ffffff">${startupName}</strong>,
    </p>
    <p style="font-size:12px;color:#cccccc;margin:0 0 8px">
      An evaluator has been assigned to review your accreditation request.
    </p>
    ${emailBlock("Evaluator Organization", evaluatorOrg, "accent")}
    <p style="font-size:12px;color:#cccccc;margin:0">
      They will contact you to schedule an evaluation meeting.
      Keep an eye on your inbox.
    </p>
  `);

  await sendEmail({
    to,
    subject: "CredSys — Evaluator assigned to your request",
    html,
  });
}

/** E3b — Evaluator: you have a new assignment */
export async function sendNewAssignment(
  to: string,
  evaluatorName: string,
  startupName: string,
  requestId: string
): Promise<void> {
  const html = emailBase(`
    <p style="font-size:12px;color:#cccccc;margin:0 0 12px">
      Hi <strong style="color:#ffffff">${evaluatorName}</strong>,
    </p>
    <p style="font-size:12px;color:#cccccc;margin:0 0 8px">
      You have been assigned to evaluate a new accreditation request.
    </p>
    ${emailBlock("Startup", startupName)}
    ${emailBlock("Request ID", requestId)}
    <p style="font-size:12px;color:#cccccc;margin:0">
      Log in to your evaluator dashboard to view the full request and
      begin the evaluation process.
    </p>
  `);

  await sendEmail({
    to,
    subject: `CredSys — New assignment: ${startupName}`,
    html,
  });
}
