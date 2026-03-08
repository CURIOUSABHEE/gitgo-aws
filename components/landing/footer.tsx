"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { Terminal, Github, Twitter, Linkedin } from "lucide-react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

export function Footer() {
  const footerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(footerRef.current, {
        scrollTrigger: {
          trigger: footerRef.current,
          start: "top 90%",
        },
        opacity: 0,
        y: 30,
        duration: 0.8,
        ease: "power3.out",
      })
    }, footerRef)

    return () => ctx.revert()
  }, [])

  return (
    <footer ref={footerRef} className="border-t border-border/50 bg-secondary/30 px-6 py-16 relative z-10" style={{ opacity: 1 }}>
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
          <div className="flex flex-col items-center gap-3 md:items-start">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-lg shadow-primary/20">
                <Terminal className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">gitgo</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Launch your open source career
            </p>
          </div>

          <div className="flex items-center gap-6">
            <Link
              href="#"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Privacy
            </Link>
            <Link
              href="#"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Terms
            </Link>
            <Link
              href="#"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Docs
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="#"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-all hover:border-primary/30 hover:text-primary"
            >
              <Github className="h-4 w-4" />
            </Link>
            <Link
              href="#"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-all hover:border-primary/30 hover:text-primary"
            >
              <Twitter className="h-4 w-4" />
            </Link>
            <Link
              href="#"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-all hover:border-primary/30 hover:text-primary"
            >
              <Linkedin className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="mt-12 border-t border-border/50 pt-8 text-center">
          <p className="text-sm text-muted-foreground">
            © 2024 gitgo. Built for developers, by developers.
          </p>
        </div>
      </div>
    </footer>
  )
}
