/**
 * GET /api/health/llm
 * 
 * Health check endpoint to test AWS Bedrock and Google Gemini connectivity
 */
import { NextResponse } from "next/server";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function GET() {
    const results: any = {
        timestamp: new Date().toISOString(),
        bedrock: { status: "unknown", error: null },
        gemini: { status: "unknown", error: null },
    };

    // Test AWS Bedrock
    try {
        const bedrockClient = new BedrockRuntimeClient({
            region: process.env.GITGO_AWS_REGION || process.env.AWS_REGION || "us-east-1",
        });

        const payload = {
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 50,
            temperature: 0.1,
            system: "You are a test assistant.",
            messages: [{ role: "user", content: "Say 'OK' if you can read this." }]
        };

        const command = new InvokeModelCommand({
            modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify(payload)
        });

        const response = await bedrockClient.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));

        results.bedrock.status = "healthy";
        results.bedrock.response = responseBody.content[0].text.slice(0, 100);
        results.bedrock.region = process.env.GITGO_AWS_REGION || "us-east-1";
    } catch (error: any) {
        results.bedrock.status = "error";
        results.bedrock.error = error.message;
        results.bedrock.errorName = error.name;
        results.bedrock.hint = error.name === 'AccessDeniedException'
            ? "Add AmazonBedrockFullAccess to Amplify service role"
            : error.name === 'ResourceNotFoundException'
                ? "Claude 3.5 Sonnet not available in this region"
                : "Check CloudWatch logs for details";
    }

    // Test Google Gemini
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === 'dummy-key-for-build') {
            throw new Error("GEMINI_API_KEY not configured");
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp",
            generationConfig: {
                maxOutputTokens: 50,
                temperature: 0.1,
            }
        });

        const result = await model.generateContent("Say 'OK' if you can read this.");
        const response = await result.response;

        results.gemini.status = "healthy";
        results.gemini.response = response.text().slice(0, 100);
    } catch (error: any) {
        results.gemini.status = "error";
        results.gemini.error = error.message;
        results.gemini.hint = error.message?.includes('API key')
            ? "Set GEMINI_API_KEY in Amplify environment variables"
            : "Check if Gemini API is accessible";
    }

    // Overall health
    const overallHealthy = results.bedrock.status === "healthy" && results.gemini.status === "healthy";
    const statusCode = overallHealthy ? 200 : 503;

    return NextResponse.json({
        healthy: overallHealthy,
        services: results
    }, { status: statusCode });
}
