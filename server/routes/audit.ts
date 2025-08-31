import { RequestHandler } from "express";
import axios from "axios";
import * as cheerio from "cheerio";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { AuditRequest, AuditResponse } from "@shared/api";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// In-memory storage for audit results (shared with audit-storage.ts)
// In production, this would be replaced with a proper database
const auditStorage = new Map<string, AuditResponse>();

// Utility function to store audit
async function storeAuditResult(auditData: AuditResponse): Promise<void> {
  try {
    auditStorage.set(auditData.id, auditData);
    console.log(`Stored audit ${auditData.id} for sharing`);
  } catch (error) {
    console.warn("Error storing audit for sharing:", error);
    // Don't throw - storage failure shouldn't break audit creation
  }
}

// Export the storage for use in audit-storage.ts
export { auditStorage };

// Function to create fallback website data when scraping fails
function createFallbackData(url: string) {
  const domain = new URL(url).hostname.replace("www.", "");
  const companyName =
    domain.split(".")[0].charAt(0).toUpperCase() +
    domain.split(".")[0].slice(1);

  return {
    title: `${companyName} - Website Analysis`,
    description: `Brand audit analysis for ${domain}`,
    headings: [`Welcome to ${companyName}`, "About Us", "Services", "Contact"],
    paragraphs: [
      `This is a brand audit analysis for ${domain}.`,
      `${companyName} appears to be a business website that may contain various sections and content.`,
      "The website structure and content will be analyzed based on common web patterns and best practices.",
      "This analysis focuses on brand consistency, user experience, and overall digital presence.",
    ],
    images: ["company logo", "hero image", "product images"],
    links: ["Home", "About", "Services", "Contact", "Privacy Policy"],
    navigation: "Home About Services Contact",
    footer: "Copyright information and contact details",
    brandElements: `${companyName} branding elements`,
    htmlLength: 0,
    url,
    fallbackUsed: true,
    // Limited fallback data for UX analysis
    performance: {
      pageSizeKB: 0,
      hasSSL: url.startsWith('https://'),
      redirectCount: 0,
      responseTime: 0,
      mobileViewport: false,
      hasServiceWorker: false,
    },
    siteStructure: {
      discoveredPages: [],
      navigation: {
        mainNav: "Limited access",
        breadcrumbs: "",
        footer: "",
        menuItems: ["Home", "About", "Services", "Contact"],
        hasSearch: false,
        hasLanguageSelector: false,
      },
      contentStructure: {
        headingLevels: [],
        sections: [],
        hasContactInfo: true,
        hasAboutPage: true,
        hasBlog: false,
        hasProducts: false,
      },
      pageCount: 0,
    },
    uxFeatures: {
      forms: { count: 0, hasLabels: false, hasValidation: false, hasContactForm: false },
      accessibility: { hasAltText: false, missingAltText: 0, hasSkipLinks: false, hasAriaLabels: false, headingStructure: false },
      interactivity: { buttons: 0, dropdowns: 0, modals: 0, carousels: 0 },
      media: { images: 0, videos: 0, hasLazyLoading: false },
      social: { socialLinks: 0, hasSocialSharing: false }
    },
    analysisDepth: 'limited',
  };
}

// Function to analyze website performance and UX metrics
async function analyzeWebsitePerformance(url: string) {
  try {
    const performanceData = {
      pageSizeKB: 0,
      hasSSL: false,
      redirectCount: 0,
      responseTime: 0,
      mobileViewport: false,
      hasServiceWorker: false,
    };

    const startTime = Date.now();
    const response = await axios.get(url, {
      timeout: 10000,
      maxRedirects: 5,
      validateStatus: (status) => status < 500,
    });
    const endTime = Date.now();

    performanceData.responseTime = endTime - startTime;
    performanceData.pageSizeKB = Math.round(response.data.length / 1024);
    performanceData.hasSSL = url.startsWith('https://');
    performanceData.redirectCount = response.request._redirectCount || 0;

    // Check for mobile viewport and other UX indicators
    const $ = cheerio.load(response.data);
    performanceData.mobileViewport = $('meta[name="viewport"]').length > 0;
    performanceData.hasServiceWorker = response.data.includes('serviceWorker') || response.data.includes('sw.js');

    return performanceData;
  } catch (error) {
    console.warn('Performance analysis failed:', error);
    return {
      pageSizeKB: 0,
      hasSSL: url.startsWith('https://'),
      redirectCount: 0,
      responseTime: 0,
      mobileViewport: false,
      hasServiceWorker: false,
    };
  }
}

// Function to discover and analyze site structure
async function analyzeSiteStructure(baseUrl: string, html: string) {
  const $ = cheerio.load(html);

  // Extract all internal links
  const links = new Set<string>();
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (href && !href.startsWith('http') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
      try {
        const fullUrl = new URL(href, baseUrl).href;
        if (fullUrl.includes(new URL(baseUrl).hostname)) {
          links.add(fullUrl);
        }
      } catch (e) {
        // Invalid URL, skip
      }
    }
  });

  // Analyze navigation structure
  const navigation = {
    mainNav: $('nav, .nav, .navbar, .navigation').first().text().trim(),
    breadcrumbs: $('.breadcrumb, .breadcrumbs').text().trim(),
    footer: $('footer').text().trim(),
    menuItems: [] as string[],
    hasSearch: $('input[type="search"], [role="search"], .search').length > 0,
    hasLanguageSelector: $('[lang], .language, .lang').length > 0,
  };

  // Extract menu structure
  $('nav a, .nav a, .navbar a, .menu a').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 0 && text.length < 50) {
      navigation.menuItems.push(text);
    }
  });

  // Analyze page structure and content organization
  const contentStructure = {
    headingLevels: [] as string[],
    sections: [] as string[],
    hasContactInfo: false,
    hasAboutPage: false,
    hasBlog: false,
    hasProducts: false,
  };

  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    contentStructure.headingLevels.push($(el).prop('tagName').toLowerCase());
  });

  $('section, .section, article, .article').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 0) {
      contentStructure.sections.push(text.substring(0, 100));
    }
  });

  // Check for common page types
  const pageText = $.text().toLowerCase();
  contentStructure.hasContactInfo = /contact|phone|email|address/.test(pageText);
  contentStructure.hasAboutPage = /about|our story|who we are/.test(pageText);
  contentStructure.hasBlog = /blog|news|articles/.test(pageText);
  contentStructure.hasProducts = /product|service|shop|buy/.test(pageText);

  return {
    discoveredPages: Array.from(links).slice(0, 10), // Limit for performance
    navigation,
    contentStructure,
    pageCount: links.size,
  };
}

// Function to analyze UX and accessibility features
async function analyzeUXFeatures(html: string) {
  const $ = cheerio.load(html);

  return {
    forms: {
      count: $('form').length,
      hasLabels: $('label').length > 0,
      hasValidation: $('[required], .required').length > 0,
      hasContactForm: $('form').text().toLowerCase().includes('contact'),
    },
    accessibility: {
      hasAltText: $('img[alt]').length > 0,
      missingAltText: $('img').length - $('img[alt]').length,
      hasSkipLinks: $('[href="#content"], [href="#main"]').length > 0,
      hasAriaLabels: $('[aria-label], [aria-labelledby]').length > 0,
      headingStructure: $('h1').length === 1, // Should have exactly one H1
    },
    interactivity: {
      buttons: $('button, input[type="button"], input[type="submit"]').length,
      dropdowns: $('select, .dropdown').length,
      modals: $('[data-modal], .modal').length,
      carousels: $('[data-carousel], .carousel, .slider').length,
    },
    media: {
      images: $('img').length,
      videos: $('video, iframe[src*="youtube"], iframe[src*="vimeo"]').length,
      hasLazyLoading: $('[loading="lazy"], [data-src]').length > 0,
    },
    social: {
      socialLinks: $('[href*="facebook"], [href*="twitter"], [href*="linkedin"], [href*="instagram"]').length,
      hasSocialSharing: $('.share, .social-share').length > 0,
    }
  };
}

// Function to scrape website content with retry logic and fallback
async function scrapeWebsite(url: string) {
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  ];

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      console.log(`Attempt ${attempt + 1} to scrape ${url}`);

      const response = await axios.get(url, {
        timeout: 8000, // Reduced timeout per attempt
        maxRedirects: 3,
        validateStatus: (status) => status < 500, // Accept 4xx but not 5xx errors
        headers: {
          "User-Agent": userAgents[attempt % userAgents.length],
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          "Accept-Encoding": "gzip, deflate, br",
          DNT: "1",
          Connection: "keep-alive",
          "Upgrade-Insecure-Requests": "1",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Cache-Control": "max-age=0",
        },
      });

      if (response.status >= 400) {
        console.log(
          `HTTP ${response.status} for ${url}, attempting with different user agent...`,
        );
        if (attempt === 2) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        continue;
      }

      const $ = cheerio.load(response.data);

      // Extract key elements
      const title = $("title").text() || "";
      const description = $('meta[name="description"]').attr("content") || "";
      const headings = $("h1, h2, h3")
        .map((_, el) => $(el).text())
        .get();
      const paragraphs = $("p")
        .map((_, el) => $(el).text())
        .get()
        .slice(0, 10);
      const images = $("img")
        .map((_, el) => $(el).attr("alt") || "")
        .get();
      const links = $("a")
        .map((_, el) => $(el).text())
        .get()
        .slice(0, 20);

      // Extract navigation and menu items
      const navigation = $("nav, .nav, .menu, .navbar").text();

      // Extract footer content
      const footer = $("footer").text();

      // Extract any brand-related elements
      const brandElements = $(".logo, .brand, #logo, #brand").text();

      console.log(
        `Successfully scraped ${url}. Title: "${title.slice(0, 50)}..."`,
      );

      // Perform comprehensive analysis
      const performanceData = await analyzeWebsitePerformance(url);
      const siteStructure = await analyzeSiteStructure(url, response.data);
      const uxFeatures = await analyzeUXFeatures(response.data);

      return {
        title: title.trim(),
        description: description.trim(),
        headings: headings.filter((h) => h.trim().length > 0),
        paragraphs: paragraphs.filter((p) => p.trim().length > 0),
        images: images.filter((alt) => alt.trim().length > 0),
        links: links.filter((l) => l.trim().length > 0),
        navigation: navigation.trim(),
        footer: footer.trim(),
        brandElements: brandElements.trim(),
        htmlLength: response.data.length,
        url,
        fallbackUsed: false,
        // Enhanced UX analysis data
        performance: performanceData,
        siteStructure: siteStructure,
        uxFeatures: uxFeatures,
        analysisDepth: 'comprehensive',
      };
    } catch (error) {
      console.error(
        `Attempt ${attempt + 1} failed for ${url}:`,
        error instanceof Error ? error.message : error,
      );

      if (attempt === 2) {
        // Final attempt failed, use fallback data but still analyze
        console.log(
          `All scraping attempts failed for ${url}, using fallback data for analysis`,
        );
        return createFallbackData(url);
      }

      // Wait before retrying (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 1000));
    }
  }

  // This should never be reached, but just in case
  return createFallbackData(url);
}

// Function to generate audit using Gemini
async function generateAudit(websiteData: any): Promise<AuditResponse> {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
As a professional brand and UX auditor, analyze the following website data and provide a comprehensive brand audit.

${
  websiteData.fallbackUsed
    ? "NOTE: Limited data available due to website access restrictions. This analysis is based on URL structure and general web best practices."
    : "This analysis is based on extracted website content."
}

Website Data:
- URL: ${websiteData.url}
- Title: ${websiteData.title}
- Description: ${websiteData.description}
- Headings: ${websiteData.headings.join(", ")}
- Content Sample: ${websiteData.paragraphs.slice(0, 5).join(" ")}
- Navigation: ${websiteData.navigation}
- Footer: ${websiteData.footer}
- Brand Elements: ${websiteData.brandElements}
- Data Source: ${websiteData.fallbackUsed ? "Fallback Analysis" : "Live Website Scraping"}

Please provide a detailed analysis covering these 6 key areas:

1. **Brand Consistency** (Score 0-100): Evaluate logo placement, color scheme consistency, typography consistency, brand voice, and messaging alignment.

2. **User Experience (UX)** (Score 0-100): Analyze navigation clarity, page load considerations, mobile responsiveness indicators, accessibility features, and user journey flow.

3. **Visual Design** (Score 0-100): Assess visual hierarchy, color usage, typography choices, white space usage, and overall aesthetic appeal.

4. **Content Quality** (Score 0-100): Evaluate content clarity, messaging effectiveness, call-to-action strength, information architecture, and content relevance.

5. **SEO & Performance** (Score 0-100): Review title tag optimization, meta description quality, heading structure, content structure, and technical SEO elements visible in the HTML.

6. **Security & Compliance** (Score 0-100): Check for HTTPS usage, privacy policy presence, contact information availability, and professional credibility indicators.

For each section, provide:
- A numerical score (0-100)
- Number of issues found (estimate based on analysis)
- Number of recommendations (estimate based on issues)
- Detailed explanation of findings and specific recommendations

Also provide:
- An overall score (average of all sections)
- A brief summary of the website's strengths and key areas for improvement
- A professional title for this audit report

Respond in this exact JSON format:
{
  "title": "Professional audit title",
  "description": "Brief description of the audit scope",
  "overallScore": 75,
  "sections": [
    {
      "name": "Brand Consistency",
      "score": 85,
      "maxScore": 100,
      "issues": 3,
      "recommendations": 5,
      "details": "Detailed analysis and recommendations for this section..."
    }
  ],
  "summary": "Overall assessment and key recommendations..."
}

Be thorough, professional, and provide actionable insights based on the available data.
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse the JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in AI response:", text);
      throw new Error("Invalid response format from AI service");
    }

    let auditData;
    try {
      auditData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Raw AI response:", text);
      throw new Error("Failed to parse AI response");
    }

    // Validate required fields
    if (
      !auditData.title ||
      !auditData.sections ||
      !Array.isArray(auditData.sections)
    ) {
      console.error("Invalid audit data structure:", auditData);
      throw new Error("Invalid audit response structure");
    }

    // Generate a unique ID and add metadata
    const auditId = Date.now().toString();
    const currentDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    return {
      id: auditId,
      url: websiteData.url,
      title: auditData.title,
      description: auditData.description,
      overallScore: auditData.overallScore,
      date: currentDate,
      status: "completed",
      sections: auditData.sections,
      summary: auditData.summary,
    };
  } catch (error) {
    console.error("Error generating audit:", error);
    throw new Error("Failed to generate audit analysis. Please try again.");
  }
}

export const handleAudit: RequestHandler = async (req, res) => {
  try {
    // Check if Gemini API key is configured
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
      return res
        .status(400)
        .json({
          error:
            "Invalid URL format. Please enter a valid URL starting with http:// or https://",
        });
    }

    console.log("Starting audit for URL:", url);

    // Step 1: Scrape website content
    const websiteData = await scrapeWebsite(url);
    if (websiteData.fallbackUsed) {
      console.log("Using fallback data for analysis due to scraping issues");
    } else {
      console.log(
        "Website data extracted successfully. Title:",
        websiteData.title,
      );
    }

    // Step 2: Generate audit using Gemini AI
    const auditResult = await generateAudit(websiteData);
    console.log(
      "Audit generated successfully. Overall score:",
      auditResult.overallScore,
    );

    // Step 3: Store audit result for sharing
    await storeAuditResult(auditResult);

    // Ensure response headers are set correctly
    res.setHeader("Content-Type", "application/json");
    res.status(200).json(auditResult);
  } catch (error) {
    console.error("Audit error:", error);

    // Provide more specific error messages
    let errorMessage = "Internal server error";
    if (error instanceof Error) {
      if (
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

    res.status(500).json({ error: errorMessage });
  }
};

export const handleDemoAudit: RequestHandler = async (req, res) => {
  try {
    const { url } = req.body as AuditRequest;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    console.log("Creating demo audit for:", url);

    // Create demo audit result instantly
    const domain = new URL(url).hostname.replace("www.", "");
    const companyName =
      domain.split(".")[0].charAt(0).toUpperCase() +
      domain.split(".")[0].slice(1);

    const demoAudit: AuditResponse = {
      id: Date.now().toString(),
      url: url,
      title: `${companyName} Brand Audit Report`,
      description: `Comprehensive brand analysis and recommendations for ${domain}`,
      overallScore: Math.floor(Math.random() * 30) + 60, // Random score between 60-90
      date: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      status: "completed",
      sections: [
        {
          name: "Brand Consistency",
          score: Math.floor(Math.random() * 20) + 75,
          maxScore: 100,
          issues: Math.floor(Math.random() * 5) + 2,
          recommendations: Math.floor(Math.random() * 6) + 4,
          details: `The ${companyName} brand shows good consistency across key elements. The logo placement and color scheme maintain coherence throughout the website. However, there are opportunities to strengthen brand voice and messaging alignment to create a more unified brand experience.`,
        },
        {
          name: "User Experience (UX)",
          score: Math.floor(Math.random() * 25) + 65,
          maxScore: 100,
          issues: Math.floor(Math.random() * 6) + 3,
          recommendations: Math.floor(Math.random() * 7) + 5,
          details: `The user experience shows promise with clear navigation elements. The website structure facilitates basic user journeys, though improvements in mobile responsiveness and accessibility features would enhance overall usability. Consider implementing more intuitive user flow patterns.`,
        },
        {
          name: "Visual Design",
          score: Math.floor(Math.random() * 20) + 70,
          maxScore: 100,
          issues: Math.floor(Math.random() * 4) + 2,
          recommendations: Math.floor(Math.random() * 5) + 3,
          details: `The visual design demonstrates solid foundations with appropriate use of whitespace and typography. The color palette supports brand recognition, though there are opportunities to enhance visual hierarchy and create more engaging aesthetic elements.`,
        },
        {
          name: "Content Quality",
          score: Math.floor(Math.random() * 25) + 55,
          maxScore: 100,
          issues: Math.floor(Math.random() * 8) + 5,
          recommendations: Math.floor(Math.random() * 9) + 7,
          details: `Content clarity varies across different sections of the website. While some messaging is effective, there are opportunities to strengthen call-to-action elements and improve information architecture for better user engagement and conversion.`,
        },
        {
          name: "SEO & Performance",
          score: Math.floor(Math.random() * 30) + 50,
          maxScore: 100,
          issues: Math.floor(Math.random() * 7) + 4,
          recommendations: Math.floor(Math.random() * 8) + 6,
          details: `Technical SEO elements need attention. Title tags and meta descriptions could be optimized for better search engine visibility. The website structure shows potential but requires improvements in heading hierarchy and content optimization.`,
        },
        {
          name: "Security & Compliance",
          score: Math.floor(Math.random() * 20) + 75,
          maxScore: 100,
          issues: Math.floor(Math.random() * 3) + 1,
          recommendations: Math.floor(Math.random() * 4) + 2,
          details: `Security measures appear adequate with HTTPS implementation. Privacy policy and contact information are accessible. Further enhancements in compliance documentation and trust signals would strengthen user confidence.`,
        },
      ],
      summary: `${companyName} demonstrates solid brand fundamentals with clear opportunities for enhancement. The website shows promise in brand consistency and visual design, while areas like content quality and SEO performance would benefit from focused improvements. Implementing the recommended changes would significantly strengthen the overall digital brand presence and user experience.`,
    };

    // Recalculate overall score based on section scores
    const avgScore = Math.round(
      demoAudit.sections.reduce((sum, section) => sum + section.score, 0) /
        demoAudit.sections.length,
    );
    demoAudit.overallScore = avgScore;

    // Store demo audit result for sharing
    await storeAuditResult(demoAudit);

    console.log("Demo audit created successfully");
    res.status(200).json(demoAudit);
  } catch (error) {
    console.error("Demo audit error:", error);
    res.status(500).json({
      error: "Failed to create demo audit",
    });
  }
};
