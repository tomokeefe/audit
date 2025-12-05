import type { Handler } from "@netlify/functions";

const handler: Handler = async (event) => {
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
    const audit = JSON.parse(event.body || "{}");

    if (!audit.id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Audit ID is required" }),
      };
    }

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.warn("DATABASE_URL not set on Netlify");
      // Don't fail - just skip database save
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, id: audit.id, stored: false }),
      };
    }

    // Parse connection string to get host
    const url = new URL(databaseUrl);
    const host = url.hostname;

    // Call Neon HTTP endpoint
    const response = await fetch(`https://${host}/sql`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `
          INSERT INTO audits (id, url, title, description, overall_score, status, date, audit_data, is_demo_mode, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
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
          false,
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Neon HTTP API error:", error);
      // Don't fail the audit - database is optional
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          id: audit.id,
          stored: false,
          dbError: "Database unavailable",
        }),
      };
    }

    console.log(`✓ Saved audit ${audit.id} to Neon`);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, id: audit.id, stored: true }),
    };
  } catch (error) {
    console.error("Error saving audit:", error);
    // Return success anyway - don't block audit creation
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};

export { handler };
