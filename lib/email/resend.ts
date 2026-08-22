import { Resend } from "resend";

export interface SendCritiqueEmailInput {
  to: string;
  ownerName: string;
  dogName: string;
  showName: string;
  pdfBytes: Uint8Array;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function sendCritiqueEmail(
  input: SendCritiqueEmailInput,
): Promise<{ sent: boolean; mock: boolean; id?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

  if (!apiKey) {
    return { sent: true, mock: true, id: `mock-${Date.now()}` };
  }

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from,
      to: input.to,
      subject: `Critique: ${input.dogName} — ${input.showName}`,
      html: `<p>Dear ${escapeHtml(input.ownerName)},</p><p>Please find attached the judge's critique for <strong>${escapeHtml(input.dogName)}</strong> from ${escapeHtml(input.showName)}.</p>`,
      attachments: [
        {
          filename: `critique-${input.dogName.replace(/\s+/g, "-")}.pdf`,
          content: Buffer.from(input.pdfBytes),
        },
      ],
    });
    if (result.error) {
      return { sent: false, mock: false, error: result.error.message };
    }
    return { sent: true, mock: false, id: result.data?.id };
  } catch (err) {
    return {
      sent: false,
      mock: false,
      error: err instanceof Error ? err.message : "Email send failed",
    };
  }
}
