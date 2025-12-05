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
          version: "20251205-deterministic",
        }),
      };
    }

    // Generate audit using deterministic scoring formula
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

      // Calculate deterministic scores based on website analysis
      console.log("[AUDIT] Calculating deterministic scores...");

      const auditId = Date.now().toString();
      const domain = new URL(websiteUrl).hostname.replace("www.", "");

      // Deterministic scoring based on website content analysis
      const scores = calculateDeterministicScores(websiteContent, websiteUrl);

      const sections = [
        {
          name: "Branding",
          score: scores.branding,
          issues: Math.floor((100 - scores.branding) / 15),
          recommendations: Math.max(
            2,
            Math.floor((100 - scores.branding) / 20),
          ),
          details: `Brand consistency and identity. ${scores.brandingDetails}`,
        },
        {
          name: "Design",
          score: scores.design,
          issues: Math.floor((100 - scores.design) / 15),
          recommendations: Math.max(2, Math.floor((100 - scores.design) / 20)),
          details: `Visual design and layout. ${scores.designDetails}`,
        },
        {
          name: "Messaging",
          score: scores.messaging,
          issues: Math.floor((100 - scores.messaging) / 15),
          recommendations: Math.max(
            2,
            Math.floor((100 - scores.messaging) / 20),
          ),
          details: `Value proposition clarity. ${scores.messagingDetails}`,
        },
        {
          name: "Usability",
          score: scores.usability,
          issues: Math.floor((100 - scores.usability) / 15),
          recommendations: Math.max(
            2,
            Math.floor((100 - scores.usability) / 20),
          ),
          details: `Navigation and UX. ${scores.usabilityDetails}`,
        },
        {
          name: "Content Strategy",
          score: scores.contentStrategy,
          issues: Math.floor((100 - scores.contentStrategy) / 15),
          recommendations: Math.max(
            2,
            Math.floor((100 - scores.contentStrategy) / 20),
          ),
          details: `Content relevance. ${scores.contentStrategyDetails}`,
        },
        {
          name: "Digital Presence",
          score: scores.digitalPresence,
          issues: Math.floor((100 - scores.digitalPresence) / 15),
          recommendations: Math.max(
            2,
            Math.floor((100 - scores.digitalPresence) / 20),
          ),
          details: `SEO and visibility. ${scores.digitalPresenceDetails}`,
        },
        {
          name: "Customer Experience",
          score: scores.customerExperience,
          issues: Math.floor((100 - scores.customerExperience) / 15),
          recommendations: Math.max(
            2,
            Math.floor((100 - scores.customerExperience) / 20),
          ),
          details: `Support accessibility. ${scores.customerExperienceDetails}`,
        },
        {
          name: "Competitor Analysis",
          score: scores.competitorAnalysis,
          issues: Math.floor((100 - scores.competitorAnalysis) / 15),
          recommendations: Math.max(
            2,
            Math.floor((100 - scores.competitorAnalysis) / 20),
          ),
          details: `Market positioning. ${scores.competitorAnalysisDetails}`,
        },
        {
          name: "Conversion Optimization",
          score: scores.conversionOptimization,
          issues: Math.floor((100 - scores.conversionOptimization) / 15),
          recommendations: Math.max(
            2,
            Math.floor((100 - scores.conversionOptimization) / 20),
          ),
          details: `CTA effectiveness. ${scores.conversionOptimizationDetails}`,
        },
        {
          name: "Compliance & Security",
          score: scores.compliance,
          issues: Math.floor((100 - scores.compliance) / 15),
          recommendations: Math.max(
            2,
            Math.floor((100 - scores.compliance) / 20),
          ),
          details: `Security protocols. ${scores.complianceDetails}`,
        },
      ];

      const overallScore = Math.round(
        sections.reduce((sum: number, s: any) => sum + s.score, 0) /
          sections.length,
      );

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
          generatedBy: "Deterministic Formula",
          methodology:
            "Formula-based analysis of website content and structure",
        },
      };

      console.log(
        `[AUDIT] ✅ SUCCESS! Generated audit ${auditId} - Score: ${overallScore}%`,
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(audit),
      };
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

function calculateDeterministicScores(
  content: string,
  url: string,
): {
  branding: number;
  design: number;
  messaging: number;
  usability: number;
  contentStrategy: number;
  digitalPresence: number;
  customerExperience: number;
  competitorAnalysis: number;
  conversionOptimization: number;
  compliance: number;
  brandingDetails: string;
  designDetails: string;
  messagingDetails: string;
  usabilityDetails: string;
  contentStrategyDetails: string;
  digitalPresenceDetails: string;
  customerExperienceDetails: string;
  competitorAnalysisDetails: string;
  conversionOptimizationDetails: string;
  complianceDetails: string;
} {
  const contentLower = content.toLowerCase();

  // Base scores
  let branding = 65;
  let design = 68;
  let messaging = 72;
  let usability = 70;
  let contentStrategy = 66;
  let digitalPresence = 62;
  let customerExperience = 68;
  let competitorAnalysis = 70;
  let conversionOptimization = 65;
  let compliance = 80;

  // Adjust based on content presence
  if (contentLower.includes("logo") || contentLower.includes("brand")) {
    branding += 8;
  }
  if (contentLower.includes("design") || contentLower.includes("style")) {
    design += 10;
  }
  if (contentLower.includes("mission") || contentLower.includes("vision")) {
    messaging += 12;
  }
  if (contentLower.includes("navigation") || contentLower.includes("menu")) {
    usability += 8;
  }
  if (contentLower.includes("blog") || contentLower.includes("article")) {
    contentStrategy += 10;
  }
  if (contentLower.includes("seo") || contentLower.includes("search")) {
    digitalPresence += 12;
  }
  if (
    contentLower.includes("contact") ||
    contentLower.includes("support") ||
    contentLower.includes("help")
  ) {
    customerExperience += 10;
  }
  if (contentLower.includes("call to action") || contentLower.includes("cta")) {
    conversionOptimization += 12;
  }
  if (contentLower.includes("ssl") || contentLower.includes("secure")) {
    compliance += 5;
  }

  // Adjust based on content length (longer content usually indicates better site)
  const contentLength = content.length;
  if (contentLength > 3000) {
    design += 5;
    contentStrategy += 8;
    messaging += 4;
  } else if (contentLength < 500) {
    design -= 10;
    contentStrategy -= 10;
    messaging -= 8;
  }

  // Check for specific patterns
  const hasImages = contentLower.includes("image") || content.includes("<img");
  const hasForms = contentLower.includes("form") || content.includes("<form");
  const hasHeadings = content.includes("<h");
  const hasSocialLinks =
    contentLower.includes("facebook") ||
    contentLower.includes("twitter") ||
    contentLower.includes("linkedin") ||
    contentLower.includes("instagram");

  if (hasImages) design += 6;
  if (hasForms) usability += 7;
  if (hasHeadings) messaging += 5;
  if (hasSocialLinks) digitalPresence += 8;

  // Ensure scores stay within bounds
  const clamp = (score: number) =>
    Math.min(100, Math.max(0, Math.round(score)));

  branding = clamp(branding);
  design = clamp(design);
  messaging = clamp(messaging);
  usability = clamp(usability);
  contentStrategy = clamp(contentStrategy);
  digitalPresence = clamp(digitalPresence);
  customerExperience = clamp(customerExperience);
  competitorAnalysis = clamp(competitorAnalysis);
  conversionOptimization = clamp(conversionOptimization);
  compliance = clamp(compliance);

  // Generate details based on scores
  const getDetail = (score: number, category: string) => {
    if (score >= 80)
      return `${category} is strong. Continue refining for excellence.`;
    if (score >= 70)
      return `${category} is good. Some improvements recommended.`;
    if (score >= 60)
      return `${category} needs attention. Focus on key improvements.`;
    return `${category} requires significant improvement.`;
  };

  return {
    branding,
    design,
    messaging,
    usability,
    contentStrategy,
    digitalPresence,
    customerExperience,
    competitorAnalysis,
    conversionOptimization,
    compliance,
    brandingDetails: getDetail(branding, "Brand identity"),
    designDetails: getDetail(design, "Visual design"),
    messagingDetails: getDetail(messaging, "Core messaging"),
    usabilityDetails: getDetail(usability, "User experience"),
    contentStrategyDetails: getDetail(contentStrategy, "Content"),
    digitalPresenceDetails: getDetail(digitalPresence, "Digital presence"),
    customerExperienceDetails: getDetail(
      customerExperience,
      "Customer support",
    ),
    competitorAnalysisDetails: getDetail(
      competitorAnalysis,
      "Competitive position",
    ),
    conversionOptimizationDetails: getDetail(conversionOptimization, "CTAs"),
    complianceDetails: getDetail(compliance, "Security"),
  };
}

export { handler };
