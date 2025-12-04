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

  // Proxy audit endpoints to backend
  if (path.includes("/api/audit")) {
    try {
      const method = event.httpMethod || "POST";
      const isGet = method === "GET";
      const url = isGet
        ? `${backendUrl}/api/audit?${new URLSearchParams(event.queryStringParameters || {})}`
        : `${backendUrl}/api/audit`;

      const fetchOptions: RequestInit = {
        method,
        headers: {
          "Content-Type": "application/json",
        },
      };

      if (!isGet && event.body) {
        fetchOptions.body = event.body;
      }

      const response = await fetch(url, fetchOptions);
      const data = await response.json();

      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify(data),
      };
    } catch (error) {
      console.error("Proxy error:", error);
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({
          error:
            "Backend service unavailable. Ensure BACKEND_URL is configured.",
        }),
      };
    }
  }

  // Proxy audits list endpoint to backend
  if (path.includes("/api/audits")) {
    try {
      const response = await fetch(`${backendUrl}/api/audits`, {
        method: event.httpMethod || "GET",
        headers: {
          "Content-Type": "application/json",
        },
        body: event.body,
      });
      const data = await response.json();

      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify(data),
      };
    } catch (error) {
      console.error("Audits proxy error:", error);
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({ error: "Backend service unavailable" }),
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
