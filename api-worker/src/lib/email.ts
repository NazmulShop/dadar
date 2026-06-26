import type { Env } from "../env";

/**
 * Email sender using the Brevo (Sendinblue) REST API via fetch (no Node SDK needed).
 * Falls back to a structured console.log when BREVO_API_KEY is unset
 * so local dev still surfaces the OTP in Worker logs.
 */
function otpEmailHtml(
  appUrl: string,
  otp: string,
  purpose: string,
  name?: string,
  resetToken?: string,
): string {
  const greeting = name ? `Hi ${name},` : "Verify your account";
  const magicLink = resetToken
    ? `<div style="margin-top:20px;">
         <a href="${appUrl}/auth/reset?token=${encodeURIComponent(resetToken)}"
            style="display:inline-block;background:#000;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
           Click to reset password
         </a>
       </div>`
    : "";

  return `<!DOCTYPE html><html><body style="margin:0;padding:0;">
  <div style="background:#f4f6f8;padding:20px;font-family:Arial,sans-serif;">
    <div style="max-width:500px;margin:auto;background:#ffffff;border-radius:10px;padding:30px;text-align:center;box-shadow:0 4px 10px rgba(0,0,0,0.1);">
      <h1 style="color:#4CAF50;margin-bottom:10px;">Dadar Shop</h1>
      <p style="color:#555;font-size:16px;">${greeting}</p>
      <p style="margin-top:20px;color:#333;">
        Use the following OTP to complete your ${purpose.toLowerCase()}:
      </p>
      <div style="margin:20px 0;padding:15px;background:#000;color:#fff;font-size:28px;letter-spacing:6px;border-radius:8px;">
        ${otp}
      </div>
      <p style="color:#777;font-size:14px;">
        This code will expire in 10 minutes.
      </p>
      ${magicLink}
      <p style="margin-top:30px;font-size:12px;color:#aaa;">
        If you didn't request this, you can ignore this email.
      </p>
    </div>
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
  if (!env.BREVO_API_KEY) {
    console.log("[email] BREVO_API_KEY missing — logging OTP instead", {
      to: opts.to,
      otp: opts.otp,
      purpose: opts.purpose,
    });
    return { success: true };
  }

  // Brevo's "sender" object needs a name + email separately, unlike Resend's
  // single "Name <email>" string — parse env.BREVO_FROM_EMAIL into both.
  const fromRaw = env.BREVO_FROM_EMAIL || env.SENDER_EMAIL || "Dadar Shop <noreply@dadar.shop>";
  const fromMatch = fromRaw.match(/^\s*(.*?)\s*<(.+)>\s*$/);
  const senderName = fromMatch ? fromMatch[1].replace(/^"|"$/g, "") || "Dadar Shop" : "Dadar Shop";
  const senderEmail = fromMatch ? fromMatch[2] : fromRaw;

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
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": env.BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: opts.to }],
        subject: `Dadar Shop — ${opts.purpose}`,
        htmlContent: html,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("[email] Brevo failed", res.status, text);
      return { success: false, error: text };
    }
    return { success: true };
  } catch (err) {
    console.error("[email] Brevo error", err);
    return { success: false, error: String(err) };
  }
}
