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
  const backendUrl = process.env.BACKEND_URL || "http://localhost:3000";

  // Ping endpoint (local)
  if (path.includes("/api/ping")) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "ping pong" }),
    };
  }

  // Save audit to Neon database
  if (path === "/api/save-audit" && event.httpMethod === "POST") {
    try {
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        return {
          statusCode: 503,
          headers,
          body: JSON.stringify({ error: "Database not configured" }),
        };
      }

      const audit = JSON.parse(event.body || "{}");
      if (!audit.id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Audit ID required" }),
        };
      }

      const url = new URL(databaseUrl);
      const host = url.hostname;
      const database = url.pathname.slice(1);
      const user = url.username;
      const password = url.password;

      // Insert or update audit in Neon
      const response = await fetch(
        `https://${host}/sql?database=${database}&user=${user}&password=${password}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `
              INSERT INTO audits (id, url, title, description, overall_score, status, date, audit_data)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              ON CONFLICT (id) DO UPDATE SET audit_data = $8, date = $7
            `,
            params: [
              audit.id,
              audit.url,
              audit.title || "Audit Report",
              audit.description || null,
              audit.overallScore || 0,
              audit.status || "completed",
              audit.date || new Date().toISOString(),
              JSON.stringify(audit.audit_data || audit),
            ],
          }),
        },
      );

      if (!response.ok) {
        const error = await response.text();
        console.error("Neon API error:", error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: "Failed to save audit" }),
        };
      }

      console.log(`✓ Saved audit ${audit.id} to Neon via REST API`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, id: audit.id }),
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

      // Fetch website content
      let websiteContent = "";
      try {
        console.log(`Fetching content from ${websiteUrl}`);
        const fetchResponse = await fetch(websiteUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });

        if (fetchResponse.ok) {
          const html = await fetchResponse.text();
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

      // Generate audit using Gemini via REST API
      const prompt = `Analyze this website and provide a brand audit with realistic, varied scores.

Website URL: ${websiteUrl}
Website Content: ${websiteContent.substring(0, 3000)}

Provide ONLY a valid JSON response (no other text) with this exact structure:
{
  "overallScore": <number 60-95>,
  "sections": [
    {
      "name": "Brand Consistency",
      "score": <number 60-100>,
      "maxScore": 100,
      "issues": <number 1-5>,
      "recommendations": <number 3-6>,
      "details": "Detailed analysis..."
    },
    {
      "name": "Design Quality",
      "score": <number 60-100>,
      "maxScore": 100,
      "issues": <number 1-5>,
      "recommendations": <number 3-6>,
      "details": "Detailed analysis..."
    },
    {
      "name": "User Experience",
      "score": <number 60-100>,
      "maxScore": 100,
      "issues": <number 1-5>,
      "recommendations": <number 3-6>,
      "details": "Detailed analysis..."
    }
  ]
}`;

      console.log("Calling Gemini API for audit generation");

      const geminiResponse = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" +
          geminiApiKey,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
          }),
        }
      );

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error("Gemini API error:", errorText);
        throw new Error(`Gemini API error: ${geminiResponse.status}`);
      }

      const geminiData = await geminiResponse.json();
      const responseText =
        geminiData.candidates?.[0]?.content?.parts?.[0]?.text ||
        "";

      if (!responseText) {
        throw new Error("Empty response from Gemini API");
      }

      console.log("Gemini response:", responseText.substring(0, 200));

      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("Could not find JSON in response:", responseText);
        throw new Error("No valid JSON in Gemini response");
      }

      const auditData = JSON.parse(jsonMatch[0]);

      // Ensure we have the required fields
      if (!auditData.overallScore || !auditData.sections) {
        throw new Error("Invalid audit data structure");
      }

      // Add metadata
      const auditId = Date.now().toString();
      const domain = new URL(websiteUrl).hostname.replace("www.", "");

      const fullAudit = {
        id: auditId,
        url: websiteUrl,
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
                  websiteUrl,
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
  }

  // Handle /api/audits/:id (retrieve single audit from Neon database)
  if (path.match(/^\/api\/audits\/[^/]+$/)) {
    try {
      const id = path.split("/").pop();
      console.log(`Retrieving audit ${id} from Neon database`);

      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        return {
          statusCode: 503,
          headers,
          body: JSON.stringify({ error: "Database not configured" }),
        };
      }

      const url = new URL(databaseUrl);
      const host = url.hostname;
      const database = url.pathname.slice(1);
      const user = url.username;
      const password = url.password;

      // Query Neon for the specific audit
      const response = await fetch(
        `https://${host}/sql?database=${database}&user=${user}&password=${password}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: "SELECT audit_data FROM audits WHERE id = $1",
            params: [id],
          }),
        },
      );

      if (!response.ok) {
        console.error("Neon API error:", await response.text());
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: "Audit not found" }),
        };
      }

      const result = await response.json();
      if (result.rows && result.rows.length > 0) {
        const auditData =
          typeof result.rows[0].audit_data === "string"
            ? JSON.parse(result.rows[0].audit_data)
            : result.rows[0].audit_data;
        console.log(`✓ Retrieved audit ${id} from Neon`);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(auditData),
        };
      }

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

  // Get all audits from Neon database
  if (path === "/api/audits" && event.httpMethod === "GET") {
    try {
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        return {
          statusCode: 503,
          headers,
          body: JSON.stringify({ error: "Database not configured" }),
        };
      }

      const url = new URL(databaseUrl);
      const host = url.hostname;
      const database = url.pathname.slice(1);
      const user = url.username;
      const password = url.password;

      // Query Neon for all audits, ordered by date descending
      const response = await fetch(
        `https://${host}/sql?database=${database}&user=${user}&password=${password}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query:
              "SELECT id, url, title, description, overall_score as overallScore, status, date FROM audits ORDER BY date DESC LIMIT 100",
            params: [],
          }),
        },
      );

      if (!response.ok) {
        console.error("Neon API error:", await response.text());
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: "Database query failed" }),
        };
      }

      const result = await response.json();
      const audits = result.rows || [];

      console.log(`✓ Retrieved ${audits.length} audits from Neon`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ audits }),
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

  // Health check endpoint
  if (path.includes("/api/health")) {
    try {
      const response = await fetch(`${backendUrl}/api/health`);
      const data = await response.json();

      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify(data),
      };
    } catch (error) {
      console.error("Health check error:", error);
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({
          status: "error",
          database: {
            configured: false,
            status: "Backend unreachable",
          },
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
