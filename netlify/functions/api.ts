import type { Handler } from "@netlify/functions";

const handler: Handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "ok" }),
    };
  }

  const path = event.path || "";

  // Ping endpoint (local)
  if (path.includes("/api/ping")) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "ping pong" }),
    };
  }

  // Save audit endpoint (localStorage fallback - just acknowledge)
  if (path === "/api/save-audit" && event.httpMethod === "POST") {
    try {
      const body = JSON.parse(event.body || "{}");
      console.log(
        `Audit save requested for ${body.id} (using localStorage fallback)`,
      );
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
      console.error("Save audit error:", error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "Server error",
          message: error instanceof Error ? error.message : String(error),
        }),
      };
    }
  }

  // Generate audit using Gemini API
  if (path === "/api/audit" && event.httpMethod === "POST") {
    try {
      const body = JSON.parse(event.body || "{}");
      const { url: websiteUrl } = body;

      if (!websiteUrl) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "URL required" }),
        };
      }

      // Validate URL format
      try {
        new URL(websiteUrl);
      } catch {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Invalid URL format" }),
        };
      }

      console.log(`Generating audit for ${websiteUrl}`);

      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (!geminiApiKey) {
        console.error("GEMINI_API_KEY not configured");
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: "API key not configured" }),
        };
      }

      // Fetch website content with timeout
      let websiteContent = "";
      try {
        console.log(`Fetching content from ${websiteUrl}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const fetchResponse = await fetch(websiteUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (fetchResponse.ok) {
          const html = await fetchResponse.text();
          // Extract text content from HTML (first 5000 chars)
          websiteContent = html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .substring(0, 5000)
            .trim();
        }
      } catch (fetchError) {
        console.warn("Error fetching website:", fetchError);
        websiteContent = "Website content could not be fetched";
      }

      if (!websiteContent) {
        websiteContent = "Unable to extract website content";
      }

      // Use Gemini to analyze the website
      const analysisPrompt = `You are a brand audit expert. Analyze this website and provide detailed scores for 10 brand audit criteria based on the actual content provided.

Website URL: ${websiteUrl}
Website Content (excerpt): ${websiteContent.substring(0, 3000)}

Evaluate the website on these 10 criteria:
1. Branding - Logo, color scheme, brand consistency
2. Design - Visual appeal, layout, user interface
3. Messaging - Clear value proposition, messaging clarity
4. Usability - Navigation, accessibility, user experience
5. Content Strategy - Quality, relevance, organization
6. Digital Presence - SEO, social signals, authority
7. Customer Experience - Customer support, trust signals
8. Competitor Analysis - Competitive positioning, differentiation
9. Conversion Optimization - CTAs, forms, conversion elements
10. Compliance & Security - Privacy policy, SSL, compliance

For EACH criteria, provide:
- score: a number between 60-100
- issues: number between 2-5
- recommendations: number between 3-5
- details: specific analysis based on the website content

You MUST respond with ONLY valid JSON (no markdown, no explanation, just the raw JSON object):
{
  "sections": [
    {
      "name": "Branding",
      "score": 75,
      "issues": 3,
      "recommendations": 4,
      "details": "Based on the website content..."
    },
    {
      "name": "Design",
      "score": 78,
      "issues": 2,
      "recommendations": 3,
      "details": "..."
    },
    {
      "name": "Messaging",
      "score": 82,
      "issues": 2,
      "recommendations": 3,
      "details": "..."
    },
    {
      "name": "Usability",
      "score": 85,
      "issues": 2,
      "recommendations": 3,
      "details": "..."
    },
    {
      "name": "Content Strategy",
      "score": 76,
      "issues": 3,
      "recommendations": 4,
      "details": "..."
    },
    {
      "name": "Digital Presence",
      "score": 72,
      "issues": 4,
      "recommendations": 4,
      "details": "..."
    },
    {
      "name": "Customer Experience",
      "score": 80,
      "issues": 2,
      "recommendations": 3,
      "details": "..."
    },
    {
      "name": "Competitor Analysis",
      "score": 74,
      "issues": 3,
      "recommendations": 4,
      "details": "..."
    },
    {
      "name": "Conversion Optimization",
      "score": 79,
      "issues": 3,
      "recommendations": 4,
      "details": "..."
    },
    {
      "name": "Compliance & Security",
      "score": 88,
      "issues": 2,
      "recommendations": 3,
      "details": "..."
    }
  ]
}`;

      console.log("Calling Gemini API for detailed audit analysis");

      const geminiResponse = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" +
          geminiApiKey,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: analysisPrompt }],
              },
            ],
          }),
        },
      );

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error(
          "Gemini API error:",
          geminiResponse.status,
          errorText.substring(0, 200),
        );
        throw new Error(`Gemini API error: ${geminiResponse.status}`);
      }

      const geminiData = await geminiResponse.json();
      const responseText =
        geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

      if (!responseText) {
        throw new Error("Empty response from Gemini API");
      }

      console.log("Gemini analysis received, parsing JSON");

      // Extract JSON from response (handle markdown code blocks)
      let jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error(
          "Could not find JSON in response:",
          responseText.substring(0, 300),
        );
        throw new Error("No valid JSON in Gemini response");
      }

      const auditData = JSON.parse(jsonMatch[0]);
      const sections = auditData.sections || [];

      if (!Array.isArray(sections) || sections.length === 0) {
        throw new Error("Invalid audit data structure - no sections");
      }

      // Validate all sections have required fields
      for (const section of sections) {
        if (
          !section.name ||
          typeof section.score !== "number" ||
          !section.details
        ) {
          throw new Error(
            `Invalid section structure: ${JSON.stringify(section)}`,
          );
        }
      }

      const overallScore = Math.round(
        sections.reduce(
          (sum: number, section: any) => sum + (section.score || 0),
          0,
        ) / sections.length,
      );

      const auditId = Date.now().toString();
      const domain = new URL(websiteUrl).hostname.replace("www.", "");

      const fullAudit = {
        id: auditId,
        url: websiteUrl,
        title: `${domain} Brand Audit Report`,
        description: `Comprehensive brand audit analysis for ${domain}`,
        overallScore,
        status: "completed",
        date: new Date().toISOString(),
        sections,
        metadata: {
          analysisConfidence: 0.85,
          industryDetected: "general",
          generatedBy: "Gemini API",
        },
      };

      console.log(
        `✓ Generated audit ${auditId} with score ${overallScore} for ${domain}`,
      );

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
  }

  // Get all audits from localStorage (client-side fallback)
  if (path === "/api/audits" && event.httpMethod === "GET") {
    try {
      console.log(
        "GET /api/audits - returning empty list (database not configured)",
      );
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ audits: [] }),
      };
    } catch (error) {
      console.error("Audits list error:", error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "Failed to retrieve audits",
          message: error instanceof Error ? error.message : String(error),
        }),
      };
    }
  }

  // Handle /api/audits/:id (retrieve single audit)
  if (path.match(/^\/api\/audits\/[^/]+$/)) {
    try {
      const id = path.split("/").pop();
      console.log(`GET /api/audits/${id} - database not configured`);

      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Audit not found" }),
      };
    } catch (error) {
      console.error("Audit retrieval error:", error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "Failed to retrieve audit",
          message: error instanceof Error ? error.message : String(error),
        }),
      };
    }
  }

  return {
    statusCode: 404,
    headers,
    body: JSON.stringify({ error: "Not found" }),
  };
};

export { handler };
