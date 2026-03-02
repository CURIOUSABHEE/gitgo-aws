"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { MermaidDiagram } from "@/components/MermaidDiagram";
import { ArchitectureDiagram } from "@/components/ArchitectureDiagram";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import Link from "next/link";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RouteAnalysisResult {
  flowVisualization: string;
  executionTrace: string | string[];
}

interface ParsedStep {
  number: number;
  title: string;
  location: string;
  code: string;
  codeLang: string;
  explanation: string;
}

// ─── Step parser ──────────────────────────────────────────────────────────────

function parseExecutionTrace(raw: string): ParsedStep[] {
  // Normalise — join arrays, strip leading bullet asterisks
  const text = raw.replace(/^\* /gm, "").replace(/^\*\* /gm, "");

  // Split on "**Step N: …**" or "Step N: …" headings
  const stepRegex = /\*?\*?Step (\d+):\s*([^\n*]+)\*?\*?/g;
  const positions: { index: number; number: number; title: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = stepRegex.exec(text)) !== null) {
    positions.push({
      index: m.index,
      number: parseInt(m[1], 10),
      title: m[2].trim(),
    });
  }

  if (positions.length === 0) return [];

  return positions.map((pos, i) => {
    const end = i + 1 < positions.length ? positions[i + 1].index : text.length;
    const block = text.slice(pos.index, end);

    // Location
    const locMatch = block.match(/\*?\*?Location:\*?\*?\s*([^\n]+)/);
    const location = locMatch
      ? locMatch[1].trim().replace(/^\*+|\*+$/g, "")
      : "";

    // Code Snippet — grab fenced block
    const codeMatch = block.match(/```(\w*)\n([\s\S]*?)```/);
    const code = codeMatch ? codeMatch[2].trim() : "";
    const codeLang = codeMatch ? codeMatch[1] || "python" : "python";

    // Explanation
    const explMatch = block.match(
      /\*?\*?Explanation:\*?\*?\s*([\s\S]+?)(?:\n\n|\*\*Step|$)/,
    );
    const explanation = explMatch
      ? explMatch[1].trim().replace(/^\*+|\*+$/g, "")
      : "";

    return {
      number: pos.number,
      title: pos.title,
      location,
      code,
      codeLang,
      explanation,
    };
  });
}

// ─── Step Card ────────────────────────────────────────────────────────────────

function StepCard({ step }: { step: ParsedStep }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-linear-to-b from-slate-800/80 to-slate-900/60 shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/7 bg-slate-800/60 px-5 py-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600/30 text-sm font-extrabold text-indigo-300 ring-1 ring-indigo-500/50">
          {step.number}
        </span>
        <h3 className="text-base font-bold leading-tight text-white">
          {step.title}
        </h3>
      </div>

      <div className="divide-y divide-white/5\">
        {/* Location */}
        {step.location && (
          <div className="flex flex-wrap items-center gap-3 px-5 py-3">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
              📍 Location
            </span>
            <code className="rounded-md bg-teal-950/60 px-2.5 py-1 font-mono text-xs text-teal-300 ring-1 ring-teal-500/30">
              {step.location}
            </code>
          </div>
        )}

        {/* Code Snippet */}
        {step.code && (
          <div className="px-5 py-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
              🧩 Code Snippet
            </p>
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0d1117] shadow-inner">
              <div className="flex items-center justify-between border-b border-white/6 px-4 py-1.5">
                <span className="text-[10px] font-mono font-medium text-slate-500 uppercase">
                  {step.codeLang}
                </span>
                <div className="flex gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500/50" />
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/50" />
                  <span className="h-2.5 w-2.5 rounded-full bg-green-500/50" />
                </div>
              </div>
              <pre className="overflow-x-auto p-4 text-sm font-mono leading-relaxed text-slate-200">
                <code>{step.code}</code>
              </pre>
            </div>
          </div>
        )}

        {/* Explanation */}
        {step.explanation && (
          <div className="px-5 py-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
              💡 Explanation
            </p>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
              <p className="text-sm leading-relaxed text-amber-200/80">
                {step.explanation}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Fallback raw renderer (if no steps parsed) ───────────────────────────────

function RawTrace({ text }: { text: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-white/10 bg-[#0d1117] p-5 text-sm font-mono leading-relaxed text-slate-300 whitespace-pre-wrap">
      {text}
    </pre>
  );
}

// ─── Main content ─────────────────────────────────────────────────────────────

function AnalyzeRouteContent() {
  const searchParams = useSearchParams();
  const repoUrl = searchParams.get("repoUrl");
  const route = searchParams.get("route");
  // routeIndex is passed by the dashboard so we can alternate API keys
  const routeIndex = searchParams.get("routeIndex") ?? "0";

  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [result, setResult] = useState<RouteAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [rateLimitExceeded, setRateLimitExceeded] = useState(false);

  const fetchAnalysis = useCallback(
    async (forceReload = false) => {
      if (!repoUrl || !route) {
        const errorMsg = "Missing repository URL or route parameter.";
        setError(errorMsg);
        setLoading(false);
        toast.error(errorMsg);
        return;
      }

      const toastId = forceReload ? "route-reload" : "route-analyze";
      toast.loading(forceReload ? "Reloading route analysis..." : "Analyzing route...", { id: toastId });

      try {
        const url = new URL("/api/analyze-route", window.location.origin);
        url.searchParams.set("repoUrl", repoUrl);
        url.searchParams.set("route", route);
        url.searchParams.set("routeIndex", routeIndex);
        if (forceReload) url.searchParams.set("forceReload", "true");

        const response = await fetch(url.toString());
        const data = await response.json();

        // ── 401 / 404: real errors, show message not subscription gate ──
        if (response.status === 401 || response.status === 404) {
          const errorMsg = data.error || "Request failed.";
          setError(errorMsg);
          toast.error(errorMsg, { id: toastId });
          return;
        }

        // ── 402 (rate limit exhausted) OR any other LLM failure → subscription gate ──
        // ── 402 (rate limit exhausted) ──
        if (response.status === 402) {
          console.error(
            `[analyze-route] Rate limit exceeded for route "${route}":`,
            data,
          );
          setRateLimitExceeded(true);
          setResult(null);
          setError(null);
          toast.error("Rate limit exceeded. Please upgrade your plan.", { id: toastId });
          return;
        }

        // ── 500 or other errors ──
        if (!response.ok) {
          const errorMsg = data.error || `API error ${response.status}`;
          console.error(
            `[analyze-route] API error ${response.status} for route "${route}":`,
            data,
          );
          setError(errorMsg);
          toast.error(errorMsg, { id: toastId });
          return;
        }

        // ── 402 (rate limit exhausted) ──
        if (response.status === 402) {
          console.error(
            `[analyze-route] Rate limit exceeded for route "${route}":`,
            data,
          );
          setRateLimitExceeded(true);
          setResult(null);
          setError(null);
          toast.error("Rate limit exceeded. Please upgrade your plan.", { id: toastId });
          return;
        }

        // ── 500 or other errors ──
        if (!response.ok) {
          const errorMsg = data.error || `API error ${response.status}`;
          console.error(
            `[analyze-route] API error ${response.status} for route "${route}":`,
            data,
          );
          setError(errorMsg);
          toast.error(errorMsg, { id: toastId });
          return;
        }
        // ── 402 (rate limit exhausted) ──
        if (response.status === 402) {
          console.error(
            `[analyze-route] Rate limit exceeded for route "${route}":`,
            data,
          );
          setRateLimitExceeded(true);
          setResult(null);
          setError(null);
          toast.error("Rate limit exceeded. Please upgrade your plan.", { id: toastId });
          return;
        }

        // ── 500 or other errors ──
        if (!response.ok) {
          const errorMsg = data.error || `API error ${response.status}`;
          console.error(
            `[analyze-route] API error ${response.status} for route "${route}":`,
            data,
          );
          setError(errorMsg);
          toast.error(errorMsg, { id: toastId });
          return;
        }

        // ── Success ───────────────────────────────────────────────────────
        setResult(data.data);
        setFromCache(data.fromCache === true);
        setError(null);
        setRateLimitExceeded(false);

        if (data.fromCache && !data.stale) {
          toast.success("Route analysis loaded from cache", { id: toastId });
        } else if (data.stale) {
          toast.success("Route analysis loaded (updating in background)", { id: toastId });
        } else {
          toast.success("Route analyzed successfully", { id: toastId });
        }
      } catch (err) {
        // Network-level failure also goes to subscription gate after logging
        console.error(
          `[analyze-route] Network/parse error for route "${route}":`,
          err,
        );
        setRateLimitExceeded(true);
        setResult(null);
        setError(null);
        toast.error("Failed to analyze route. Please try again.", { id: toastId });
      } finally {
        setLoading(false);
        setReloading(false);
      }
    },
    [repoUrl, route, routeIndex],
  );

  useEffect(() => {
    fetchAnalysis(false);
  }, [fetchAnalysis]);

  const handleForceReload = () => {
    setReloading(true);
    setResult(null);
    setError(null);
    setRateLimitExceeded(false);
    fetchAnalysis(true);
  };

  const traceRaw = Array.isArray(result?.executionTrace)
    ? result!.executionTrace.join("\n\n")
    : result?.executionTrace || "";

  const steps = traceRaw ? parseExecutionTrace(traceRaw) : [];
  const isSpinning = loading || reloading;

  // ── Subscription gate: shown fullscreen when rate limit is exhausted ──
  if (!isSpinning && rateLimitExceeded) {
    return (
      <div className="min-h-screen bg-slate-950">
        <div className="border-b border-white/6 bg-slate-950/80 px-4 py-3">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition"
          >
            ← Back to Dashboard
          </Link>
        </div>
        <SubscriptionGate route={route ?? "this route"} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-400 transition hover:text-indigo-300"
        >
          ← Back to Dashboard
        </Link>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Route Analysis
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <code className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 font-mono text-sm text-indigo-300">
                {route}
              </code>
              <span className="text-xs text-slate-500">
                from <span className="text-slate-400">{repoUrl}</span>
              </span>
              {/* Cache badge — shown only for cached responses */}
              {!isSpinning && fromCache && result && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400 ring-1 ring-emerald-500/30">
                  ⚡ Served from cache
                </span>
              )}
            </div>
          </div>

          {/* Force Reload button — visible only when a result is shown */}
          {!isSpinning && result && (
            <button
              onClick={handleForceReload}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-700/50 px-4 py-2 text-sm font-semibold text-slate-200 shadow transition hover:bg-slate-600/60 hover:text-white active:scale-95"
              title="Re-run all LLM calls and refresh the cache"
            >
              🔄 Force Reload
            </button>
          )}
        </div>
      </div>

      {/* Loading / Reloading */}
      {isSpinning && (
        <div className="flex h-60 flex-col items-center justify-center gap-4 rounded-2xl border border-white/5 bg-slate-800/30">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-indigo-500/30 border-t-indigo-400" />
          <p className="animate-pulse text-sm font-medium text-slate-400">
            {reloading
              ? "Force-reloading… bypassing cache, calling LLM…"
              : "Tracing execution flow… this may take up to a minute."}
          </p>
        </div>
      )}

      {/* Error */}
      {!isSpinning && error && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/20 text-2xl">
            ⚠️
          </div>
          <p className="font-semibold text-rose-300">{error}</p>
          <Link
            href="/dashboard"
            className="mt-3 inline-block text-sm text-indigo-400 hover:underline"
          >
            ← Back to Dashboard
          </Link>
        </div>
      )}

      {/* Results */}
      {!isSpinning && result && (
        <div className="space-y-6">
          {/* Flow Diagram */}
          {(() => {
            if (!result.flowVisualization) {
              return (
                <section className="rounded-2xl border border-white/10 bg-slate-800/60 shadow-xl">
                  <div className="flex items-center gap-3 border-b border-white/6 px-6 py-4">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 text-base">🌊</span>
                    <div>
                      <p className="text-sm font-bold text-white">Flow Visualization</p>
                    </div>
                  </div>
                  <p className="px-6 py-4 text-sm text-slate-500">No flow diagram generated.</p>
                </section>
              );
            }

            // Try rendering as React Flow JSON first
            try {
              const archData = JSON.parse(result.flowVisualization);
              if (archData && archData.nodes) {
                return <ArchitectureDiagram repoName={route ?? "Route"} data={archData} />;
              }
            } catch (e) {
              // Ignore parse errors, fallback to Mermaid string
            }

            // Fallback for legacy cached Mermaid strings
            return (
              <section className="rounded-2xl border border-white/10 bg-slate-800/60 shadow-xl">
                <div className="flex items-center gap-3 border-b border-white/6 px-6 py-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 text-base">🌊</span>
                  <div>
                    <p className="text-sm font-bold text-white">Flow Visualization</p>
                    <p className="text-xs text-slate-500">Mermaid.js Diagram (Legacy Cache)</p>
                  </div>
                </div>
                <div className="overflow-auto rounded-b-2xl bg-slate-950/60 p-4" style={{ maxHeight: "400px" }}>
                  <MermaidDiagram chart={result.flowVisualization.replace(/```mermaid\n?/g, "").replace(/```/g, "").trim()} />
                </div>
              </section>
            );
          })()}

          {/* Execution Trace */}
          <section>
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-base">
                🔍
              </span>
              <div>
                <p className="text-sm font-bold text-white">Execution Trace</p>
                <p className="text-xs text-slate-500">
                  Step-by-step code walkthrough
                </p>
              </div>
            </div>

            {steps.length > 0 ? (
              <div className="space-y-5">
                {steps.map((step) => (
                  <StepCard key={step.number} step={step} />
                ))}
              </div>
            ) : traceRaw ? (
              <RawTrace text={traceRaw} />
            ) : (
              <p className="text-sm text-slate-500">
                No execution trace generated.
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

// ─── Page wrapper ─────────────────────────────────────────────────────────────

export default function AnalyzeRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className="animate-pulse text-sm font-medium text-slate-400">
            Loading analysis…
          </p>
        </div>
      }
    >
      <AnalyzeRouteContent />
    </Suspense>
  );
}
