/**
 * LLM Analysis Service using Groq (llama-3.3-70b-versatile / mixtral-8x7b).
 * Groq provides the fastest inference for large models — ideal for this use case.
 *
 * Two main functions:
 * 1. analyzeArchitecture — generates overall flow + Mermaid architecture diagram
 * 2. analyzeRoutes       — extracts and describes all routes in structured JSON
 */
import Groq from "groq-sdk";
import { truncate } from "./utils";
import type { KeyFile, TechStack, TreeItem, TechStackCategory } from "./github";

function formatTechStack(techStack: TechStack): string {
    let s = "";
    if (techStack.frontend) {
        const fDeps = [...techStack.frontend.dependencies, ...techStack.frontend.devDependencies].slice(0, 40).join(", ");
        s += `Frontend (${techStack.frontend.source}): ${fDeps}\n`;
    }
    if (techStack.backend) {
        const bDeps = [...techStack.backend.dependencies, ...techStack.backend.devDependencies].slice(0, 40).join(", ");
        s += `Backend (${techStack.backend.source}): ${bDeps}\n`;
    }
    return s.trim() || "None detected";
}

// ─── Groq Client Pool ────────────────────────────────────────────────────────
// Four separate clients to distribute TPM load across 4 API keys:
//   groqMain  → GROQ_API_KEY   : all architecture analysis + deep route analysis
//   groq1     → GROQ_API_KEY_1 : file-identification for routes (index % 3 === 0)
//   groq2     → GROQ_API_KEY_2 : file-identification for routes (index % 3 === 1)
//   groq3     → GROQ_API_KEY_3 : file-identification for routes (index % 3 === 2)
//   groqArchi → GROQ_API_KEY_ARCHI_1 & 2 : dedicated for large architecture diagram generation
//   groqMatch → GROQ_API_KEY_FOR_OPEN_SOUCE_FINDING_1,2,3 : dedicated for AI Repo Matching
const groqMain = new Groq({ apiKey: process.env.GROQ_API_KEY });
const groq1 = new Groq({ apiKey: process.env.GROQ_API_KEY_1 });
const groq2 = new Groq({ apiKey: process.env.GROQ_API_KEY_2 });
const groq3 = new Groq({ apiKey: process.env.GROQ_API_KEY_3 });
const groqArchi1 = new Groq({ apiKey: process.env.GROQ_API_KEY_ARCHI_1 });
const groqArchi2 = new Groq({ apiKey: process.env.GROQ_API_KEY_ARCHI_2 });

const groqMatch1 = new Groq({ apiKey: process.env.GROQ_API_KEY_FOR_OPEN_SOUCE_FINDING_1 });
const groqMatch2 = new Groq({ apiKey: process.env.GROQ_API_KEY_FOR_OPEN_SOUCE_FINDING_2 });
const groqMatch3 = new Groq({ apiKey: process.env.GROQ_API_KEY_FOR_OPEN_SOUCE_FINDING_3 });

/** Pick groq1, groq2, or groq3 based on route index (round-robin). */
function pickSecondaryClient(routeIndex: number): Groq {
    const remainder = routeIndex % 3;
    if (remainder === 0) return groq1;
    if (remainder === 1) return groq2;
    return groq3;
}

/** Randomly pick between the two dedicated ARCHI keys to load balance diagram generation */
function pickArchitectureClient(): Groq {
    // Fallback to main if Archi keys aren't set in environment
    if (!process.env.GROQ_API_KEY_ARCHI_1) return groqMain;

    return Math.random() > 0.5 ? groqArchi1 : groqArchi2;
}

/** Round-robin load balancer for Open Source Repo Recommendation generation */
function pickMatchClient(): Groq {
    if (!process.env.GROQ_API_KEY_FOR_OPEN_SOUCE_FINDING_1) return groqMain;

    // Simple randomizer to distribute the heavy generation requests
    const rand = Math.random();
    if (rand < 0.33) return groqMatch1;
    if (rand < 0.66) return groqMatch2;
    return groqMatch3;
}

/**
 * Wrapper for Groq API calls with rate limit error handling
 */
async function callGroqWithErrorHandling(
    client: Groq,
    params: Parameters<typeof client.chat.completions.create>[0]
) {
    try {
        return await client.chat.completions.create(params);
    } catch (error: any) {
        // Check if it's a rate limit error
        if (error?.error?.code === "rate_limit_exceeded" || error?.status === 429) {
            const errorMsg = error?.error?.message || "Rate limit exceeded";
            console.error("[Groq] Rate limit hit:", errorMsg);

            throw new Error(`429 RateLimitExhausted: ${errorMsg}`);
        }

        // Re-throw other errors
        throw error;
    }
}

// Model to use — llama-3.3-70b-versatile is the best available on Groq's free tier
const MODEL = "llama-3.3-70b-versatile";

/**
 * Extracts JSON from an LLM response that may be wrapped in markdown code blocks.
 */
function extractJSON<T>(text: string): T {
    // Try ```json ... ``` or ``` ... ``` block first
    const blockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = blockMatch ? blockMatch[1].trim() : text.trim();
    return JSON.parse(jsonStr) as T;
}

// ─── 1. Architecture Analysis ─────────────────────────────────────────────────

export interface ArchNode {
    id: string;
    label: string;
    type: "frontend" | "backend" | "service" | "database" | "external" | "infrastructure";
}

export interface ArchEdge {
    from: string;
    to: string;
    label?: string;
}

export interface ArchitectureJson {
    nodes: ArchNode[];
    edges: ArchEdge[];
    notes?: string[];
}

export interface ArchitectureAnalysis {
    overallFlow: string;
    architectureJson: ArchitectureJson;
}

export async function analyzeArchitecture(
    fileTree: TreeItem[],
    techStack: TechStack,
    keyFiles: KeyFile[]
): Promise<ArchitectureAnalysis> {
    const fileTreeStr = fileTree
        .map((f) => `${f.type === "tree" ? "📁" : "📄"} ${f.path}`)
        .join("\n");

    const keyFilesStr = keyFiles
        .map((f) => `\n\n=== FILE: ${f.path} ===\n${f.content}`)
        .join("");

    const systemPrompt = `You are a senior software architect specializing in production-level system design. Your job is to analyze a GitHub project and return a DETAILED, PRODUCTION-READY architecture diagram as a strict JSON object.
Return ONLY valid JSON — no markdown, no commentary, no explanation outside the JSON.`;

    const userPrompt = `Analyze this project and return a JSON object with EXACTLY these two keys:

1. "overallFlow": A comprehensive paragraph (200-300 words) explaining:
   - What this project does (its purpose and business value)
   - Complete data flow: User → Frontend → API → Services → Database → Response
   - Authentication and authorization flow
   - All technologies and how they integrate
   - External services and APIs
   - Caching strategy (if any)
   - Async processing (if any)

2. "architectureJson": A DETAILED, PRODUCTION-LEVEL architecture diagram as JSON.
   CRITICAL: You are running on a DEDICATED high-capacity API key. You MUST generate an EXTREMELY DETAILED diagram with as many relevant nodes and deep connections as you can find. Don't summarize. Extract the authentic complexity of the system.

   CRITICAL REQUIREMENTS - Include ALL these layers if detected:
   
   🔹 Layer 1: Client & Authentication
   - User/Browser node
   - Frontend framework (React, Next.js, Vue, etc.)
   - OAuth/Auth provider (GitHub, Google, Auth0, etc.)
   - Session management
   
   🔹 Layer 2: API Gateway & Rate Limiting
   - API Routes/Controllers
   - Auth middleware
   - Input validation
   - Rate limiter (Redis-backed if detected)
   
   🔹 Layer 3: Async Processing (CRITICAL if detected)
   - Job Queue (BullMQ, RabbitMQ, SQS, Celery, etc.)
   - Worker Service (separate from API)
   - Background jobs
   
   🔹 Layer 4: External Integrations
   - GitHub API (with rate limit boundary)
   - Third-party APIs (Stripe, SendGrid, etc.)
   - AI/ML services (OpenAI, Groq, etc.)
   
   🔹 Layer 5: Business Logic & Services
   - Core services
   - Data processing
   - Business rules
   
   🔹 Layer 6: Caching Layer
   - Redis/Memcached (CRITICAL: DO NOT HALLUCINATE THIS. ONLY include if explicitly found in package.json or code)
   - Cache strategy
   - Session storage
   
   🔹 Layer 7: Storage Layer
   - Primary database (PostgreSQL, MongoDB, MySQL, etc.)
   - Secondary databases
   - File storage (S3, etc.)

   Node Requirements:
   - Each node MUST have:
       "id"    : unique snake_case string, no spaces
       "label" : highly specific file name, exact route path, or specialized module name (e.g., "app/api/analyze/route.ts", "React Dashboard <Results>", "lib/github.ts", "MongoDB User Schema"). DO NOT USE GENERIC BUCKETS like "React Frontend" or "FastAPI Backend". Be extremely detailed and precise!
       "type"  : one of: frontend | backend | service | database | external | infrastructure
   - Include 25-45 nodes for a highly detailed and granular architectural picture. Extract specific components from the provided files.
   - Group related components logically
   - Show ALL critical infrastructure and core route handlers

   Edge Requirements:
   - Each edge MUST have:
       "from"  : source node id
       "to"    : target node id
       "label" : specific action/data (e.g., "POST /api/analyze", "OAuth token", "Enqueue job", "Fetch repo data")
   - Show complete request/response flow
   - Include async flows (job queues)
   - Show data flow directions clearly
   - NO self-loops (from === to is forbidden)

   Notes Requirements:
   - CRITICAL STRICNESS: DO NOT HALLUCINATE INFRASTRUCTURE. If Redis, Memcached, or a specific database is not clearly visible in the code or package.json, DO NOT INCLUDE IT in the nodes, edges, or notes.
   - Include 4-8 architectural observations
   - Mention authentication strategy
   - Mention async processing if present
   - Mention caching strategy
   - Mention rate limiting
   - Mention scalability considerations

   Example structure (expand this significantly):
   {
     "nodes": [
       { "id": "user", "label": "User Browser", "type": "frontend" },
       { "id": "frontend", "label": "Next.js Frontend", "type": "frontend" },
       { "id": "auth", "label": "GitHub OAuth", "type": "external" },
       { "id": "api", "label": "Next.js API Routes", "type": "backend" },
       { "id": "auth_middleware", "label": "Auth Middleware", "type": "service" },
       { "id": "rate_limiter", "label": "Redis Rate Limiter", "type": "infrastructure" },
       { "id": "job_queue", "label": "BullMQ Job Queue", "type": "infrastructure" },
       { "id": "worker", "label": "Worker Service", "type": "service" },
       { "id": "github_api", "label": "GitHub API", "type": "external" },
       { "id": "cache", "label": "Redis Cache", "type": "database" },
       { "id": "db", "label": "MongoDB", "type": "database" }
     ],
     "edges": [
       { "from": "user", "to": "frontend", "label": "HTTPS request" },
       { "from": "frontend", "to": "auth", "label": "OAuth flow" },
       { "from": "frontend", "to": "api", "label": "API calls" },
       { "from": "api", "to": "auth_middleware", "label": "Validate token" },
       { "from": "api", "to": "rate_limiter", "label": "Check limits" },
       { "from": "api", "to": "job_queue", "label": "Enqueue analysis" },
       { "from": "job_queue", "to": "worker", "label": "Process job" },
       { "from": "worker", "to": "github_api", "label": "Fetch repo data" },
       { "from": "worker", "to": "cache", "label": "Cache results" },
       { "from": "worker", "to": "db", "label": "Save analysis" }
     ],
     "notes": [
       "GitHub OAuth for authentication",
       "Redis-backed rate limiting (100 req/min)",
       "Async job processing with BullMQ",
       "GitHub API rate limit: 5000 req/hr",
       "MongoDB for persistent storage",
       "Redis for caching and sessions"
     ]
   }

## Project File Tree
\`\`\`
${truncate(fileTreeStr, 4000)}
\`\`\`

## Tech Stack
${formatTechStack(techStack)}

## Key File Contents
${truncate(keyFilesStr, 25000)}

Return ONLY the JSON object.`;

    // 5000 max_tokens keeps us under the 12k TPM threshold for the dedicated key
    const client = pickArchitectureClient();
    const response = await callGroqWithErrorHandling(client, {
        model: MODEL,
        max_tokens: 5000,
        temperature: 0.2,
        stream: false,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
        ],
    }) as any;

    const text = response.choices[0]?.message?.content ?? "{}";

    try {
        return extractJSON<ArchitectureAnalysis>(text);
    } catch {
        return {
            overallFlow: text.replace(/```[\s\S]*?```/g, "").slice(0, 600),
            architectureJson: {
                nodes: [{ id: "error", label: "Could not generate diagram", type: "infrastructure" }],
                edges: [],
                notes: ["LLM response could not be parsed as JSON."],
            },
        };
    }
}

// ─── 2. Route Analysis ────────────────────────────────────────────────────────

export interface RouteDetail {
    path: string;
    method: string;
    functionality: string;
    contribution: string;
    lifecycleRole: string;
}

export async function analyzeRoutes(
    keyFiles: KeyFile[],
    fileTree: TreeItem[],
    techStack: TechStack
): Promise<RouteDetail[]> {
    // Step A: Try README files first
    const readmeFiles = keyFiles.filter((f) =>
        f.path.toLowerCase().includes("readme")
    );

    // Step B: Fallback to routing files
    const routingFiles = keyFiles.filter((f) => {
        const p = f.path.toLowerCase();
        return (
            p.includes("route") || p.includes("router") || p.includes("urls.py") ||
            p.includes("server") || p.includes("app.js") || p.includes("app.ts") ||
            p.includes("main.py") || p.includes("index.js") || p.includes("index.ts") ||
            p.includes("/api/") || p.includes("pages/") || p.includes("app/")
        );
    });

    const sourceFiles = readmeFiles.length > 0
        ? [...readmeFiles, ...routingFiles].slice(0, 8)
        : routingFiles.slice(0, 8);

    const sourceStr = sourceFiles
        .map((f) => `\n\n=== ${f.path} ===\n${f.content}`)
        .join("");

    // App directory structure for inference
    const appDirFiles = fileTree
        .filter((f) => {
            const p = f.path ?? "";
            return (
                p.startsWith("app/") || p.startsWith("pages/") ||
                p.startsWith("src/app/") || p.startsWith("src/pages/")
            );
        })
        .map((f) => f.path)
        .slice(0, 60)
        .join("\n");

    const systemPrompt = `You are an expert API documentation engineer. 
Return ONLY a valid JSON array. No markdown, no explanation outside the JSON array.`;

    const userPrompt = `Analyze these project files and return a JSON ARRAY of ALL routes, pages, and endpoints.

## Tech Stack
${formatTechStack(techStack)}

## Source Files (README + routing files)
${truncate(sourceStr, 25000)}

## App Directory Structure (for inference)
\`\`\`
${truncate(appDirFiles, 2000)}
\`\`\`

Each array item MUST have these exact keys:
- "path": URL path (e.g., "/api/users", "/dashboard")
- "method": HTTP method ("GET", "POST", "PUT", "PATCH", "DELETE") or "PAGE" for UI routes
- "functionality": Plain English explanation of what this route does (2-3 sentences)
- "contribution": How this route contributes to the overall project (1-2 sentences)  
- "lifecycleRole": ONE of: "Authentication", "Data Fetching", "CRUD Operation", "UI Rendering", "File Processing", "Third-party Integration", "Real-time", "Navigation", "Background Processing"

Rules:
- Include BOTH frontend pages AND backend API endpoints
- For Next.js app/ directory: app/dashboard/page.tsx → path "/dashboard", method "PAGE"
- For Express: router.get('/api/users') → path "/api/users", method "GET"
- Include at minimum 5 routes
- Be specific about each route's purpose

Return ONLY the JSON array.`;

    const response = await callGroqWithErrorHandling(groqMain, {
        model: MODEL,
        max_tokens: 3000,
        temperature: 0.2,
        stream: false,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
        ],
    }) as any;

    const text = response.choices[0]?.message?.content ?? "[]";

    try {
        return extractJSON<RouteDetail[]>(text);
    } catch {
        // Minimal fallback
        return [
            {
                path: "/",
                method: "PAGE",
                functionality: "Main entry point of the application.",
                contribution: "Serves as the landing page for all users.",
                lifecycleRole: "UI Rendering",
            },
        ];
    }
}

// ─── 3. Specific Route Analysis ──────────────────────────────────────────────

export interface RouteAnalysisResult {
    flowVisualization: string;
    executionTrace: string | string[];
}

export async function identifyRelevantFilesForRoute(
    targetRoute: string,
    filePaths: string[],
    routeIndex: number = 0   // 0-based index in the route list → selects key1 or key2
): Promise<string[]> {
    const systemPrompt = `You are a Senior Software Engineer AI. Your task is to identify which files in a repository are most likely to handle a particular route. 
Return ONLY a JSON array of strings containing up to a maximum of 10 file paths. Choose the entrypoint (e.g. main.py, app.js), the specific router/controller file, and the core service/database logic files related to the route. No markdown, purely a JSON array.`;

    const userPrompt = `### 🎯 TARGET_ROUTE
${targetRoute}

### 📂 REPOSITORY FILE PATHS
${truncate(filePaths.join("\n"), 30000)}

Return a JSON array of up to 10 strings representing the exact file paths.`;

    // Use key1 / key2 alternately to distribute TPM load away from the main key
    const client = pickSecondaryClient(routeIndex);

    const response = await callGroqWithErrorHandling(client, {
        model: MODEL,
        max_tokens: 1000,
        temperature: 0.1,
        stream: false,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
        ],
    }) as any;

    try {
        let text = response.choices[0]?.message?.content ?? "[]";
        text = text.replace(/^```json/g, "").replace(/^```/g, "").replace(/```$/g, "").trim();
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
            return parsed.filter(p => typeof p === "string");
        }
        return [];
    } catch (e) {
        console.error("Failed to parse identified files JSON:", e);
        return [];
    }
}

export async function analyzeSpecificRoute(
    targetRoute: string,
    codebaseFiles: string,
    routeIndex: number = 0
): Promise<RouteAnalysisResult> {
    const systemPrompt = `You are an Expert Software Architect and Code Reverser. Your task is to analyze the provided raw codebase and reverse-engineer the exact execution flow for a specific target route.

Analyze the provided files to find exactly where and how TARGET_ROUTE is defined, handled, and executed. Trace its entire lifecycle.

DO NOT OUTPUT JSON. Output your analysis STRICTLY using the exact markdown headers below.

### FLOW_VISUALIZATION
Provide a JSON object representing the execution flow for the ArchitectureDiagram UI.
- MUST be perfectly valid JSON with no trailing commas.
- DO NOT wrap in markdown \`\`\`json blocks. Just output raw JSON block.
- Format:
{
  "nodes": [
    { "id": "A", "label": "routes.js (Frontend)", "type": "frontend" },
    { "id": "B", "label": "main()", "type": "backend" }
  ],
  "edges": [
    { "from": "A", "to": "B", "label": "calls" }
  ]
}
- "type" MUST be exactly one of: frontend | backend | service | database | external | infrastructure.

### EXECUTION_TRACE
Provide a chronological, step-by-step breakdown of the execution flow across the files.
For EVERY step, use EXACTLY this format:

**Step [Number]: [Action Description]**
* **Location:** [File Path] > [Function Name]
* **Code Snippet:**
  <<<FILE:[Exact File Path]:[StartLine]-[EndLine]>>>
* **Explanation:** Write a DETAILED, thorough explanation (minimum 5-7 sentences) covering:
  1. What this specific block of code does and WHY it exists at this point in the flow.
  2. A description of every important variable, parameter, or return value and its purpose.
  3. How this block connects to the previous and next step in the execution chain.
  4. Any side effects, database interactions, API calls, or state mutations that occur here.
  5. Edge cases or error paths handled in this block, if any.
  Do NOT write a single-sentence summary. Every explanation MUST be comprehensive and educational.

CRITICAL: DO NOT WRITE OR SUMMARIZE ANY CODE YOURSELF in the Code Snippet section! You MUST use the exact <<<FILE:path:start-end>>> syntax using the line numbers provided in the reference files. Do NOT use markdown code blocks. Just use the tag.`;

    const userPrompt = `### 🎯 TARGET_ROUTE
${targetRoute}

### 📂 CODEBASE_FILES
${truncate(codebaseFiles, 28000)}

Output exactly the two headers ### FLOW_VISUALIZATION and ### EXECUTION_TRACE followed by their content.`;

    // Distribute load across secondary keys for routing analysis to prevent TPM exhaustion
    const client = pickSecondaryClient(routeIndex);

    const response = await callGroqWithErrorHandling(client, {
        model: MODEL,
        max_tokens: 3000,
        temperature: 0.2,
        stream: false,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
        ],
    }) as any;

    const text = response.choices[0]?.message?.content ?? "";

    try {
        const flowMatch = text.match(/### FLOW_VISUALIZATION\n([\s\S]*?)(?=### EXECUTION_TRACE)/);
        const traceMatch = text.match(/### EXECUTION_TRACE\n([\s\S]*)/);

        let flowVisualization = flowMatch ? flowMatch[1].trim() : "{}";
        let executionTrace = traceMatch ? traceMatch[1].trim() : "Failed to extract trace from LLM response.";

        // Clean up any rogue markdown block wrappers from the JSON string
        if (flowVisualization.startsWith("\`\`\`json")) {
            flowVisualization = flowVisualization.replace(/^\`\`\`json\n?/, "").replace(/\n?\`\`\`$/, "");
        } else if (flowVisualization.startsWith("\`\`\`")) {
            flowVisualization = flowVisualization.replace(/^\`\`\`\n?/, "").replace(/\n?\`\`\`$/, "");
        }

        return {
            flowVisualization,
            executionTrace
        };
    } catch (e) {
        console.error("Failed to parse specific route markdown:", text);
        return {
            flowVisualization: "```mermaid\ngraph TD\n  A[\"Failed to generate flowchart\"]\n```",
            executionTrace: "Failed to parse execution trace. Please try again."
        };
    }
}

// ─── 3. AI Repository Matcher (Open Source Recommendations) ───────────────

// ─── Interfaces ───────────────────────────────────────────────────────────

export interface DomainAnalysis {
    domainKey: string;         // e.g. "full-stack-react-node"
    label: string;             // e.g. "Full Stack (React / Node.js)"
    primaryLanguage: string;   // e.g. "TypeScript"
    frameworks: string[];      // e.g. ["react", "nextjs", "prisma"]
    minStars: number;           // matching the developer's level
    reasoning: string;         // why this domain matches the user
}

export interface UserDomainProfile {
    experienceLevel: "beginner" | "intermediate" | "advanced";
    hasOpenSourceContributions: boolean;
    contributionNotes: string;
    domains: DomainAnalysis[];
}

export interface RecommendedRepo {
    name: string;
    full_name: string;
    html_url: string;
    description: string;
    stars: number;
    language: string;
    topics: string[];
    whyItFits: string;
    whereToStart: string;
}

export interface RecommendationCategory {
    domain: string;
    label: string;
    repos: RecommendedRepo[];
}

// ─── Phase 1: Profile Analyst ─────────────────────────────────────────────

/**
 * Phase 1: Deeply analyzes the developer's full profile (resume, GitHub repos, 
 * open-source history) and returns structured domain objects.
 * 
 * IMPORTANT: This function NEVER generates GitHub search queries.
 * It only outputs structured data (language, frameworks, stars threshold).
 * The backend constructs valid search queries from this output.
 */
export async function analyzeProfileForDomains(userProfile: {
    name?: string;
    languages: string[];
    skills: string[];
    techStack: string[];
    repos?: Array<{
        name: string;
        description?: string;
        language?: string;
        topics?: string[];
        fork?: boolean;
        html_url?: string;
    }>;
    resume?: {
        careerObjective?: string;
        skillGroups?: any[];
        experience?: any[];
        projects?: any[];
    };
    hasOSContributions: boolean; // true if user has contributed to external repos
}): Promise<UserDomainProfile> {
    const systemPrompt = `You are an expert developer mentor and open-source career advisor. You will receive a complete developer profile including their GitHub activity, resume, and skills. Your job is to deeply understand what this specific person has built, what their strongest technologies are, and what level of open-source contributor they are ready to be. Return ONLY valid JSON with no markdown.`;

    // Enrich context: list forked repos (signals OSS interest), list their own projects with tech
    const ownProjects = userProfile.repos?.filter(r => !r.fork).map(r => ({
        name: r.name,
        language: r.language,
        topics: r.topics?.slice(0, 5),
        description: r.description?.slice(0, 100)
    }));

    const forkedRepos = userProfile.repos?.filter(r => r.fork).map(r => r.name);

    const userPrompt = `
Analyze this developer's COMPLETE profile and identify their tech domains, experience level, and contribution readiness.

====== GITHUB PROFILE ======
Name: ${userProfile.name || "Unknown"}
Primary Languages (detected from repos): ${userProfile.languages.join(', ') || "None detected"}
Skills & Tags: ${userProfile.skills.join(', ') || "None"}
Tech Stack: ${userProfile.techStack.join(', ') || "None"}

Own GitHub Projects (${ownProjects?.length || 0} repos):
${JSON.stringify(ownProjects?.slice(0, 15) || [], null, 2).slice(0, 3000)}

Forked Repositories (${forkedRepos?.length || 0}):
${forkedRepos?.slice(0, 10).join(', ') || "None — no forks found"}

Has made open-source contributions to external repos: ${userProfile.hasOSContributions ? "YES" : "NO or unknown"}

====== RESUME DATA ======
Career Objective: ${userProfile.resume?.careerObjective || "Not provided"}

Skills from Resume:
${JSON.stringify(userProfile.resume?.skillGroups || [], null, 2).slice(0, 1500)}

Work Experience:
${JSON.stringify(userProfile.resume?.experience?.map((e: any) => ({
        company: e.company, role: e.role || e.title,
        duration: e.duration || e.dates,
        keyTech: e.technologies || e.skills
    })) || [], null, 2).slice(0, 2000)}

Resume Projects:
${JSON.stringify(userProfile.resume?.projects?.map((p: any) => ({
        name: p.name, tech: p.technologies || p.techStack,
        description: p.description?.slice(0, 120)
    })) || [], null, 2).slice(0, 2000)}

====== INSTRUCTIONS ======
Based on ALL the data above, produce:

1. "experienceLevel": "beginner" | "intermediate" | "advanced"
   - beginner: mostly tutorial projects, no real-world apps, no contributions
   - intermediate: has built real projects, but limited OSS experience  
   - advanced: production experience, open-source contributions, complex architectures

2. "hasOpenSourceContributions": true/false
   - true only if forked repos exist OR resume mentions OSS contributions

3. "contributionNotes": 1 sentence describing their OSS journey so far (reference specifics)

4. "domains": Exactly 3 tech domains they are strongest in. For each:
   - "domainKey": slug e.g. "full-stack-typescript"
   - "label": Human readable e.g. "Full Stack TypeScript (React/Next.js)"
   - "primaryLanguage": The exact language name e.g. "TypeScript"
   - "frameworks": Array of 3-5 framework/topic keywords EXACTLY as used in GitHub topics e.g. ["react","nextjs","nodejs","prisma"]
   - "minStars": number — set based on their level:
       beginner: 200, intermediate: 500, advanced: 1000
   - "reasoning": 1 sentence explaining why this domain was chosen, referencing their actual project names

Output ONLY this JSON structure, nothing else:
{
  "experienceLevel": "intermediate",
  "hasOpenSourceContributions": false,
  "contributionNotes": "...",
  "domains": [
    {
      "domainKey": "full-stack-typescript",
      "label": "Full Stack TypeScript (React/Next.js)",
      "primaryLanguage": "TypeScript",
      "frameworks": ["react", "nextjs", "nodejs", "prisma"],
      "minStars": 500,
      "reasoning": "Built 3+ TypeScript React apps including [project name from their profile]"
    }
  ]
}`;

    // Try each match client in order — if all 429, fall through to groqMain as last resort.
    const clientsToTry = [groqMatch1, groqMatch2, groqMatch3, groqMain];
    const params = {
        model: MODEL,
        max_tokens: 2000,
        temperature: 0.1,
        stream: false as const,
        messages: [
            { role: "system" as const, content: systemPrompt },
            { role: "user" as const, content: userPrompt }
        ]
    };

    for (let i = 0; i < clientsToTry.length; i++) {
        try {
            const response = await callGroqWithErrorHandling(clientsToTry[i], params) as any;
            const text: string = response.choices[0]?.message?.content ?? "{}";
            try {
                return extractJSON<UserDomainProfile>(text);
            } catch {
                console.error("[analyzeProfileForDomains] JSON parse failed:", text.slice(0, 300));
                break; // bad JSON — no point retrying with another key
            }
        } catch (err: any) {
            const isRateLimit = err?.message?.includes("429") || err?.status === 429;
            if (isRateLimit && i < clientsToTry.length - 1) {
                console.warn(`[analyzeProfileForDomains] Key ${i + 1} rate-limited, trying next key...`);
                continue;
            }
            console.error(`[analyzeProfileForDomains] Key ${i + 1} failed:`, err?.message);
            break;
        }
    }

    // All clients failed or JSON parse error — build a sensible fallback from detected languages
    const topLangs = userProfile.languages.slice(0, 3);
    const lang1 = topLangs[0] || "JavaScript";
    const lang2 = topLangs[1] || lang1;
    const lang3 = topLangs[2] || lang1;
    return {
        experienceLevel: "intermediate",
        hasOpenSourceContributions: userProfile.hasOSContributions,
        contributionNotes: "Profile analysis used language fallback due to LLM unavailability.",
        domains: [
            {
                domainKey: `${lang1.toLowerCase()}-dev`,
                label: `${lang1} Development`,
                primaryLanguage: lang1,
                frameworks: userProfile.skills.slice(0, 4),
                minStars: 300,
                reasoning: `Primary language detected from GitHub repos: ${lang1}`
            },
            {
                domainKey: `${lang2.toLowerCase()}-dev-2`,
                label: `${lang2} Projects`,
                primaryLanguage: lang2,
                frameworks: userProfile.techStack.slice(0, 4),
                minStars: 200,
                reasoning: `Secondary language detected: ${lang2}`
            },
            {
                domainKey: `${lang3.toLowerCase()}-open-source`,
                label: `${lang3} Open Source`,
                primaryLanguage: lang3,
                frameworks: [],
                minStars: 150,
                reasoning: `Tertiary language detected: ${lang3}`
            }
        ]
    };
}

// ─── Phase 2: Personalizer ────────────────────────────────────────────────

/**
 * Phase 2: Takes real GitHub repos fetched by the backend and generates 
 * deeply personalized recommendations referencing the user's actual projects.
 */
export async function generateStructuredRecommendations(
    userProfile: {
        name?: string;
        languages: string[];
        skills: string[];
        techStack: string[];
        repos?: any[];
        resume?: any;
    },
    fetchedReposByDomain: Array<{ domain: string; label: string; repos: any[] }>,
    domainProfile?: UserDomainProfile
): Promise<RecommendationCategory[]> {
    const systemPrompt = `You are a senior developer mentor doing 1-on-1 career coaching. You have the developer's complete profile — their actual projects, resume, experience level, and open-source history. You will evaluate a list of real GitHub open-source repositories and make HIGHLY PERSONALIZED recommendations, referencing their actual project names and skills in every single recommendation. Return ONLY raw valid JSON.`;

    // Build rich project context for referencing by name
    const ownProjectNames = userProfile.repos?.filter(r => !r.fork).map(r => r.name) || [];
    const resumeProjectNames = userProfile.resume?.projects?.map((p: any) => p.name) || [];
    const allProjects = [...new Set([...ownProjectNames, ...resumeProjectNames])];

    const userPrompt = `
====== DEVELOPER PROFILE ======
Name: ${userProfile.name || "Developer"}
Experience Level: ${domainProfile?.experienceLevel || "intermediate"}
Open Source History: ${domainProfile?.contributionNotes || "No prior OSS contributions detected."}
Has Previous OSS Contributions: ${domainProfile?.hasOpenSourceContributions ? "YES — Give slightly harder challenges" : "NO — Prioritize beginner-friendly repos"}

Primary Languages: ${userProfile.languages.join(', ')}
Skills: ${userProfile.skills.join(', ')}
Their GitHub Projects: ${allProjects.slice(0, 10).join(', ') || "None listed"}
Resume Summary: ${userProfile.resume?.careerObjective?.slice(0, 250) || "Not provided"}

Resume Projects with Tech:
${JSON.stringify(userProfile.resume?.projects?.map((p: any) => ({
        name: p.name, tech: p.technologies
    })) || []).slice(0, 1200)}

====== REPOSITORIES TO EVALUATE ======
${JSON.stringify(fetchedReposByDomain.map(d => ({
        domain: d.domain,
        label: d.label,
        repos: d.repos.slice(0, 15).map(r => ({
            full_name: r.full_name,
            description: r.description,
            stars: r.stargazers_count,
            language: r.language,
            topics: r.topics?.slice(0, 6),
            open_issues: r.open_issues_count
        }))
    }))).slice(0, 15000)}

====== INSTRUCTIONS ======
For EACH domain, select the BEST 10 repositories for THIS SPECIFIC developer.

Rules:
1. "whyItFits" MUST reference their actual project/skill names (e.g. "Since you built [ProjectName] using React...")
2. If they have NO OSS contributions → prioritize repos with many open issues and pick simpler starter repos
3. If they DO have OSS contributions → recommend more complex, higher-impact repos
4. "whereToStart" must be concrete and actionable: mention specific tabs, filters, file names they should look for
5. Sort repos within each category by best fit first

Return ONLY this exact JSON structure:
{
  "categories": [
    {
      "domain": "domain-key",
      "label": "Human Readable Label",
      "repos": [
        {
          "name": "repo-name",
          "full_name": "owner/repo-name",
          "html_url": "https://github.com/owner/repo-name",
          "description": "description",
          "stars": 1234,
          "language": "TypeScript",
          "topics": ["react","nextjs"],
          "whyItFits": "Since you built [their project name] with React, you'll feel at home here...",
          "whereToStart": "Go to Issues tab → filter label 'good first issue' → look for TypeScript or UI-related tasks"
        }
      ]
    }
  ]
}`;

    const client = pickMatchClient();
    const response = await callGroqWithErrorHandling(client, {
        model: MODEL,
        max_tokens: 5000,
        temperature: 0.2,
        stream: false,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ]
    }) as any;

    const text = response.choices[0]?.message?.content ?? "{}";
    try {
        const parsed = extractJSON<{ categories: RecommendationCategory[] }>(text);
        return parsed.categories || [];
    } catch {
        console.error("[generateStructuredRecommendations] JSON parse failed:", text.slice(0, 300));
        return [];
    }
}









