import { sendEmail } from "@/lib/email/resend";
import { emailBase, emailBlock } from "@/lib/email/base";

/** E13 — Sponsor: startup declined your sponsorship */
export async function sendSponsorshipDeclined(
  to: string,
  startupName: string,
  sponsorOrgName: string
): Promise<void> {
  const html = emailBase(`
    <p style="font-size:12px;color:#cccccc;margin:0 0 12px">
      Hi <strong style="color:#ffffff">${sponsorOrgName}</strong>,
    </p>
    <p style="font-size:12px;color:#cccccc;margin:0 0 8px">
      Unfortunately, a startup has declined your accreditation sponsorship.
    </p>
    ${emailBlock("Startup", startupName, "alert")}
    <p style="font-size:12px;color:#cccccc;margin:0">
      You may reach out to the startup directly or sponsor another.
    </p>
  `);

  await sendEmail({
    to,
    subject: `${startupName} declined your accreditation sponsorship`,
    html,
  });
}
