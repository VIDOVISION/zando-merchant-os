/**
 * Get the base URL for the app. Uses a cascading fallback:
 * 1. NEXT_PUBLIC_APP_URL — explicit override (set by Paperclip or user)
 * 2. VERCEL_PROJECT_PRODUCTION_URL — stable production domain (auto-set by Vercel)
 * 3. VERCEL_URL — deployment-specific hash URL (last resort for previews)
 * 4. localhost — local development
 *
 * Note: Vercel system vars don't include the protocol.
 */
export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return `http://localhost:${process.env.PORT || 3000}`;
}
