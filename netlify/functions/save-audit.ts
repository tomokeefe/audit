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
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { sql } = require("@neon/serverless");
    const queryClient = sql(process.env.DATABASE_URL);

    const audit = JSON.parse(event.body || "{}");

    if (!audit.id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Audit ID is required" }),
      };
    }

    // Save audit to database
    await queryClient`
      INSERT INTO audits (id, url, title, description, overall_score, status, date, audit_data)
      VALUES (${audit.id}, ${audit.url}, ${audit.title}, ${audit.description || null}, 
              ${audit.overallScore}, ${audit.status || "completed"}, ${audit.date}, ${JSON.stringify(audit)})
      ON CONFLICT (id) DO UPDATE SET
        audit_data = ${JSON.stringify(audit)}
    `;

    console.log(`✓ Saved audit ${audit.id} to Neon`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, id: audit.id }),
    };
  } catch (error) {
    console.error("Error saving audit:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to save audit" }),
    };
  }
};

export { handler };
