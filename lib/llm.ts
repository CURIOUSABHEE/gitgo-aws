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

// Lazy-load clients to avoid build-time errors when env vars are missing
let groqMain: Groq | null = null;
let groq1: Groq | null = null;
let groq2: Groq | null = null;
let groq3: Groq | null = null;
let groqArchi1: Groq | null = null;
let groqArchi2: Groq | null = null;
let groqMatch1: Groq | null = null;
let groqMatch2: Groq | null = null;
let groqMatch3: Groq | null = null;

function getGroqMain(): Groq {
    if (!groqMain) {
        groqMain = new Groq({ apiKey: process.env.GROQ_API_KEY || 'dummy-key-for-build' });
    }
    return groqMain;
}

function getGroq1(): Groq {
    if (!groq1) {
        groq1 = new Groq({ apiKey: process.env.GROQ_API_KEY_1 || process.env.GROQ_API_KEY || 'dummy-key-for-build' });
    }
    return groq1;
}

function getGroq2(): Groq {
    if (!groq2) {
        groq2 = new Groq({ apiKey: process.env.GROQ_API_KEY_2 || process.env.GROQ_API_KEY || 'dummy-key-for-build' });
    }
    return groq2;
}

function getGroq3(): Groq {
    if (!groq3) {
        groq3 = new Groq({ apiKey: process.env.GROQ_API_KEY_3 || process.env.GROQ_API_KEY || 'dummy-key-for-build' });
    }
    return groq3;
}

function getGroqArchi1(): Groq {
    if (!groqArchi1) {
        groqArchi1 = new Groq({ apiKey: process.env.GROQ_API_KEY_ARCHI_1 || process.env.GROQ_API_KEY || 'dummy-key-for-build' });
    }
    return groqArchi1;
}

function getGroqArchi2(): Groq {
    if (!groqArchi2) {
        groqArchi2 = new Groq({ apiKey: process.env.GROQ_API_KEY_ARCHI_2 || process.env.GROQ_API_KEY || 'dummy-key-for-build' });
    }
    return groqArchi2;
}

function getGroqMatch1(): Groq {
    if (!groqMatch1) {
        groqMatch1 = new Groq({ apiKey: process.env.GROQ_API_KEY_FOR_OPEN_SOUCE_FINDING_1 || process.env.GROQ_API_KEY || 'dummy-key-for-build' });
    }
    return groqMatch1;
}

function getGroqMatch2(): Groq {
    if (!groqMatch2) {
        groqMatch2 = new Groq({ apiKey: process.env.GROQ_API_KEY_FOR_OPEN_SOUCE_FINDING_2 || process.env.GROQ_API_KEY || 'dummy-key-for-build' });
    }
    return groqMatch2;
}

function getGroqMatch3(): Groq {
    if (!groqMatch3) {
        groqMatch3 = new Groq({ apiKey: process.env.GROQ_API_KEY_FOR_OPEN_SOUCE_FINDING_3 || process.env.GROQ_API_KEY || 'dummy-key-for-build' });
    }
    return groqMatch3;
}

/** Pick groq1, groq2, or groq3 based on route index (round-robin). */
function pickSecondaryClient(routeIndex: number): Groq {
    const remainder = routeIndex % 3;
    if (remainder === 0) return getGroq1();
    if (remainder === 1) return getGroq2();
    return getGroq3();
}

/** Randomly pick between the two dedicated ARCHI keys to load balance diagram generation */
function pickArchitectureClient(): Groq {
    // Fallback to main if Archi keys aren't set in environment
    if (!process.env.GROQ_API_KEY_ARCHI_1) return getGroqMain();

    return Math.random() > 0.5 ? getGroqArchi1() : getGroqArchi2();
}

/** Round-robin load balancer for Open Source Repo Recommendation generation */
function pickMatchClient(): Groq {
    if (!process.env.GROQ_API_KEY_FOR_OPEN_SOUCE_FINDING_1) return getGroqMain();

    // Simple randomizer to distribute the heavy generation requests
    const rand = Math.random();
    if (rand < 0.33) return getGroqMatch1();
    if (rand < 0.66) return getGroqMatch2();
    return getGroqMatch3();
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

    const systemPrompt = `You are a senior software architect specializing in analyzing codebases and creating accurate visual representations of their architecture.

Your job is to analyze a GitHub repository and produce a clear, accurate architecture diagram based on what you actually find in the code.

CRITICAL RULES:
- NEVER hallucinate files, services, or infrastructure that don't exist
- Only describe what is evident from the provided code and file structure
- If you can only see partial code, work with what's available and note limitations
- Prefer clarity over completeness
- Be honest about what you don't know

Return ONLY valid JSON — no markdown, no commentary, no explanation outside the JSON.`;

    const userPrompt = `Analyze this repository following this systematic process:

## STEP 1: ANALYZE THE REPOSITORY

Examine the provided code for:
- Directory structure and file organization
- Key configuration files (package.json, requirements.txt, Dockerfile, etc.)
- Entry points (main files, index files, app files)
- Frameworks and libraries actually used
- Services, modules, and components that exist
- Database connections, APIs, and external integrations found in code
- Environment variables and infrastructure hints (docker-compose, k8s, etc.)

## STEP 2: DETERMINE ARCHITECTURE TYPE

Based on what you find, identify the architecture pattern:
- Microservices / distributed system → Show services + connections
- Monolith / MVC web app → Show layered architecture
- Frontend app → Show component structure
- Library / SDK → Show module dependencies
- Data pipeline → Show data flow
- Mixed / unclear → Show folder structure + component map

## STEP 3: GENERATE ACCURATE DIAGRAM

Create a JSON architecture diagram with these requirements:

### Node Requirements:
- Each node MUST represent something that ACTUALLY EXISTS in the codebase
- Use SPECIFIC names from actual files/folders (e.g., "app/api/analyze/route.ts", "lib/github.ts")
- DO NOT use generic names like "Backend Service" or "API Layer" unless that's the actual structure
- Each node MUST have:
    "id": unique snake_case identifier
    "label": specific file path, component name, or service name from the actual code
    "type": one of: frontend | backend | service | database | external | infrastructure

- Include 15-30 nodes depending on complexity
- Only include infrastructure (Redis, queues, etc.) if you see it in package.json, imports, or config files

### Edge Requirements:
- Each edge shows actual data flow or dependencies found in the code
- Each edge MUST have:
    "from": source node id
    "to": target node id  
    "label": specific action (e.g., "POST /api/analyze", "imports", "queries")
- Show request/response flows based on actual routes
- NO self-loops (from === to is forbidden)
- Only show connections you can verify from the code

### Notes Requirements:
- Include 4-8 observations about the architecture
- Mention the actual tech stack found (languages, frameworks, databases)
- Note the architecture pattern (MVC, microservices, etc.)
- Mention entry points and how execution flows
- Note any external dependencies or APIs
- CRITICAL: Only mention infrastructure you actually see in the code

## STEP 4: PROVIDE SUMMARY

Return a JSON object with EXACTLY these keys:

1. "overallFlow": A comprehensive paragraph (200-300 words) explaining:
   - What this project does (purpose and functionality)
   - The architecture pattern used
   - Complete data flow from entry point to storage
   - Technologies used and how they integrate
   - External services and APIs (only if found in code)
   - Any notable patterns or design decisions

2. "architectureJson": The detailed diagram as JSON with structure:
   {
     "nodes": [
       { "id": "user", "label": "User Browser", "type": "frontend" },
       { "id": "nextjs_app", "label": "Next.js App Router", "type": "frontend" },
       { "id": "api_routes", "label": "app/api/*", "type": "backend" },
       { "id": "mongodb", "label": "MongoDB Database", "type": "database" },
       { "id": "github_api", "label": "GitHub REST API", "type": "external" }
     ],
     "edges": [
       { "from": "user", "to": "nextjs_app", "label": "HTTPS request" },
       { "from": "nextjs_app", "to": "api_routes", "label": "API calls" },
       { "from": "api_routes", "to": "mongodb", "label": "CRUD operations" },
       { "from": "api_routes", "to": "github_api", "label": "Fetch repo data" }
     ],
     "notes": [
       "Next.js 14 with App Router architecture",
       "MongoDB for data persistence",
       "GitHub OAuth for authentication",
       "Server-side rendering with React Server Components"
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

REMEMBER: Only include what you can actually verify from the provided code. Do not hallucinate infrastructure or services.

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
    experienceLevel: "none" | "small" | "good" | "frequent";
    hasOpenSourceContributions: boolean;
    contributionNotes: string;
    strengths: string[];
    weaknesses: string[];
    improvements: string[];
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

1. "experienceLevel": "none" | "small" | "good" | "frequent"
   - none: no prior open-source contributions, beginner to OSS workflow
   - small: has done 1-2 small open-source contributions, familiar with basic workflow
   - good: has done some good open-source contributions, knows how to approach issues well
   - frequent: contributes to open-source frequently, highly experienced

2. "hasOpenSourceContributions": true/false
   - true only if forked repos exist OR resume mentions OSS contributions

3. "contributionNotes": 1 sentence describing their OSS journey so far (reference specifics)

4. "strengths": Array of 3 short strings highlighting their best tech choices or practices based on their repos/resume.
5. "weaknesses": Array of 2 short strings pointing out missing skills (e.g. "No testing frameworks detected", "Light on backend experience").
6. "improvements": Array of 2 actionable suggestions for what they should build or learn next to level up.

7. "domains": Exactly 3 tech domains they are strongest in. For each:
   - "domainKey": slug e.g. "full-stack-typescript"
   - "label": Human readable e.g. "Full Stack TypeScript (React/Next.js)"
   - "primaryLanguage": The exact language name e.g. "TypeScript"
   - "frameworks": Array of 3-5 framework/topic keywords EXACTLY as used in GitHub topics e.g. ["react","nextjs","nodejs","prisma"]
   - "minStars": number — set based on their level:
       none: 100, small: 250, good: 500, frequent: 1000
   - "reasoning": 1 sentence explaining why this domain was chosen, referencing their actual project names

Output ONLY this JSON structure, nothing else:
{
  "experienceLevel": "intermediate",
  "hasOpenSourceContributions": false,
  "contributionNotes": "...",
  "strengths": ["Strong React and Next.js frontend skills", "Experience with modern ORMs like Prisma"],
  "weaknesses": ["Lack of visible unit testing", "Limited backend API exposure"],
  "improvements": ["Contribute to a project with Jest/Cypress testing", "Explore backend performance optimization"],
  "domains": [
    {
      "domainKey": "full-stack-typescript",
      "label": "Full Stack TypeScript (React/Next.js)",
      "primaryLanguage": "TypeScript",
      "frameworks": ["react", "nextjs", "nodejs", "prisma"],
      "minStars": 500,
      "reasoning": "Built 3+ TypeScript React apps including [project name from their profile]"
    },
    {
      "domainKey": "machine-learning-python",
      "label": "Machine Learning (Python)",
      "primaryLanguage": "Python",
      "frameworks": ["scikit-learn", "pandas", "numpy", "tensorflow"],
      "minStars": 500,
      "reasoning": "Developed predictive models in Python as seen in [project name]"
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
        experienceLevel: "good",
        hasOpenSourceContributions: userProfile.hasOSContributions,
        contributionNotes: "Profile analysis used language fallback due to LLM unavailability.",
        strengths: ["Shows initiative by pushing code to GitHub", `Familiarity with ${lang1} and ${lang2}`],
        weaknesses: ["Unable to perform deep analysis at this time"],
        improvements: ["Continue building projects and pushing to GitHub", "Explore more diverse tech stacks"],
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
 * Phase 2: Uses the LLM's vast internal knowledge of GitHub to generate an expert curated
 * list of repository "owner/repo" names tailored to the user's specific tech stack and experience level.
 */
export async function generateExpertCuratedRepos(
    userProfile: {
        name?: string;
        languages: string[];
        skills: string[];
        techStack: string[];
        repos?: any[];
        resume?: any;
    },
    domainProfile: UserDomainProfile,
    randomSeed?: string
): Promise<RecommendationCategory[]> {
    const systemPrompt = `You are a senior developer mentor doing 1-on-1 career coaching. You possess encyclopedic knowledge of all open-source repositories on GitHub across all languages (React, Python, Machine Learning, Systems, etc). You are tasked with generating a master curriculum of exactly 10 repositories per tech domain that the developer should contribute to. Return ONLY raw valid JSON.`;

    // Build rich project context for referencing by name
    const ownProjectNames = userProfile.repos?.filter(r => !r.fork).map(r => r.name) || [];
    const resumeProjectNames = userProfile.resume?.projects?.map((p: any) => p.name) || [];
    const allProjects = [...new Set([...ownProjectNames, ...resumeProjectNames])];

    const userPrompt = `
====== DEVELOPER PROFILE ======
Name: ${userProfile.name || "Developer"}
Experience Level: ${domainProfile.experienceLevel}
Open Source History: ${domainProfile.contributionNotes || "No prior OSS contributions detected."}
Has Previous OSS Contributions: ${domainProfile.hasOpenSourceContributions ? "YES" : "NO"}

Primary Languages: ${userProfile.languages.join(', ')}
Skills: ${userProfile.skills.join(', ')}
Their GitHub Projects: ${allProjects.slice(0, 10).join(', ') || "None listed"}
Resume Summary: ${userProfile.resume?.careerObjective?.slice(0, 250) || "Not provided"}

Resume Projects with Tech:
${JSON.stringify(userProfile.resume?.projects?.map((p: any) => ({
        name: p.name, tech: p.technologies
    })) || []).slice(0, 1200)}

====== TECH DOMAINS TO CURATE ======
${JSON.stringify(domainProfile.domains, null, 2)}

${randomSeed ? `====== RANDOMIZATION SEED ======\nTo ensure variety upon regeneration, use this seed: "${randomSeed}". Do NOT recommend the exact same most popular repositories. Dig deeper into the GitHub ecosystem to find high-quality alternative matches that fit this seed's variation.\n` : ""}

====== INSTRUCTIONS ======
You must act as a personalized open-source matchmaker. 
For EACH of the tech domains listed above, you MUST recommend EXACTLY 10 open-source repositories from GitHub that perfectly fit their profile and experience level.

CRITICAL ADAPTATION FOR USER EXPERIENCE LEVEL:
The developer's experience level is: "${domainProfile.experienceLevel}". 
You MUST pick the right repositories based strictly on this level.
- If "none" (New to OSS): START the list with pure workflow Repos (like "firstcontributions/first-contributions"), then move to hyper-welcoming UI communities (like "EddieHubCommunity/BioDrop" or "freeCodeCamp/freeCodeCamp"), then graduate to real products matching their exact stack (e.g. "usebruno/bruno" or "novuhq/novu"). Do NOT recommend giant monoliths like "vercel/next.js" or "mrdoob/three.js" as their first issues! Sequence them from absolute easiest to hardest.
- If "small" (Getting Started): Skip the basic workflow repos. Start with well-known welcoming repos and graduate them to mid-tier fullstack applications.
- If "good" (Intermediate): Focus on mid-to-large projects that leverage their specialized skills. Include some advanced stretch goals.
- If "frequent" (Top Contributor): Focus exclusively on Advanced/Ecosystem contributions (mega-frameworks, complex architecture, large monorepos).

CRITICAL ANTI-PATTERNS TO AVOID:
1. DEPRECATED OR UNMAINTAINED: NEVER recommend deprecated, unmaintained, or dying projects (e.g., "facebook/create-react-app", "jaredpalmer/formik").
2. INTIMIDATING MONOLITHS: NEVER recommend the core repositories of massive frameworks to beginners (e.g., "reactjs/react.dev", "facebook/react", "vercel/next.js", "styled-components").
3. TEXTBOOKS/TUTORIALS: For Machine Learning, NEVER recommend textbooks, course materials, or markdown-heavy tutorial repos (e.g., "rasbt/python-machine-learning-book", "microsoft/ML-For-Beginners"). ONLY recommend actual software infrastructure or tooling.
4. C++ ML ENGINES FOR BEGINNERS: For Machine Learning beginners, NEVER recommend massive C++ backend engines with Python wrappers like "tensorflow/tensorflow", "pytorch/pytorch", or "dmlc/dmlc-core". Stick to pure Python ML tooling, ecosystem libraries, or widely used MLOps tools (e.g., "scikit-learn/scikit-learn", "huggingface/transformers", "optuna/optuna", "gradio-app/gradio").

CRITICAL CONSTRAINTS & RULES:
1. DOMAIN SEGREGATION: You MUST preserve the exact 'domainKey' and 'label' for each of the provided domains (e.g. "Full Stack JavaScript", "Machine Learning"). 
2. EXACTLY 10 REPOS: For EVERY domain, you MUST output EXACTLY 10 repos. Pick from your internal knowledge of GitHub.
3. ACCURATE REPO NAMES: Ensure the "full_name" is the exact actual GitHub owner/repo identifier (e.g. "scikit-learn/scikit-learn").
4. PERSONALIZED REASONING: "whyItFits" MUST reference their actual project names, specific skills, or resume details. Connect their background directly to why this repo works for them (e.g. "Because you built EcoPlus using React, you'll feel at home here...").
5. ACTIONABLE ADVICE: "whereToStart" must be concrete and actionable: mention specific issue labels, folders, or steps to take.

Return ONLY this exact JSON structure:
{
  "categories": [
    {
      "domain": "original-domainKey",
      "label": "Original Domain Label",
      "repos": [
        {
          "full_name": "owner/repo-name",
          "whyItFits": "Since you built [their project name] with React, you'll feel at home here...",
          "whereToStart": "Go to Issues tab → filter label 'good first issue'"
        }
      ]
    }
  ]
}
`;

    // Increase randomness if user pressed 'Regenerate'
    const finalTemperature = randomSeed ? 0.7 : 0.2;

    const client = pickMatchClient();
    const response = await callGroqWithErrorHandling(client, {
        model: MODEL,
        max_tokens: 5000,
        temperature: finalTemperature,
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









