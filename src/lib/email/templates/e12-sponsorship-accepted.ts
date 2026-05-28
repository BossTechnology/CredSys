import { sendEmail } from "@/lib/email/resend";
import { emailBase, emailBlock } from "@/lib/email/base";

/** E12 — Sponsor (investor/accelerator): startup accepted your sponsorship */
export async function sendSponsorshipAccepted(
  to: string,
  startupName: string,
  sponsorOrgName: string
): Promise<void> {
  const html = emailBase(`
    <p style="font-size:12px;color:#cccccc;margin:0 0 12px">
      Hi <strong style="color:#ffffff">${sponsorOrgName}</strong>,
    </p>
    <p style="font-size:12px;color:#cccccc;margin:0 0 8px">
      Great news — a startup has accepted your accreditation sponsorship.
    </p>
    ${emailBlock("Startup", startupName, "accent")}
    <p style="font-size:12px;color:#cccccc;margin:0">
      The accreditation process will now begin. You will be notified when it is complete.
    </p>
  `);

  await sendEmail({
    to,
    subject: `${startupName} accepted your accreditation sponsorship`,
    html,
  });
}
