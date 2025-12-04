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
    // Use lazy import to avoid bundling issues
    const { Client } = await import("pg");

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });

    await client.connect();

    const result = await client.query("SELECT audit_data FROM audits WHERE id = $1", [id]);
    await client.end();

    if (result.rows.length === 0) {
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

    console.log(`✓ Retrieved audit ${id} from Neon database`);
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
