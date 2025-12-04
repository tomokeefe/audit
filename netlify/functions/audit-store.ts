import type { Handler } from "@netlify/functions";

const handler: Handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL not configured on Netlify");
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({ error: "Database not configured" }),
    };
  }

  try {
    // Parse the database URL to extract connection details
    const url = new URL(databaseUrl);
    const host = url.hostname;
    const database = url.pathname.slice(1);
    const user = url.username;
    const password = url.password;

    // For GET /audit-store/:id - retrieve audit
    if (event.httpMethod === "GET") {
      const id = event.queryStringParameters?.id;
      if (!id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Audit ID required" }),
        };
      }

      // Use Neon SQL query via HTTP API
      const response = await fetch(
        `https://${host}/sql?database=${database}&user=${user}&password=${password}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: "SELECT audit_data FROM audits WHERE id = $1",
            params: [id],
          }),
        }
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
    }

    // For POST /audit-store - save audit
    if (event.httpMethod === "POST") {
      const audit = JSON.parse(event.body || "{}");

      if (!audit.id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Audit ID required" }),
        };
      }

      // Use Neon SQL query via HTTP API
      const response = await fetch(
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
              audit.id,
              audit.url,
              audit.title,
              audit.description || null,
              audit.overallScore,
              audit.status || "completed",
              audit.date,
              JSON.stringify(audit),
            ],
          }),
        }
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
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  } catch (error) {
    console.error("Audit store error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Server error",
        message: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};

export { handler };
