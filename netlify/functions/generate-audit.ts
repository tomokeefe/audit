import type { Handler } from "@netlify/functions";

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

    // Generate audit using Grok
    const grokUrl = "https://api.x.ai/v1/chat/completions";

    const prompt = `Analyze this website and provide a brand audit. Generate realistic, varied scores (not all the same).

Website URL: ${url}
Website Content: ${websiteContent}

Provide a JSON response with this structure:
{
  "overallScore": <number 60-95>,
  "sections": [
    {
      "name": "Brand Consistency",
      "score": <number 60-100>,
      "maxScore": 100,
      "issues": <number>,
      "recommendations": <number>,
      "details": "<detailed analysis>"
    },
    {
      "name": "Design Quality",
      "score": <number 60-100>,
      "maxScore": 100,
      "issues": <number>,
      "recommendations": <number>,
      "details": "<detailed analysis>"
    },
    {
      "name": "User Experience",
      "score": <number 60-100>,
      "maxScore": 100,
      "issues": <number>,
      "recommendations": <number>,
      "details": "<detailed analysis>"
    }
  ]
}

Make sure scores vary (don't use the same score for all sections). Be realistic and base scores on the actual website content provided.`;

    console.log("Calling Grok API for audit generation");
    const grokResponse = await fetch(grokUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${grokApiKey}`,
      },
      body: JSON.stringify({
        model: "grok-2-1212",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.4,
        top_p: 0.8,
        max_tokens: 4096,
      }),
    });

    if (!grokResponse.ok) {
      const errorText = await grokResponse.text();
      throw new Error(`Grok API error: ${grokResponse.status} - ${errorText}`);
    }

    const grokData = await grokResponse.json();
    const responseText = grokData.choices?.[0]?.message?.content;

    if (!responseText) {
      throw new Error("No content in Grok API response");
    }

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No valid JSON in Grok response");
    }

    const auditData = JSON.parse(jsonMatch[0]);

    // Ensure we have the required fields
    if (!auditData.overallScore || !auditData.sections) {
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
