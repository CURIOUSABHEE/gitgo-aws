"use client"

import { useEffect, useRef } from "react"
import { useSession, signIn } from "next-auth/react"
import { Github, LayoutDashboard, ArrowRight, GitBranch, Star, GitPullRequest } from "lucide-react"
import { Button } from "@/components/ui/button"
import gsap from "gsap"

export function Hero() {
  const { data: session } = useSession()
  const heroRef = useRef<HTMLDivElement>(null)
  const badgeRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const descRef = useRef<HTMLParagraphElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)
  const statsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } })

      tl.from(badgeRef.current, {
        opacity: 0,
        y: -20,
        duration: 0.6,
      })
        .from(titleRef.current, {
          opacity: 0,
          y: 30,
          duration: 0.8,
        }, "-=0.3")
        .from(descRef.current, {
          opacity: 0,
          y: 20,
          duration: 0.6,
        }, "-=0.4")
        .from(ctaRef.current, {
          opacity: 0,
          y: 20,
          duration: 0.6,
        }, "-=0.3")
        .from(statsRef.current?.children || [], {
          opacity: 0,
          y: 30,
          stagger: 0.1,
          duration: 0.6,
        }, "-=0.2")
    }, heroRef)

    return () => ctx.revert()
  }, [])

  const handleGetStarted = () => {
    if (session) {
      window.location.href = "/dashboard"
    } else {
      signIn("github", { callbackUrl: "/onboarding" })
    }
  }

  return (
    <section ref={heroRef} className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-16">
      {/* Simplified background */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        {/* Badge */}
        <div ref={badgeRef} className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm text-foreground backdrop-blur-sm">
          <span className="flex h-2 w-2 animate-pulse rounded-full bg-primary" />
          Matching 10,000+ open source projects
        </div>

        <h1 ref={titleRef} className="text-balance text-5xl font-bold leading-tight tracking-tight text-foreground md:text-7xl lg:text-8xl">
          Launch your Open Source
          <br />
          <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Career</span>
        </h1>

        <p ref={descRef} className="mx-auto mt-8 max-w-2xl text-balance text-lg leading-relaxed text-muted-foreground md:text-xl">
          Connect GitHub and upload your resume. Get matched with issues you can actually solve.
        </p>

        <div ref={ctaRef} className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            size="lg"
            className="h-14 bg-primary px-10 text-base font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-105 hover:shadow-xl hover:shadow-primary/30"
            onClick={handleGetStarted}
          >
            {session ? (
              <>
                <LayoutDashboard className="mr-2 h-5 w-5" />
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            ) : (
              <>
                <Github className="mr-2 h-5 w-5" />
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        {/* Stats */}
        <div ref={statsRef} className="mt-24 grid grid-cols-3 gap-8 border-t border-border/50 pt-12">
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-primary" />
              <span className="text-3xl font-bold text-foreground md:text-4xl">10K+</span>
            </div>
            <span className="text-sm text-muted-foreground">Projects</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              <span className="text-3xl font-bold text-foreground md:text-4xl">98%</span>
            </div>
            <span className="text-sm text-muted-foreground">Accuracy</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <GitPullRequest className="h-5 w-5 text-primary" />
              <span className="text-3xl font-bold text-foreground md:text-4xl">5K+</span>
            </div>
            <span className="text-sm text-muted-foreground">PRs Merged</span>
          </div>
        </div>
      </div>
    </section>
  )
}
