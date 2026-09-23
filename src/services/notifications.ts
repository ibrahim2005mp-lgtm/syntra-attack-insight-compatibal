/**
 * Frontend notification service — session-scoped, fire-and-forget.
 *
 * The app is frontend-only, so outbound notifications (e.g. the welcome
 * email sent when a new account is created) are delivered by POSTing a
 * small JSON payload to a webhook endpoint you control. Point
 * `VITE_WELCOME_WEBHOOK_URL` at any handler that accepts:
 *
 *   POST { email, source, sentAt }
 *
 * A ready-made handler is a serverless function calling the Resend API
 * (https://resend.com/docs) with RESEND_API_KEY kept server-side:
 *
 *   export default async function handler(req, res) {
 *     const { email } = await req.json();
 *     await fetch("https://api.resend.com/emails", {
 *       method: "POST",
 *       headers: {
 *         Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
 *         "Content-Type": "application/json",
 *       },
 *       body: JSON.stringify({
 *         from: "SYNTRA <onboarding@resend.dev>",
 *         to: [email],
 *         subject: "Welcome to SYNTRA",
 *         html: "<strong>Welcome to SYNTRA.</strong> Your investigation workspace is ready.",
 *       }),
 *     });
 *     res.status(204).end();
 *   }
 *
 * Delivery is best-effort by design: notification failures must never
 * block or break account creation, so they are logged, not thrown.
 */

const WEBHOOK_URL: string | undefined = import.meta.env.VITE_WELCOME_WEBHOOK_URL;

/** True when a welcome-notification endpoint is configured. */
export function isWelcomeNotificationConfigured(): boolean {
  return typeof WEBHOOK_URL === "string" && WEBHOOK_URL.length > 0;
}

/**
 * Fire the welcome notification for a newly created account. Resolves
 * immediately with whether the event was dispatched; errors are logged
 * and swallowed.
 */
export async function sendWelcomeNotification(email: string): Promise<boolean> {
  const endpoint = WEBHOOK_URL;
  if (!endpoint || !email) return false;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, source: "syntra-signup", sentAt: Date.now() }),
      // Do not let a hanging endpoint hold the session open.
      keepalive: true,
    });
    if (!response.ok) {
      console.warn(
        `[notifications] welcome webhook responded ${response.status}; check the endpoint and RESEND_API_KEY.`,
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[notifications] welcome webhook request failed:", error);
    return false;
  }
}
