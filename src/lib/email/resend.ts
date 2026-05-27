/**
 * sendEmail — thin Resend wrapper.
 * All email templates import this and call it directly.
 */

interface SendEmailParams {
  to:       string;
  subject:  string;
  html:     string;
  cc?:      string;
  replyTo?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from:     `StartupBoss.org <${process.env.FROM_EMAIL ?? "noreply@startupboss.org"}>`,
      to:       [params.to],
      subject:  params.subject,
      html:     params.html,
      ...(params.cc      && { cc:       [params.cc]      }),
      ...(params.replyTo && { reply_to: params.replyTo   }),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[sendEmail] Resend error", res.status, body);
    throw new Error(`Resend API error ${res.status}: ${body}`);
  }
}
