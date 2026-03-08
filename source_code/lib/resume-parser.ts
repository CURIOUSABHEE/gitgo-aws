"use strict"

// AI-powered resume parser using Groq API
// 1. Extracts raw text from PDF using pdf-parse
// 2. Sends to Groq (Llama 3.3 70B) for intelligent structured extraction
// 3. Returns clean, structured resume data

export interface SkillGroup {
    category: string
    skills: string[]
}

export interface ParsedEducation {
    degree: string
    institution: string
    year: string
    details?: string
}

export interface ParsedProject {
    name: string
    description: string
    technologies: string[]
    githubUrl?: string
    duration?: string
}

export interface ParsedExperience {
    title: string
    company: string
    duration: string
    description: string
}

export interface ParsedResume {
    careerObjective: string
    skillGroups: SkillGroup[]
    education: ParsedEducation[]
    projects: ParsedProject[]
    experience: ParsedExperience[]
    rawText: string
}

const SYSTEM_PROMPT = `You are an expert resume parser. Given the raw text extracted from a PDF resume, extract and return structured data as JSON.

IMPORTANT RULES:
- The text may come from a multi-column layout, so sections might be interleaved. Use your judgment to separate them correctly.
- Extract ALL information accurately — do not make up or infer data that isn't in the resume.
- If a section doesn't exist in the resume, return an empty array or empty string for that field.
- For skills, group them by their category as written in the resume (e.g., "Programming Languages", "Frameworks & Libraries", "Tools", etc.). If skills are listed without explicit categories, create appropriate categories based on the skill type.
- For projects, extract the project name, description (combine all bullet points into one paragraph), technologies used, and duration/date if available.
- For education, extract institution name, degree, year/duration, and any additional details like CGPA, percentage, board, etc.
- For experience, extract job title, company/organization, duration, and description of responsibilities.
- Keep the career objective/profile/summary as a single clean paragraph.
- Do NOT include contact information (phone, email, address, LinkedIn URL) in any field.

Return ONLY valid JSON in this exact format (no markdown, no code fences, no explanation):
{
  "careerObjective": "string - the career objective, profile summary, or about section",
  "skillGroups": [
    {
      "category": "string - category name like Programming Languages, Frameworks, etc.",
      "skills": ["string array of individual skills"]
    }
  ],
  "education": [
    {
      "institution": "string - school/college/university name",
      "degree": "string - degree name like B.E in Information Technology, HSC, etc.",
      "year": "string - year or year range like 2023 - 2027 or 2024",
      "details": "string - CGPA, percentage, board info (optional, omit key if not present)"
    }
  ],
  "projects": [
    {
      "name": "string - project name",
      "description": "string - full project description combining all bullet points",
      "technologies": ["string array of technologies/tools used in this project"],
      "duration": "string - time period (optional, omit key if not present)"
    }
  ],
  "experience": [
    {
      "title": "string - role/position title",
      "company": "string - company or organization name",
      "duration": "string - time period",
      "description": "string - description of responsibilities and achievements"
    }
  ]
}`

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

/**
 * Parse a PDF buffer using Groq AI for intelligent extraction
 */
export async function parseResume(pdfBuffer: Buffer): Promise<ParsedResume> {
    // Step 1: Extract raw text from PDF
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse")
    
    let pdfData: any
    let rawText: string
    
    try {
        pdfData = await pdfParse(pdfBuffer)
        rawText = pdfData.text || ""
    } catch (pdfError: any) {
        console.error("PDF parsing error:", pdfError)
        throw new Error("Failed to read PDF file. The file may be corrupted, password-protected, or in an unsupported format.")
    }

    // Check if we got meaningful text
    const cleanText = rawText.trim()
    if (!cleanText || cleanText.length < 20) {
        throw new Error(
            "Could not extract text from the PDF. This may be an image-based PDF (scanned document). " +
            "Please use a text-based PDF or convert your scanned PDF to text using OCR software."
        )
    }

    // Step 2: Send to Groq API for intelligent parsing
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
        throw new Error("GROQ_API_KEY is not configured")
    }

    const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                {
                    role: "user",
                    content: `Parse this resume text and extract structured data as JSON:\n\n${rawText.slice(0, 8000)}`,
                },
            ],
            temperature: 0.1,
            max_tokens: 4000,
            response_format: { type: "json_object" },
        }),
    })

    if (!response.ok) {
        const errorText = await response.text()
        console.error("Groq API error:", response.status, errorText)
        throw new Error(`AI parsing failed: ${response.status}`)
    }

    const result = await response.json()
    const aiContent = result.choices?.[0]?.message?.content

    if (!aiContent) {
        console.error("Groq response:", JSON.stringify(result).slice(0, 500))
        throw new Error("No response from AI")
    }

    // Step 3: Parse the JSON response
    let parsed: any
    try {
        let cleanJson = aiContent.trim()
        if (cleanJson.startsWith("```")) {
            cleanJson = cleanJson.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
        }
        parsed = JSON.parse(cleanJson)
    } catch {
        console.error("Failed to parse AI response as JSON:", aiContent.slice(0, 500))
        throw new Error("AI returned invalid JSON")
    }

    // Step 4: Validate and return structured data
    return {
        careerObjective: typeof parsed.careerObjective === "string" ? parsed.careerObjective : "",
        skillGroups: Array.isArray(parsed.skillGroups)
            ? parsed.skillGroups
                .filter((g: any) => g.category && Array.isArray(g.skills))
                .map((g: any) => ({
                    category: String(g.category),
                    skills: g.skills.map(String).filter(Boolean),
                }))
            : [],
        education: Array.isArray(parsed.education)
            ? parsed.education.map((e: any) => ({
                institution: String(e.institution || ""),
                degree: String(e.degree || ""),
                year: String(e.year || ""),
                details: e.details ? String(e.details) : undefined,
            }))
            : [],
        projects: Array.isArray(parsed.projects)
            ? parsed.projects.map((p: any) => ({
                name: String(p.name || ""),
                description: String(p.description || ""),
                technologies: Array.isArray(p.technologies) ? p.technologies.map(String) : [],
                githubUrl: p.githubUrl ? String(p.githubUrl) : undefined,
                duration: p.duration ? String(p.duration) : undefined,
            }))
            : [],
        experience: Array.isArray(parsed.experience)
            ? parsed.experience.map((e: any) => ({
                title: String(e.title || ""),
                company: String(e.company || ""),
                duration: String(e.duration || ""),
                description: String(e.description || ""),
            }))
            : [],
        rawText: rawText.slice(0, 10000),
    }
}
