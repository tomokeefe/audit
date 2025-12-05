import type { Handler } from "@netlify/functions";
import { sql } from "@neondatabase/serverless";

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
      console.error("DATABASE_URL not configured");
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({ error: "Database not configured" }),
      };
    }

    // Use Neon serverless driver
    const { sql } = await import("@neondatabase/serverless");
    
    const client = sql(dbUrl);
    
    const result = await client`SELECT audit_data FROM audits WHERE id = ${id}`;

    if (!result || result.length === 0) {
      console.warn(`⚠ Audit ${id} not found`);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Audit not found" }),
      };
    }

    const auditData =
      typeof result[0].audit_data === "string"
        ? JSON.parse(result[0].audit_data)
        : result[0].audit_data;

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
