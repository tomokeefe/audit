import type { Handler } from "@netlify/functions";

export const handler: Handler = async (event, context) => {
  // Handle both direct function calls and redirected API calls
  let path = event.path;
  if (path.startsWith("/.netlify/functions/api")) {
    path = path.replace("/.netlify/functions/api", "");
  } else if (path.startsWith("/api")) {
    path = path.replace("/api", "");
  }

  // If path is empty, default to root
  if (!path) path = "/";

  const method = event.httpMethod;

  console.log(`Function called with path: ${event.path}, processed path: ${path}, method: ${method}`);

  // Set CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Content-Type": "application/json",
  };

  // Handle preflight requests
  if (method === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  try {
    // Handle different routes
    // Note: paths come without /api prefix due to Netlify redirect
    if (path === "/ping" && method === "GET") {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: "ping pong" }),
      };
    }

    if (path === "/audit" && method === "POST") {
      const body = event.body ? JSON.parse(event.body) : {};
      const { url } = body;

      if (!url) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "URL is required" }),
        };
      }

      // Mock audit response for now
      const mockResponse = {
        id: Date.now().toString(),
        url,
        title: "Example Brand Audit Report",
        description: "Comprehensive brand analysis and recommendations for " + url,
        date: new Date().toLocaleDateString(),
        overallScore: Math.floor(Math.random() * 40) + 60,
        sections: [
          {
            name: "Brand Consistency",
            score: Math.floor(Math.random() * 40) + 60,
            details: "Brand consistency analysis shows good alignment across visual elements.",
            issues: Math.floor(Math.random() * 5),
            recommendations: Math.floor(Math.random() * 8) + 2,
          },
          {
            name: "User Experience",
            score: Math.floor(Math.random() * 40) + 60,
            details: "User experience evaluation reveals several improvement opportunities.",
            issues: Math.floor(Math.random() * 5),
            recommendations: Math.floor(Math.random() * 8) + 2,
          },
        ],
        summary: "This audit reveals several key areas for improvement in brand consistency and user experience.",
      };

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(mockResponse),
      };
    }

    if (path === "/audits" && method === "GET") {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ audits: [] }),
      };
    }

    if (path.startsWith("/audits/") && method === "GET") {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Audit not found" }),
      };
    }

    if (path === "/audits" && method === "POST") {
      const body = event.body ? JSON.parse(event.body) : {};
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, id: body.id }),
      };
    }

    // Default 404
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: "Not found" }),
    };
  } catch (error) {
    console.error("Function error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
