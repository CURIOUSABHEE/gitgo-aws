"use client"

import { useEffect, useRef } from "react"
import { Github, FileSearch, Rocket } from "lucide-react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

const steps = [
  {
    icon: Github,
    step: "01",
    title: "Connect GitHub",
    description:
      "Link your GitHub account and upload your resume. We analyze everything in seconds.",
  },
  {
    icon: FileSearch,
    step: "02",
    title: "Get Matched",
    description:
      "AI matches you with projects and issues based on your exact skill level.",
  },
  {
    icon: Rocket,
    step: "03",
    title: "Start Contributing",
    description:
      "Dive in with AI-powered explanations, then auto-generate your portfolio.",
  },
]

export function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const stepsRef = useRef<HTMLDivElement>(null)

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

      gsap.from(stepsRef.current?.children || [], {
        scrollTrigger: {
          trigger: stepsRef.current,
          start: "top 80%",
        },
        opacity: 0,
        y: 50,
        stagger: 0.15,
        duration: 0.8,
        ease: "power3.out",
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} id="how-it-works" className="relative z-10 px-6 py-32" style={{ opacity: 1 }}>
      <div className="mx-auto max-w-6xl">
        <div ref={headerRef} className="mb-20 text-center opacity-100">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">
            How It Works
          </p>
          <h2 className="text-balance text-4xl font-bold text-foreground md:text-5xl">
            Three steps to your first PR
          </h2>
        </div>

        <div ref={stepsRef} className="grid gap-12 md:grid-cols-3 opacity-100">
          {steps.map((item, i) => (
            <div key={item.step} className="relative text-center">
              {i < steps.length - 1 && (
                <div className="absolute left-1/2 top-12 hidden h-px w-full bg-gradient-to-r from-primary/50 to-primary/20 md:block" />
              )}
              <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg shadow-primary/10">
                <item.icon className="h-10 w-10 text-primary" />
                <span className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-lg">
                  {item.step}
                </span>
              </div>
              <h3 className="mb-3 text-xl font-semibold text-foreground">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
