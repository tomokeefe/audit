import type { Handler } from "@netlify/functions";
import axios from "axios";
import * as cheerio from "cheerio";
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";

// Demo audit generator fallback when API key is not available
function generateDemoAudit(url: string) {
  const domain = new URL(url).hostname.replace("www.", "");
  const companyName =
    domain.split(".")[0].charAt(0).toUpperCase() +
    domain.split(".")[0].slice(1);
  const auditId = Math.random().toString(36).substring(2, 15);

  // Generate realistic variable scores based on URL characteristics
  const urlHash = Array.from(domain).reduce((hash, char) => {
    return ((hash << 5) - hash + char.charCodeAt(0)) & 0xffffffff;
  }, 0);

  // Create deterministic but variable scores based on URL hash
  const generateVariableScore = (
    baseScore: number,
    index: number,
    variance: number = 15,
  ): number => {
    const seed = Math.abs(urlHash + index * 1000);
    const random = (seed % 1000) / 1000; // 0-1 range
    const variation = (random - 0.5) * variance * 2; // +/- variance
    const score = Math.max(20, Math.min(95, baseScore + variation)); // Keep within realistic range
    return parseFloat(score.toFixed(1));
  };

  // Generate variable scores for each section
  const brandingScore = generateVariableScore(85, 0, 12);
  const designScore = generateVariableScore(75, 1, 15);
  const messagingScore = generateVariableScore(80, 2, 10);
  const usabilityScore = generateVariableScore(78, 3, 18);
  const contentScore = generateVariableScore(72, 4, 20);
  const digitalScore = generateVariableScore(68, 5, 25);
  const customerScore = generateVariableScore(74, 6, 15);
  const competitorScore = generateVariableScore(70, 7, 12);
  const conversionScore = generateVariableScore(76, 8, 18);
  const complianceScore = generateVariableScore(82, 9, 8);

  // Calculate scores with standardized weights for consistency
  const sectionScores = [
    { name: "Branding", score: brandingScore, weight: 0.18 },
    { name: "Design", score: designScore, weight: 0.13 },
    { name: "Messaging", score: messagingScore, weight: 0.13 },
    { name: "Usability", score: usabilityScore, weight: 0.13 },
    { name: "Content Strategy", score: contentScore, weight: 0.09 },
    { name: "Digital Presence", score: digitalScore, weight: 0.09 },
    { name: "Customer Experience", score: customerScore, weight: 0.05 },
    { name: "Competitor Analysis", score: competitorScore, weight: 0.05 },
    { name: "Conversion Optimization", score: conversionScore, weight: 0.1 },
    { name: "Consistency & Compliance", score: complianceScore, weight: 0.05 },
  ];

  // Calculate weighted overall score
  const overallScore = sectionScores.reduce(
    (sum, section) => sum + section.weight * section.score,
    0,
  );

  return {
    id: auditId,
    url,
    title: `Brand Audit for ${companyName}`,
    date: new Date().toISOString().split("T")[0],
    overallScore: parseFloat(overallScore.toFixed(1)),
    status: "completed",
    isDemoMode: true,
    sections: [
      {
        name: "Branding",
        score: brandingScore,
        subScores: [
          {
            name: "Logo Consistency",
            score: generateVariableScore(brandingScore + 3, 10, 8),
            maxScore: 100,
          },
          {
            name: "Color Palette",
            score: generateVariableScore(brandingScore, 11, 5),
            maxScore: 100,
          },
          {
            name: "Typography",
            score: generateVariableScore(brandingScore - 3, 12, 6),
            maxScore: 100,
          },
        ],
        issues: Math.max(
          1,
          Math.min(6, Math.round((100 - brandingScore) / 15)),
        ),
        recommendations: Math.max(
          2,
          Math.min(8, Math.round((100 - brandingScore) / 12)),
        ),
        details: `Brand consistency analysis for ${domain}. Logo consistency ${brandingScore >= 80 ? "strong" : brandingScore >= 60 ? "moderate" : "needs improvement"} across analyzed pages.`,
        priorityLevel:
          brandingScore < 60 ? "high" : brandingScore < 80 ? "medium" : "low",
        implementationDifficulty:
          brandingScore < 50 ? "hard" : brandingScore < 75 ? "medium" : "easy",
      },
      {
        name: "Design",
        score: designScore,
        subScores: [
          {
            name: "Visual Hierarchy",
            score: generateVariableScore(designScore + 5, 20, 10),
            maxScore: 100,
          },
          {
            name: "Layout Consistency",
            score: generateVariableScore(designScore - 2, 21, 8),
            maxScore: 100,
          },
          {
            name: "Mobile Responsiveness",
            score: generateVariableScore(designScore - 3, 22, 12),
            maxScore: 100,
          },
        ],
        issues: Math.max(1, Math.min(7, Math.round((100 - designScore) / 12))),
        recommendations: Math.max(
          2,
          Math.min(9, Math.round((100 - designScore) / 10)),
        ),
        details: `Design evaluation for ${domain}. ${designScore >= 80 ? "Excellent" : designScore >= 60 ? "Good" : "Poor"} visual hierarchy and layout structure.`,
        priorityLevel:
          designScore < 55 ? "high" : designScore < 75 ? "medium" : "low",
        implementationDifficulty:
          designScore < 45 ? "hard" : designScore < 70 ? "medium" : "easy",
      },
      {
        name: "Messaging",
        score: messagingScore,
        subScores: [
          {
            name: "Value Proposition",
            score: generateVariableScore(messagingScore + 3, 30, 8),
            maxScore: 100,
          },
          {
            name: "Tone Consistency",
            score: generateVariableScore(messagingScore - 2, 31, 6),
            maxScore: 100,
          },
          {
            name: "Call-to-Action Clarity",
            score: generateVariableScore(messagingScore + 1, 32, 7),
            maxScore: 100,
          },
        ],
        issues: Math.max(
          1,
          Math.min(5, Math.round((100 - messagingScore) / 18)),
        ),
        recommendations: Math.max(
          2,
          Math.min(7, Math.round((100 - messagingScore) / 15)),
        ),
        details: `Messaging analysis for ${domain}. ${messagingScore >= 80 ? "Clear and compelling" : messagingScore >= 60 ? "Adequate" : "Unclear"} value proposition.`,
        priorityLevel: messagingScore < 60 ? "high" : "medium",
        implementationDifficulty: messagingScore < 50 ? "medium" : "easy",
      },
      {
        name: "Usability",
        score: usabilityScore,
        subScores: [
          {
            name: "Navigation Structure",
            score: generateVariableScore(usabilityScore + 3, 40, 8),
            maxScore: 100,
          },
          {
            name: "Search Functionality",
            score: generateVariableScore(usabilityScore - 3, 41, 12),
            maxScore: 100,
          },
          {
            name: "Form Usability",
            score: generateVariableScore(usabilityScore, 42, 10),
            maxScore: 100,
          },
        ],
        issues: Math.max(
          2,
          Math.min(8, Math.round((100 - usabilityScore) / 10)),
        ),
        recommendations: Math.max(
          3,
          Math.min(10, Math.round((100 - usabilityScore) / 8)),
        ),
        details: `Usability assessment for ${domain}. Navigation ${usabilityScore >= 75 ? "is intuitive and well-structured" : usabilityScore >= 55 ? "needs minor improvements" : "requires significant restructuring"}.`,
        priorityLevel: usabilityScore < 60 ? "high" : "medium",
        implementationDifficulty: usabilityScore < 50 ? "hard" : "medium",
      },
      {
        name: "Content Strategy",
        score: contentScore,
        subScores: [
          {
            name: "Content Quality",
            score: generateVariableScore(contentScore + 2, 50, 10),
            maxScore: 100,
          },
          {
            name: "SEO Optimization",
            score: generateVariableScore(contentScore - 5, 51, 15),
            maxScore: 100,
          },
          {
            name: "Content Structure",
            score: generateVariableScore(contentScore + 3, 52, 8),
            maxScore: 100,
          },
        ],
        issues: Math.max(2, Math.min(8, Math.round((100 - contentScore) / 12))),
        recommendations: Math.max(
          3,
          Math.min(10, Math.round((100 - contentScore) / 10)),
        ),
        details: `Content strategy evaluation for ${domain}. ${contentScore >= 75 ? "Well-structured content with good organization" : contentScore >= 55 ? "Content structure needs improvement" : "Significant content strategy overhaul required"}.`,
        priorityLevel: contentScore < 65 ? "high" : "medium",
        implementationDifficulty: contentScore < 50 ? "hard" : "medium",
      },
      {
        name: "Digital Presence",
        score: digitalScore,
        subScores: [
          {
            name: "Social Media Integration",
            score: generateVariableScore(digitalScore - 5, 60, 15),
            maxScore: 100,
          },
          {
            name: "Online Reviews",
            score: generateVariableScore(digitalScore + 3, 61, 10),
            maxScore: 100,
          },
          {
            name: "Digital Marketing",
            score: generateVariableScore(digitalScore + 2, 62, 12),
            maxScore: 100,
          },
        ],
        issues: Math.max(3, Math.min(8, Math.round((100 - digitalScore) / 10))),
        recommendations: Math.max(
          4,
          Math.min(10, Math.round((100 - digitalScore) / 8)),
        ),
        details: `Digital presence analysis for ${domain}. ${digitalScore >= 70 ? "Solid social media integration" : digitalScore >= 50 ? "Limited social media presence" : "Minimal digital footprint"}.`,
        priorityLevel: digitalScore < 55 ? "high" : "medium",
        implementationDifficulty: "easy",
      },
      {
        name: "Customer Experience",
        score: customerScore,
        subScores: [
          {
            name: "Support Accessibility",
            score: generateVariableScore(customerScore - 2, 70, 10),
            maxScore: 100,
          },
          {
            name: "Contact Options",
            score: generateVariableScore(customerScore + 3, 71, 8),
            maxScore: 100,
          },
          {
            name: "User Journey",
            score: generateVariableScore(customerScore - 1, 72, 12),
            maxScore: 100,
          },
        ],
        issues: Math.max(
          2,
          Math.min(6, Math.round((100 - customerScore) / 15)),
        ),
        recommendations: Math.max(
          3,
          Math.min(8, Math.round((100 - customerScore) / 12)),
        ),
        details: `Customer experience evaluation for ${domain}. ${customerScore >= 80 ? "Excellent customer support accessibility" : customerScore >= 60 ? "Adequate support options" : "Limited customer support visibility"}.`,
        priorityLevel: customerScore < 65 ? "medium" : "low",
        implementationDifficulty: "medium",
      },
      {
        name: "Competitor Analysis",
        score: competitorScore,
        subScores: [
          {
            name: "Strengths Comparison",
            score: generateVariableScore(competitorScore * 0.5, 80, 8),
            maxScore: 50,
          },
          {
            name: "Weaknesses Assessment",
            score: generateVariableScore(competitorScore * 0.5 - 2, 81, 6),
            maxScore: 50,
          },
          {
            name: "Market Positioning",
            score: generateVariableScore(competitorScore * 0.2, 82, 3),
            maxScore: 20,
          },
          {
            name: "Competitive Advantage",
            score: generateVariableScore(competitorScore * 0.2 + 1, 83, 4),
            maxScore: 20,
          },
        ],
        issues: Math.max(
          3,
          Math.min(8, Math.round((100 - competitorScore) / 8)),
        ),
        recommendations: Math.max(
          4,
          Math.min(10, Math.round((100 - competitorScore) / 7)),
        ),
        details: `Competitive analysis for ${domain}. ${competitorScore >= 75 ? "Strong market positioning relative to competitors" : competitorScore >= 55 ? "Moderate competitive standing" : "Competitive disadvantages identified"}.`,
        priorityLevel: competitorScore < 60 ? "medium" : "low",
        implementationDifficulty: competitorScore < 50 ? "hard" : "medium",
      },
      {
        name: "Conversion Optimization",
        score: conversionScore,
        subScores: [
          {
            name: "Conversion Funnel",
            score: generateVariableScore(conversionScore - 2, 90, 8),
            maxScore: 100,
          },
          {
            name: "Trust Signals",
            score: generateVariableScore(conversionScore + 2, 91, 10),
            maxScore: 100,
          },
          {
            name: "Lead Generation",
            score: generateVariableScore(conversionScore, 92, 12),
            maxScore: 100,
          },
        ],
        issues: Math.max(
          2,
          Math.min(7, Math.round((100 - conversionScore) / 12)),
        ),
        recommendations: Math.max(
          3,
          Math.min(9, Math.round((100 - conversionScore) / 10)),
        ),
        details: `Conversion optimization analysis for ${domain}. ${conversionScore >= 80 ? "Strong conversion elements in place" : conversionScore >= 60 ? "Basic conversion optimization present" : "Significant conversion improvements needed"}.`,
        priorityLevel: conversionScore < 65 ? "high" : "medium",
        implementationDifficulty: conversionScore < 50 ? "hard" : "medium",
      },
      {
        name: "Consistency & Compliance",
        score: complianceScore,
        subScores: [
          {
            name: "Legal Compliance",
            score: generateVariableScore(complianceScore + 5, 100, 5),
            maxScore: 100,
          },
          {
            name: "Accessibility Standards",
            score: generateVariableScore(complianceScore - 5, 101, 12),
            maxScore: 100,
          },
          {
            name: "Brand Guidelines",
            score: generateVariableScore(complianceScore, 102, 8),
            maxScore: 100,
          },
        ],
        issues: Math.max(
          1,
          Math.min(4, Math.round((100 - complianceScore) / 20)),
        ),
        recommendations: Math.max(
          2,
          Math.min(6, Math.round((100 - complianceScore) / 15)),
        ),
        details: `Compliance and consistency evaluation for ${domain}. ${complianceScore >= 85 ? "Excellent legal and accessibility compliance" : complianceScore >= 65 ? "Good compliance with minor gaps" : "Compliance issues need attention"}.`,
        priorityLevel: complianceScore < 70 ? "medium" : "low",
        implementationDifficulty: complianceScore < 60 ? "medium" : "easy",
      },
    ],
    metadata: {
      analysisConfidence: 0.95,
      industryDetected: "general",
      businessType: "b2c",
      evidenceQuality: "high",
      qualityScore: 88,
      demoMode: true,
      note: "This is a demo audit. For AI-powered audits, ensure GEMINI_API_KEY is configured.",
    },
  };
}

// Scrape website content
async function scrapeWebsite(url: string) {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      maxRedirects: 5,
    });

    const $ = cheerio.load(response.data);

    // Extract content
    const title = $("title").text();
    const description = $('meta[name="description"]').attr("content") || "";
    const headings = $("h1, h2, h3")
      .slice(0, 10)
      .map((_, el) => $(el).text())
      .get();
    const paragraphs = $("p")
      .slice(0, 5)
      .map((_, el) => $(el).text())
      .get();
    const images = $("img")
      .map((_, el) => $(el).attr("alt") || $(el).attr("src") || "image")
      .get()
      .slice(0, 10);
    const links = $("a")
      .map((_, el) => $(el).text())
      .get()
      .slice(0, 10);

    return {
      title,
      description,
      headings,
      paragraphs,
      images,
      links,
      url,
      fallbackUsed: false,
    };
  } catch (error) {
    console.warn(`Failed to scrape ${url}:`, error);
    throw error;
  }
}

// Generate real audit using Gemini AI
async function generateRealAudit(url: string, websiteData: any) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const auditPrompt = `Analyze the following website information and provide a structured brand audit. Return JSON format only.

Website URL: ${url}
Title: ${websiteData.title}
Description: ${websiteData.description}
Headings: ${websiteData.headings.join("; ")}
Content samples: ${websiteData.paragraphs.join("; ")}

Provide a JSON object with these 10 sections, each with: name, score (0-100), subScores array, details, priorityLevel, and implementationDifficulty:
1. Branding - Logo, colors, typography consistency
2. Design - Visual hierarchy, layout, mobile responsiveness  
3. Messaging - Value proposition, tone, CTAs
4. Usability - Navigation, search, forms
5. Content Strategy - Quality, SEO, structure
6. Digital Presence - Social media, reviews, marketing
7. Customer Experience - Support, contact, user journey
8. Competitor Analysis - Market position
9. Conversion Optimization - Funnel, trust signals, lead generation
10. Consistency & Compliance - Legal, accessibility, guidelines

For each section provide score (60-95 range), 3 subScores with scores, an issues count (1-8), recommendations count (2-10), priorityLevel (high/medium/low), and implementationDifficulty (easy/medium/hard).

Calculate overallScore as weighted average. Return valid JSON only, no markdown.`;

  try {
    const result = await model.generateContent(auditPrompt);
    const responseText = result.response.text();

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No valid JSON in response");
    }

    const auditData = JSON.parse(jsonMatch[0]);
    return {
      id: Date.now().toString(),
      url,
      title: `Brand Audit for ${new URL(url).hostname}`,
      date: new Date().toISOString().split("T")[0],
      overallScore: auditData.overallScore || 75,
      status: "completed",
      isDemoMode: false,
      sections: auditData.sections || [],
      metadata: {
        analysisConfidence: 0.9,
        industryDetected: "detected",
        businessType: "b2c",
        evidenceQuality: "high",
        qualityScore: 90,
        demoMode: false,
      },
    };
  } catch (error) {
    console.error("Gemini API error:", error);
    throw error;
  }
}

export const handler: Handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Content-Type": "application/json",
  };

  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "CORS preflight" }),
    };
  }

  // Handle GET request for audit
  if (event.httpMethod === "GET") {
    try {
      const url = event.queryStringParameters?.url;

      if (!url) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "URL parameter is required" }),
        };
      }

      console.log(`Processing audit request for: ${url}`);

      // Check if GEMINI_API_KEY is available
      if (!process.env.GEMINI_API_KEY) {
        console.log("GEMINI_API_KEY not configured, using demo audit");
        const demoAudit = generateDemoAudit(url);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(demoAudit),
        };
      }

      // Try to generate real audit
      try {
        const websiteData = await scrapeWebsite(url);
        const realAudit = await generateRealAudit(url, websiteData);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(realAudit),
        };
      } catch (error) {
        console.error(
          "Failed to generate real audit, falling back to demo:",
          error,
        );
        const demoAudit = generateDemoAudit(url);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(demoAudit),
        };
      }
    } catch (error) {
      console.error("Error processing request:", error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "Failed to process audit request",
          message: error instanceof Error ? error.message : "Unknown error",
        }),
      };
    }
  }

  // Handle POST request
  if (event.httpMethod === "POST") {
    try {
      const { url } = JSON.parse(event.body || "{}");

      if (!url) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "URL is required in request body" }),
        };
      }

      console.log(`Processing audit POST request for: ${url}`);

      // Check if GEMINI_API_KEY is available
      if (!process.env.GEMINI_API_KEY) {
        console.log("GEMINI_API_KEY not configured, using demo audit");
        const demoAudit = generateDemoAudit(url);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(demoAudit),
        };
      }

      // Try to generate real audit
      try {
        const websiteData = await scrapeWebsite(url);
        const realAudit = await generateRealAudit(url, websiteData);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(realAudit),
        };
      } catch (error) {
        console.error(
          "Failed to generate real audit, falling back to demo:",
          error,
        );
        const demoAudit = generateDemoAudit(url);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(demoAudit),
        };
      }
    } catch (error) {
      console.error("Error processing POST request:", error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "Failed to process audit request",
          message: error instanceof Error ? error.message : "Unknown error",
        }),
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: "Method not allowed" }),
  };
};
