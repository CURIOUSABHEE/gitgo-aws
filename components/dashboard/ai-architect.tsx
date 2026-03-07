"use client"

import { Brain, ArrowRight, Shield, Database, Globe, Lock } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

const architectureNodes = [
  {
    icon: Globe,
    label: "Client Request",
    description: "HTTP request hits the API route",
    color: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  },
  {
    icon: Shield,
    label: "Middleware",
    description: "Rate limiting and CORS validation",
    color: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
  },
  {
    icon: Lock,
    label: "Auth Handler",
    description: "JWT token verification and session management",
    color: "border-primary/30 bg-primary/10 text-primary",
  },
  {
    icon: Database,
    label: "Database Query",
    description: "User lookup and permission checks",
    color: "border-cyan-500/30 bg-cyan-500/10 text-cyan-400",
  },
]

const insights = [
  {
    title: "Authentication Flow",
    content:
      "This file handles the core authentication logic using JWT tokens. It exports a POST handler for login and a GET handler for session validation.",
  },
  {
    title: "Security Pattern",
    content:
      "Uses bcrypt for password hashing with a cost factor of 12. Tokens expire after 24 hours with automatic refresh on active sessions.",
  },
  {
    title: "Database Integration",
    content:
      "Connects to PostgreSQL via the shared db utility in /lib/db.ts. Uses parameterized queries to prevent SQL injection.",
  },
  {
    title: "Error Handling",
    content:
      "Implements structured error responses with proper HTTP status codes. All errors are logged with request context for debugging.",
  },
]

export function AIArchitect() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
          <Brain className="h-3.5 w-3.5 text-primary" />
        </div>
        <h3 className="text-sm font-medium text-foreground">AI Architect</h3>
        <span className="ml-auto rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
          Analyzing
        </span>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-5">
          {/* Active File */}
          <div className="mb-6">
            <p className="mb-1 text-xs text-muted-foreground">
              Currently viewing
            </p>
            <p className="font-mono text-sm text-primary">
              src/app/api/auth/route.ts
            </p>
          </div>

          {/* Architecture Diagram */}
          <div className="mb-6">
            <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Request Flow
            </h4>
            <div className="space-y-2">
              {architectureNodes.map((node, i) => (
                <div key={node.label}>
                  <div
                    className={`flex items-center gap-3 rounded-lg border p-3 ${node.color}`}
                  >
                    <node.icon className="h-4 w-4 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{node.label}</p>
                      <p className="text-xs opacity-70">{node.description}</p>
                    </div>
                  </div>
                  {i < architectureNodes.length - 1 && (
                    <div className="flex justify-center py-1">
                      <ArrowRight className="h-3.5 w-3.5 rotate-90 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Separator className="my-6" />

          {/* AI Insights */}
          <div>
            <h4 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Code Insights
            </h4>
            <div className="space-y-4">
              {insights.map((insight) => (
                <div key={insight.title}>
                  <h5 className="mb-1 text-sm font-medium text-foreground">
                    {insight.title}
                  </h5>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {insight.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
