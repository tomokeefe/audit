import { RequestHandler } from "express";

// TEMPORARY: Hardcoded to bypass environment variable caching
const HARDCODED_GROK_KEY = "xai-PsoOOgLma7fSQale13NPDiYbJI5J9OOlL2nFDfnzxigtxzBhkyfsvV9DZzxHWLBhdrRJHYEiD3jX9WK5";
const getGrokApiKey = () => HARDCODED_GROK_KEY || process.env.GROK_API_KEY;
const GROK_API_URL = "https://api.x.ai/v1/chat/completions";

export const testGrok: RequestHandler = async (req, res) => {
  const GROK_API_KEY = getGrokApiKey();

  console.log("[TEST GROK] Testing Grok API connection...");
  console.log("[TEST GROK] API Key present:", !!GROK_API_KEY);
  console.log(
    "[TEST GROK] API Key preview:",
    GROK_API_KEY ? `${GROK_API_KEY.substring(0, 8)}...${GROK_API_KEY.slice(-4)}` : "NOT SET",
  );

  if (!GROK_API_KEY) {
    return res.status(500).json({
      success: false,
      error: "GROK_API_KEY not configured",
    });
  }

  try {
    const response = await fetch(GROK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "grok-2-1212",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant.",
          },
          {
            role: "user",
            content: "Say 'test successful' in 2 words.",
          },
        ],
        temperature: 0.7,
        max_tokens: 50,
      }),
    });

    console.log("[TEST GROK] Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[TEST GROK] Error response:", errorText);
      return res.status(response.status).json({
        success: false,
        status: response.status,
        error: errorText,
      });
    }

    const data = await response.json();
    console.log("[TEST GROK] Success! Response:", data);

    return res.json({
      success: true,
      message: "Grok API connection successful",
      response: data.choices?.[0]?.message?.content || data,
      keyPreview: `${GROK_API_KEY.substring(0, 8)}...${GROK_API_KEY.slice(-4)}`,
    });
  } catch (error) {
    console.error("[TEST GROK] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
