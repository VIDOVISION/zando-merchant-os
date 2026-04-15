import { getStripe } from '@/lib/stripe'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  // Next.js 15: searchParams is a Promise — MUST await it
  const params = await searchParams
  const sessionId = params.session_id
  if (!sessionId) redirect('/')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const session = await getStripe().checkout.sessions.retrieve(sessionId)

  // Verify this session belongs to the authenticated user (prevents snooping)
  if (session.metadata?.userId !== user.id) {
    redirect('/unauthorized')
  }

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('stripe_session_id', sessionId)
    .single()

  // Order may not exist yet if webhook hasn't fired — show pending state
  const isPaid = order?.status === 'paid' || session.payment_status === 'paid'

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        {isPaid ? (
          <>
            <h1 className="text-2xl font-bold">Payment confirmed!</h1>
            <p className="mt-2 text-gray-600">
              Thank you for your purchase.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold">Processing your payment...</h1>
            <p className="mt-2 text-gray-600">
              This usually takes a few seconds. Refresh the page if needed.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
