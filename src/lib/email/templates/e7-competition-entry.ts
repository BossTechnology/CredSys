import { sendEmail } from "@/lib/email/resend";
import { emailBase, emailBlock } from "@/lib/email/base";

/** E7 — Competition entry confirmed for startup */
export async function sendCompetitionEntered(
  to: string,
  startupName: string,
  competitionName: string
): Promise<void> {
  const html = emailBase(`
    <p style="font-size:12px;color:#cccccc;margin:0 0 12px">
      Hi <strong style="color:#ffffff">${startupName}</strong>,
    </p>
    <p style="font-size:12px;color:#cccccc;margin:0 0 8px">
      Your entry has been confirmed for the following competition.
    </p>
    ${emailBlock("Competition", competitionName, "accent")}
    <p style="font-size:12px;color:#cccccc;margin:0">
      You will receive a notification once scoring begins.
      Make sure your accreditation profile is complete and up to date.
    </p>
  `);

  await sendEmail({
    to,
    subject: `CredSys — Entry confirmed: ${competitionName}`,
    html,
  });
}
