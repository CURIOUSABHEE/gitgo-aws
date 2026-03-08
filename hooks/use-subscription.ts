import { useEffect, useState } from "react"

interface SubscriptionStatus {
  plan: "free" | "starter" | "pro" | "enterprise"
  status: "active" | "cancelled" | "expired" | "trial"
  endDate?: Date
  routeAnalysisCount: number
  routeAnalysisLimit: number
  routeAnalysisRemaining: number
  canAnalyze: boolean
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSubscription = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/subscription/status")
      
      if (!response.ok) {
        throw new Error("Failed to fetch subscription status")
      }

      const data = await response.json()
      setSubscription(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setSubscription(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubscription()
  }, [])

  return {
    subscription,
    loading,
    error,
    refetch: fetchSubscription,
  }
}
