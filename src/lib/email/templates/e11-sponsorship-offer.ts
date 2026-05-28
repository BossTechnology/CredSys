import { sendEmail } from "@/lib/email/resend";
import { emailBase, emailBlock } from "@/lib/email/base";

/** E11 — Startup: a sponsor wants to fund your accreditation */
export async function sendSponsorshipOffer(
  to: string,
  startupName: string,
  sponsorOrgName: string,
  notes: string | null,
  portalUrl: string
): Promise<void> {
  const html = emailBase(`
    <p style="font-size:12px;color:#cccccc;margin:0 0 12px">
      Hi <strong style="color:#ffffff">${startupName}</strong>,
    </p>
    <p style="font-size:12px;color:#cccccc;margin:0 0 8px">
      An investor wants to sponsor your StartupCred accreditation evaluation.
    </p>
    ${emailBlock("Sponsor", sponsorOrgName, "accent")}
    ${notes ? emailBlock("Message", notes) : ""}
    <p style="font-size:12px;color:#cccccc;margin:0 0 8px">
      Log in to your Startup Portal to accept or decline this sponsorship offer.
    </p>
    <a href="${portalUrl}/app/startup/dashboard"
       style="display:inline-block;background:#ffffff;color:#000000;font-family:'Courier New',monospace;font-size:10px;font-weight:bold;letter-spacing:0.15em;text-transform:uppercase;padding:10px 20px;margin-top:8px;text-decoration:none;">
      Review Offer →
    </a>
  `);

  await sendEmail({
    to,
    subject: `${sponsorOrgName} wants to sponsor your StartupCred evaluation`,
    html,
  });
}
