/**
 * GET /api/health/llm
 * 
 * Health check endpoint to test Groq connectivity
 */
import { NextResponse } from "next/server";
import Groq from "groq-sdk";

export async function GET() {
    const results: any = {
        timestamp: new Date().toISOString(),
        groq: { status: "unknown", error: null },
    };

    // Test Groq Llama 3.3 70B
    try {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey || apiKey === 'dummy-key-for-build') {
            throw new Error("GROQ_API_KEY not configured");
        }

        const groq = new Groq({ apiKey });
        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: "Say 'OK' if you can read this." }],
            temperature: 0.1,
            max_tokens: 50,
        });

        results.groq.status = "healthy";
        results.groq.response = completion.choices[0]?.message?.content?.slice(0, 100) || "";
        results.groq.model = "llama-3.3-70b-versatile";
    } catch (error: any) {
        results.groq.status = "error";
        results.groq.error = error.message;
        results.groq.hint = error.message?.includes('API key')
            ? "Set GROQ_API_KEY in environment variables"
            : "Check if Groq API is accessible";
    }

    // Overall health
    const overallHealthy = results.groq.status === "healthy";
    const statusCode = overallHealthy ? 200 : 503;

    return NextResponse.json({
        healthy: overallHealthy,
        services: results
    }, { status: statusCode });
}
