import { sendEmail } from "@/lib/email/resend";
import { emailBase, emailBlock } from "@/lib/email/base";

/** E1 — Account setup link sent after intake form submission */
export async function sendAccountSetup(
  to: string,
  orgName: string,
  setupUrl: string
): Promise<void> {
  const html = emailBase(`
    <p style="font-size:12px;color:#cccccc;margin:0 0 12px">
      Hi <strong style="color:#ffffff">${orgName}</strong>,
    </p>
    <p style="font-size:12px;color:#cccccc;margin:0 0 16px">
      Your application to StartupBoss.org has been received. Click below to set up
      your account and complete your profile.
    </p>
    ${emailBlock("Account Setup Link", "Valid for 7 days")}
    <div style="margin:20px 0">
      <a href="${setupUrl}"
         style="display:inline-block;background:#D9D3FA;color:#000000;font-family:'Courier New',monospace;font-size:10px;font-weight:bold;letter-spacing:0.15em;text-transform:uppercase;padding:10px 20px;text-decoration:none">
        ACTIVATE MY ACCOUNT
      </a>
    </div>
    <p style="font-size:10px;color:#6B6B6B;margin:0">
      If you did not request this, you can safely ignore this email.
    </p>
  `);

  await sendEmail({
    to,
    subject: "StartupBoss.org — Activate your account",
    html,
  });
}
