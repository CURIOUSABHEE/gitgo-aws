import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

// Initialize AWS Clients (optimized for Lambda cold starts)
const dynamoDb = DynamoDBDocumentClient.from(
  new DynamoDBClient({}),
  {
    marshallOptions: {
      removeUndefinedValues: true,
      convertEmptyValues: false,
    },
  }
);
const bedrock = new BedrockRuntimeClient({});

// Gemma 3 27B PT model configuration
const GEMMA_MODEL_ID = "google.gemma-3-27b-pt-v1:0";
const MAX_TOKENS_PHASE1 = 1500;
const MAX_TOKENS_PHASE2 = 3000;

/**
 * Optimized prompt builder for Gemma 3 27B PT
 * Gemma prefers concise, structured prompts with clear delimiters
 */
function buildPhase1Prompt(userProfile) {
  const ownRepos = userProfile.repos
    .filter(r => !r.fork)
    .slice(0, 10)
    .map(r => `${r.name} (${r.language || 'N/A'}): ${r.description || 'No description'}`)
    .join('\n');

  return `Task: Analyze developer profile and output JSON only.

Profile:
- Name: ${userProfile.name}
- Languages: ${userProfile.languages.join(', ') || 'None'}
- Skills: ${userProfile.skills.join(', ') || 'None'}
- Tech Stack: ${userProfile.techStack.join(', ') || 'None'}
- Open Source Contributions: ${userProfile.hasOSContributions ? 'Yes' : 'No'}

Projects:
${ownRepos || 'None'}

Output JSON with these exact keys:
{
  "experienceLevel": "none|small|good|frequent",
  "hasOpenSourceContributions": boolean,
  "contributionNotes": "1 sentence",
  "strengths": ["3 items"],
  "weaknesses": ["2 items"],
  "improvements": ["2 items"],
  "domains": [
    {
      "domainKey": "slug-format",
      "label": "Human readable",
      "primaryLanguage": "Language name",
      "frameworks": ["3-5 frameworks"],
      "minStars": 100|250|500|1000,
      "reasoning": "1 sentence why"
    }
  ]
}

Rules:
- Exactly 3 domains
- minStars based on level: none=100, small=250, good=500, frequent=1000
- No markdown, pure JSON only`;
}

/**
 * Optimized Phase 2 prompt for Gemma 3 27B PT
 */
function buildPhase2Prompt(domainProfile, userProfile, allProjects) {
  const domainsStr = domainProfile.domains
    .map(d => `${d.label} (${d.primaryLanguage}): ${d.frameworks.join(', ')}`)
    .join('\n');

  return `Task: Recommend exactly 10 GitHub repos per domain. Output JSON only.

Developer:
- Level: ${domainProfile.experienceLevel}
- Languages: ${userProfile.languages.join(', ')}
- Projects: ${allProjects.slice(0, 10).join(', ')}

Domains:
${domainsStr}

Output JSON:
{
  "categories": [
    {
      "domain": "exact-domainKey-from-input",
      "label": "exact-label-from-input",
      "repos": [
        {
          "full_name": "owner/repo",
          "whyItFits": "Reference their actual projects",
          "whereToStart": "Specific actionable step"
        }
      ]
    }
  ]
}

Rules:
- EXACTLY 10 repos per domain
- Use real GitHub repo names (owner/repo format)
- Personalize whyItFits with their project names
- No markdown, pure JSON only`;
}

/**
 * Call Bedrock with Gemma 3 27B PT optimized parameters
 */
async function invokeGemma(prompt, maxTokens, temperature = 0.1) {
  const command = new InvokeModelCommand({
    modelId: GEMMA_MODEL_ID,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
      prompt: prompt,
      max_tokens: maxTokens,
      temperature: temperature,
      top_p: 0.95,
      top_k: 40,
      // Gemma-specific optimizations
      stop_sequences: ["\n\n\n"], // Prevent excessive whitespace
    }),
  });

  const response = await bedrock.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  
  // Gemma returns text in 'outputs' array
  return responseBody.outputs?.[0]?.text || responseBody.text || "";
}

/**
 * Extract and parse JSON from Gemma response
 * Gemma sometimes wraps JSON in markdown or adds commentary
 */
function extractJSON(text) {
  // Remove markdown code blocks
  let cleaned = text.replace(/```(?:json)?\s*([\s\S]*?)```/g, "$1").trim();
  
  // Find JSON object boundaries
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  
  if (jsonStart !== -1 && jsonEnd !== -1) {
    cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
  }
  
  // Remove any trailing commas (common LLM mistake)
  cleaned = cleaned.replace(/,(\s*[}\]])/g, "$1");
  
  return JSON.parse(cleaned);
}

/**
 * Fetch user profile from DynamoDB with optimized queries
 */
async function fetchUserProfile(githubId) {
  const userProfile = {
    name: "Developer",
    languages: [],
    skills: [],
    techStack: [],
    repos: [],
    hasOSContributions: false,
  };

  if (!githubId) return userProfile;

  try {
    // Parallel fetch for better performance
    const [userRes, reposRes] = await Promise.all([
      dynamoDb.send(new GetCommand({
        TableName: "GitGo-Users",
        Key: { githubId: String(githubId) },
      })),
      dynamoDb.send(new QueryCommand({
        TableName: "GitGo-Repositories",
        KeyConditionExpression: "githubId = :gh",
        ExpressionAttributeValues: { ":gh": String(githubId) },
        Limit: 50, // Limit to reduce data transfer
      })),
    ]);

    const user = userRes.Item;
    const repos = reposRes.Items || [];

    if (user) {
      userProfile.name = user.name || user.login;
      userProfile.languages = user.languages || [];
      userProfile.skills = user.skills || [];
      userProfile.techStack = user.techStack || [];
      userProfile.repos = repos;
      userProfile.resume = {
        careerObjective: user.resumeCareerObjective,
        skillGroups: user.resumeSkillGroups,
        experience: user.resumeExperience,
        projects: user.resumeProjects,
      };
      userProfile.hasOSContributions = repos.some(r => r.fork);
    }
  } catch (error) {
    console.error("Error fetching user profile:", error);
  }

  return userProfile;
}

/**
 * Main Lambda handler optimized for Gemma 3 27B PT
 */
export const handler = async (event) => {
  console.log("Starting AI execution with Gemma 3 27B PT");
  
  const startTime = Date.now();

  try {
    // Parse request body
    const reqBody = typeof event.body === 'string' ? JSON.parse(event.body) : event;
    const { testGithubUrl, regenerate, sessionUser } = reqBody;

    if (!sessionUser?.githubId && !testGithubUrl) {
      return {
        statusCode: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Unauthorized payload" }),
      };
    }

    const githubIdObj = sessionUser?.githubId ? String(sessionUser.githubId) : null;
    const userIdString = sessionUser?.id || "test-user";

    // Phase 0: Fetch user profile
    console.log("Phase 0: Fetching user profile from DynamoDB");
    const userProfile = await fetchUserProfile(githubIdObj);

    if (testGithubUrl) {
      userProfile.name = "Test Profile Analysis";
    }

    // Phase 1: Profile Analysis with Gemma
    console.log("Phase 1: Analyzing profile with Gemma 3 27B PT");
    const phase1Prompt = buildPhase1Prompt(userProfile);
    const phase1Response = await invokeGemma(phase1Prompt, MAX_TOKENS_PHASE1, 0.1);
    const domainProfile = extractJSON(phase1Response);

    console.log("Phase 1 complete:", {
      experienceLevel: domainProfile.experienceLevel,
      domainsCount: domainProfile.domains?.length,
    });

    // Phase 2: Repository Recommendations with Gemma
    console.log("Phase 2: Generating repository recommendations with Gemma 3 27B PT");
    
    const allProjects = [
      ...userProfile.repos.filter(r => !r.fork).map(r => r.name),
      ...(userProfile.resume?.projects?.map(p => p.name) || []),
    ];

    const phase2Prompt = buildPhase2Prompt(domainProfile, userProfile, allProjects);
    const phase2Temperature = regenerate ? 0.7 : 0.2;
    const phase2Response = await invokeGemma(phase2Prompt, MAX_TOKENS_PHASE2, phase2Temperature);
    const categoriesData = extractJSON(phase2Response);

    const finalCategories = categoriesData.categories || [];

    console.log("Phase 2 complete:", {
      categoriesCount: finalCategories.length,
      totalRepos: finalCategories.reduce((sum, cat) => sum + (cat.repos?.length || 0), 0),
    });

    // Phase 3: Save to DynamoDB
    console.log("Phase 3: Saving recommendations to DynamoDB");
    
    const recommendationItem = {
      userId: userIdString,
      githubId: githubIdObj ? Number(githubIdObj) : null,
      experienceLevel: domainProfile.experienceLevel,
      hasOSSContributions: domainProfile.hasOpenSourceContributions,
      contributionNotes: domainProfile.contributionNotes,
      strengths: domainProfile.strengths || [],
      weaknesses: domainProfile.weaknesses || [],
      improvements: domainProfile.improvements || [],
      categories: finalCategories,
      generatedAt: new Date().toISOString(),
      modelUsed: "gemma-3-27b-pt",
      executionTimeMs: Date.now() - startTime,
    };

    await dynamoDb.send(new PutCommand({
      TableName: "GitGo-Recommendations",
      Item: recommendationItem,
    }));

    const executionTime = Date.now() - startTime;
    console.log(`Successfully saved recommendations. Total execution time: ${executionTime}ms`);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Success",
        executionTimeMs: executionTime,
        categoriesCount: finalCategories.length,
      }),
    };

  } catch (error) {
    console.error("Critical execution error:", error);
    
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: error.message,
        type: error.name,
        executionTimeMs: Date.now() - startTime,
      }),
    };
  }
};
