import { sendEmail } from "@/lib/email/resend";
import { emailBase, emailBlock } from "@/lib/email/base";

/** E9 — Competition results published */
export async function sendCompetitionResults(
  to: string,
  startupName: string,
  competitionName: string,
  rank: number | null
): Promise<void> {
  const html = emailBase(`
    <p style="font-size:12px;color:#cccccc;margin:0 0 12px">
      Hi <strong style="color:#ffffff">${startupName}</strong>,
    </p>
    <p style="font-size:12px;color:#cccccc;margin:0 0 8px">
      The results for <strong style="color:#ffffff">${competitionName}</strong>
      have been published.
    </p>
    ${rank != null ? `
    <div style="background:#1A1A1A;border-left:3px solid #D9D3FA;padding:12px 16px;margin:16px 0">
      <div style="font-size:8px;color:#6B6B6B;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:4px">Final Rank</div>
      <div style="font-size:28px;font-weight:bold;color:#D9D3FA">#${rank}</div>
    </div>
    ` : `
    <p style="font-size:12px;color:#cccccc;margin:12px 0">
      Log in to your dashboard to view the full leaderboard.
    </p>
    `}
    <p style="font-size:10px;color:#6B6B6B;margin:0">
      Thank you for participating. Your accreditation remains active.
    </p>
  `);

  await sendEmail({
    to,
    subject: `StartupBoss.org — Results published: ${competitionName}`,
    html,
  });
}
