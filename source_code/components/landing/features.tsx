"use client"

import { useEffect, useRef } from "react"
import {
  Brain,
  GitBranch,
  FileText,
  Target,
  Zap,
  Shield,
} from "lucide-react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

const features = [
  {
    icon: Brain,
    title: "AI-Powered Matching",
    description:
      "Analyzes your skills from GitHub and resume to find perfectly suited issues.",
  },
  {
    icon: Target,
    title: "Match Score",
    description:
      "Transparent scoring system based on your tech stack and experience.",
  },
  {
    icon: GitBranch,
    title: "Smart Onboarding",
    description:
      "AI-generated architecture breakdowns to understand any codebase quickly.",
  },
  {
    icon: FileText,
    title: "Portfolio Generation",
    description:
      "Auto-generate a beautiful portfolio from your GitHub activity.",
  },
  {
    icon: Zap,
    title: "Real-Time Updates",
    description:
      "Get notified when new issues match your profile instantly.",
  },
  {
    icon: Shield,
    title: "Beginner Friendly",
    description:
      "Filtered for good-first-issue labels and welcoming maintainers.",
  },
]

export function Features() {
  const sectionRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const cardsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(headerRef.current, {
        scrollTrigger: {
          trigger: headerRef.current,
          start: "top 80%",
        },
        opacity: 0,
        y: 30,
        duration: 0.8,
        ease: "power3.out",
      })

      gsap.from(cardsRef.current?.children || [], {
        scrollTrigger: {
          trigger: cardsRef.current,
          start: "top 80%",
        },
        opacity: 0,
        y: 40,
        stagger: 0.1,
        duration: 0.6,
        ease: "power3.out",
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} id="features" className="relative px-6 py-32">
      <div className="mx-auto max-w-7xl">
        <div ref={headerRef} className="mb-20 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">
            Features
          </p>
          <h2 className="text-balance text-4xl font-bold text-foreground md:text-5xl">
            Everything you need
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            From finding the right project to generating your portfolio
          </p>
        </div>

        <div ref={cardsRef} className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl border border-border bg-card p-8 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-transform duration-300 group-hover:scale-110">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-3 text-xl font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
