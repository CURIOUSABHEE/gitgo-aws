"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Github, Terminal } from "lucide-react"
import { Button } from "@/components/ui/button"
import gsap from "gsap"

export function Navbar() {
  const navRef = useRef<HTMLElement>(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(navRef.current, {
        y: -100,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
      })
    }, navRef)

    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }

    window.addEventListener("scroll", handleScroll)
    return () => {
      ctx.revert()
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])

  return (
    <header
      ref={navRef}
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "border-b border-border/50 bg-background/95 backdrop-blur-xl shadow-sm"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 transition-transform hover:scale-105">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-lg shadow-primary/20">
            <Terminal className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground">gitgo</span>
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          <Link
            href="#features"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Features
          </Link>
          <Link
            href="#how-it-works"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            How It Works
          </Link>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Dashboard
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" asChild>
            <Link href="/onboarding">Sign In</Link>
          </Button>
          <Button size="sm" className="bg-primary text-primary-foreground shadow-md shadow-primary/20 transition-all hover:scale-105 hover:shadow-lg hover:shadow-primary/30" asChild>
            <Link href="/onboarding">
              <Github className="mr-2 h-4 w-4" />
              Get Started
            </Link>
          </Button>
        </div>
      </nav>
    </header>
  )
}
