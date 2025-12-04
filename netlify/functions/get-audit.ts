import type { Handler } from "@netlify/functions";

const handler: Handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const id = event.path?.split("/").pop();
  if (!id) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Audit ID required" }),
    };
  }

  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error("DATABASE_URL not configured");
    }

    // Extract Neon project ID from connection string
    // Format: postgresql://user:password@host/database
    const url = new URL(dbUrl);
    const host = url.hostname; // e.g., "ep-xxxxx.us-east-1.aws.neon.tech"

    // Neon SQL over HTTP endpoint: https://console.neon.tech/app/projects/XXX/sql
    // Use the connectionString directly with their HTTP API
    const neonApiUrl = `https://${host}/sql`;

    const response = await fetch(neonApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: "SELECT audit_data FROM audits WHERE id = $1",
        params: [id],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Neon API error (${response.status}):`, error);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Audit not found" }),
      };
    }

    const result = await response.json();

    if (!result.rows || result.rows.length === 0) {
      console.warn(`⚠ Audit ${id} not found in database`);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Audit not found" }),
      };
    }

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
  } catch (error) {
    console.error(`Error retrieving audit ${id}:`, error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Failed to retrieve audit",
        message: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};

export { handler };
