/**
 * Email base layout — CHASS1S monospace black theme.
 * Wraps per-template content in the shared shell.
 */
export function emailBase(content: string): string {
  return `
    <div style="font-family:'Courier New',monospace;background:#000000;color:#ffffff;padding:32px 24px;max-width:520px;margin:0 auto">
      <div style="margin-bottom:20px">
        <div style="font-size:18px;font-weight:bold;letter-spacing:0.15em;color:#ffffff">CRED SYS</div>
        <div style="font-size:9px;color:#6B6B6B;margin-top:2px;letter-spacing:0.2em;text-transform:uppercase">StartupBoss.org</div>
      </div>
      <div style="border-top:1px solid #333333;margin-bottom:20px"></div>
      ${content}
      <div style="border-top:1px solid #222222;margin-top:32px;padding-top:16px">
        <p style="font-size:9px;color:#4A4A4A;margin:0;letter-spacing:0.1em">
          GetCRED. Build Trust. Become Unstoppable.
        </p>
        <p style="font-size:8px;color:#333333;margin:4px 0 0">
          StartupBoss.org &mdash; CredSys Accreditation Platform
        </p>
      </div>
    </div>
  `.trim();
}

/** Renders a highlighted info block (used for credential IDs, scores, etc.) */
export function emailBlock(
  label: string,
  value: string,
  variant: "default" | "accent" | "alert" = "default"
): string {
  const borderColor = variant === "accent" ? "#D9D3FA" : variant === "alert" ? "#CC0000" : "#333333";
  const valueColor  = variant === "accent" ? "#D9D3FA" : variant === "alert" ? "#CC0000" : "#ffffff";
  return `
    <div style="background:#1A1A1A;border-left:3px solid ${borderColor};padding:12px 16px;margin:16px 0">
      <div style="font-size:8px;color:#6B6B6B;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:4px">${label}</div>
      <div style="font-size:15px;font-weight:bold;color:${valueColor};letter-spacing:0.05em">${value}</div>
    </div>
  `.trim();
}
