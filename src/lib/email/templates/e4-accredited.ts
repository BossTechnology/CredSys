import { sendEmail } from "@/lib/email/resend";
import { emailBase, emailBlock } from "@/lib/email/base";

/** E4 — Startup is now ACCREDITED */
export async function sendAccredited(
  to: string,
  startupName: string,
  uniqueCode: string
): Promise<void> {
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://startupboss.org"}/startup/${uniqueCode}`;

  const html = emailBase(`
    <p style="font-size:12px;color:#cccccc;margin:0 0 12px">
      Congratulations, <strong style="color:#ffffff">${startupName}</strong>!
    </p>
    <p style="font-size:12px;color:#cccccc;margin:0 0 8px">
      Your startup has been officially
      <strong style="color:#D9D3FA">ACCREDITED</strong> on StartupBoss.
    </p>
    ${emailBlock("Credential ID", uniqueCode, "accent")}
    <div style="margin:20px 0">
      <a href="${verifyUrl}"
         style="display:inline-block;background:#D9D3FA;color:#000000;font-family:'Courier New',monospace;font-size:10px;font-weight:bold;letter-spacing:0.15em;text-transform:uppercase;padding:10px 20px;text-decoration:none">
        VIEW MY CREDENTIAL
      </a>
    </div>
    <p style="font-size:10px;color:#6B6B6B;margin:0">
      Share your credential ID with investors, accelerators, and partners to
      verify your accreditation status.
    </p>
  `);

  await sendEmail({
    to,
    subject: "CredSys — You are now ACCREDITED",
    html,
  });
}
