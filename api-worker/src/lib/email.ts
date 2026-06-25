import type { Env } from "../env";

/**
 * Email sender using the Resend REST API via fetch (no Node SDK needed).
 * Falls back to a structured console.log when RESEND_API_KEY is unset
 * so local dev still surfaces the OTP in Worker logs.
 */
function otpEmailHtml(
  appUrl: string,
  otp: string,
  purpose: string,
  name?: string,
  resetToken?: string,
): string {
  const greeting = name ? `Hi ${name},` : "Hi there,";
  const magicLink = resetToken
    ? `<div style="margin:16px 0;">
         <a href="${appUrl}/auth/reset?token=${encodeURIComponent(resetToken)}"
            style="display:inline-block;background:#2a3d35;color:#FAF8F3;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;">
           Click to reset password
         </a>
       </div>`
    : "";

  return `<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#FAF8F3;font-family:Inter,system-ui,sans-serif;color:#1a2e25;">
    <div style="max-width:560px;margin:auto;background:#fff;border:1px solid #e8e5de;border-radius:16px;padding:32px;">
      <h1 style="margin:0 0 16px;font-size:20px;color:#2a3d35;">Dadar Shop — ${purpose}</h1>
      <p style="font-size:15px;color:#3a5243;">${greeting}</p>
      <p style="font-size:15px;line-height:1.6;color:#4a5e52;">Use the code below to continue. It expires in 10 minutes.</p>
      <div style="background:#f5f3ee;border:1px solid #e8e5de;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
        <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#7a9288;">${purpose} code</div>
        <div style="font-size:32px;font-weight:700;letter-spacing:8px;color:#2a3d35;margin-top:8px;">${otp}</div>
      </div>
      ${magicLink}
      <p style="font-size:12px;color:#7a9288;margin-top:24px;">If you didn't request this, you can safely ignore this email.</p>
    </div>
  </body></html>`;
}

export async function sendOtpEmail(
  env: Env,
  opts: {
    to: string;
    otp: string;
    purpose: string;
    name?: string;
    resetToken?: string;
  },
): Promise<{ success: boolean; error?: string }> {
  if (!env.RESEND_API_KEY) {
    console.log("[email] RESEND_API_KEY missing — logging OTP instead", {
      to: opts.to,
      otp: opts.otp,
      purpose: opts.purpose,
    });
    return { success: true };
  }

  const from = env.RESEND_FROM_EMAIL || "Dadar Shop <noreply@dadar.shop>";

  // The reset-password link must point at the frontend (React Router handles
  // /auth/reset), not at the backend Worker itself (APP_URL). CORS_ORIGIN
  // is exactly the frontend URL — use its first value (it can be a
  // comma-separated list for multi-origin setups).
  const frontendUrl = (env.CORS_ORIGIN ?? "").split(",")[0]?.trim() || env.APP_URL;
  const safeUrl = frontendUrl && /^https?:\/\//i.test(frontendUrl) ? frontendUrl : "";
  if (!safeUrl && (env.NODE_ENV ?? "").toLowerCase() === "production") {
    console.error("[email] Cannot determine a valid frontend URL for email links — set CORS_ORIGIN to your frontend URL");
  }
  const html = otpEmailHtml(safeUrl || "https://dadar.shop", opts.otp, opts.purpose, opts.name, opts.resetToken);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: opts.to,
        subject: `Dadar Shop — ${opts.purpose}`,
        html,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("[email] Resend failed", res.status, text);
      return { success: false, error: text };
    }
    return { success: true };
  } catch (err) {
    console.error("[email] Resend error", err);
    return { success: false, error: String(err) };
  }
}
