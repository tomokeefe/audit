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
    const audit = JSON.parse(event.body || "{}");
    if (!audit.id) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Audit ID required" }) };
    }

    // Save to localStorage as JSON file (client can download if needed)
    // For now, return success - client already saves to localStorage
    console.log(`✓ Audit ${audit.id} prepared for sharing`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, id: audit.id }),
    };
  } catch (error) {
    console.error("Error in save-audit:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to save audit" }),
    };
  }
};

export { handler };
