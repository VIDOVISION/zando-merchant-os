'use server'
import { getStripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { getBaseUrl } from '@/lib/url'

export async function createCheckoutSession(
  priceId: string
): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const baseUrl = getBaseUrl()

  const session = await getStripe().checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    // DO NOT URL-encode these — Stripe substitutes {CHECKOUT_SESSION_ID} literally
    success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/cancel`,
    metadata: {
      userId: user.id, // Derived server-side, never trust the client
    },
    customer_email: user.email ?? undefined,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
  })

  // Return URL to client — do NOT call redirect() here (try/catch trap)
  return session.url!
}
