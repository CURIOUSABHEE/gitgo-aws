"use client"

import { useEffect, useRef } from "react"
import {
  Search,
  BarChart3,
  GraduationCap,
  UserCircle,
  MessageSquare,
  TrendingUp,
} from "lucide-react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

const features = [
  {
    icon: Search,
    title: "Smart Repository Discovery",
    description:
      "AI-powered recommendations based on your tech stack",
  },
  {
    icon: BarChart3,
    title: "Repository Analysis",
    description:
      "Deep insights into project architecture and contribution opportunities",
  },
  {
    icon: GraduationCap,
    title: "GSoC Integration",
    description:
      "Browse Google Summer of Code organizations",
  },
  {
    icon: UserCircle,
    title: "Developer Portfolio",
    description:
      "Generate and customize your developer portfolio",
  },
  {
    icon: MessageSquare,
    title: "Community Feed",
    description:
      "Connect with other developers and share achievements",
  },
  {
    icon: TrendingUp,
    title: "Analytics Dashboard",
    description:
      "Track your open-source contributions",
  },
]

export function Features() {
  const sectionRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const cardsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        headerRef.current,
        { opacity: 0, y: 30 },
        {
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 90%",
          },
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
        }
      )

      const cards = cardsRef.current?.children
      if (cards && cards.length > 0) {
        gsap.fromTo(
          cards,
          { opacity: 0, y: 50, scale: 0.95 },
          {
            scrollTrigger: {
              trigger: cardsRef.current,
              start: "top 95%",
            },
            opacity: 1,
            y: 0,
            scale: 1,
            stagger: 0.08,
            duration: 0.7,
            ease: "power3.out",
          }
        )
      }
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} id="features" className="relative px-6 py-16">
      {/* Subtle ambient glow behind the section */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[800px] rounded-full bg-primary/[0.03] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        <div ref={headerRef} className="mb-16 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Features
            </span>
          </div>
          <h2 className="text-balance text-4xl font-bold text-foreground md:text-5xl">
            Everything you need
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            From finding the right project to generating your portfolio
          </p>
        </div>

        <div ref={cardsRef} className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-7 transition-all duration-500 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1"
            >
              {/* Gradient accent line at top */}
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-primary to-emerald-400 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

              {/* Hover glow effect */}
              <div className="pointer-events-none absolute -top-20 -right-20 h-40 w-40 rounded-full bg-primary/20 opacity-0 blur-3xl transition-opacity duration-700 group-hover:opacity-[0.07]" />

              <div className="relative">
                {/* Icon — GitGo green palette */}
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20 transition-all duration-500 group-hover:scale-110 group-hover:bg-primary/15 group-hover:shadow-lg group-hover:shadow-primary/10">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>

                {/* Content */}
                <h3 className="mb-2 text-lg font-semibold text-foreground tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
