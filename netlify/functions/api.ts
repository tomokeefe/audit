import type { Handler } from "@netlify/functions";

const handler: Handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Content-Type": "application/json",
  };

  try {
    console.log(
      `[API] Incoming request - method: ${event.httpMethod}, path: ${event.path}`
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
    if ((path === "/api/audit" || path === "/audit") && event.httpMethod === "POST") {
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

      // Get Gemini API key from environment
      const geminiApiKey = process.env.GEMINI_API_KEY;
      console.log(`[AUDIT] Gemini API Key available: ${!!geminiApiKey}`);

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
            .replace(
              /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
              ""
            )
            .replace(
              /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
              ""
            )
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .substring(0, 4000);
          console.log(
            `[AUDIT] Content fetched: ${websiteContent.length} chars`
          );
        }
      } catch (fetchError) {
        console.warn(`[AUDIT] Failed to fetch website:`, fetchError);
      }

      // Only proceed with Gemini if we have an API key
      if (!geminiApiKey) {
        console.warn("[AUDIT] No Gemini API key - returning demo audit");
        return generateDemoAudit(websiteUrl, headers);
      }

      // Call Gemini API
      try {
        console.log("[AUDIT] Calling Gemini API...");

        const prompt = `You are a brand audit expert. Analyze this website and provide exactly 10 audit sections with scores.

Website: ${websiteUrl}
Content: ${websiteContent.substring(0, 2000)}

Respond with ONLY this exact JSON structure (no markdown, no explanation):
{
  "sections": [
    {"name": "Branding", "score": 75, "issues": 3, "recommendations": 4, "details": "Logo and color scheme are consistent. Brand identity is clear but could be more distinctive."},
    {"name": "Design", "score": 78, "issues": 2, "recommendations": 3, "details": "Layout is modern and well-organized. Typography is readable. Some spacing could be improved."},
    {"name": "Messaging", "score": 82, "issues": 2, "recommendations": 3, "details": "Value proposition is clear. Headlines are compelling. Messaging is consistent throughout."},
    {"name": "Usability", "score": 85, "issues": 2, "recommendations": 3, "details": "Navigation is intuitive. Forms are user-friendly. Mobile experience is responsive."},
    {"name": "Content Strategy", "score": 76, "issues": 3, "recommendations": 4, "details": "Content is relevant and well-organized. Consider expanding blog section. Add more case studies."},
    {"name": "Digital Presence", "score": 72, "issues": 4, "recommendations": 4, "details": "SEO elements are present. Social media integration could be stronger. Meta descriptions need improvement."},
    {"name": "Customer Experience", "score": 80, "issues": 2, "recommendations": 3, "details": "Contact information is accessible. Support options are clear. Consider adding live chat."},
    {"name": "Competitor Analysis", "score": 74, "issues": 3, "recommendations": 4, "details": "Positioning is competitive. Unique selling points are evident. Differentiation messaging could be clearer."},
    {"name": "Conversion Optimization", "score": 79, "issues": 3, "recommendations": 4, "details": "CTAs are present and clear. Forms capture key information. A/B testing could improve conversion rates."},
    {"name": "Compliance & Security", "score": 88, "issues": 2, "recommendations": 3, "details": "SSL certificate is installed. Privacy policy is accessible. Cookie consent is properly implemented."}
  ]
}`;

        const geminiUrl =
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" +
          geminiApiKey;

        const geminiResponse = await fetch(geminiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
          }),
        });

        console.log(`[AUDIT] Gemini status: ${geminiResponse.status}`);

        if (!geminiResponse.ok) {
          const errorBody = await geminiResponse.text();
          console.error(
            `[AUDIT] Gemini error (${geminiResponse.status}):`,
            errorBody.substring(0, 500)
          );
          return generateDemoAudit(websiteUrl, headers);
        }

        const geminiData = await geminiResponse.json();
        const responseText =
          geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!responseText) {
          console.error("[AUDIT] Empty response from Gemini");
          return generateDemoAudit(websiteUrl, headers);
        }

        console.log(
          `[AUDIT] Got Gemini response: ${responseText.length} chars`
        );

        // Extract JSON
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          console.error(
            "[AUDIT] No JSON found in response:",
            responseText.substring(0, 200)
          );
          return generateDemoAudit(websiteUrl, headers);
        }

        const auditData = JSON.parse(jsonMatch[0]);
        const sections = auditData.sections;

        if (!Array.isArray(sections) || sections.length === 0) {
          console.error("[AUDIT] Invalid sections");
          return generateDemoAudit(websiteUrl, headers);
        }

        // Validate sections
        for (const section of sections) {
          if (
            !section.name ||
            typeof section.score !== "number" ||
            section.score < 0 ||
            section.score > 100
          ) {
            console.error(
              "[AUDIT] Invalid section:",
              JSON.stringify(section).substring(0, 100)
            );
            return generateDemoAudit(websiteUrl, headers);
          }
        }

        const overallScore = Math.round(
          sections.reduce((sum: number, s: any) => sum + s.score, 0) /
            sections.length
        );
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
            generatedBy: "Gemini API",
          },
        };

        console.log(
          `[AUDIT] ✓ Success! Generated audit ${auditId} with score ${overallScore}`
        );

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(audit),
        };
      } catch (geminiError) {
        console.error(
          "[AUDIT] Gemini API error:",
          geminiError instanceof Error ? geminiError.message : geminiError
        );
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
        message:
          error instanceof Error ? error.message : String(error),
      }),
    };
  }
};

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
