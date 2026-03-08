"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  Github,
  FileText,
  CheckCircle2,
  Loader2,
  Terminal,
} from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { GitHubAPI } from "@/lib/github"

const languages = [
  { name: "TypeScript", color: "bg-blue-500" },
  { name: "Python", color: "bg-yellow-500" },
  { name: "JavaScript", color: "bg-amber-400" },
  { name: "Rust", color: "bg-orange-500" },
  { name: "Go", color: "bg-cyan-400" },
]

const skills = [
  "React",
  "Python",
  "Node.js",
  "REST APIs",
  "PostgreSQL",
  "Docker",
  "Git",
  "TypeScript",
]

export function OnboardingFlow() {
  const { data: session } = useSession()
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const [detectedLanguages, setDetectedLanguages] = useState<string[]>([])
  const [extractedSkills, setExtractedSkills] = useState<string[]>([])
  const [matchCount, setMatchCount] = useState(0)
  const [actualRepoCount, setActualRepoCount] = useState(0)
  const [isLoadingGitHub, setIsLoadingGitHub] = useState(false)
  const router = useRouter()

  // Fetch real GitHub data
  useEffect(() => {
    const fetchGitHubData = async () => {
      if (!session?.accessToken) return
      
      setIsLoadingGitHub(true)
      try {
        const github = new GitHubAPI(session.accessToken)
        const repos = await github.getRepos()
        
        // Store actual repo count
        setActualRepoCount(repos.length)
        
        // Extract unique languages from repos
        const languageSet = new Set<string>()
        repos.forEach(repo => {
          if (repo.language) languageSet.add(repo.language)
        })
        
        // Convert to array and limit to 5 unique languages
        const uniqueLanguages = Array.from(languageSet).slice(0, 5)
        
        // Simulate progressive language detection
        for (let i = 0; i < uniqueLanguages.length; i++) {
          setTimeout(() => {
            setDetectedLanguages(prev => {
              // Ensure no duplicates when adding
              if (prev.includes(uniqueLanguages[i])) return prev
              return [...prev, uniqueLanguages[i]]
            })
          }, i * 400)
        }
        
      } catch (error) {
        console.error("Failed to fetch GitHub data:", error)
      } finally {
        setIsLoadingGitHub(false)
      }
    }

    fetchGitHubData()
  }, [session])

  const runStep1 = useCallback(() => {
    const interval = setInterval(() => {
      setDetectedLanguages((prev) => {
        const remaining = languages.filter((l) => !prev.includes(l.name))
        if (remaining.length === 0) {
          clearInterval(interval)
          return prev
        }
        return [...prev, remaining[0].name]
      })
    }, 400)
    return interval
  }, [])

  const runStep2 = useCallback(() => {
    const interval = setInterval(() => {
      setExtractedSkills((prev) => {
        const remaining = skills.filter((s) => !prev.includes(s))
        if (remaining.length === 0) {
          clearInterval(interval)
          return prev
        }
        return [...prev, remaining[0]]
      })
    }, 300)
    return interval
  }, [])

  useEffect(() => {
    // Progress bar animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval)
          return 100
        }
        return prev + 1
      })
    }, 80)

    // Step transitions
    const step1Timer = setTimeout(() => setCurrentStep(1), 2500)
    const step2Timer = setTimeout(() => setCurrentStep(2), 5500)

    return () => {
      clearInterval(progressInterval)
      clearTimeout(step1Timer)
      clearTimeout(step2Timer)
    }
  }, [])

  useEffect(() => {
    if (currentStep === 0) {
      const interval = runStep1()
      return () => clearInterval(interval)
    }
    if (currentStep === 1) {
      const interval = runStep2()
      return () => clearInterval(interval)
    }
    if (currentStep === 2) {
      // Animate match count to actual repo count
      const targetCount = actualRepoCount || 12 // Fallback to 12 if not loaded yet
      let count = 0
      const increment = Math.ceil(targetCount / 12) // Adjust speed based on count
      const interval = setInterval(() => {
        count += increment
        if (count >= targetCount) {
          setMatchCount(targetCount)
          clearInterval(interval)
        } else {
          setMatchCount(count)
        }
      }, 100)
      return () => clearInterval(interval)
    }
  }, [currentStep, runStep1, runStep2, actualRepoCount])

  const steps = [
    {
      icon: Github,
      title: "Analyzing GitHub Profile...",
      subtitle: "Scanning repositories and commit history",
    },
    {
      icon: FileText,
      title: "Parsing Resume...",
      subtitle: "Extracting skills and experience",
    },
    {
      icon: CheckCircle2,
      title: `Success! We found ${matchCount} projects matching your skill level.`,
      subtitle: "Your personalized dashboard is ready",
    },
  ]

  return (
    <div className="w-full max-w-lg">
      {/* Logo */}
      <div className="mb-10 flex items-center justify-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <Terminal className="h-4.5 w-4.5 text-primary-foreground" />
        </div>
        <span className="text-xl font-semibold text-foreground">gitgo</span>
      </div>

      {/* Progress */}
      <Progress value={progress} className="mb-10 h-1.5" />

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step, i) => {
          const isActive = currentStep === i
          const isDone = currentStep > i
          const isPending = currentStep < i

          return (
            <div
              key={i}
              className={`rounded-xl border p-5 transition-all duration-500 ${
                isActive
                  ? "border-primary/40 bg-card glow-green"
                  : isDone
                    ? "border-primary/20 bg-card/50"
                    : "border-border bg-card/30 opacity-40"
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    isDone
                      ? "bg-primary/20"
                      : isActive
                        ? "bg-primary/10"
                        : "bg-secondary"
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : isActive ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : (
                    <step.icon className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p
                    className={`font-medium ${
                      isPending
                        ? "text-muted-foreground"
                        : "text-foreground"
                    }`}
                  >
                    {step.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {step.subtitle}
                  </p>
                </div>
              </div>

              {/* Step 1: Languages */}
              {i === 0 && (isActive || isDone) && (
                <div className="mt-4 flex flex-wrap gap-2 pl-14">
                  {detectedLanguages.map((lang, index) => {
                    const langData = languages.find((l) => l.name === lang)
                    // Use predefined color or default to primary color
                    const colorClass = langData?.color || "bg-primary"
                    return (
                      <span
                        key={`${lang}-${index}`}
                        className="inline-flex animate-in fade-in items-center gap-1.5 rounded-md border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-foreground"
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${colorClass}`}
                        />
                        {lang}
                      </span>
                    )
                  })}
                </div>
              )}

              {/* Step 2: Skills */}
              {i === 1 && (isActive || isDone) && (
                <div className="mt-4 flex flex-wrap gap-2 pl-14">
                  {extractedSkills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex animate-in fade-in items-center rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              {/* Step 3: CTA */}
              {i === 2 && isActive && matchCount > 0 && (
                <div className="mt-4 pl-14">
                  <button
                    onClick={() => router.push("/dashboard")}
                    className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 glow-green"
                  >
                    View Your Dashboard
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Step indicator */}
      <div className="mt-8 flex items-center justify-center gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i === currentStep
                ? "w-8 bg-primary"
                : i < currentStep
                  ? "w-1.5 bg-primary/50"
                  : "w-1.5 bg-border"
            }`}
          />
        ))}
      </div>
    </div>
  )
}
