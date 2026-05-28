import { sendEmail } from "@/lib/email/resend";
import { emailBase, emailBlock } from "@/lib/email/base";

/** E14 — Investor: a watched startup just got accredited */
export async function sendWatchlistAccredited(
  to: string,
  startupName: string,
  uniqueCode: string,
  portalUrl: string
): Promise<void> {
  const credUrl = `${portalUrl}/startup/${uniqueCode}`;

  const html = emailBase(`
    <p style="font-size:12px;color:#cccccc;margin:0 0 12px">
      A startup on your watchlist just earned their StartupCred!
    </p>
    ${emailBlock("Startup", startupName, "accent")}
    ${emailBlock("Credential ID", uniqueCode.toUpperCase())}
    <a href="${credUrl}"
       style="display:inline-block;background:#ffffff;color:#000000;font-family:'Courier New',monospace;font-size:10px;font-weight:bold;letter-spacing:0.15em;text-transform:uppercase;padding:10px 20px;margin-top:8px;text-decoration:none;">
      View Credential →
    </a>
  `);

  await sendEmail({
    to,
    subject: `${startupName} just earned their StartupCred!`,
    html,
  });
}
