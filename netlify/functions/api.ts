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
      body: JSON.stringify({ message: "ping pong" }),
    };
  }

  // Demo audit generator
  function generateDemoAudit(urlInput: string) {
    const url = urlInput.startsWith("http") ? urlInput : `https://${urlInput}`;
    const domain = new URL(url).hostname.replace("www.", "");
    const id = Math.random().toString(36).substring(2, 10);
    const baseScore = 65 + Math.random() * 25;

    return {
      id,
      url,
      title: `Brand Audit for ${domain}`,
      description: `Comprehensive brand audit for ${domain}`,
      date: new Date().toISOString().split("T")[0],
      overallScore: Math.round(baseScore * 10) / 10,
      status: "completed",
      summary: `Overall score: ${Math.round(baseScore * 10) / 10}/100`,
      sections: [
        {
          name: "Branding",
          score: 75,
          maxScore: 100,
          issues: 2,
          recommendations: 3,
          details: "Brand consistency analysis",
          priorityLevel: "medium",
          implementationDifficulty: "easy",
          confidence: 0.85,
          estimatedImpact: "15-25% improvement in brand recognition",
          evidenceLevel: "high",
        },
        {
          name: "Design",
          score: 70,
          maxScore: 100,
          issues: 3,
          recommendations: 4,
          details: "Design quality assessment",
          priorityLevel: "medium",
          implementationDifficulty: "medium",
          confidence: 0.82,
          estimatedImpact: "20-30% improvement in user engagement",
          evidenceLevel: "high",
        },
        {
          name: "Messaging",
          score: 72,
          maxScore: 100,
          issues: 2,
          recommendations: 3,
          details: "Message effectiveness",
          priorityLevel: "medium",
          implementationDifficulty: "easy",
          confidence: 0.88,
          estimatedImpact: "10-15% conversion improvement",
          evidenceLevel: "high",
        },
        {
          name: "Usability",
          score: 68,
          maxScore: 100,
          issues: 4,
          recommendations: 5,
          details: "User experience assessment",
          priorityLevel: "high",
          implementationDifficulty: "medium",
          confidence: 0.84,
          estimatedImpact: "15-25% bounce rate reduction",
          evidenceLevel: "high",
        },
        {
          name: "Content Strategy",
          score: 65,
          maxScore: 100,
          issues: 3,
          recommendations: 4,
          details: "Content quality and structure",
          priorityLevel: "high",
          implementationDifficulty: "hard",
          confidence: 0.8,
          estimatedImpact: "20-40% organic traffic increase",
          evidenceLevel: "medium",
        },
        {
          name: "Digital Presence",
          score: 60,
          maxScore: 100,
          issues: 5,
          recommendations: 6,
          details: "Social and online visibility",
          priorityLevel: "high",
          implementationDifficulty: "easy",
          confidence: 0.75,
          estimatedImpact: "30-50% brand awareness increase",
          evidenceLevel: "medium",
        },
        {
          name: "Customer Experience",
          score: 70,
          maxScore: 100,
          issues: 2,
          recommendations: 3,
          details: "Support and customer journey",
          priorityLevel: "medium",
          implementationDifficulty: "medium",
          confidence: 0.83,
          estimatedImpact: "25-35% customer lifetime value increase",
          evidenceLevel: "high",
        },
        {
          name: "Competitor Analysis",
          score: 68,
          maxScore: 100,
          issues: 3,
          recommendations: 4,
          details: "Market positioning assessment",
          priorityLevel: "medium",
          implementationDifficulty: "hard",
          confidence: 0.72,
          estimatedImpact: "5-15% market share increase",
          evidenceLevel: "medium",
        },
        {
          name: "Conversion Optimization",
          score: 72,
          maxScore: 100,
          issues: 2,
          recommendations: 3,
          details: "Conversion funnel analysis",
          priorityLevel: "high",
          implementationDifficulty: "medium",
          confidence: 0.89,
          estimatedImpact: "20-50% revenue increase",
          evidenceLevel: "high",
        },
        {
          name: "Consistency & Compliance",
          score: 75,
          maxScore: 100,
          issues: 1,
          recommendations: 2,
          details: "Legal and accessibility compliance",
          priorityLevel: "medium",
          implementationDifficulty: "easy",
          confidence: 0.91,
          estimatedImpact: "15-25% trust increase",
          evidenceLevel: "high",
        },
      ],
      metadata: {
        analysisConfidence: 0.85,
        industryDetected: "general",
        businessType: "b2c",
        evidenceQuality: "high",
        qualityScore: 82,
        demoMode: true,
      },
    };
  }

  // Audit endpoints
  if (path.includes("/api/audit")) {
    try {
      if (event.httpMethod === "GET") {
        const url = event.queryStringParameters?.url || "example.com";
        const audit = generateDemoAudit(url);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(audit),
        };
      }

      if (event.httpMethod === "POST") {
        const body = JSON.parse(event.body || "{}");
        const url = body.url || "example.com";
        const audit = generateDemoAudit(url);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(audit),
        };
      }
    } catch (error) {
      console.error("Audit error:", error);
      const defaultAudit = generateDemoAudit("example.com");
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(defaultAudit),
      };
    }
  }

  // Audits list endpoint
  if (path.includes("/api/audits")) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ audits: [] }),
    };
  }

  return {
    statusCode: 404,
    headers,
    body: JSON.stringify({ error: "Not found" }),
  };
};

export { handler };
