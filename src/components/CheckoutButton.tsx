'use client'
import { createCheckoutSession } from '@/actions/checkout'
import { useState } from 'react'

export function CheckoutButton({
  priceId,
  label = 'Buy Now',
}: {
  priceId: string
  label?: string
}) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const url = await createCheckoutSession(priceId)
      window.location.href = url // client-side redirect — safe from try/catch trap
    } catch (err) {
      console.error('Checkout error:', err)
      setLoading(false)
    }
  }

  return (
    <button onClick={handleClick} disabled={loading}>
      {loading ? 'Redirecting...' : label}
    </button>
  )
}
