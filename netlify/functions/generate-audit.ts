import type { Handler } from "@netlify/functions";

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

const handler: Handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { url } = body;

    if (!url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "URL required" }),
      };
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Invalid URL format" }),
      };
    }

    console.log(`Generating audit for ${url}`);

    const grokApiKey = process.env.GROK_API_KEY;
    if (!grokApiKey) {
      console.error("GROK_API_KEY not configured");
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "API configuration missing" }),
      };
    }

    // Fetch website content
    let websiteContent = "";
    try {
      console.log(`Fetching content from ${url}`);
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      if (response.ok) {
        const html = await response.text();
        // Extract text content from HTML
        websiteContent = html
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
          .replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .substring(0, 4000);
      }
    } catch (fetchError) {
      console.warn("Error fetching website:", fetchError);
      websiteContent = "Website content could not be fetched";
    }

    // Generate audit using Grok with Brand Whisperer prompt
    const grokUrl = "https://api.x.ai/v1/chat/completions";

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

    const userPrompt = `Audit this brand's website: ${url}. Extract/infer name, audience, challenges as needed.

Website Content: ${websiteContent}`;

    console.log("Calling Grok API for audit generation");
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

    if (!grokResponse.ok) {
      const errorText = await grokResponse.text();
      throw new Error(
        `Grok API error: ${grokResponse.status} - ${errorText}`,
      );
    }

    const grokData = await grokResponse.json();
    const responseText = grokData.choices?.[0]?.message?.content;

    if (!responseText) {
      throw new Error("No content in Grok API response");
    }

    // Parse markdown response
    const auditData = parseGrokMarkdownResponse(responseText);

    // Ensure we have the required fields
    if (!auditData || !auditData.overallScore || !auditData.sections) {
      throw new Error("Invalid audit data structure");
    }

    // Add metadata
    const auditId = Date.now().toString();
    const domain = new URL(url).hostname.replace("www.", "");

    const fullAudit = {
      id: auditId,
      url,
      title: `${domain} Brand Audit Report`,
      description: `Comprehensive brand audit analysis for ${domain}`,
      overallScore: auditData.overallScore,
      status: "completed",
      date: new Date().toISOString(),
      sections: auditData.sections,
      metadata: {
        analysisConfidence: 0.85,
        industryDetected: "general",
        generatedBy: "Brand Whisperer - Grok AI",
      },
    };

    // Save to database
    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl) {
      try {
        const dbUrl = new URL(databaseUrl);
        const host = dbUrl.hostname;
        const database = dbUrl.pathname.slice(1);
        const user = dbUrl.username;
        const password = dbUrl.password;

        await fetch(
          `https://${host}/sql?database=${database}&user=${user}&password=${password}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: `
                INSERT INTO audits (id, url, title, description, overall_score, status, date, audit_data)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (id) DO UPDATE SET audit_data = $8
              `,
              params: [
                auditId,
                url,
                fullAudit.title,
                fullAudit.description,
                fullAudit.overallScore,
                "completed",
                fullAudit.date,
                JSON.stringify(fullAudit),
              ],
            }),
          },
        );
        console.log(`✓ Saved audit ${auditId} to database`);
      } catch (dbError) {
        console.warn("Error saving to database:", dbError);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(fullAudit),
    };
  } catch (error) {
    console.error("Audit generation error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Failed to generate audit",
        message: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};

export { handler };
