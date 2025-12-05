import type { Handler } from "@netlify/functions";
import { sql } from "@neondatabase/serverless";

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

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.warn("DATABASE_URL not configured on Netlify");
      // Return success anyway - don't break audit creation
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          id: audit.id,
          stored: false,
          note: "Database not configured",
        }),
      };
    }

    // Use Neon serverless driver
    const { sql } = await import("@neondatabase/serverless");
    
    const client = sql(dbUrl);

    await client`
      INSERT INTO audits (id, url, title, description, overall_score, status, date, audit_data, is_demo_mode, created_at)
      VALUES (${audit.id}, ${audit.url}, ${audit.title}, ${audit.description || null}, ${audit.overallScore}, ${audit.status || "completed"}, ${audit.date}, ${JSON.stringify(audit)}, false, NOW())
      ON CONFLICT (id) DO UPDATE SET audit_data = ${JSON.stringify(audit)}
    `;

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
        note: "Audit created but database save failed - share links may not work",
      }),
    };
  }
};

export { handler };
