import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env vars not set')
  return createClient(url, key)
}

export async function POST(request: NextRequest) {
  // CRITICAL: request.text() preserves the raw body that Stripe signed.
  // request.json() would parse and re-serialize it, breaking signature verification.
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set')
    return NextResponse.json(
      { error: 'Webhook not configured' },
      { status: 500 }
    )
  }

  let event: Stripe.Event

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      webhookSecret
    )
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }
      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutExpired(session)
        break
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.error('Payment failed:', paymentIntent.id)
        break
      }
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
  } catch (err) {
    console.error(`Error handling event ${event.type}:`, err)
    // Return 500 so Stripe retries — handler is idempotent, retry is safe
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  if (!userId) {
    throw new Error(`No userId in session metadata: ${session.id}`)
  }

  const supabase = getSupabase()

  // UPSERT — idempotent by UNIQUE constraint on stripe_session_id
  const { error } = await supabase.from('orders').upsert(
    {
      user_id: userId,
      stripe_session_id: session.id,
      stripe_payment_intent_id: typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id ?? null,
      amount_total: session.amount_total,
      currency: session.currency,
      status: 'paid',
      metadata: session.metadata,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'stripe_session_id',
      ignoreDuplicates: false,
    }
  )

  if (error) throw error
}

async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  const supabase = getSupabase()

  const { error } = await supabase
    .from('orders')
    .update({ status: 'expired', updated_at: new Date().toISOString() })
    .eq('stripe_session_id', session.id)

  if (error) throw error
}
