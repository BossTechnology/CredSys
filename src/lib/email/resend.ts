import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "CredSys <noreply@startupboss.org>";

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

async function send(payload: EmailPayload) {
  const { error } = await resend.emails.send({
    from: FROM,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
  });
  if (error) console.error("[Resend]", error);
}

// E2 — Submission confirmed
export async function sendSubmissionConfirmed(to: string, startupName: string) {
  await send({
    to,
    subject: "CredSys — Your accreditation request was received",
    html: `
      <div style="font-family:monospace;background:#000;color:#fff;padding:24px;max-width:480px">
        <div style="font-size:20px;font-weight:bold;letter-spacing:0.1em">CRED SYS</div>
        <div style="color:#9A9A9A;font-size:10px;margin-top:4px">STARTUPBOSS.ORG</div>
        <hr style="border-color:#333;margin:16px 0"/>
        <p style="font-size:12px;color:#ccc">Hi <strong>${startupName}</strong>,</p>
        <p style="font-size:12px;color:#ccc;margin-top:8px">
          We received your accreditation request. Our team will review it and assign an evaluator shortly.
        </p>
        <p style="font-size:10px;color:#6B6B6B;margin-top:24px">GetCRED. Build Trust. Become Unstoppable.</p>
      </div>`,
  });
}

// E3 — Evaluator assigned
export async function sendEvaluatorAssigned(
  to: string,
  startupName: string,
  evaluatorOrg: string
) {
  await send({
    to,
    subject: "CredSys — Evaluator assigned to your request",
    html: `
      <div style="font-family:monospace;background:#000;color:#fff;padding:24px;max-width:480px">
        <div style="font-size:20px;font-weight:bold;letter-spacing:0.1em">CRED SYS</div>
        <hr style="border-color:#333;margin:16px 0"/>
        <p style="font-size:12px;color:#ccc">Hi <strong>${startupName}</strong>,</p>
        <p style="font-size:12px;color:#ccc;margin-top:8px">
          <strong style="color:#D9D3FA">${evaluatorOrg}</strong> has been assigned to evaluate your accreditation request.
          They will contact you to schedule an interview.
        </p>
        <p style="font-size:10px;color:#6B6B6B;margin-top:24px">GetCRED. Build Trust. Become Unstoppable.</p>
      </div>`,
  });
}

// E4 — Accreditation approved
export async function sendAccredited(
  to: string,
  startupName: string,
  uniqueCode: string
) {
  await send({
    to,
    subject: "🎉 CredSys — You are now ACCREDITED",
    html: `
      <div style="font-family:monospace;background:#000;color:#fff;padding:24px;max-width:480px">
        <div style="font-size:20px;font-weight:bold;letter-spacing:0.1em">CRED SYS</div>
        <hr style="border-color:#333;margin:16px 0"/>
        <p style="font-size:12px;color:#ccc">Congratulations, <strong>${startupName}</strong>!</p>
        <p style="font-size:12px;color:#ccc;margin-top:8px">
          Your startup has been <strong style="color:#D9D3FA">ACCREDITED</strong> on StartupBoss.
        </p>
        <div style="background:#1A1A1A;border-left:4px solid #D9D3FA;padding:12px;margin:16px 0">
          <div style="font-size:10px;color:#9A9A9A">CREDENTIAL ID</div>
          <div style="font-size:16px;font-weight:bold;color:#D9D3FA">${uniqueCode}</div>
        </div>
        <p style="font-size:10px;color:#6B6B6B;margin-top:24px">GetCRED. Build Trust. Become Unstoppable.</p>
      </div>`,
  });
}

// E5 — Rejected
export async function sendRejected(to: string, startupName: string, reason?: string) {
  await send({
    to,
    subject: "CredSys — Accreditation request update",
    html: `
      <div style="font-family:monospace;background:#000;color:#fff;padding:24px;max-width:480px">
        <div style="font-size:20px;font-weight:bold;letter-spacing:0.1em">CRED SYS</div>
        <hr style="border-color:#333;margin:16px 0"/>
        <p style="font-size:12px;color:#ccc">Hi <strong>${startupName}</strong>,</p>
        <p style="font-size:12px;color:#ccc;margin-top:8px">
          After careful review, your accreditation request was not approved at this time.
        </p>
        ${reason ? `<p style="font-size:12px;color:#CC0000;margin-top:8px">${reason}</p>` : ""}
        <p style="font-size:12px;color:#ccc;margin-top:8px">You may re-apply after addressing the feedback.</p>
        <p style="font-size:10px;color:#6B6B6B;margin-top:24px">GetCRED. Build Trust. Become Unstoppable.</p>
      </div>`,
  });
}

// E6 — Under review notification
export async function sendUnderReview(to: string, startupName: string) {
  await send({
    to,
    subject: "CredSys — Your application is under review",
    html: `
      <div style="font-family:monospace;background:#000;color:#fff;padding:24px;max-width:480px">
        <div style="font-size:20px;font-weight:bold;letter-spacing:0.1em">CRED SYS</div>
        <hr style="border-color:#333;margin:16px 0"/>
        <p style="font-size:12px;color:#ccc">Hi <strong>${startupName}</strong>,</p>
        <p style="font-size:12px;color:#ccc;margin-top:8px">
          Your accreditation application is now <strong style="color:#D9D3FA">under active review</strong>.
          An interview will be scheduled shortly.
        </p>
        <p style="font-size:10px;color:#6B6B6B;margin-top:24px">GetCRED. Build Trust. Become Unstoppable.</p>
      </div>`,
  });
}

// E7 — New assignment for evaluator
export async function sendNewAssignment(
  to: string,
  evaluatorName: string,
  startupName: string,
  requestId: string
) {
  await send({
    to,
    subject: `CredSys — New assignment: ${startupName}`,
    html: `
      <div style="font-family:monospace;background:#000;color:#fff;padding:24px;max-width:480px">
        <div style="font-size:20px;font-weight:bold;letter-spacing:0.1em">CRED SYS</div>
        <hr style="border-color:#333;margin:16px 0"/>
        <p style="font-size:12px;color:#ccc">Hi <strong>${evaluatorName}</strong>,</p>
        <p style="font-size:12px;color:#ccc;margin-top:8px">
          You have been assigned to evaluate <strong>${startupName}</strong>.
        </p>
        <div style="background:#1A1A1A;padding:12px;margin:16px 0;font-size:10px;color:#9A9A9A">
          Request ID: <span style="color:#fff">${requestId}</span>
        </div>
        <p style="font-size:10px;color:#6B6B6B;margin-top:24px">GetCRED. Build Trust. Become Unstoppable.</p>
      </div>`,
  });
}

// E8 — Competition entry confirmed
export async function sendCompetitionEntered(
  to: string,
  startupName: string,
  competitionTitle: string
) {
  await send({
    to,
    subject: `CredSys — Entry confirmed: ${competitionTitle}`,
    html: `
      <div style="font-family:monospace;background:#000;color:#fff;padding:24px;max-width:480px">
        <div style="font-size:20px;font-weight:bold;letter-spacing:0.1em">CRED SYS</div>
        <hr style="border-color:#333;margin:16px 0"/>
        <p style="font-size:12px;color:#ccc">Hi <strong>${startupName}</strong>,</p>
        <p style="font-size:12px;color:#ccc;margin-top:8px">
          Your entry to <strong style="color:#D9D3FA">${competitionTitle}</strong> has been confirmed.
          You will be notified once scoring begins.
        </p>
        <p style="font-size:10px;color:#6B6B6B;margin-top:24px">GetCRED. Build Trust. Become Unstoppable.</p>
      </div>`,
  });
}

// E9 — Entry scored notification
export async function sendEntryScored(
  to: string,
  startupName: string,
  competitionTitle: string,
  score: number
) {
  await send({
    to,
    subject: `CredSys — Your entry has been scored: ${competitionTitle}`,
    html: `
      <div style="font-family:monospace;background:#000;color:#fff;padding:24px;max-width:480px">
        <div style="font-size:20px;font-weight:bold;letter-spacing:0.1em">CRED SYS</div>
        <hr style="border-color:#333;margin:16px 0"/>
        <p style="font-size:12px;color:#ccc">Hi <strong>${startupName}</strong>,</p>
        <p style="font-size:12px;color:#ccc;margin-top:8px">
          Your entry to <strong>${competitionTitle}</strong> has been evaluated.
        </p>
        <div style="background:#1A1A1A;border-left:4px solid #D9D3FA;padding:12px;margin:16px 0">
          <div style="font-size:10px;color:#9A9A9A">YOUR SCORE</div>
          <div style="font-size:24px;font-weight:bold;color:#D9D3FA">${score}<span style="font-size:14px;color:#6B6B6B">/100</span></div>
        </div>
        <p style="font-size:10px;color:#6B6B6B;margin-top:24px">GetCRED. Build Trust. Become Unstoppable.</p>
      </div>`,
  });
}

// E10 — Competition completed / results published
export async function sendCompetitionResults(
  to: string,
  startupName: string,
  competitionTitle: string,
  rank: number | null
) {
  await send({
    to,
    subject: `CredSys — Results published: ${competitionTitle}`,
    html: `
      <div style="font-family:monospace;background:#000;color:#fff;padding:24px;max-width:480px">
        <div style="font-size:20px;font-weight:bold;letter-spacing:0.1em">CRED SYS</div>
        <hr style="border-color:#333;margin:16px 0"/>
        <p style="font-size:12px;color:#ccc">Hi <strong>${startupName}</strong>,</p>
        <p style="font-size:12px;color:#ccc;margin-top:8px">
          The results for <strong>${competitionTitle}</strong> have been published.
        </p>
        ${rank ? `
        <div style="background:#1A1A1A;border-left:4px solid #D9D3FA;padding:12px;margin:16px 0">
          <div style="font-size:10px;color:#9A9A9A">FINAL RANK</div>
          <div style="font-size:24px;font-weight:bold;color:#D9D3FA">#${rank}</div>
        </div>` : ""}
        <p style="font-size:10px;color:#6B6B6B;margin-top:24px">GetCRED. Build Trust. Become Unstoppable.</p>
      </div>`,
  });
}
