import { Request, Response } from "express";
import { AuditRequest } from "@shared/api";
import { scrapeWebsite } from "./audit";
import { generateAudit } from "./audit";
import { storeAuditResult } from "./audit";

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
  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  const sendProgress = (update: ProgressUpdate) => {
    res.write(`data: ${JSON.stringify(update)}\n\n`);
  };

  try {
    const { url } = req.body as AuditRequest;

    if (!url) {
      sendProgress({
        step: 'validation',
        progress: 0,
        message: 'URL is required',
        error: 'URL is required'
      });
      res.end();
      return;
    }

    // Validate URL
    sendProgress({
      step: 'validation',
      progress: 5,
      message: 'Validating URL format...'
    });

    try {
      new URL(url);
    } catch {
      sendProgress({
        step: 'validation',
        progress: 5,
        message: 'Invalid URL format',
        error: 'Invalid URL format. Please enter a valid URL starting with http:// or https://'
      });
      res.end();
      return;
    }

    sendProgress({
      step: 'validation',
      progress: 10,
      message: 'URL validated successfully'
    });

    // Step 1: Website Discovery and Crawling
    sendProgress({
      step: 'crawling',
      progress: 15,
      message: 'Starting website discovery and content extraction...'
    });

    const websiteData = await scrapeWebsiteWithProgress(url, sendProgress);

    if (websiteData.fallbackUsed) {
      sendProgress({
        step: 'crawling',
        progress: 35,
        message: 'Using fallback analysis due to access restrictions'
      });
    } else {
      sendProgress({
        step: 'crawling',
        progress: 40,
        message: `Successfully analyzed ${websiteData.multiPageAnalysis?.pagesAnalyzed || 1} pages`
      });
    }

    // Step 2: AI Analysis
    sendProgress({
      step: 'analysis',
      progress: 45,
      message: 'Initializing AI-powered brand analysis...'
    });

    const auditResult = await generateAuditWithProgress(websiteData, sendProgress);

    sendProgress({
      step: 'analysis',
      progress: 85,
      message: 'Analysis complete. Generating recommendations...'
    });

    // Step 3: Finalization
    sendProgress({
      step: 'finalizing',
      progress: 90,
      message: 'Finalizing audit report and storing results...'
    });

    await storeAuditResult(auditResult);

    sendProgress({
      step: 'completed',
      progress: 100,
      message: 'Audit completed successfully!',
      data: auditResult,
      completed: true
    });

    res.end();

  } catch (error) {
    console.error("Audit progress error:", error);
    
    let errorMessage = "Internal server error";
    if (error instanceof Error) {
      if (error.message.includes("fetch") || error.message.includes("timeout")) {
        errorMessage = "Unable to access the website. Please check the URL and try again.";
      } else if (error.message.includes("Invalid response format")) {
        errorMessage = "AI service error. Please try again in a moment.";
      } else {
        errorMessage = error.message;
      }
    }

    sendProgress({
      step: 'error',
      progress: 0,
      message: 'Audit failed',
      error: errorMessage
    });

    res.end();
  }
};

// Enhanced scraping with progress updates
async function scrapeWebsiteWithProgress(
  url: string, 
  sendProgress: (update: ProgressUpdate) => void
) {
  sendProgress({
    step: 'crawling',
    progress: 15,
    message: 'Connecting to website...'
  });

  // Import the scrapeWebsite function from audit.ts
  // We'll need to modify it to support progress callbacks
  // For now, let's create a wrapper that provides progress updates
  
  const startTime = Date.now();
  
  try {
    sendProgress({
      step: 'crawling',
      progress: 20,
      message: 'Downloading main page content...'
    });

    // Simulate realistic progress during scraping
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed < 8000) { // Don't go beyond 35% until actually done
        const timeProgress = Math.min(15, (elapsed / 8000) * 15);
        sendProgress({
          step: 'crawling',
          progress: 20 + timeProgress,
          message: 'Analyzing page structure and extracting content...'
        });
      }
    }, 1000);

    // Call the actual scraping function
    const { scrapeWebsite } = await import('./audit');
    const result = await scrapeWebsite(url);

    clearInterval(progressInterval);

    sendProgress({
      step: 'crawling',
      progress: 35,
      message: `Content extraction complete. Found ${result.multiPageAnalysis?.pagesAnalyzed || 1} pages to analyze.`
    });

    return result;

  } catch (error) {
    sendProgress({
      step: 'crawling',
      progress: 20,
      message: 'Website access failed, using fallback analysis',
      error: error instanceof Error ? error.message : 'Unknown scraping error'
    });
    
    // Return fallback data
    const { createFallbackData } = await import('./audit');
    return createFallbackData(url);
  }
}

// Enhanced AI generation with progress updates
async function generateAuditWithProgress(
  websiteData: any,
  sendProgress: (update: ProgressUpdate) => void
) {
  const stages = [
    { progress: 50, message: 'Analyzing brand consistency and messaging...' },
    { progress: 55, message: 'Evaluating design and visual elements...' },
    { progress: 60, message: 'Assessing user experience and usability...' },
    { progress: 65, message: 'Reviewing content strategy and effectiveness...' },
    { progress: 70, message: 'Analyzing digital presence and SEO factors...' },
    { progress: 75, message: 'Evaluating customer experience touchpoints...' },
    { progress: 80, message: 'Conducting competitive analysis and benchmarking...' },
    { progress: 82, message: 'Calculating evidence-weighted scores...' },
    { progress: 85, message: 'Generating actionable recommendations...' }
  ];

  let currentStage = 0;
  const stageInterval = setInterval(() => {
    if (currentStage < stages.length) {
      sendProgress({
        step: 'analysis',
        progress: stages[currentStage].progress,
        message: stages[currentStage].message
      });
      currentStage++;
    }
  }, 1500);

  try {
    // Call the actual AI generation function
    const { generateAudit } = await import('./audit');
    const result = await generateAudit(websiteData);
    
    clearInterval(stageInterval);
    
    sendProgress({
      step: 'analysis',
      progress: 85,
      message: `Analysis complete! Overall score: ${result.overallScore}%`
    });

    return result;

  } catch (error) {
    clearInterval(stageInterval);
    throw error;
  }
}

// Standard audit endpoint (non-SSE) for backwards compatibility
export const handleAuditStandard = async (req: Request, res: Response) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY environment variable is not set");
      return res
        .status(500)
        .json({ error: "Server configuration error. Please contact support." });
    }

    const { url } = req.body as AuditRequest;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({
        error: "Invalid URL format. Please enter a valid URL starting with http:// or https://",
      });
    }

    console.log("Starting standard audit for URL:", url);

    // Use the original audit flow
    const { scrapeWebsite, generateAudit, storeAuditResult } = await import('./audit');
    
    const websiteData = await scrapeWebsite(url);
    const auditResult = await generateAudit(websiteData);
    await storeAuditResult(auditResult);

    res.setHeader("Content-Type", "application/json");
    res.status(200).json(auditResult);
    
  } catch (error) {
    console.error("Standard audit error:", error);
    
    let errorMessage = "Internal server error";
    if (error instanceof Error) {
      if (error.message.includes("fetch") || error.message.includes("timeout")) {
        errorMessage = "Unable to access the website. Please check the URL and try again.";
      } else if (error.message.includes("Invalid response format")) {
        errorMessage = "AI service error. Please try again in a moment.";
      } else {
        errorMessage = error.message;
      }
    }

    res.status(500).json({ error: errorMessage });
  }
};
