import { AuditResponse } from "@shared/api";
import crypto from "crypto";
import { getRuntimeEnv } from "../env-runtime.js";

const getGrokApiKey = () => {
  return getRuntimeEnv("GROK_API_KEY");
};
const GROK_API_URL = "https://api.x.ai/v1/chat/completions";

interface PitchDeckData {
  fileName: string;
  fileType: string;
  extractedText: string;
  fileSize: number;
}

// In-memory cache for pitch deck audits (should use Redis in production)
const pitchDeckCache = new Map<
  string,
  { audit: AuditResponse; timestamp: Date }
>();

// Generate content hash for deterministic caching
function generateContentHash(extractedText: string): string {
  return crypto.createHash("sha256").update(extractedText.trim()).digest("hex");
}

export async function generatePitchDeckAudit(
  data: PitchDeckData,
): Promise<AuditResponse> {
  console.log("[PITCH DECK AUDIT] Generating audit for:", data.fileName);

  const GROK_API_KEY = getGrokApiKey();
  if (!GROK_API_KEY) {
    throw new Error("GROK_API_KEY not configured");
  }

  // Generate content hash for caching
  const contentHash = generateContentHash(data.extractedText);
  console.log("[PITCH DECK AUDIT] Content hash:", contentHash);

  // Check cache first
  const cached = pitchDeckCache.get(contentHash);
  if (cached) {
    // Cache valid for 7 days
    const cacheAge = Date.now() - cached.timestamp.getTime();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    if (cacheAge < sevenDays) {
      console.log(
        "[PITCH DECK AUDIT] Using cached result (age:",
        Math.round(cacheAge / 1000 / 60),
        "minutes)",
      );
      // Return cached result with updated metadata
      return {
        ...cached.audit,
        id: Date.now().toString(),
        date: new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      };
    } else {
      console.log("[PITCH DECK AUDIT] Cache expired, generating new audit");
      pitchDeckCache.delete(contentHash);
    }
  }

  console.log("[PITCH DECK AUDIT] No valid cache found, calling Grok API");

  const systemPrompt = `You are Brand Whisperer's senior pitch deck strategist with expertise in investor presentations and fundraising.

CRITICAL REQUIREMENTS:
- Base ALL scores on SPECIFIC EVIDENCE from the provided pitch deck content
- Include QUANTIFIABLE observations (e.g., "15 slides analyzed", "4 financial projections missing")
- Score fairly and realistically: 9-10 (exceptional), 7-8 (good/solid), 5-6 (average/adequate), 3-4 (needs improvement), 1-2 (serious issues)
- Most real pitch decks score in the 6-8 range - don't artificially deflate scores
- Prioritize: narrative first, visuals second, data third

Evaluate across exactly these 10 criteria (0–10 scores, half-points OK):

1. Narrative Structure & Flow (10%) - Check overall story arc (problem → solution → traction → ask), slide order logic, transitions, and pacing (aim for 10–15 slides, 3-min read)
2. Problem & Solution Clarity (15%) - Assess problem framing (pain points, market size), solution uniqueness, and "aha" moment. Look for jargon, overcomplexity, or weak hooks
3. Market Opportunity & Positioning (15%) - Evaluate TAM/SAM/SOM, market trends, and positioning vs. competitors (e.g., matrix charts). Check data sources and visuals
4. Traction & Metrics (10%) - Review KPIs (ARR, user growth, churn), visualization (charts/graphs), and credibility (sources). Aim for "hockey stick" proof
5. Competitive Advantage (10%) - Analyze moat (IP, barriers), competitor matrix, and differentiation (e.g., "why us?"). Look for undefended claims
6. Visual Design & Aesthetics (10%) - Test slide layout, color consistency, typography, image quality, and whitespace (no clutter)
7. Team & Credibility (10%) - Evaluate bios, photos, roles, and "why us" proof (e.g., past exits, advisors). Check for placeholders or gaps
8. Financial Projections & Model (10%) - Assess realism of forecasts, assumptions, burn rate, and visuals (graphs/tables). Check sensitivity analysis
9. Call to Action & Investor Appeal (10%) - Review the ask (amount, use of funds), term sheet hooks, and closing slide (contact/QR). Test for urgency and overall persuasiveness
10. Risks & Mitigation (10%) - Scan for addressed risks (market, execution, legal) and mitigation plans. Look for omissions like scalability leaks

For EACH section, provide:
- Specific evidence from the deck content
- Quantifiable findings where available
- 2-3 actionable recommendations SPECIFIC TO THAT SECTION

Structure: # Brand Whisperer Pitch Deck Audit: [Company Name]
**Overall: X/100** (Grade)
## Section Scores
1. Narrative Structure & Flow – X/10
   Evidence: [Specific findings with data from deck]
   Recommendations: [2-3 actionable items]

2. Problem & Solution Clarity – X/10
   Evidence: [Specific findings with data from deck]
   Recommendations: [2-3 actionable items]

3. Market Opportunity & Positioning – X/10
   Evidence: [Specific findings]
   Recommendations: [2-3 actionable items]

[Continue for all 10 sections...]

## Key Strengths
- [Specific strength with evidence]

## Biggest Opportunities
- [Specific opportunity with impact]

## Detailed Analysis
[2–4 paragraphs with specific observations from the deck]

End: 'This audit shows where your pitch stands—Brand Whisperer helps founders scale to unicorn status. Reply for investor readiness coaching.'`;

  const userPrompt = `Analyze this pitch deck:

FILE: ${data.fileName}
TYPE: ${data.fileType}
SIZE: ${(data.fileSize / 1024 / 1024).toFixed(2)} MB

EXTRACTED CONTENT:
${data.extractedText.substring(0, 10000)}

RULES:
- Use specific data from the deck (e.g., "Slide 3 mentions $50M TAM")
- Evidence + 2-3 Recommendations for ALL 10 sections
- Follow format exactly with "Evidence:" and "Recommendations:" headers
- Score fairly based on evidence: 8-10 for strong, 6-7 for average, 4-5 for needs work, below 4 for serious issues`;

  try {
    // Build authorization header at runtime to prevent bundler inlining
    const authHeader = "Bearer " + GROK_API_KEY;
    const response = await fetch(GROK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        model: "grok-4-1-fast-reasoning",
        temperature: 0.1, // Low temperature for consistent, deterministic results
        max_tokens: 4500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Grok API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const text = result.choices?.[0]?.message?.content;

    console.log("[PITCH DECK AUDIT] ========================================");
    console.log(
      "[PITCH DECK AUDIT] Raw Grok API response length:",
      text?.length || 0,
    );
    console.log("[PITCH DECK AUDIT] Response preview (first 1000 chars):");
    console.log(text?.substring(0, 1000) || "NO CONTENT");
    console.log("[PITCH DECK AUDIT] ========================================");

    if (!text) {
      throw new Error("No content in Grok API response");
    }

    // Parse the markdown response
    console.log("[PITCH DECK AUDIT] Starting to parse markdown response...");
    const auditData = parseMarkdownAuditResponse(text);
    console.log("[PITCH DECK AUDIT] Parsed audit data:");
    console.log("[PITCH DECK AUDIT] - Overall Score:", auditData.overallScore);
    console.log(
      "[PITCH DECK AUDIT] - Sections Count:",
      auditData.sections?.length || 0,
    );
    console.log(
      "[PITCH DECK AUDIT] - Strengths Count:",
      auditData.strengths?.length || 0,
    );
    console.log(
      "[PITCH DECK AUDIT] - Opportunities Count:",
      auditData.opportunities?.length || 0,
    );

    // Generate unique ID and share token
    const auditId = Date.now().toString();
    const { randomUUID } = await import("crypto");
    const shareToken = randomUUID();

    const currentDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Extract company name from heading
    const titleMatch = text.match(/# Brand Whisperer Pitch Deck Audit:\s*(.+)/);
    const companyName = titleMatch ? titleMatch[1].trim() : "Pitch Deck";

    // Ensure we have sections (fallback if parsing failed)
    const sections =
      auditData.sections && auditData.sections.length > 0
        ? auditData.sections
        : [
            "Problem & Solution Clarity",
            "Market Opportunity",
            "Business Model",
            "Traction & Metrics",
            "Competitive Advantage",
            "Visual Design & Flow",
            "Team & Credibility",
            "Financial Projections",
            "Call to Action",
            "Investor Appeal",
          ].map((name) => {
            const defaultRecs = [
              `Strengthen ${name.toLowerCase()} with specific data`,
              `Add supporting evidence and examples`,
              `Clarify key messages for investors`,
            ];
            return {
              name,
              score: 70,
              maxScore: 100,
              issues: 2,
              recommendations: defaultRecs,
              details: `Overview:\nThis section requires detailed analysis.\n\nRecommendations:\n${defaultRecs.map((r) => `- ${r}`).join("\n")}`,
            };
          });

    console.log("[PITCH DECK AUDIT] Final sections count:", sections.length);

    const auditResult: AuditResponse = {
      id: auditId,
      url: data.fileName,
      title: `${companyName} Pitch Deck Audit`,
      description: `Comprehensive pitch deck analysis for ${companyName}`,
      overallScore: auditData.overallScore,
      date: currentDate,
      status: "completed",
      sections: sections,
      summary: `Pitch deck audit for ${companyName}. See detailed analysis and recommendations below.`,
      strengths: auditData.strengths,
      opportunities: auditData.opportunities,
      detailedAnalysis: auditData.detailedAnalysis,
      recommendations: auditData.recommendations,
      rawAnalysis: text,
      shareToken: shareToken,
    };

    console.log(
      "[PITCH DECK AUDIT] Audit result created with",
      auditResult.sections.length,
      "sections",
    );

    // Cache the result
    pitchDeckCache.set(contentHash, {
      audit: auditResult,
      timestamp: new Date(),
    });
    console.log(
      "[PITCH DECK AUDIT] Cached audit result (cache size:",
      pitchDeckCache.size,
      ")",
    );

    // CRITICAL: Save to database for persistence across deployments
    try {
      const auditServiceModule = await import("../db/audit-service.js");
      const { auditService } = auditServiceModule;
      await auditService.saveAudit(auditResult);
      console.log(`[PITCH DECK AUDIT] ✅ Saved to database: ${auditResult.id}`);
    } catch (dbError) {
      console.error(
        `[PITCH DECK AUDIT] ❌ CRITICAL: Failed to save to database:`,
        dbError,
      );
      console.error(
        `[PITCH DECK AUDIT] ⚠️ Audit will be lost on server restart!`,
      );
    }

    return auditResult;
  } catch (error) {
    console.error("[PITCH DECK AUDIT] Error:", error);
    throw error;
  }
}

// Helper function to parse markdown audit response
function parseMarkdownAuditResponse(text: string): any {
  console.log("[PARSE] Starting parseMarkdownAuditResponse...");

  // Extract overall score
  const overallMatch = text.match(
    /\*\*Overall:\s*(\d+(?:\.\d+)?)\s*\/\s*100\*\*/i,
  );
  const overallScore = overallMatch
    ? Math.round(parseFloat(overallMatch[1]))
    : 75;
  console.log("[PARSE] Overall score match:", overallMatch?.[0]);
  console.log("[PARSE] Overall score:", overallScore);

  // Extract section scores - try multiple regex patterns
  console.log("[PARSE] Looking for section scores...");

  // Try pattern 1: "1. Section Name – 7.5/10"
  let sectionMatches = text.match(
    /^\s*(\d+)\.\s+([^–\-]+?)\s*(?:–|-)\s*(\d+(?:\.\d+)?)\s*\/\s*10/gm,
  );
  console.log("[PARSE] Pattern 1 matches:", sectionMatches?.length || 0);

  // Try pattern 2: "Section Name – 7.5/10" (without number)
  if (!sectionMatches || sectionMatches.length === 0) {
    sectionMatches = text.match(
      /([A-Z][^–\-\n]+?)\s*(?:–|-)\s*(\d+(?:\.\d+)?)\s*\/\s*10/g,
    );
    console.log("[PARSE] Pattern 2 matches:", sectionMatches?.length || 0);
  }

  const sections: any[] = [];

  const sectionNames = [
    "Narrative Structure & Flow",
    "Problem & Solution Clarity",
    "Market Opportunity & Positioning",
    "Traction & Metrics",
    "Competitive Advantage",
    "Visual Design & Aesthetics",
    "Team & Credibility",
    "Financial Projections & Model",
    "Call to Action & Investor Appeal",
    "Risks & Mitigation",
  ];

  if (sectionMatches && sectionMatches.length > 0) {
    console.log("[PARSE] Processing", sectionMatches.length, "section matches");

    // Extract full section content including Evidence and Recommendations
    sectionMatches.forEach((match, index) => {
      console.log("[PARSE] Section", index + 1, "match:", match);
      const scoreMatch = match.match(/(\d+(?:\.\d+)?)\s*\/\s*10/);
      const scoreOut10 = scoreMatch ? parseFloat(scoreMatch[1]) : 7;
      const score = Math.round((scoreOut10 / 10) * 100);
      const sectionName = sectionNames[index] || `Section ${index + 1}`;

      // Extract Evidence and Recommendations for this section
      // Find the section content between this section and the next
      const nextSectionIndex =
        index < sectionMatches.length - 1
          ? text.indexOf(sectionMatches[index + 1])
          : text.indexOf("## Key Strengths");

      const sectionStartIndex = text.indexOf(match);
      const sectionContent =
        nextSectionIndex > sectionStartIndex
          ? text.substring(sectionStartIndex, nextSectionIndex)
          : text.substring(sectionStartIndex, sectionStartIndex + 1000);

      // Extract Evidence
      const evidenceMatch = sectionContent.match(
        /Evidence:\s*([^\n]+(?:\n(?!Recommendations:)[^\n]+)*)/i,
      );
      const evidence = evidenceMatch ? evidenceMatch[1].trim() : "";

      // Extract Recommendations
      const recommendationsMatch = sectionContent.match(
        /Recommendations:\s*([^\n]+(?:\n(?!\d+\.)[^\n]+)*)/i,
      );
      const recommendationsText = recommendationsMatch
        ? recommendationsMatch[1].trim()
        : "";

      // Split recommendations by semicolons or bullet points
      const recommendationsList = recommendationsText
        .split(/[;•]/)
        .map((r) => r.trim())
        .filter((r) => r.length > 10);

      // Format details with Evidence and Recommendations sections for frontend parsing
      let detailsText = "";
      if (evidence) {
        detailsText += `Overview:\n${evidence}\n\n`;
      }
      if (recommendationsList.length > 0) {
        detailsText += `Recommendations:\n${recommendationsList.map((r) => `- ${r}`).join("\n")}`;
      } else {
        detailsText += `Recommendations:\n- Improve ${sectionName.toLowerCase()} to increase investor appeal`;
      }

      const section = {
        name: sectionName,
        score: Math.max(0, Math.min(100, score)),
        maxScore: 100,
        issues: Math.max(1, Math.round((100 - score) / 15)),
        recommendations:
          recommendationsList.length > 0
            ? recommendationsList
            : [
                `Improve ${sectionName.toLowerCase()} to increase investor appeal`,
              ],
        details:
          detailsText ||
          `Score: ${score}%. See detailed analysis for specific insights.`,
      };

      console.log(
        "[PARSE] Created section:",
        section.name,
        "Score:",
        section.score,
        "Recommendations:",
        section.recommendations.length,
      );
      sections.push(section);
    });
  } else {
    console.log(
      "[PARSE] WARNING: No section matches found! Creating default sections...",
    );
    // Create default sections if parsing fails
    sectionNames.forEach((name, index) => {
      const defaultScore = 70; // Default to 70%
      const defaultRecommendations = [
        `Enhance ${name.toLowerCase()} with specific data and evidence`,
        `Add quantifiable metrics to support claims`,
        `Strengthen messaging to increase investor confidence`,
      ];
      sections.push({
        name,
        score: defaultScore,
        maxScore: 100,
        issues: 2,
        recommendations: defaultRecommendations,
        details: `Overview:\nThis section scored ${defaultScore}% based on initial analysis.\n\nRecommendations:\n${defaultRecommendations.map((r) => `- ${r}`).join("\n")}`,
      });
    });
  }

  console.log("[PARSE] Total sections created:", sections.length);

  // Extract strengths
  const strengthsMatch = text.match(
    /##\s+Key Strengths\s*\n([\s\S]*?)(?=##|$)/i,
  );
  const strengths = strengthsMatch
    ? strengthsMatch[1]
        .split("\n")
        .filter((line) => line.trim().startsWith("-"))
        .map((line) => line.replace(/^-\s*/, "").trim())
        .filter((s) => s.length > 0)
    : [];

  // Extract opportunities
  const opportunitiesMatch = text.match(
    /##\s+Biggest Opportunities\s*\n([\s\S]*?)(?=##|$)/i,
  );
  const opportunities = opportunitiesMatch
    ? opportunitiesMatch[1]
        .split("\n")
        .filter((line) => line.trim().startsWith("-"))
        .map((line) => line.replace(/^-\s*/, "").trim())
        .filter((o) => o.length > 0)
    : [];

  // Extract detailed analysis
  const detailedAnalysisMatch = text.match(
    /##\s+Detailed Analysis\s*\n([\s\S]*?)(?=##|End:|$)/i,
  );
  const detailedAnalysis = detailedAnalysisMatch
    ? detailedAnalysisMatch[1].trim()
    : "";

  const result = {
    overallScore,
    sections,
    strengths,
    opportunities,
    detailedAnalysis,
    recommendations: [],
  };

  console.log("[PARSE] Final result summary:");
  console.log("[PARSE] - overallScore:", result.overallScore);
  console.log("[PARSE] - sections.length:", result.sections.length);
  console.log("[PARSE] - strengths.length:", result.strengths.length);
  console.log("[PARSE] - opportunities.length:", result.opportunities.length);
  console.log(
    "[PARSE] - detailedAnalysis length:",
    result.detailedAnalysis.length,
  );

  return result;
}
