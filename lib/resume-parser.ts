"use strict"

// AI-powered resume parser using Groq API with OCR support
// 1. Tries to extract text from PDF using pdf-parse
// 2. If text extraction fails, uses Tesseract.js OCR
// 3. Sends extracted text to Groq (Llama 3.3 70B) for intelligent structured extraction
// 4. Returns clean, structured resume data

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
    name: string | null
    email: string | null
    phone: string | null
    location: string | null
    careerObjective: string
    skills: string[]
    skillGroups: SkillGroup[]
    education: ParsedEducation[]
    projects: ParsedProject[]
    experience: ParsedExperience[]
    certifications: string[]
    rawText: string
}

const SYSTEM_PROMPT = `Your task is to extract structured information from a resume.

From the resume text, extract the following fields:
1. name
2. email
3. phone
4. location
5. careerObjective (career objective, summary, or about section)
6. skills (flat array of all skills)
7. skillGroups (skills grouped by category)
8. education (array of objects)
9. experience (array of objects)
10. projects (array of objects)
11. certifications (array)

For experience extract:
- company
- role (job title)
- duration
- description

For projects extract:
- name
- description
- technologies (array)
- githubUrl (if available)
- duration (if available)

For education extract:
- institution
- degree
- year
- details (CGPA, percentage, etc.)

For skillGroups extract:
- category (e.g., "Programming Languages", "Frameworks", "Tools")
- skills (array of skills in that category)

Return the result in STRICT JSON format only.

Rules:
- If a field is missing return null for strings, empty array for arrays, or empty string for careerObjective
- Do not invent information
- Do not include explanations
- Do not return markdown code fences
- Only return valid JSON
- Extract ALL skills into both the flat "skills" array AND the grouped "skillGroups" array
- Do NOT include contact information (email, phone) in any description fields

Return ONLY this JSON structure:
{
  "name": "string or null",
  "email": "string or null",
  "phone": "string or null",
  "location": "string or null",
  "careerObjective": "string (empty string if not found)",
  "skills": ["array of all skills as flat list"],
  "skillGroups": [
    {
      "category": "string",
      "skills": ["array"]
    }
  ],
  "education": [
    {
      "institution": "string",
      "degree": "string",
      "year": "string",
      "details": "string or omit if not present"
    }
  ],
  "experience": [
    {
      "company": "string",
      "role": "string",
      "duration": "string",
      "description": "string"
    }
  ],
  "projects": [
    {
      "name": "string",
      "description": "string",
      "technologies": ["array"],
      "githubUrl": "string or omit if not present",
      "duration": "string or omit if not present"
    }
  ],
  "certifications": ["array of certification names"]
}`

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

/**
 * Extract text from image-based PDF using OCR (Tesseract.js)
 */
async function extractTextWithOCR(pdfBuffer: Buffer): Promise<string> {
    console.log("[OCR] Starting OCR extraction for image-based PDF...")

    try {
        // Dynamic imports
        const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs")
        const { createWorker } = await import("tesseract.js")
        const { createCanvas } = await import("canvas")

        // Load PDF document
        const loadingTask = pdfjsLib.getDocument({
            data: new Uint8Array(pdfBuffer),
            useSystemFonts: true,
        })
        const pdfDocument = await loadingTask.promise
        const numPages = pdfDocument.numPages

        console.log(`[OCR] PDF has ${numPages} pages, processing up to 5 pages...`)

        // Create Tesseract worker
        const worker = await createWorker("eng", 1, {
            logger: (m: any) => {
                if (m.status === "recognizing text") {
                    console.log(`[OCR] Progress: ${Math.round(m.progress * 100)}%`)
                }
            },
        })

        let fullText = ""
        const pagesToProcess = Math.min(numPages, 5) // Limit to 5 pages to avoid timeout

        // Process each page
        for (let pageNum = 1; pageNum <= pagesToProcess; pageNum++) {
            console.log(`[OCR] Processing page ${pageNum}/${pagesToProcess}...`)

            try {
                // Get page
                const page = await pdfDocument.getPage(pageNum)
                const viewport = page.getViewport({ scale: 2.0 }) // Higher scale for better OCR

                // Create canvas
                const canvas = createCanvas(viewport.width, viewport.height)
                const context = canvas.getContext("2d")

                // Render PDF page to canvas
                await page.render({
                    canvasContext: context as any,
                    viewport: viewport,
                }).promise

                // Convert canvas to buffer
                const imageBuffer = canvas.toBuffer("image/png")

                // Run OCR on the image
                const { data: { text } } = await worker.recognize(imageBuffer)

                if (text && text.trim()) {
                    fullText += text + "\n\n"
                    console.log(`[OCR] Page ${pageNum} extracted ${text.length} characters`)
                }
            } catch (pageError: any) {
                console.error(`[OCR] Error processing page ${pageNum}:`, pageError.message)
                // Continue with next page
            }
        }

        // Terminate worker
        await worker.terminate()

        const extractedLength = fullText.trim().length
        console.log(`[OCR] Total extracted: ${extractedLength} characters`)

        if (extractedLength < 50) {
            throw new Error("OCR extraction produced insufficient text. The PDF may be too low quality or corrupted.")
        }

        return fullText.trim()

    } catch (error: any) {
        console.error("[OCR] OCR processing failed:", error.message)
        throw new Error(
            `OCR processing failed: ${error.message}. Please ensure the PDF is readable and not corrupted.`
        )
    }
}

/**
 * Parse a PDF buffer using Groq AI for intelligent extraction
 */
export async function parseResume(pdfBuffer: Buffer): Promise<ParsedResume> {
    // Step 1: Extract raw text from PDF
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse")

    let pdfData: any
    let rawText: string
    let usedOCR = false

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
        console.log("[Resume Parser] Text extraction failed, attempting OCR...")

        try {
            rawText = await extractTextWithOCR(pdfBuffer)
            usedOCR = true
            console.log("[Resume Parser] ✅ OCR successful! Extracted", rawText.length, "characters")
        } catch (ocrError: any) {
            console.error("[Resume Parser] OCR failed:", ocrError.message)
            throw new Error(
                "Could not extract text from the PDF. " + ocrError.message +
                " Please try: 1) Using a higher quality scan, 2) Converting to text-based PDF first, " +
                "3) Using an online OCR tool like https://www.onlineocr.net/"
            )
        }
    } else {
        console.log("[Resume Parser] ✅ Text-based PDF, extracted", rawText.length, "characters")
    }

    // Step 2: Send to Groq API for intelligent parsing
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
        throw new Error("GROQ_API_KEY is not configured")
    }

    console.log(`[Resume Parser] Sending to Groq AI for parsing (${usedOCR ? 'OCR text' : 'direct text'})...`)

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
                    content: `Resume text:\n\n${rawText.slice(0, 8000)}`,
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

    console.log("[Resume Parser] ✅ Successfully parsed resume data")

    // Step 4: Validate and return structured data
    return {
        name: typeof parsed.name === "string" ? parsed.name : null,
        email: typeof parsed.email === "string" ? parsed.email : null,
        phone: typeof parsed.phone === "string" ? parsed.phone : null,
        location: typeof parsed.location === "string" ? parsed.location : null,
        careerObjective: typeof parsed.careerObjective === "string" ? parsed.careerObjective : "",
        skills: Array.isArray(parsed.skills) ? parsed.skills.map(String).filter(Boolean) : [],
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
                title: String(e.role || e.title || ""),
                company: String(e.company || ""),
                duration: String(e.duration || ""),
                description: String(e.description || ""),
            }))
            : [],
        certifications: Array.isArray(parsed.certifications)
            ? parsed.certifications.map(String).filter(Boolean)
            : [],
        rawText: rawText.slice(0, 10000),
    }
}
