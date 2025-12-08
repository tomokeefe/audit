import { RequestHandler } from "express";

const GROK_API_KEY = process.env.GROK_API_KEY;
const GROK_API_URL = "https://api.x.ai/v1/chat/completions";

export const testGrokAPI: RequestHandler = async (req, res) => {
  console.log("[TEST GROK] Testing Grok API connectivity");
  console.log("[TEST GROK] API Key present:", !!GROK_API_KEY);
  console.log(
    "[TEST GROK] API Key length:",
    GROK_API_KEY ? GROK_API_KEY.length : 0,
  );

  if (!GROK_API_KEY) {
    return res.status(500).json({
      success: false,
      error: "GROK_API_KEY not configured",
      details: "Environment variable GROK_API_KEY is missing",
    });
  }

  try {
    console.log("[TEST GROK] Sending test request to Grok API...");

    const response = await fetch(GROK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROK_API_KEY}`,
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant.",
          },
          {
            role: "user",
            content: "Say hello in one sentence.",
          },
        ],
        model: "grok-4-1-fast-reasoning", // Latest Grok 4.1 with reasoning
        temperature: 0.7,
        max_tokens: 100,
      }),
    });

    console.log("[TEST GROK] Response status:", response.status);
    console.log("[TEST GROK] Response ok:", response.ok);

    const responseText = await response.text();
    console.log(
      "[TEST GROK] Response body (first 500 chars):",
      responseText.substring(0, 500),
    );

    if (!response.ok) {
      return res.status(500).json({
        success: false,
        error: `Grok API returned status ${response.status}`,
        details: responseText,
        statusCode: response.status,
      });
    }

    const data = JSON.parse(responseText);

    return res.json({
      success: true,
      message: "Grok API is working correctly",
      response: data.choices?.[0]?.message?.content || "No content in response",
      fullResponse: data,
    });
  } catch (error) {
    console.error("[TEST GROK] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      details: error instanceof Error ? error.stack : String(error),
    });
  }
};
