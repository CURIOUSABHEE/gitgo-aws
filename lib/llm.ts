/**
 * LLM Analysis Service using Groq
 * - Groq Llama 3.3 70B Versatile: All AI tasks (architecture, routes, recommendations)
 * 
 * Using Groq exclusively because AWS Bedrock models require inference profiles
 * which are not available in all regions or accounts.
 */
import Groq from "groq-sdk";
import { truncate } from "./utils";
import type { KeyFile, TechStack, TreeItem } from "./github";

// ─── Groq Client ───────────────────────────────────────────────────────────
const groqKeys = [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_1,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
    process.env.GROQ_API_KEY_ARCHI_1,
    process.env.GROQ_API_KEY_ARCHI_2,
    process.env.GROQ_API_KEY_FOR_OPEN_SOUCE_FINDING_1,
    process.env.GROQ_API_KEY_FOR_OPEN_SOUCE_FINDING_2,
    process.env.GROQ_API_KEY_FOR_OPEN_SOUCE_FINDING_3,
].filter(Boolean) as string[];

let currentGroqKeyIndex = 0;

function getGroqClient(): Groq {
    const apiKey = groqKeys[currentGroqKeyIndex % groqKeys.length] || 'dummy-key-for-build';
    return new Groq({ apiKey });
}

function rotateGroqKey() {
    currentGroqKeyIndex = (currentGroqKeyIndex + 1) % groqKeys.length;
}

// ─── Helper Functions ──────────────────────────────────────────────────────

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

/**
 * Extracts JSON from an LLM response that may be wrapped in markdown code blocks.
 */
function extractJSON<T>(text: string): T {
    const blockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = blockMatch ? blockMatch[1].trim() : text.trim();
    return JSON.parse(jsonStr) as T;
}

// ─── Groq Helper ───────────────────────────────────────────────────────────

/**
 * Call Groq Llama 3.3 70B for all AI tasks
 * Use for: Architecture analysis, route analysis, recommendations, quick summaries
 */
async function callGroq(systemPrompt: string, userPrompt: string, maxTokens: number = 3000): Promise<string> {
    try {
        const groq = getGroqClient();

        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.2,
            max_tokens: maxTokens,
        });

        return completion.choices[0]?.message?.content || "";
    } catch (error: any) {
        console.error("[Groq] Error:", error);

        // Log detailed error
        console.error("[Groq] Error details:", {
            name: error.name,
            message: error.message,
            status: error.status,
        });

        // Handle rate limits by rotating keys
        if (error.status === 429 || error.message?.includes('rate_limit')) {
            console.log("[Groq] Rate limit hit, rotating to next API key...");
            rotateGroqKey();

            // Retry with next key
            const groq = getGroqClient();
            const completion = await groq.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.2,
                max_tokens: maxTokens,
            });
            return completion.choices[0]?.message?.content || "";
        }

        // Provide helpful error messages
        if (error.message?.includes('API key') || error.message?.includes('authentication')) {
            throw new Error(`Groq API Key Invalid: Check GROQ_API_KEY environment variables`);
        }

        throw new Error(`Groq API error: ${error.message}`);
    }
}

// ─── 1. Architecture Analysis (Groq) ───────────────────────────────────────

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

    const systemPrompt = `You are a Principal Cloud Architect and Systems Engineer evaluating a new codebase. Your ONLY purpose is to analyze the structural topology of the GitHub repository and output a perfectly formatted JSON architecture map.

CRITICAL DIRECTIVES:
1. ONLY return valid JSON. Do NOT wrap the JSON in \`\`\`json markdown blocks. Absolutely no conversational filler.
2. ONLY include components that explicitly exist in the provided repository files. 
3. DO NOT hallucinate external SaaS services, dummy databases, or infrastructure unless there is hard evidence (e.g., actual SDK imports, DB connection strings).
4. Aggregate at the SERVICE level. A frontend Next.js app is one node. An Express backend is one node. A Postgres database is one node. Do not create nodes for individual files or minor utilities.
5. Limit the architecture diagram to a maximum of 15 nodes to maintain readability.`;

    const userPrompt = `Analyze this GitHub repository and create a system architecture diagram following these exact steps:

## STEP 1 — IDENTIFY SYSTEM COMPONENTS

Analyze the repository structure and detect major components:
- **Frontend applications**: React apps, Next.js pages, Vue components
- **Backend services**: API servers, Express apps, FastAPI services
- **APIs**: REST endpoints, GraphQL servers, gRPC services
- **Microservices**: Independent services with their own deployment
- **Databases**: PostgreSQL, MongoDB, Redis, MySQL (check connection strings)
- **Queues**: RabbitMQ, Kafka, Redis Queue, SQS
- **External services**: Stripe, AWS S3, SendGrid, Twilio (check API calls)
- **Background workers**: Celery, Bull, cron jobs
- **Infrastructure**: Nginx, Load Balancers, API Gateway

For each component, identify:
- Component name (use ACTUAL name from code)
- Component type (frontend/backend/database/service/external)

## STEP 2 — DETERMINE RELATIONSHIPS

For each component, determine:
- **Which component calls it**: Trace imports, API calls, database queries
- **Communication type**: 
  - HTTP/REST (API calls)
  - GraphQL (GraphQL queries)
  - Database Query (SQL, MongoDB queries)
  - Message Queue (RabbitMQ, Kafka)
  - SDK Call (AWS SDK, Stripe SDK)
  - WebSocket (real-time connections)
  - gRPC (service-to-service)

Return relationships as: Source → Target (Interaction type)

## STEP 3 — CREATE ARCHITECTURE LAYERS

Group components into logical layers:
- **Client Layer**: Web browsers, mobile apps, CLI tools
- **Frontend Layer**: React apps, Next.js, static sites
- **API Layer**: REST APIs, GraphQL servers, API Gateway
- **Service Layer**: Business logic services, microservices
- **Data Layer**: Databases, caches, file storage
- **External Services**: Third-party APIs, SaaS platforms

## STEP 4 — GENERATE GRAPH STRUCTURE

Convert the architecture into a graph with nodes and edges.

**Node format:**
\`\`\`json
{
  "id": "unique_snake_case_id",
  "label": "Actual Component Name",
  "type": "frontend | backend | database | service | external | infrastructure"
}
\`\`\`

**Edge format:**
\`\`\`json
{
  "from": "source_node_id",
  "to": "target_node_id",
  "label": "HTTP/REST | GraphQL | DB Query | Queue | SDK | WebSocket"
}
\`\`\`

## STEP 5 — OUTPUT REACT FLOW COMPATIBLE JSON

Return the diagram in this EXACT format:
\`\`\`json
{
  "nodes": [
    {"id": "...", "label": "...", "type": "..."}
  ],
  "edges": [
    {"from": "...", "to": "...", "label": "..."}
  ],
  "notes": ["Architecture observation 1", "Observation 2"]
}
\`\`\`

## STEP 6 — ENSURE DIAGRAM CLARITY

Before returning, verify:
- ✅ No duplicate nodes
- ✅ Architecture is high-level (service-level, not file-level)
- ✅ Maximum 12-15 nodes
- ✅ All components actually exist in the repository
- ✅ Relationships are accurate based on code
- ✅ No hallucinated services

## GUIDELINES FOR NODE NAMING

**Good Examples (Service-level):**
- "Next.js Frontend" (not "app/page.tsx")
- "User API" (not "app/api/users/route.ts")
- "MongoDB Database" (not "models/User.ts")
- "Stripe Payment Service" (not "lib/stripe.ts")
- "Redis Cache" (not "cache/redis.ts")

**Bad Examples (Too granular):**
- ❌ "app/dashboard/page.tsx"
- ❌ "lib/services/UserService.ts"
- ❌ "components/Header.tsx"

**Node Type Guidelines:**
- **frontend**: Web apps, mobile apps, UI layers
- **backend**: API servers, backend services
- **service**: Microservices, background workers, specific business services
- **database**: Databases, caches, storage systems
- **external**: Third-party APIs, SaaS platforms
- **infrastructure**: Load balancers, API gateways, message queues

## REPOSITORY DATA

### File Tree
\`\`\`
${truncate(fileTreeStr, 5000)}
\`\`\`

### Tech Stack Detected
${formatTechStack(techStack)}

### Key File Contents
${truncate(keyFilesStr, 30000)}

## OUTPUT FORMAT

You MUST return the structure EXACTLY like this (NO markdown backticks around it):
{
  "overallFlow": "Concise 2-3 sentence overview of the architecture and primary data flow.",
  "architectureJson": {
    "nodes": [
      {"id": "api_gateway", "label": "API Gateway", "type": "infrastructure"}
    ],
    "edges": [
      {"from": "frontend_app", "to": "api_gateway", "label": "HTTP/REST"}
    ],
    "notes": [
      "Key Database: PostgreSQL via Prisma",
      "Event Bus: RabbitMQ for background jobs"
    ]
  }
}

Remember: ONLY JSON output. No markdown wrappers. No explanations.`;

    const text = await callGroq(systemPrompt, userPrompt, 8000);

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

// ─── 2. Route Analysis (Groq) ──────────────────────────────────────────────

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
    const readmeFiles = keyFiles.filter((f) =>
        f.path.toLowerCase().includes("readme")
    );

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

    const systemPrompt = `You are a Senior Backend Engineer extracting API endpoints, web pages, and application routes from a frontend and backend codebase. Your sole output must be a perfectly valid JSON array.

CRITICAL DIRECTIVES:
1. ONLY return a valid JSON array. Do NOT wrap it in \`\`\`json markdown blocks. No conversational text whatsoever.
2. Ensure you extract actual REST endpoints, Next.js page routes, Django URLs, Express endpoints, etc.
3. If no routes are found, return exactly this: [{"path": "/", "method": "PAGE", "functionality": "Main entry point", "contribution": "Landing page", "lifecycleRole": "UI Rendering"}]`;

    const userPrompt = `Analyze these project files and extract ALL routes, pages, and HTTP endpoints.

## Tech Stack
${formatTechStack(techStack)}

## Source Files
${truncate(sourceStr, 25000)}

## App Directory Structure
${truncate(appDirFiles, 2000)}

Return EXACTLY a JSON array where each object has these string keys:
- "path": The URL path (e.g. "/api/users" or "/dashboard")
- "method": The HTTP method (GET, POST, etc.) or "PAGE" for UI routes
- "functionality": A clear 2-sentence explanation of what the route does
- "contribution": A 1-sentence explanation of its business value to the project
- "lifecycleRole": MUST EXACTLY match ONE of: "Authentication", "Data Fetching", "CRUD Operation", "UI Rendering", "File Processing", "Third-party Integration", "Real-time", "Navigation", "Background Processing"

OUTPUT ONLY THE JSON ARRAY. NO MARKDOWN. NO BACKTICKS.`;

    const text = await callGroq(systemPrompt, userPrompt, 3000);

    try {
        return extractJSON<RouteDetail[]>(text);
    } catch {
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

// ─── 3. Specific Route Analysis (Groq) ─────────────────────────────────────

export interface RouteAnalysisResult {
    flowVisualization: string;
    executionTrace: string | string[];
}

export async function identifyRelevantFilesForRoute(
    targetRoute: string,
    filePaths: string[]
): Promise<string[]> {
    const systemPrompt = `You are a Senior Software Engineer AI. Your task is to identify which files in a repository are most likely to handle a particular route. 
Return ONLY a JSON array of strings containing up to 10 file paths. No markdown, purely a JSON array.`;

    const userPrompt = `### TARGET_ROUTE
${targetRoute}

### REPOSITORY FILE PATHS
${truncate(filePaths.join("\n"), 30000)}

Return a JSON array of up to 10 strings representing the exact file paths.`;

    const text = await callGroq(systemPrompt, userPrompt, 1000);

    try {
        let cleanText = text.replace(/^```json/g, "").replace(/^```/g, "").replace(/```$/g, "").trim();
        const parsed = JSON.parse(cleanText);
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
    codebaseFiles: string
): Promise<RouteAnalysisResult> {
    const systemPrompt = `You are an Expert Software Architect. Analyze the provided codebase and reverse-engineer the exact execution flow for a specific target route.

Output your analysis using these exact markdown headers:

### FLOW_VISUALIZATION
Provide a JSON object for the execution flow.

### EXECUTION_TRACE
Provide a step-by-step breakdown.`;

    const userPrompt = `### TARGET_ROUTE
${targetRoute}

### CODEBASE_FILES
${truncate(codebaseFiles, 28000)}

Output the two headers with their content.`;

    const text = await callGroq(systemPrompt, userPrompt, 3000);

    try {
        const flowMatch = text.match(/### FLOW_VISUALIZATION\n([\s\S]*?)(?=### EXECUTION_TRACE)/);
        const traceMatch = text.match(/### EXECUTION_TRACE\n([\s\S]*)/);

        let flowVisualization = flowMatch ? flowMatch[1].trim() : "{}";
        let executionTrace = traceMatch ? traceMatch[1].trim() : "Failed to extract trace.";

        if (flowVisualization.startsWith("```json")) {
            flowVisualization = flowVisualization.replace(/^```json\n?/, "").replace(/\n?```$/, "");
        } else if (flowVisualization.startsWith("```")) {
            flowVisualization = flowVisualization.replace(/^```\n?/, "").replace(/\n?```$/, "");
        }

        return {
            flowVisualization,
            executionTrace
        };
    } catch (e) {
        console.error("Failed to parse specific route:", e);
        return {
            flowVisualization: "{}",
            executionTrace: "Failed to parse execution trace."
        };
    }
}

// ─── 4. AI Repository Matcher (Groq) ───────────────────────────────────────

export interface DomainAnalysis {
    domainKey: string;
    label: string;
    primaryLanguage: string;
    frameworks: string[];
    minStars: number;
    reasoning: string;
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
    resume?: any;
    hasOSContributions: boolean;
}): Promise<UserDomainProfile> {
    const systemPrompt = `You are an expert developer mentor and open-source career advisor. Analyze the developer profile and return ONLY valid JSON with no markdown.`;

    const ownProjects = userProfile.repos?.filter(r => !r.fork).map(r => ({
        name: r.name,
        language: r.language,
        topics: r.topics?.slice(0, 5),
        description: r.description?.slice(0, 100)
    }));

    const forkedRepos = userProfile.repos?.filter(r => r.fork).map(r => r.name);

    const userPrompt = `Analyze this developer's profile and identify their tech domains and experience level.

Name: ${userProfile.name || "Unknown"}
Languages: ${userProfile.languages.join(', ')}
Skills: ${userProfile.skills.join(', ')}
Tech Stack: ${userProfile.techStack.join(', ')}

Own Projects: ${JSON.stringify(ownProjects?.slice(0, 15) || [])}
Forked Repos: ${forkedRepos?.slice(0, 10).join(', ') || "None"}
Has OSS Contributions: ${userProfile.hasOSContributions ? "YES" : "NO"}

Return JSON with: experienceLevel, hasOpenSourceContributions, contributionNotes, strengths, weaknesses, improvements, and domains (3 domains with domainKey, label, primaryLanguage, frameworks, minStars, reasoning).`;

    const text = await callGroq(systemPrompt, userPrompt, 2000);

    try {
        return extractJSON<UserDomainProfile>(text);
    } catch {
        const topLangs = userProfile.languages.slice(0, 3);
        const lang1 = topLangs[0] || "JavaScript";
        return {
            experienceLevel: "good",
            hasOpenSourceContributions: userProfile.hasOSContributions,
            contributionNotes: "Profile analysis used fallback.",
            strengths: ["Shows initiative", `Familiarity with ${lang1}`],
            weaknesses: ["Unable to perform deep analysis"],
            improvements: ["Continue building projects"],
            domains: [
                {
                    domainKey: `${lang1.toLowerCase()}-dev`,
                    label: `${lang1} Development`,
                    primaryLanguage: lang1,
                    frameworks: userProfile.skills.slice(0, 4),
                    minStars: 300,
                    reasoning: `Primary language: ${lang1}`
                }
            ]
        };
    }
}

export async function generateExpertCuratedRepos(
    domainProfile: UserDomainProfile
): Promise<RecommendationCategory[]> {
    const systemPrompt = `You are a senior developer mentor with encyclopedic knowledge of GitHub repositories. Generate a curated list of 10 repositories per domain.

CRITICAL RULES FOR REPOSITORY SELECTION:
1. Do NOT recommend massive legacy software or overly complex monolithic codebases (e.g., linux, kubernetes, tensorflow, react, typescript).
2. Recommend SIMPLE, clear, and focused repositories that are understandable for a single developer.
3. Prioritize modern tools, distinct utilities, starter templates, or small-to-medium libraries.
4. Repositories should typically be under 10,000 stars to avoid overwhelming enterprise codebases.
5. Maximize the chances that the user can actually read the codebase and contribute within a single weekend.

Return ONLY valid JSON.`;

    const userPrompt = `Generate repository recommendations for this developer.

Experience Level: ${domainProfile.experienceLevel}
Domains: ${JSON.stringify(domainProfile.domains)}

For each domain, recommend EXACTLY 10 repositories.
Ensure every single repository is relatively small, understandable, and actively welcoming smaller contributions. Do NOT suggest the most famous repository in the language.

Return JSON EXACTLY in this format: { "categories": [ { "domain": "...", "label": "...", "repos": [ { "full_name": "owner/repo", "whyItFits": "...", "whereToStart": "..." } ] } ] }`;

    const text = await callGroq(systemPrompt, userPrompt, 5000);

    try {
        const parsed = extractJSON<{ categories: RecommendationCategory[] }>(text);
        return parsed.categories || [];
    } catch {
        return [];
    }
}
