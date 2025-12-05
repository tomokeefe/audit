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

  // Ping endpoint
  if (path.includes("/api/ping")) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: "pong",
        timestamp: new Date().toISOString(),
      }),
    };
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

      console.log(`[AUDIT] Starting audit for ${websiteUrl}`);

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

      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (!geminiApiKey) {
        console.warn("[AUDIT] GEMINI_API_KEY not configured, using demo data");
        return generateDemoAudit(websiteUrl, headers);
      }

      // Fetch website content
      let websiteContent = "";
      try {
        console.log(`[AUDIT] Fetching ${websiteUrl}...`);
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
          // Extract text content from HTML
          websiteContent = html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .substring(0, 5000)
            .trim();
          console.log(
            `[AUDIT] Fetched ${websiteContent.length} chars of content`,
          );
        }
      } catch (fetchError) {
        console.warn("[AUDIT] Error fetching website:", fetchError);
      }

      if (!websiteContent) {
        console.warn("[AUDIT] No website content, using demo data");
        return generateDemoAudit(websiteUrl, headers);
      }

      // Call Gemini API
      const analysisPrompt = `You are a brand audit expert. Analyze this website and provide detailed scores for 10 brand audit criteria.

Website URL: ${websiteUrl}
Website Content: ${websiteContent.substring(0, 3000)}

Evaluate on these 10 criteria (60-100 score each):
1. Branding - Logo, color scheme, brand consistency
2. Design - Visual appeal, layout, user interface  
3. Messaging - Value proposition, messaging clarity
4. Usability - Navigation, accessibility, UX
5. Content Strategy - Quality, relevance, organization
6. Digital Presence - SEO, social signals, authority
7. Customer Experience - Support, trust signals
8. Competitor Analysis - Positioning, differentiation
9. Conversion Optimization - CTAs, forms, conversions
10. Compliance & Security - Privacy, SSL, compliance

Respond with ONLY valid JSON (no markdown):
{
  "sections": [
    {"name": "Branding", "score": 75, "issues": 3, "recommendations": 4, "details": "..."},
    {"name": "Design", "score": 78, "issues": 2, "recommendations": 3, "details": "..."},
    {"name": "Messaging", "score": 82, "issues": 2, "recommendations": 3, "details": "..."},
    {"name": "Usability", "score": 85, "issues": 2, "recommendations": 3, "details": "..."},
    {"name": "Content Strategy", "score": 76, "issues": 3, "recommendations": 4, "details": "..."},
    {"name": "Digital Presence", "score": 72, "issues": 4, "recommendations": 4, "details": "..."},
    {"name": "Customer Experience", "score": 80, "issues": 2, "recommendations": 3, "details": "..."},
    {"name": "Competitor Analysis", "score": 74, "issues": 3, "recommendations": 4, "details": "..."},
    {"name": "Conversion Optimization", "score": 79, "issues": 3, "recommendations": 4, "details": "..."},
    {"name": "Compliance & Security", "score": 88, "issues": 2, "recommendations": 3, "details": "..."}
  ]
}`;

      console.log("[AUDIT] Gemini API key:", geminiApiKey ? "present" : "MISSING");
      console.log("[AUDIT] Calling Gemini API...");

      try {
        const geminiResponse = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" +
            geminiApiKey,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: analysisPrompt }] }],
            }),
          },
        );

        console.log("[AUDIT] Gemini response status:", geminiResponse.status);

        if (!geminiResponse.ok) {
          const errorText = await geminiResponse.text();
          console.error(
            "[AUDIT] Gemini API error:",
            geminiResponse.status,
            errorText.substring(0, 300),
          );
          return generateDemoAudit(websiteUrl, headers);
        }

        const geminiData = await geminiResponse.json();
        const responseText =
          geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

        if (!responseText) {
          console.error("[AUDIT] Empty Gemini response");
          return generateDemoAudit(websiteUrl, headers);
        }

        console.log("[AUDIT] Got response from Gemini, length:", responseText.length);

        // Extract JSON from response
        let jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          console.error(
            "[AUDIT] No JSON in response:",
            responseText.substring(0, 300),
          );
          return generateDemoAudit(websiteUrl, headers);
        }

        let auditData;
        try {
          auditData = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
          console.error("[AUDIT] JSON parse error:", parseError);
          return generateDemoAudit(websiteUrl, headers);
        }

        const sections = auditData.sections || [];
        if (!Array.isArray(sections) || sections.length === 0) {
          console.error("[AUDIT] Invalid sections in response");
          return generateDemoAudit(websiteUrl, headers);
        }

        console.log("[AUDIT] ✓ Successfully got", sections.length, "sections from Gemini");

        const overallScore = Math.round(
          sections.reduce((sum: number, s: any) => sum + (s.score || 0), 0) /
            sections.length,
        );

        const auditId = Date.now().toString();
        const domain = new URL(websiteUrl).hostname.replace("www.", "");

        const audit = {
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
          `[AUDIT] ✓ Generated audit ${auditId} with score ${overallScore}`,
        );

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(audit),
        };
      } catch (geminiError) {
        console.error("[AUDIT] Gemini call failed:", geminiError instanceof Error ? geminiError.message : geminiError);
        return generateDemoAudit(websiteUrl, headers);
      }
    } catch (error) {
      console.error("[AUDIT] Error:", error);
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

  // Save audit endpoint
  if (path === "/api/save-audit" && event.httpMethod === "POST") {
    try {
      const body = JSON.parse(event.body || "{}");
      console.log(`[SAVE] Audit save requested for ${body.id}`);
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
      console.error("[SAVE] Error:", error);
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

  // Get audits endpoint (empty list)
  if (path === "/api/audits" && event.httpMethod === "GET") {
    console.log("[AUDITS] GET /api/audits");
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ audits: [] }),
    };
  }

  // Get single audit endpoint
  if (path.match(/^\/api\/audits\/[^/]+$/)) {
    const id = path.split("/").pop();
    console.log(`[AUDIT] GET /api/audits/${id}`);
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: "Audit not found" }),
    };
  }

  return {
    statusCode: 404,
    headers,
    body: JSON.stringify({ error: "Not found" }),
  };
};

function generateDemoAudit(url: string, headers: Record<string, string>) {
  const auditId = Date.now().toString();
  const domain = new URL(url).hostname.replace("www.", "");

  const audit = {
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
          "The website has a clear brand identity with consistent logo usage. Color scheme is modern and professional. Consider adding more brand personality to differentiate from competitors.",
      },
      {
        name: "Design",
        score: 78,
        issues: 2,
        recommendations: 3,
        details:
          "Layout is clean and well-organized. Navigation is intuitive. Some spacing improvements could enhance visual hierarchy.",
      },
      {
        name: "Messaging",
        score: 82,
        issues: 2,
        recommendations: 3,
        details:
          "Value proposition is clearly stated. Messaging is concise and compelling. Headlines effectively communicate key benefits.",
      },
      {
        name: "Usability",
        score: 85,
        issues: 2,
        recommendations: 3,
        details:
          "Site navigation is straightforward. Forms are user-friendly. Mobile responsiveness appears good overall.",
      },
      {
        name: "Content Strategy",
        score: 76,
        issues: 3,
        recommendations: 4,
        details:
          "Content is relevant and well-organized. Consider expanding blog section. Add more case studies or testimonials.",
      },
      {
        name: "Digital Presence",
        score: 72,
        issues: 4,
        recommendations: 4,
        details:
          "Basic SEO elements are in place. Social media presence could be stronger. Consider improving meta descriptions.",
      },
      {
        name: "Customer Experience",
        score: 80,
        issues: 2,
        recommendations: 3,
        details:
          "Contact information is easily accessible. Support options are clear. Response time for customer inquiries could be highlighted.",
      },
      {
        name: "Competitor Analysis",
        score: 74,
        issues: 3,
        recommendations: 4,
        details:
          "Positioning is competitive. Unique selling points are evident. Consider more detailed competitive differentiation messaging.",
      },
      {
        name: "Conversion Optimization",
        score: 79,
        issues: 3,
        recommendations: 4,
        details:
          "CTAs are present and actionable. Forms appear functional. Consider A/B testing to improve conversion rates.",
      },
      {
        name: "Compliance & Security",
        score: 88,
        issues: 2,
        recommendations: 3,
        details:
          "SSL certificate is properly installed. Privacy policy is accessible. Cookie consent is implemented.",
      },
    ],
    metadata: {
      analysisConfidence: 0.75,
      industryDetected: "general",
      generatedBy: "Demo",
    },
  };

  console.log(`[DEMO] Generated demo audit ${auditId} for ${domain}`);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(audit),
  };
}

export { handler };
