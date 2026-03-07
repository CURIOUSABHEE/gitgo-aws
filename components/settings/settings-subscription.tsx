"use client"

import { useSubscription } from "@/hooks/use-subscription"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Loader2, Crown, Zap, Rocket, CheckCircle2, ArrowRight } from "lucide-react"
import Link from "next/link"

const PLAN_INFO = {
  free: {
    name: "Free",
    icon: Zap,
    color: "text-slate-400",
    bgColor: "bg-slate-500/10",
    borderColor: "border-slate-500/20",
  },
  starter: {
    name: "Starter",
    icon: Zap,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
  },
  pro: {
    name: "Pro",
    icon: Crown,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20",
  },
  enterprise: {
    name: "Enterprise",
    icon: Rocket,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
  },
}

export function SettingsSubscription() {
  const { subscription, loading, error, refetch } = useSubscription()

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error || !subscription) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm text-muted-foreground">
            {error || "Failed to load subscription information"}
          </p>
          <Button onClick={refetch} variant="outline" size="sm" className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  const planInfo = PLAN_INFO[subscription.plan]
  const Icon = planInfo.icon
  const usagePercent = subscription.routeAnalysisLimit === Infinity 
    ? 0 
    : (subscription.routeAnalysisCount / subscription.routeAnalysisLimit) * 100

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>Manage your subscription and billing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Plan Badge */}
          <div className={`flex items-center gap-4 rounded-lg border ${planInfo.borderColor} ${planInfo.bgColor} p-4`}>
            <div className={`flex h-12 w-12 items-center justify-center rounded-full ${planInfo.bgColor}`}>
              <Icon className={`h-6 w-6 ${planInfo.color}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-foreground">{planInfo.name} Plan</h3>
                <Badge variant={subscription.status === "active" ? "default" : "secondary"}>
                  {subscription.status}
                </Badge>
              </div>
              {subscription.endDate && (
                <p className="text-sm text-muted-foreground">
                  Renews on {new Date(subscription.endDate).toLocaleDateString()}
                </p>
              )}
            </div>
            {subscription.plan === "free" && (
              <Link href="/payment?plan=pro">
                <Button>
                  Upgrade <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>

          {/* Usage Stats */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Route Analysis Usage</span>
              <span className="text-sm text-muted-foreground">
                {subscription.routeAnalysisCount} / {subscription.routeAnalysisLimit === Infinity ? "∞" : subscription.routeAnalysisLimit}
              </span>
            </div>
            {subscription.routeAnalysisLimit !== Infinity && (
              <Progress value={usagePercent} className="h-2" />
            )}
            <p className="text-xs text-muted-foreground">
              {subscription.routeAnalysisRemaining === Infinity 
                ? "Unlimited route analyses available"
                : `${subscription.routeAnalysisRemaining} analyses remaining today`}
            </p>
          </div>

          {/* Features */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Plan Features</p>
            <div className="space-y-2">
              {subscription.plan === "free" && (
                <>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    2 route analyses per day
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Basic architecture diagrams
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Repository caching
                  </div>
                </>
              )}
              {subscription.plan === "starter" && (
                <>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    10 route analyses per day
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Mermaid flow diagrams
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Email support
                  </div>
                </>
              )}
              {subscription.plan === "pro" && (
                <>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Unlimited route analyses
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Priority LLM processing
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Team shared cache
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Priority support
                  </div>
                </>
              )}
              {subscription.plan === "enterprise" && (
                <>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Everything in Pro
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Bring your own API key
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Dedicated account manager
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    SLA guarantee
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Options */}
      {subscription.plan !== "enterprise" && (
        <Card>
          <CardHeader>
            <CardTitle>Upgrade Your Plan</CardTitle>
            <CardDescription>Get more features and higher limits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {subscription.plan === "free" && (
                <>
                  <Link href="/payment?plan=starter" className="block">
                    <div className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="h-5 w-5 text-blue-400" />
                        <h4 className="font-semibold text-foreground">Starter</h4>
                      </div>
                      <p className="text-2xl font-bold text-foreground mb-1">₹299<span className="text-sm font-normal text-muted-foreground">/month</span></p>
                      <p className="text-sm text-muted-foreground">10 analyses/day + email support</p>
                    </div>
                  </Link>
                  <Link href="/payment?plan=pro" className="block">
                    <div className="rounded-lg border border-primary bg-primary/5 p-4 transition-colors hover:border-primary/80">
                      <div className="flex items-center gap-2 mb-2">
                        <Crown className="h-5 w-5 text-purple-400" />
                        <h4 className="font-semibold text-foreground">Pro</h4>
                        <Badge variant="secondary" className="text-xs">Popular</Badge>
                      </div>
                      <p className="text-2xl font-bold text-foreground mb-1">₹799<span className="text-sm font-normal text-muted-foreground">/month</span></p>
                      <p className="text-sm text-muted-foreground">Unlimited analyses + priority support</p>
                    </div>
                  </Link>
                </>
              )}
              {subscription.plan === "starter" && (
                <Link href="/payment?plan=pro" className="block">
                  <div className="rounded-lg border border-primary bg-primary/5 p-4 transition-colors hover:border-primary/80">
                    <div className="flex items-center gap-2 mb-2">
                      <Crown className="h-5 w-5 text-purple-400" />
                      <h4 className="font-semibold text-foreground">Pro</h4>
                      <Badge variant="secondary" className="text-xs">Recommended</Badge>
                    </div>
                    <p className="text-2xl font-bold text-foreground mb-1">₹799<span className="text-sm font-normal text-muted-foreground">/month</span></p>
                    <p className="text-sm text-muted-foreground">Unlimited analyses + priority support</p>
                  </div>
                </Link>
              )}
              <Link href="/payment?plan=enterprise" className="block">
                <div className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary">
                  <div className="flex items-center gap-2 mb-2">
                    <Rocket className="h-5 w-5 text-amber-400" />
                    <h4 className="font-semibold text-foreground">Enterprise</h4>
                  </div>
                  <p className="text-2xl font-bold text-foreground mb-1">₹2,499<span className="text-sm font-normal text-muted-foreground">/month</span></p>
                  <p className="text-sm text-muted-foreground">Custom limits + dedicated support</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
