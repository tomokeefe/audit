import { Request, Response } from "express";
import { AuditRequest } from "@shared/api";

interface ProgressUpdate {
  step: string;
  progress: number;
  message: string;
  data?: any;
  completed?: boolean;
  error?: string;
}

// Progress tracking with Server-Sent Events
export const handleAuditProgress = async (req: Request, res: Response) => {
  console.log("=== EventSource Request Started ===");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  console.log("Query params:", req.query);
  console.log("Headers:", {
    "user-agent": req.headers["user-agent"],
    accept: req.headers["accept"],
    "cache-control": req.headers["cache-control"],
  });

  // Set up SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Cache-Control",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  });

  console.log("SSE headers sent successfully");

  const sendProgress = (update: ProgressUpdate) => {
    try {
      if (!res.destroyed && res.writable) {
        const message = `data: ${JSON.stringify(update)}\n\n`;
        console.log("Sending SSE message:", update.message);
        res.write(message);
        // Note: Express Response doesn't have flush method, but write should send immediately for SSE
      } else {
        console.log("Cannot send SSE message - connection not writable");
      }
    } catch (error) {
      console.error("Error sending SSE message:", error);
    }
  };

  // Handle connection cleanup
  let isCleanedUp = false;
  const cleanup = () => {
    if (!isCleanedUp && !res.destroyed) {
      isCleanedUp = true;
      console.log("Cleaning up EventSource connection");
      res.end();
    }
  };

  // Send immediate connection test
  sendProgress({
    step: "connection",
    progress: 0,
    message: "EventSource connection established",
  });

  // Set up connection close handlers (but don't cleanup too aggressively)
  req.on("close", () => {
    console.log("EventSource request closed by client");
    cleanup();
  });
  req.on("aborted", () => {
    console.log("EventSource request aborted");
    cleanup();
  });

  // Don't cleanup on response close - let the audit complete
  res.on("error", (error) => {
    console.log("EventSource response error:", error);
    cleanup();
  });

  try {
    // Get URL from query parameters (EventSource uses GET)
    const url = req.query.url as string;
    const sessionId = req.query.session as string;

    console.log(
      `Starting progress audit for session ${sessionId} with URL: ${url}`,
    );

    if (!url) {
      sendProgress({
        step: "validation",
        progress: 0,
        message: "URL is required",
        error: "URL is required",
      });
      cleanup();
      return;
    }

    // If API key not configured, fallback to demo audit
    if (!process.env.GROK_API_KEY) {
      console.log(
        "GROK_API_KEY not configured, sending fallback audit via SSE",
      );

      // Import and generate demo audit
      const { generateFallbackAudit } = await import("./audit");
      const demoAudit = generateFallbackAudit({
        url,
        title: new URL(url).hostname,
        fallbackUsed: true,
      });

      // Send progress completion with demo audit
      sendProgress({
        step: "complete",
        progress: 100,
        message: "Audit complete (demo mode)",
        completed: true,
        data: demoAudit,
      });
      res.end();
      return;
    }

    // Validate URL
    sendProgress({
      step: "validation",
      progress: 5,
      message: "Validating URL format...",
    });

    try {
      new URL(url);
    } catch {
      sendProgress({
        step: "validation",
        progress: 5,
        message: "Invalid URL format",
        error:
          "Invalid URL format. Please enter a valid URL starting with http:// or https://",
      });
      res.end();
      return;
    }

    sendProgress({
      step: "validation",
      progress: 10,
      message: "URL validated successfully",
    });

    // Step 1: Website Discovery and Crawling
    sendProgress({
      step: "crawling",
      progress: 15,
      message: "Starting website discovery and content extraction...",
    });

    // Simulate realistic crawling progress
    const crawlingSteps = [
      { progress: 20, message: "Connecting to website...", delay: 1000 },
      {
        progress: 25,
        message: "Downloading main page content...",
        delay: 2000,
      },
      { progress: 30, message: "Analyzing page structure...", delay: 1500 },
      {
        progress: 35,
        message: "Extracting navigation and links...",
        delay: 1000,
      },
      { progress: 40, message: "Discovering additional pages...", delay: 2000 },
      { progress: 45, message: "Analyzing multi-page content...", delay: 1500 },
    ];

    for (const step of crawlingSteps) {
      await new Promise((resolve) => setTimeout(resolve, step.delay));
      sendProgress({
        step: "crawling",
        progress: step.progress,
        message: step.message,
      });
    }

    // Step 2: AI Analysis with detailed progress
    const analysisSteps = [
      {
        progress: 50,
        message: "Initializing AI-powered brand analysis...",
        delay: 1000,
      },
      {
        progress: 55,
        message: "Analyzing brand consistency and messaging...",
        delay: 2000,
      },
      {
        progress: 60,
        message: "Evaluating design and visual elements...",
        delay: 1500,
      },
      {
        progress: 65,
        message: "Assessing user experience and usability...",
        delay: 1500,
      },
      {
        progress: 70,
        message: "Reviewing content strategy and effectiveness...",
        delay: 1500,
      },
      {
        progress: 75,
        message: "Analyzing digital presence and SEO factors...",
        delay: 1500,
      },
      {
        progress: 80,
        message: "Evaluating customer experience touchpoints...",
        delay: 1000,
      },
      {
        progress: 85,
        message: "Conducting competitive analysis and benchmarking...",
        delay: 2000,
      },
      {
        progress: 90,
        message: "Calculating evidence-weighted scores...",
        delay: 1000,
      },
      {
        progress: 95,
        message: "Generating actionable recommendations...",
        delay: 1500,
      },
    ];

    for (const step of analysisSteps) {
      await new Promise((resolve) => setTimeout(resolve, step.delay));
      sendProgress({
        step: "analysis",
        progress: step.progress,
        message: step.message,
      });
    }

    // Step 3: Perform actual audit analysis
    sendProgress({
      step: "finalizing",
      progress: 96,
      message: "Performing comprehensive analysis...",
    });

    // Call the actual audit functions to get real results
    console.log("🔵 [PROGRESS] Importing audit functions...");
    const { scrapeWebsite, generateAudit, storeAuditResult } = await import(
      "./audit"
    );
    console.log("✅ [PROGRESS] Audit functions imported");

    // Perform the actual audit
    console.log(`🔵 [PROGRESS] Starting scrape for ${url}...`);
    const websiteData = await scrapeWebsite(url);
    console.log(`✅ [PROGRESS] Scrape completed for ${url}`);

    sendProgress({
      step: "finalizing",
      progress: 97,
      message: "Processing analysis results...",
    });

    console.log(`🔵 [PROGRESS] Generating audit for ${url}...`);
    const auditResult = await generateAudit(websiteData);
    console.log(`✅ [PROGRESS] Audit generated with ID: ${auditResult.id}, Score: ${auditResult.overallScore}`);

    sendProgress({
      step: "finalizing",
      progress: 98,
      message: "Storing audit results...",
    });

    // Store the result
    console.log(`🔵 [PROGRESS] Calling storeAuditResult for ${auditResult.id}...`);
    await storeAuditResult(auditResult);
    console.log(`✅ [PROGRESS] storeAuditResult completed for ${auditResult.id}`);

    sendProgress({
      step: "completed",
      progress: 100,
      message: "Audit completed successfully!",
      data: auditResult,
      completed: true,
    });

    // Give time for the final message to be sent before cleanup
    setTimeout(() => {
      cleanup();
    }, 1000);
  } catch (error) {
    console.error("Audit progress error:", error);

    let errorMessage = "Internal server error";
    if (error instanceof Error) {
      if (
        error.message.includes("overloaded") ||
        error.message.includes("503")
      ) {
        errorMessage =
          "AI service is temporarily overloaded. Using fallback analysis mode...";

        // Try to provide a fallback audit
        try {
          const { generateFallbackAudit } = await import("./audit");
          const auditUrl = req.query.url as string;
          const fallbackData = {
            url: auditUrl ? decodeURIComponent(auditUrl) : "unknown",
            fallbackUsed: true,
          };
          const auditResult = generateFallbackAudit(fallbackData);

          sendProgress({
            step: "completed",
            progress: 100,
            message: "Audit completed with fallback analysis!",
            data: auditResult,
            completed: true,
          });

          setTimeout(() => cleanup(), 1000);
          return;
        } catch (fallbackError) {
          console.error("Fallback audit failed:", fallbackError);
          errorMessage =
            "Service temporarily unavailable. Please try again in a few minutes.";
        }
      } else if (
        error.message.includes("fetch") ||
        error.message.includes("timeout")
      ) {
        errorMessage =
          "Unable to access the website. Please check the URL and try again.";
      } else if (error.message.includes("Invalid response format")) {
        errorMessage = "AI service error. Please try again in a moment.";
      } else {
        errorMessage = error.message;
      }
    }

    sendProgress({
      step: "error",
      progress: 0,
      message: "Audit failed",
      error: errorMessage,
    });

    cleanup();
  }
};

// Standard audit endpoint (non-SSE) for backwards compatibility
export const handleAuditStandard = async (req: Request, res: Response) => {
  try {
    const { url } = req.body as AuditRequest;
    console.log("📥 [STANDARD] Received audit request for:", url);

    if (!url) {
      console.log("❌ [STANDARD] No URL provided");
      return res.status(400).json({ error: "URL is required" });
    }

    // Check API key early
    if (!process.env.GROK_API_KEY) {
      console.error("❌ [STANDARD] GROK_API_KEY not configured - cannot process audit");
      return res.status(500).json({
        error:
          "Server configuration error: API key not configured. Please contact support.",
      });
    }

    // Validate URL format
    try {
      new URL(url);
      console.log("✅ [STANDARD] URL validated:", url);
    } catch {
      console.log("❌ [STANDARD] Invalid URL format:", url);
      return res.status(400).json({
        error:
          "Invalid URL format. Please enter a valid URL starting with http:// or https://",
      });
    }

    console.log("🔵 [STANDARD] Starting standard audit for URL:", url);

    // Import necessary functions from audit module
    let scrapeWebsite, generateAudit, storeAuditResult;
    try {
      console.log("🔵 [STANDARD] Importing audit module...");
      const auditModule = await import("./audit.js");
      scrapeWebsite = auditModule.scrapeWebsite;
      generateAudit = auditModule.generateAudit;
      storeAuditResult = auditModule.storeAuditResult;
      console.log("✅ [STANDARD] Audit module imported successfully");
    } catch (importError) {
      console.error("❌ [STANDARD] Failed to import audit module:", importError);
      return res.status(500).json({
        error:
          "Server error: Failed to load audit module. Please try again later.",
      });
    }

    // Perform audit
    console.log(`🔵 [STANDARD] Scraping website: ${url}`);
    const websiteData = await scrapeWebsite(url);
    console.log(`✅ [STANDARD] Website scraped. Fallback used: ${websiteData.fallbackUsed}`);

    console.log(`🔵 [STANDARD] Generating audit for ${url}...`);
    const auditResult = await generateAudit(websiteData);
    console.log(`✅ [STANDARD] Audit generated. ID: ${auditResult.id}, Score: ${auditResult.overallScore}`);

    console.log(`🔵 [STANDARD] Storing audit ${auditResult.id}...`);
    await storeAuditResult(auditResult);
    console.log(`✅ [STANDARD] Audit ${auditResult.id} storage completed`);

    res.setHeader("Content-Type", "application/json");
    console.log(`✅ [STANDARD] Sending response for audit ${auditResult.id}`);
    res.status(200).json(auditResult);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Standard audit error:", errorMessage);
    console.error("Full error:", error);

    // Only send detailed error in development
    const isDev = process.env.NODE_ENV !== "production";
    res.status(500).json({
      error: "Failed to generate audit",
      message: isDev ? errorMessage : "Internal server error",
    });
  }
};
