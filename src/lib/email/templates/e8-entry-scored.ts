import { sendEmail } from "@/lib/email/resend";
import { emailBase, emailBlock } from "@/lib/email/base";

/** E8 — Startup: your competition entry has been scored */
export async function sendEntryScored(
  to: string,
  startupName: string,
  competitionName: string,
  score: number
): Promise<void> {
  const html = emailBase(`
    <p style="font-size:12px;color:#cccccc;margin:0 0 12px">
      Hi <strong style="color:#ffffff">${startupName}</strong>,
    </p>
    <p style="font-size:12px;color:#cccccc;margin:0 0 8px">
      Your entry to <strong style="color:#ffffff">${competitionName}</strong>
      has been evaluated.
    </p>
    <div style="background:#1A1A1A;border-left:3px solid #D9D3FA;padding:12px 16px;margin:16px 0">
      <div style="font-size:8px;color:#6B6B6B;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:4px">Your Score</div>
      <div style="font-size:28px;font-weight:bold;color:#D9D3FA">
        ${score}<span style="font-size:14px;color:#6B6B6B">&nbsp;/ 100</span>
      </div>
    </div>
    <p style="font-size:10px;color:#6B6B6B;margin:0">
      Final rankings will be published when the competition closes.
    </p>
  `);

  await sendEmail({
    to,
    subject: `CredSys — Your entry has been scored: ${competitionName}`,
    html,
  });
}

/** E8b — Accelerator: a startup in your competition has been scored */
export async function sendAcceleratorEntryScored(
  to: string,
  acceleratorName: string,
  startupName: string,
  competitionName: string,
  score: number
): Promise<void> {
  const html = emailBase(`
    <p style="font-size:12px;color:#cccccc;margin:0 0 12px">
      Hi <strong style="color:#ffffff">${acceleratorName}</strong>,
    </p>
    <p style="font-size:12px;color:#cccccc;margin:0 0 8px">
      A startup in your competition has been scored.
    </p>
    ${emailBlock("Startup",     startupName,      "default")}
    ${emailBlock("Competition", competitionName,  "accent")}
    <div style="background:#1A1A1A;border-left:3px solid #D9D3FA;padding:12px 16px;margin:16px 0">
      <div style="font-size:8px;color:#6B6B6B;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:4px">Score</div>
      <div style="font-size:22px;font-weight:bold;color:#D9D3FA">
        ${score}<span style="font-size:12px;color:#6B6B6B">&nbsp;/ 100</span>
      </div>
    </div>
  `);

  await sendEmail({
    to,
    subject: `CredSys — Score update: ${startupName} in ${competitionName}`,
    html,
  });
}
