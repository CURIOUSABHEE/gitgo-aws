/**
 * LLM Analysis Service using AWS Bedrock and Google Gemini
 * - AWS Bedrock: Claude 3.5 Sonnet for architecture analysis
 * - Google Gemini: Gemini 2.7B PT for route analysis and recommendations
 */
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { truncate } from "./utils";
import type { KeyFile, TechStack, TreeItem } from "./github";

// ─── AWS Bedrock Client ────────────────────────────────────────────────────
const bedrockClient = new BedrockRuntimeClient({
    region: process.env.GITGO_AWS_REGION || process.env.AWS_REGION || "us-east-1",
});

// ─── Google Gemini Client ──────────────────────────────────────────────────
let geminiClient: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI {
    if (!geminiClient) {
        const apiKey = process.env.GEMINI_API_KEY || 'dummy-key-for-build';
        geminiClient = new GoogleGenerativeAI(apiKey);
    }
    return geminiClient;
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

// ─── AWS Bedrock Helper ────────────────────────────────────────────────────

async function callBedrock(systemPrompt: string, userPrompt: string, maxTokens: number = 4000): Promise<string> {
    try {
        const payload = {
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: maxTokens,
            temperature: 0.2,
            system: systemPrompt,
            messages: [
                {
                    role: "user",
                    content: userPrompt
                }
            ]
        };

        const command = new InvokeModelCommand({
            modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0", // Claude 3.5 Sonnet v2
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify(payload)
        });

        const response = await bedrockClient.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));

        return responseBody.content[0].text;
    } catch (error: any) {
        console.error("[Bedrock] Error:", error);

        // Log detailed error information
        console.error("[Bedrock] Error details:", {
            name: error.name,
            message: error.message,
            code: error.code,
            statusCode: error.$metadata?.httpStatusCode,
        });

        // Provide helpful error messages
        if (error.name === 'AccessDeniedException') {
            throw new Error(`Bedrock Access Denied: Add AmazonBedrockFullAccess to Amplify service role`);
        }

        if (error.name === 'ResourceNotFoundException') {
            throw new Error(`Bedrock Model Not Found in ${process.env.GITGO_AWS_REGION || 'us-east-1'}`);
        }

        throw new Error(`Bedrock API error: ${error.message}`);
    }
}

// ─── Google Gemini Helper ──────────────────────────────────────────────────

async function callGemini(systemPrompt: string, userPrompt: string, maxTokens: number = 3000): Promise<string> {
    try {
        const genAI = getGeminiClient();
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp", // Using Gemini 2.0 Flash (free tier)
            generationConfig: {
                maxOutputTokens: maxTokens,
                temperature: 0.2,
            }
        });

        const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        return response.text();
    } catch (error: any) {
        console.error("[Gemini] Error:", error);

        // Log detailed error
        console.error("[Gemini] Error details:", {
            name: error.name,
            message: error.message,
            status: error.status,
        });

        // Provide helpful error messages
        if (error.message?.includes('API key')) {
            throw new Error(`Gemini API Key Invalid: Check GEMINI_API_KEY environment variable`);
        }

        if (error.status === 429) {
            throw new Error(`Gemini Rate Limit: Free tier limit exceeded. Try again later.`);
        }

        throw new Error(`Gemini API error: ${error.message}`);
    }
}

// ─── 1. Architecture Analysis (AWS Bedrock) ────────────────────────────────

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
- Use SPECIFIC names from actual files/folders
- Each node MUST have:
    "id": unique snake_case identifier
    "label": specific file path, component name, or service name from the actual code
    "type": one of: frontend | backend | service | database | external | infrastructure

- Include 15-30 nodes depending on complexity

### Edge Requirements:
- Each edge shows actual data flow or dependencies found in the code
- Each edge MUST have:
    "from": source node id
    "to": target node id  
    "label": specific action
- NO self-loops (from === to is forbidden)

### Notes Requirements:
- Include 4-8 observations about the architecture
- Mention the actual tech stack found
- Note the architecture pattern

## Project File Tree
\`\`\`
${truncate(fileTreeStr, 4000)}
\`\`\`

## Tech Stack
${formatTechStack(techStack)}

## Key File Contents
${truncate(keyFilesStr, 25000)}

Return ONLY the JSON object with "overallFlow" and "architectureJson" keys.`;

    const text = await callBedrock(systemPrompt, userPrompt, 5000);

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

// ─── 2. Route Analysis (Google Gemini) ─────────────────────────────────────

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

    const systemPrompt = `You are an expert API documentation engineer. 
Return ONLY a valid JSON array. No markdown, no explanation outside the JSON array.`;

    const userPrompt = `Analyze these project files and return a JSON ARRAY of ALL routes, pages, and endpoints.

## Tech Stack
${formatTechStack(techStack)}

## Source Files
${truncate(sourceStr, 25000)}

## App Directory Structure
\`\`\`
${truncate(appDirFiles, 2000)}
\`\`\`

Each array item MUST have these exact keys:
- "path": URL path
- "method": HTTP method or "PAGE" for UI routes
- "functionality": Plain English explanation (2-3 sentences)
- "contribution": How this route contributes to the project (1-2 sentences)  
- "lifecycleRole": ONE of: "Authentication", "Data Fetching", "CRUD Operation", "UI Rendering", "File Processing", "Third-party Integration", "Real-time", "Navigation", "Background Processing"

Return ONLY the JSON array.`;

    const text = await callGemini(systemPrompt, userPrompt, 3000);

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

// ─── 3. Specific Route Analysis (Google Gemini) ────────────────────────────

export interface RouteAnalysisResult {
    flowVisualization: string;
    executionTrace: string | string[];
}

export async function identifyRelevantFilesForRoute(
    targetRoute: string,
    filePaths: string[],
    routeIndex: number = 0
): Promise<string[]> {
    const systemPrompt = `You are a Senior Software Engineer AI. Your task is to identify which files in a repository are most likely to handle a particular route. 
Return ONLY a JSON array of strings containing up to 10 file paths. No markdown, purely a JSON array.`;

    const userPrompt = `### TARGET_ROUTE
${targetRoute}

### REPOSITORY FILE PATHS
${truncate(filePaths.join("\n"), 30000)}

Return a JSON array of up to 10 strings representing the exact file paths.`;

    const text = await callGemini(systemPrompt, userPrompt, 1000);

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
    codebaseFiles: string,
    routeIndex: number = 0
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

    const text = await callGemini(systemPrompt, userPrompt, 3000);

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

// ─── 4. AI Repository Matcher (Google Gemini) ──────────────────────────────

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

    const text = await callGemini(systemPrompt, userPrompt, 2000);

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
    userProfile: any,
    domainProfile: UserDomainProfile,
    randomSeed?: string
): Promise<RecommendationCategory[]> {
    const systemPrompt = `You are a senior developer mentor with encyclopedic knowledge of GitHub repositories. Generate a curated list of 10 repositories per domain. Return ONLY valid JSON.`;

    const userPrompt = `Generate repository recommendations for this developer.

Experience Level: ${domainProfile.experienceLevel}
Domains: ${JSON.stringify(domainProfile.domains)}

For each domain, recommend EXACTLY 10 repositories with full_name, whyItFits, and whereToStart.

Return JSON: { "categories": [ { "domain": "...", "label": "...", "repos": [...] } ] }`;

    const text = await callGemini(systemPrompt, userPrompt, 5000);

    try {
        const parsed = extractJSON<{ categories: RecommendationCategory[] }>(text);
        return parsed.categories || [];
    } catch {
        return [];
    }
}
