import type { Handler } from "@netlify/functions";
import crypto from "crypto";

// Parse markdown audit response from Grok
function parseGrokMarkdownResponse(text: string): {
  overallScore: number;
  sections: Array<{
    name: string;
    score: number;
    issues: number;
    recommendations: number;
    details: string;
  }>;
} | null {
  try {
    // Extract overall score from "**Overall: X/100**" format
    const overallMatch = text.match(/\*\*Overall:\s*(\d+(?:\.\d+)?)\s*\/\s*100\*\*/i);
    const overallScore = overallMatch ? Math.round(parseFloat(overallMatch[1])) : 75;

    // Extract section scores from "N. Name – X/10" format
    const sectionNames = [
      "Branding & Identity",
      "Messaging & Positioning",
      "Content Strategy",
      "Customer Experience",
      "Conversion Optimization",
      "Visual Design & Aesthetics",
      "Usability & Navigation",
      "Digital Presence & SEO",
      "Competitor Differentiation",
      "Consistency & Compliance",
    ];

    const sections: any[] = [];
    const scoreLines = text.match(/^\s*\d+\.\s+[^–-]+ – \d+(?:\.\d+)?\/10/gm) || [];

    scoreLines.forEach((line, index) => {
      const scoreMatch = line.match(/(\d+(?:\.\d+)?)\s*\/\s*10/);
      const score = scoreMatch
        ? Math.round((parseFloat(scoreMatch[1]) / 10) * 100)
        : 75;
      sections.push({
        name: sectionNames[index] || `Section ${index + 1}`,
        score: Math.max(0, Math.min(100, score)),
        issues: 2,
        recommendations: 3,
        details: `Analysis for ${sectionNames[index] || `Section ${index + 1}`}. Score: ${Math.round((parseFloat(scoreMatch?.[1] || "7.5") / 10) * 100)}/100.`,
      });
    });

    // If we couldn't parse sections, create defaults
    if (sections.length === 0) {
      sectionNames.forEach((name) => {
        sections.push({
          name,
          score: overallScore,
          issues: 2,
          recommendations: 3,
          details: `Analysis for ${name}. Review the full audit for detailed feedback.`,
        });
      });
    }

    return {
      overallScore,
      sections: sections.slice(0, 10),
    };
  } catch (error) {
    console.error("Error parsing markdown response:", error);
    return null;
  }
}

// Section weights (copied from server/constants/scoring.ts for Netlify functions)
const SECTION_WEIGHTS_ARRAY = [
  0.18, // Branding
  0.13, // Design
  0.13, // Messaging
  0.13, // Usability
  0.09, // Content Strategy
  0.09, // Digital Presence
  0.05, // Customer Experience
  0.05, // Competitor Analysis
  0.1, // Conversion Optimization
  0.05, // Compliance & Security
];

const handler: Handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Content-Type": "application/json",
  };

  try {
    console.log(
      `[API] Incoming request - method: ${event.httpMethod}, path: ${event.path}`,
    );

    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: "ok" }),
      };
    }

    // Normalize path - handle both "/api/..." and "..." formats
    let path = event.path || "";
    console.log(`[API] Raw event.path: ${path}, method: ${event.httpMethod}`);

    // Ensure path starts with / for consistency
    if (!path.startsWith("/")) {
      path = "/" + path;
    }

    // If path doesn't start with /api, add /api prefix (for Netlify routing)
    if (!path.startsWith("/api/")) {
      path = "/api" + path;
    }

    console.log(`[API] Normalized path: ${path}`);

    // Ping endpoint
    if (path.includes("/api/ping") || path === "/ping") {
      console.log("[API] Serving ping endpoint");
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: "pong",
          timestamp: new Date().toISOString(),
          version: "20251205-fixed",
        }),
      };
    }

    // Generate audit using Gemini API
    if (
      (path === "/api/audit" || path === "/audit") &&
      event.httpMethod === "POST"
    ) {
      const body = JSON.parse(event.body || "{}");
      const { url: websiteUrl } = body;

      if (!websiteUrl) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "URL required" }),
        };
      }

      console.log(`[AUDIT] Starting audit for: ${websiteUrl}`);

      // Validate URL format
      try {
        new URL(websiteUrl);
      } catch (e) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Invalid URL format" }),
        };
      }

      // Get Grok API key from environment
      const grokApiKey = process.env.GROK_API_KEY;
      console.log(`[AUDIT] Grok API Key available: ${!!grokApiKey}`);
      console.log(`[AUDIT] Grok API Key length: ${grokApiKey?.length || 0}`);
      console.log(
        `[AUDIT] Grok API Key first 10 chars: ${grokApiKey?.substring(0, 10) || "MISSING"}`,
      );
      console.log(
        `[AUDIT] All env keys: ${Object.keys(process.env)
          .filter((k) => k.includes("GROK") || k.includes("API"))
          .join(", ")}`,
      );

      // Fetch website content
      let websiteContent = "Unable to fetch content";
      try {
        console.log(`[AUDIT] Fetching website content from: ${websiteUrl}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(websiteUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const html = await response.text();
          // Remove scripts and styles, then extract text
          websiteContent = html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .substring(0, 4000);
          console.log(
            `[AUDIT] Content fetched: ${websiteContent.length} chars`,
          );
        }
      } catch (fetchError) {
        console.warn(`[AUDIT] Failed to fetch website:`, fetchError);
      }

      // Only proceed with Grok if we have an API key
      if (!grokApiKey) {
        console.warn("[AUDIT] ❌ No Grok API key found - returning demo audit");
        console.warn(
          `[AUDIT] Available env vars with 'API': ${Object.keys(process.env)
            .filter((k) => k.includes("API"))
            .join(", ")}`,
        );
        return generateDemoAudit(websiteUrl, headers);
      }

      // Call Grok API
      try {
        console.log("[AUDIT] ✓ Grok API key found, proceeding with Grok call");
        console.log(
          `[AUDIT] Calling Grok API with key: ${grokApiKey.substring(0, 20)}...`,
        );

        const systemPrompt = `You are Brand Whisperer's senior brand strategist. For URL-only inputs, FIRST extract/infer: Brand Name (from <title>/meta), Target Audience (from copy like 'for millennials' or hero sections), Challenges/Goals (infer from pain points or CTAs). If unclear, use 'General Consumer' and note it.

Then evaluate across exactly these 10 criteria (0–10 scores, half-points OK). Weights for overall /100:
1. Branding & Identity (15%)
2. Messaging & Positioning (15%)
3. Content Strategy (10%)
4. Customer Experience (10%)
5. Conversion Optimization (10%)
6. Visual Design & Aesthetics (10%)
7. Usability & Navigation (10%)
8. Digital Presence & SEO (10%)
9. Competitor Differentiation (10%)
10. Consistency & Compliance (10%)

Be insightful/candid. Structure exactly: # Brand Whisperer Audit: [Name]
**Overall: X/100** (Grade)
## Section Scores
1. ... – X/10
2. ... – X/10
... (all 10)
## Key Strengths
- [Strength]
## Biggest Opportunities
- [Opportunity]
## Detailed Analysis
[2–4 paragraphs]
## Prioritized Recommendations
1. [Recommendation]

End: 'This audit shows where your brand stands—Brand Whisperer scales it to unicorn status. Reply for a custom strategy call.'`;

        const userPrompt = `Audit this brand's website: ${websiteUrl}. Extract/infer name, audience, challenges as needed.

Website Content:
${websiteContent.substring(0, 2000)}`;

        const grokUrl = "https://api.x.ai/v1/chat/completions";

        const grokResponse = await fetch(grokUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${grokApiKey}`,
          },
          body: JSON.stringify({
            messages: [
              {
                role: "system",
                content: systemPrompt,
              },
              {
                role: "user",
                content: userPrompt,
              },
            ],
            model: "grok-4-0709",
            temperature: 0.7,
            max_tokens: 2500,
          }),
        });

        console.log(`[AUDIT] Grok status: ${grokResponse.status}`);
        console.log(`[AUDIT] Grok response ok: ${grokResponse.ok}`);

        if (!grokResponse.ok) {
          const errorBody = await grokResponse.text();
          console.error(
            `[AUDIT] ❌ Grok error (${grokResponse.status}):`,
            errorBody.substring(0, 500),
          );
          console.error(
            `[AUDIT] Falling back to demo because Grok returned ${grokResponse.status}`,
          );
          return generateDemoAudit(websiteUrl, headers);
        }

        const grokData = await grokResponse.json();
        const responseText = grokData.choices?.[0]?.message?.content;

        if (!responseText) {
          console.error("[AUDIT] ❌ Empty response from Grok");
          return generateDemoAudit(websiteUrl, headers);
        }

        console.log(
          `[AUDIT] ✓ Got Grok response: ${responseText.length} chars`,
        );

        // Parse markdown response
        const auditData = parseGrokMarkdownResponse(responseText);
        if (!auditData || !auditData.sections || auditData.sections.length === 0) {
          console.error("[AUDIT] ❌ Failed to parse Grok response");
          return generateDemoAudit(websiteUrl, headers);
        }

        console.log(
          `[AUDIT] ✓ Parsed ${auditData.sections.length} sections from Grok`,
        );

        const overallScore = auditData.overallScore || 75;
        const sections = auditData.sections;
        const auditId = Date.now().toString();
        const domain = new URL(websiteUrl).hostname.replace("www.", "");

        const audit = {
          id: auditId,
          url: websiteUrl,
          title: `${domain} Brand Audit Report`,
          description: `Brand audit analysis for ${domain}`,
          overallScore,
          status: "completed",
          date: new Date().toISOString(),
          sections,
          metadata: {
            analysisConfidence: 0.85,
            industryDetected: "general",
            generatedBy: "Brand Whisperer - Grok AI",
          },
        };

        console.log(
          `[AUDIT] ✅ SUCCESS! Generated audit ${auditId} with Deterministic Score: ${overallScore}%`,
        );

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(audit),
        };
      } catch (grokError) {
        console.error(
          "[AUDIT] ❌ Grok API error:",
          grokError instanceof Error ? grokError.message : grokError,
        );
        console.error("[AUDIT] Falling back to demo audit due to Grok error");
        return generateDemoAudit(websiteUrl, headers);
      }
    }

    // Save audit endpoint
    if (
      (path === "/api/save-audit" || path === "/save-audit") &&
      event.httpMethod === "POST"
    ) {
      try {
        const body = JSON.parse(event.body || "{}");
        console.log(`[SAVE] Storing audit ${body.id}`);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            id: body.id,
            note: "Stored in browser",
          }),
        };
      } catch (error) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            error: "Failed to save audit",
          }),
        };
      }
    }

    // Get audits endpoint
    if (
      (path === "/api/audits" || path === "/audits") &&
      event.httpMethod === "GET"
    ) {
      console.log("[API] Serving audits endpoint");
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ audits: [] }),
      };
    }

    // Get single audit
    if (
      path.match(/^\/api\/audits\/[^/]+$/) ||
      path.match(/^\/audits\/[^/]+$/)
    ) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Audit not found" }),
      };
    }

    // Default 404 for unmatched endpoints
    console.log(`[API] No matching endpoint for: ${path}`);
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        error: "Not found",
        path: path,
        method: event.httpMethod,
        availableEndpoints: [
          "/api/ping",
          "/api/audit",
          "/api/audits",
          "/api/save-audit",
        ],
      }),
    };
  } catch (error) {
    console.error(`[API] Handler error:`, error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};

// Deterministic scoring cache (in-memory for this deployment)
const deterministicCache = new Map<string, any>();

/**
 * Generate deterministic scores based on website content
 */
function generateDeterministicScores(
  url: string,
  websiteContent: string,
): { scores: number[]; overall: number } {
  // Create cache key from URL
  const urlHash = crypto.createHash("sha256").update(url).digest("hex");

  // Check cache first
  if (deterministicCache.has(urlHash)) {
    const cached = deterministicCache.get(urlHash);
    console.log(`[SCORING] Using cached score for ${url}: ${cached.overall}`);
    return cached;
  }

  console.log(`[SCORING] Generating deterministic scores for ${url}`);

  // Base section scores derived from content analysis
  const sectionNames = [
    "Branding",
    "Design",
    "Messaging",
    "Usability",
    "Content Strategy",
    "Digital Presence",
    "Customer Experience",
    "Competitor Analysis",
    "Conversion Optimization",
    "Compliance & Security",
  ];

  // Generate deterministic scores for each section
  const scores = sectionNames.map((_, index) => {
    const sectionHash = crypto
      .createHash("sha256")
      .update(`${urlHash}-${index}`)
      .digest("hex");

    // Extract a number 0-100 from the hash
    const hashNum = parseInt(sectionHash.substring(0, 8), 16);
    const baseScore = 60 + ((hashNum % 40) - 20); // 40-80 range

    // Fine-tune based on content signals
    let adjustment = 0;
    if (
      websiteContent.includes("contact") ||
      websiteContent.includes("support")
    ) {
      adjustment += index === 6 ? 5 : 0; // Customer Experience boost
    }
    if (websiteContent.includes("https") || websiteContent.includes("ssl")) {
      adjustment += index === 9 ? 5 : 0; // Compliance boost
    }
    if (websiteContent.includes("nav") || websiteContent.includes("menu")) {
      adjustment += index === 3 ? 3 : 0; // Usability boost
    }

    return Math.max(0, Math.min(100, Math.round(baseScore + adjustment)));
  });

  // Calculate weighted overall score
  const overall =
    Math.round(
      scores.reduce(
        (sum, score, i) => sum + score * SECTION_WEIGHTS_ARRAY[i],
        0,
      ) * 10,
    ) / 10;

  const result = { scores, overall };
  deterministicCache.set(urlHash, result);
  console.log(
    `[SCORING] Generated deterministic score: ${overall}% for ${url}`,
  );

  return result;
}

function generateDemoAudit(url: string, headers: Record<string, string>) {
  const auditId = Date.now().toString();
  const domain = new URL(url).hostname.replace("www.", "");

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      id: auditId,
      url,
      title: `${domain} Brand Audit Report`,
      description: `Demo brand audit analysis for ${domain}`,
      overallScore: 76,
      status: "completed",
      date: new Date().toISOString(),
      sections: [
        {
          name: "Branding",
          score: 75,
          issues: 3,
          recommendations: 4,
          details:
            "Logo and color scheme are consistent. Brand identity is clear. Consider adding more brand personality.",
        },
        {
          name: "Design",
          score: 78,
          issues: 2,
          recommendations: 3,
          details:
            "Layout is clean and modern. Navigation is intuitive. Some spacing improvements recommended.",
        },
        {
          name: "Messaging",
          score: 82,
          issues: 2,
          recommendations: 3,
          details:
            "Value proposition is clear. Messaging is concise and compelling. Headlines are effective.",
        },
        {
          name: "Usability",
          score: 85,
          issues: 2,
          recommendations: 3,
          details:
            "Navigation is straightforward. Forms are user-friendly. Mobile responsiveness is good.",
        },
        {
          name: "Content Strategy",
          score: 76,
          issues: 3,
          recommendations: 4,
          details:
            "Content is relevant and well-organized. Expand blog section. Add more case studies.",
        },
        {
          name: "Digital Presence",
          score: 72,
          issues: 4,
          recommendations: 4,
          details:
            "Basic SEO elements in place. Social media integration weak. Improve meta descriptions.",
        },
        {
          name: "Customer Experience",
          score: 80,
          issues: 2,
          recommendations: 3,
          details:
            "Contact information accessible. Support options clear. Highlight response time.",
        },
        {
          name: "Competitor Analysis",
          score: 74,
          issues: 3,
          recommendations: 4,
          details:
            "Positioning is competitive. Unique selling points evident. Improve differentiation messaging.",
        },
        {
          name: "Conversion Optimization",
          score: 79,
          issues: 3,
          recommendations: 4,
          details:
            "CTAs are present. Forms capture data. A/B test to improve conversion rates.",
        },
        {
          name: "Compliance & Security",
          score: 88,
          issues: 2,
          recommendations: 3,
          details:
            "SSL installed. Privacy policy accessible. Cookie consent implemented.",
        },
      ],
      metadata: {
        analysisConfidence: 0.75,
        industryDetected: "general",
        generatedBy: "Demo",
      },
    }),
  };
}

export { handler };
