import type { Handler } from "@netlify/functions";
import axios from "axios";
import * as cheerio from "cheerio";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(Netlify.env.get("GEMINI_API_KEY") || "");

// In-memory storage for audit results
const auditStorage = new Map<string, any>();

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
    performance: {
      pageSizeKB: 0,
      hasSSL: url.startsWith("https://"),
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
      forms: {
        count: 0,
        hasLabels: false,
        hasValidation: false,
        hasContactForm: false,
      },
      accessibility: {
        hasAltText: false,
        missingAltText: 0,
        hasSkipLinks: false,
        hasAriaLabels: false,
        headingStructure: false,
      },
      interactivity: { buttons: 0, dropdowns: 0, modals: 0, carousels: 0 },
      media: { images: 0, videos: 0, hasLazyLoading: false },
      social: { socialLinks: 0, hasSocialSharing: false },
    },
    analysisDepth: "limited",
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
      timeout: 6000,
      maxRedirects: 5,
      validateStatus: (status) => status < 500,
    });
    const endTime = Date.now();

    performanceData.responseTime = endTime - startTime;
    performanceData.pageSizeKB = Math.round(response.data.length / 1024);
    performanceData.hasSSL = url.startsWith("https://");
    performanceData.redirectCount = response.request._redirectCount || 0;

    // Check for mobile viewport and other UX indicators
    const $ = cheerio.load(response.data);
    performanceData.mobileViewport = $('meta[name="viewport"]').length > 0;
    performanceData.hasServiceWorker =
      response.data.includes("serviceWorker") ||
      response.data.includes("sw.js");

    return performanceData;
  } catch (error) {
    console.warn("Performance analysis failed:", error);
    return {
      pageSizeKB: 0,
      hasSSL: url.startsWith("https://"),
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
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (
      href &&
      !href.startsWith("http") &&
      !href.startsWith("mailto:") &&
      !href.startsWith("tel:")
    ) {
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
    mainNav: $("nav, .nav, .navbar, .navigation").first().text().trim(),
    breadcrumbs: $(".breadcrumb, .breadcrumbs").text().trim(),
    footer: $("footer").text().trim(),
    menuItems: [] as string[],
    hasSearch: $('input[type="search"], [role="search"], .search').length > 0,
    hasLanguageSelector: $("[lang], .language, .lang").length > 0,
  };

  // Extract menu structure
  $("nav a, .nav a, .navbar a, .menu a").each((_, el) => {
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

  $("h1, h2, h3, h4, h5, h6").each((_, el) => {
    contentStructure.headingLevels.push($(el).prop("tagName").toLowerCase());
  });

  $("section, .section, article, .article").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 0) {
      contentStructure.sections.push(text.substring(0, 100));
    }
  });

  // Check for common page types
  const pageText = $.text().toLowerCase();
  contentStructure.hasContactInfo = /contact|phone|email|address/.test(
    pageText,
  );
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
      count: $("form").length,
      hasLabels: $("label").length > 0,
      hasValidation: $("[required], .required").length > 0,
      hasContactForm: $("form").text().toLowerCase().includes("contact"),
    },
    accessibility: {
      hasAltText: $("img[alt]").length > 0,
      missingAltText: $("img").length - $("img[alt]").length,
      hasSkipLinks: $('[href="#content"], [href="#main"]').length > 0,
      hasAriaLabels: $("[aria-label], [aria-labelledby]").length > 0,
      headingStructure: $("h1").length === 1, // Should have exactly one H1
    },
    interactivity: {
      buttons: $('button, input[type="button"], input[type="submit"]').length,
      dropdowns: $("select, .dropdown").length,
      modals: $("[data-modal], .modal").length,
      carousels: $("[data-carousel], .carousel, .slider").length,
    },
    media: {
      images: $("img").length,
      videos: $('video, iframe[src*="youtube"], iframe[src*="vimeo"]').length,
      hasLazyLoading: $('[loading="lazy"], [data-src]').length > 0,
    },
    social: {
      socialLinks: $(
        '[href*="facebook"], [href*="twitter"], [href*="linkedin"], [href*="instagram"]',
      ).length,
      hasSocialSharing: $(".share, .social-share").length > 0,
    },
  };
}

// Function to perform comprehensive multi-page crawling
async function crawlMultiplePages(
  baseUrl: string,
  discoveredPages: string[],
  maxPages: number = 6,
) {
  const crawlResults: any[] = [];
  const userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  // Prioritize important pages
  const priorityPages = discoveredPages.filter((url) => {
    const path = url.toLowerCase();
    return (
      path.includes("/about") ||
      path.includes("/contact") ||
      path.includes("/services") ||
      path.includes("/products") ||
      path.includes("/pricing") ||
      path.includes("/blog") ||
      path.includes("/home")
    );
  });

  // Combine priority pages with others, limit total
  const pagesToCrawl = [
    ...new Set([...priorityPages, ...discoveredPages]),
  ].slice(0, maxPages);
  console.log(`Starting multi-page crawl for ${pagesToCrawl.length} pages`);

  const concurrency = Math.min(3, pagesToCrawl.length);
  let index = 0;

  async function worker(workerId: number) {
    while (index < pagesToCrawl.length) {
      const i = index++;
      const pageUrl = pagesToCrawl[i];
      if (!pageUrl) break;

      try {
        console.log(
          `Worker ${workerId} crawling ${i + 1}/${pagesToCrawl.length}: ${pageUrl}`,
        );
        // Small stagger between requests
        await new Promise((r) => setTimeout(r, workerId * 200));

        const response = await axios.get(pageUrl, {
          timeout: 5000,
          maxRedirects: 3,
          validateStatus: (status) => status < 500,
          headers: {
            "User-Agent": userAgent,
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Cache-Control": "max-age=0",
          },
        });

        if (response.status >= 400) {
          console.log(`Skipping ${pageUrl} - HTTP ${response.status}`);
          continue;
        }

        const $ = cheerio.load(response.data);

        const pageAnalysis = {
          url: pageUrl,
          title: $("title").text().trim(),
          description: $('meta[name="description"]').attr("content") || "",
          headings: {
            h1: $("h1")
              .map((_, el) => $(el).text().trim())
              .get(),
            h2: $("h2")
              .map((_, el) => $(el).text().trim())
              .get(),
            h3: $("h3")
              .map((_, el) => $(el).text().trim())
              .get(),
          },
          contentLength: $.text().length,
          images: {
            total: $("img").length,
            withAlt: $("img[alt]").length,
            missingAlt: $("img").length - $("img[alt]").length,
          },
          links: {
            internal: $("a[href]").filter((_, el) => {
              const href = $(el).attr("href");
              return (
                href && !href.startsWith("http") && !href.startsWith("mailto:")
              );
            }).length,
            external: $("a[href]").filter((_, el) => {
              const href = $(el).attr("href");
              return (
                href &&
                href.startsWith("http") &&
                !href.includes(new URL(baseUrl).hostname)
              );
            }).length,
          },
          forms: {
            count: $("form").length,
            hasLabels: $("label").length > 0,
            hasValidation: $("[required], .required").length > 0,
          },
          navigation: {
            breadcrumbs: $(
              '.breadcrumb, .breadcrumbs, [aria-label*="breadcrumb"]',
            )
              .text()
              .trim(),
            mainNav: $("nav, .nav, .navbar").first().text().trim(),
          },
          brandElements: {
            logo: $('.logo, .brand, #logo, #brand, [alt*="logo"]').length > 0,
            colorScheme: $('[style*="color"], [class*="color-"]').length > 0,
            fonts: $('[style*="font"], [class*="font-"]').length > 0,
          },
          pageType: determinePageType(pageUrl, $.text()),
          loadTime: Date.now(),
          socialElements: {
            socialLinks: $(
              '[href*="facebook"], [href*="twitter"], [href*="linkedin"], [href*="instagram"]',
            ).length,
            shareButtons: $(".share, .social-share, [data-share]").length,
          },
        };

        crawlResults.push(pageAnalysis);
      } catch (error) {
        console.warn(
          `Failed to crawl ${pageUrl}:`,
          error instanceof Error ? error.message : error,
        );
      }
    }
  }

  await Promise.all(
    Array.from({ length: concurrency }, (_, i) => worker(i + 1)),
  );

  console.log(`Completed crawling ${crawlResults.length} pages successfully`);
  return crawlResults;
}

// Helper function to determine page type
function determinePageType(url: string, content: string): string {
  const path = url.toLowerCase();
  const text = content.toLowerCase();

  if (path.includes("/about") || text.includes("about us")) return "about";
  if (path.includes("/contact") || text.includes("contact us"))
    return "contact";
  if (path.includes("/services") || text.includes("our services"))
    return "services";
  if (path.includes("/products") || text.includes("products"))
    return "products";
  if (path.includes("/pricing") || text.includes("pricing")) return "pricing";
  if (path.includes("/blog") || path.includes("/news")) return "blog";
  if (path === "/" || path.includes("/home")) return "homepage";

  return "other";
}

// Function to analyze cross-page consistency
function analyzeCrossPageConsistency(crawlResults: any[]) {
  if (crawlResults.length < 2) {
    return {
      brandConsistency: {
        score: 50,
        issues: ["Insufficient pages analyzed for consistency check"],
      },
      navigationConsistency: {
        score: 50,
        issues: ["Limited navigation analysis"],
      },
      contentConsistency: { score: 50, issues: ["Single page analysis only"] },
    };
  }

  const analysis = {
    brandConsistency: {
      score: 85,
      issues: [] as string[],
      recommendations: [] as string[],
    },
    navigationConsistency: {
      score: 80,
      issues: [] as string[],
      recommendations: [] as string[],
    },
    contentConsistency: {
      score: 75,
      issues: [] as string[],
      recommendations: [] as string[],
    },
  };

  // Check logo consistency
  const pagesWithLogo = crawlResults.filter(
    (page) => page.brandElements.logo,
  ).length;
  const logoConsistency = (pagesWithLogo / crawlResults.length) * 100;

  if (logoConsistency < 80) {
    analysis.brandConsistency.score -= 15;
    analysis.brandConsistency.issues.push(
      "Logo not consistently present across all pages",
    );
    analysis.brandConsistency.recommendations.push(
      "Ensure logo appears on all pages for brand recognition",
    );
  }

  // Check navigation consistency
  const uniqueNavs = new Set(
    crawlResults.map((page) => page.navigation.mainNav),
  ).size;
  if (uniqueNavs > 2) {
    // Allow for some variation
    analysis.navigationConsistency.score -= 20;
    analysis.navigationConsistency.issues.push(
      "Navigation structure varies significantly between pages",
    );
    analysis.navigationConsistency.recommendations.push(
      "Standardize navigation menu across all pages",
    );
  }

  // Check title tag patterns
  const titlePatterns = crawlResults.map((page) => {
    const title = page.title;
    return title.includes("|") || title.includes("-") ? "structured" : "simple";
  });
  const consistentTitles = titlePatterns.filter(
    (p) => p === titlePatterns[0],
  ).length;

  if (consistentTitles / crawlResults.length < 0.8) {
    analysis.contentConsistency.score -= 10;
    analysis.contentConsistency.issues.push(
      "Title tag format inconsistent across pages",
    );
    analysis.contentConsistency.recommendations.push(
      'Establish consistent title tag pattern (e.g., "Page Title | Brand Name")',
    );
  }

  // Check heading structure consistency
  const pagesWithH1 = crawlResults.filter(
    (page) => page.headings.h1.length > 0,
  ).length;
  if (pagesWithH1 / crawlResults.length < 0.9) {
    analysis.contentConsistency.score -= 15;
    analysis.contentConsistency.issues.push("Some pages missing H1 headings");
    analysis.contentConsistency.recommendations.push(
      "Ensure every page has exactly one H1 heading",
    );
  }

  return analysis;
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
        timeout: 8000,
        maxRedirects: 3,
        validateStatus: (status) => status < 500,
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

      // Perform multi-page crawling
      console.log("Starting comprehensive multi-page crawling...");
      const multiPageResults = await crawlMultiplePages(
        url,
        siteStructure.discoveredPages,
        8,
      );
      const crossPageAnalysis = analyzeCrossPageConsistency(multiPageResults);

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
        // Multi-page crawling results
        multiPageAnalysis: {
          pagesAnalyzed: multiPageResults.length,
          pageDetails: multiPageResults,
          crossPageConsistency: crossPageAnalysis,
          totalContentLength: multiPageResults.reduce(
            (sum, page) => sum + page.contentLength,
            0,
          ),
          avgImagesPerPage:
            multiPageResults.length > 0
              ? multiPageResults.reduce(
                  (sum, page) => sum + page.images.total,
                  0,
                ) / multiPageResults.length
              : 0,
          avgFormsPerPage:
            multiPageResults.length > 0
              ? multiPageResults.reduce(
                  (sum, page) => sum + page.forms.count,
                  0,
                ) / multiPageResults.length
              : 0,
          pageTypes: multiPageResults.map((page) => ({
            url: page.url,
            type: page.pageType,
          })),
        },
        analysisDepth: "comprehensive-multipage",
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

// Function to detect business type and industry
function detectBusinessContext(websiteData: any) {
  const { title, description, headings, paragraphs, navigation, url } = websiteData;
  const allText = [title, description, ...headings, ...paragraphs, navigation].join(' ').toLowerCase();

  // Industry detection patterns
  const industries = {
    ecommerce: /shop|store|buy|cart|product|ecommerce|marketplace|retail|purchase|checkout/,
    saas: /software|saas|platform|dashboard|api|subscription|trial|demo|app|cloud/,
    healthcare: /health|medical|doctor|clinic|hospital|patient|therapy|wellness|medicine/,
    finance: /finance|bank|investment|loan|insurance|mortgage|credit|financial|wealth/,
    education: /education|school|university|course|learning|student|teacher|academic|training/,
    realestate: /real estate|property|homes|rent|lease|mortgage|realtor|listing|mls/,
    restaurant: /restaurant|food|menu|dining|chef|cuisine|delivery|catering|takeout/,
    legal: /law|lawyer|attorney|legal|court|litigation|counsel|firm|practice/,
    consulting: /consulting|consultant|advisory|strategy|expert|professional services/,
    agency: /agency|marketing|design|advertising|creative|digital|branding|media/,
    nonprofit: /nonprofit|charity|donation|volunteer|foundation|cause|mission|impact/,
    portfolio: /portfolio|designer|photographer|artist|creative|freelance|personal|work/
  };

  let detectedIndustry = 'general';
  let confidence = 0;

  for (const [industry, pattern] of Object.entries(industries)) {
    const matches = allText.match(pattern);
    if (matches && matches.length > confidence) {
      detectedIndustry = industry;
      confidence = matches.length;
    }
  }

  // Business type detection
  const businessTypes = {
    b2b: /enterprise|business|corporate|professional|solution|industry|commercial/,
    b2c: /customer|consumer|personal|individual|family|home|lifestyle/,
    marketplace: /marketplace|platform|connect|network|community|seller|buyer/
  };

  let businessType = 'b2c';
  for (const [type, pattern] of Object.entries(businessTypes)) {
    if (pattern.test(allText)) {
      businessType = type;
      break;
    }
  }

  // Extract key business indicators
  const hasEcommerce = /shop|store|cart|buy|product|price/i.test(allText);
  const hasBooking = /book|appointment|schedule|reserve|calendar/i.test(allText);
  const hasLogin = websiteData.uxFeatures?.forms?.count > 0 || /login|sign in|account|dashboard/i.test(allText);
  const hasBlog = websiteData.siteStructure?.contentStructure?.hasBlog || /blog|news|article/i.test(allText);

  return {
    industry: detectedIndustry,
    businessType,
    confidence: Math.min(confidence / 3, 1), // Normalize confidence
    features: {
      hasEcommerce,
      hasBooking,
      hasLogin,
      hasBlog,
      isServiceBased: businessType === 'b2b' || detectedIndustry === 'consulting',
      isContentFocused: hasBlog || detectedIndustry === 'education'
    },
    industryBenchmarks: getIndustryBenchmarks(detectedIndustry)
  };
}

// Function to get industry-specific benchmarks
function getIndustryBenchmarks(industry: string) {
  const benchmarks = {
    ecommerce: {
      conversionRate: 2.5,
      loadTime: 2.0,
      mobileScore: 85,
      trustSignals: 'high',
      priorities: ['conversion_optimization', 'product_presentation', 'checkout_flow', 'trust_signals']
    },
    saas: {
      conversionRate: 3.0,
      loadTime: 1.5,
      mobileScore: 90,
      trustSignals: 'medium',
      priorities: ['user_onboarding', 'feature_clarity', 'trial_conversion', 'support_accessibility']
    },
    healthcare: {
      conversionRate: 4.0,
      loadTime: 2.5,
      mobileScore: 80,
      trustSignals: 'critical',
      priorities: ['credibility', 'accessibility', 'privacy_compliance', 'appointment_booking']
    },
    finance: {
      conversionRate: 2.0,
      loadTime: 2.0,
      mobileScore: 85,
      trustSignals: 'critical',
      priorities: ['security', 'compliance', 'trust_building', 'clear_communication']
    },
    general: {
      conversionRate: 2.8,
      loadTime: 2.5,
      mobileScore: 80,
      trustSignals: 'medium',
      priorities: ['user_experience', 'content_quality', 'mobile_optimization', 'performance']
    }
  };

  return benchmarks[industry] || benchmarks.general;
}

// Enhanced Scoring System Functions

// 1. Evidence-Weight Scoring Enhancement
function calculateEvidenceWeightedScore(baseScore: number, evidenceLevel: string, evidenceData: any): number {
  const evidenceMultipliers = {
    'high': 1.0,
    'medium': 0.9,
    'low': 0.75,
    'minimal': 0.6
  };

  let multiplier = evidenceMultipliers[evidenceLevel as keyof typeof evidenceMultipliers] || 0.8;

  // Evidence quality thresholds
  const hasQuantifiableData = evidenceData?.hasNumbers || false;
  const hasSpecificExamples = evidenceData?.hasExamples || false;
  const hasCrossPageEvidence = evidenceData?.crossPageEvidence || false;

  // Bonus for high-quality evidence
  if (evidenceLevel === 'high' && hasQuantifiableData && hasSpecificExamples) {
    multiplier = Math.min(multiplier + 0.1, 1.05); // Allow slight bonus for exceptional evidence
  }

  // Penalty for insufficient evidence on high scores
  if (baseScore > 80 && evidenceLevel === 'low') {
    multiplier = Math.min(multiplier, 0.85); // Cap high scores with low evidence
  }

  return Math.round(baseScore * multiplier);
}

// 2. Industry Benchmark Calibration
function calibrateScoreToIndustryBenchmarks(score: number, sectionName: string, industry: string): { score: number, comparison: string, percentile: number } {
  const industryBenchmarks = {
    ecommerce: {
      'Branding': { average: 75, top10: 90, top25: 85 },
      'Conversion Optimization': { average: 68, top10: 88, top25: 80 },
      'Usability': { average: 70, top10: 85, top25: 78 },
      'Customer Experience': { average: 72, top10: 87, top25: 82 }
    },
    saas: {
      'Branding': { average: 78, top10: 92, top25: 87 },
      'Usability': { average: 82, top10: 93, top25: 88 },
      'Content Strategy': { average: 75, top10: 89, top25: 83 },
      'Digital Presence': { average: 80, top10: 91, top25: 86 }
    },
    healthcare: {
      'Consistency & Compliance': { average: 85, top10: 95, top25: 92 },
      'Customer Experience': { average: 78, top10: 90, top25: 85 },
      'Usability': { average: 75, top10: 88, top25: 82 }
    },
    finance: {
      'Consistency & Compliance': { average: 88, top10: 96, top25: 93 },
      'Customer Experience': { average: 80, top10: 92, top25: 87 },
      'Design': { average: 73, top10: 86, top25: 81 }
    },
    general: {
      'Branding': { average: 73, top10: 87, top25: 82 },
      'Design': { average: 70, top10: 85, top25: 78 },
      'Usability': { average: 72, top10: 86, top25: 80 },
      'Content Strategy': { average: 69, top10: 83, top25: 77 }
    }
  };

  const benchmarks = industryBenchmarks[industry as keyof typeof industryBenchmarks] || industryBenchmarks.general;
  const sectionBenchmark = benchmarks[sectionName as keyof typeof benchmarks] || benchmarks['Branding'];

  // Calculate percentile position
  let percentile = 50; // Default to median
  let comparison = 'average';

  if (score >= sectionBenchmark.top10) {
    percentile = 95;
    comparison = 'top_10_percent';
  } else if (score >= sectionBenchmark.top25) {
    percentile = 85;
    comparison = 'top_25_percent';
  } else if (score >= sectionBenchmark.average + 5) {
    percentile = 70;
    comparison = 'above_average';
  } else if (score >= sectionBenchmark.average - 5) {
    percentile = 50;
    comparison = 'average';
  } else if (score >= sectionBenchmark.average - 15) {
    percentile = 30;
    comparison = 'below_average';
  } else {
    percentile = 15;
    comparison = 'bottom_quartile';
  }

  return { score, comparison, percentile };
}

// 3. Confidence-Adjusted Scoring
function adjustScoreForConfidence(score: number, confidence: number, hasEvidence: boolean): number {
  // Apply confidence multiplier
  let adjustedScore = score;

  if (confidence < 0.6) {
    adjustedScore = Math.round(score * 0.85); // 15% penalty for low confidence
  } else if (confidence < 0.8) {
    adjustedScore = Math.round(score * 0.95); // 5% penalty for medium confidence
  }

  // Additional penalty if low confidence AND lack of evidence
  if (confidence < 0.7 && !hasEvidence) {
    adjustedScore = Math.round(adjustedScore * 0.9);
  }

  return adjustedScore;
}

// 4. Implementation Impact Weighting
function calculateImplementationImpactScore(baseScore: number, implementationDifficulty: string, estimatedImpact: string): { score: number, priorityLevel: string } {
  const difficultyMultipliers = {
    'easy': 1.1,
    'medium': 1.0,
    'hard': 0.95,
    'very_hard': 0.9
  };

  const impactMultipliers = {
    'high': 1.1,
    'medium': 1.0,
    'low': 0.9
  };

  const difficultyMult = difficultyMultipliers[implementationDifficulty as keyof typeof difficultyMultipliers] || 1.0;
  const impactMult = impactMultipliers[estimatedImpact as keyof typeof impactMultipliers] || 1.0;

  const weightedScore = Math.round(baseScore * difficultyMult * impactMult);

  // Determine priority level
  let priorityLevel = 'medium';
  if (implementationDifficulty === 'easy' && estimatedImpact === 'high') {
    priorityLevel = 'critical';
  } else if (difficultyMult >= 1.05 || impactMult >= 1.05) {
    priorityLevel = 'high';
  } else if (difficultyMult <= 0.95 && impactMult <= 0.95) {
    priorityLevel = 'low';
  }

  return { score: Math.min(weightedScore, 100), priorityLevel };
}

// 5. Enhanced Quality Assurance with Cross-Validation
function validateAuditOutput(auditData: any, businessContext: any) {
  const errors: string[] = [];
  const warnings: string[] = [];
  let qualityScore = 0;
  const validationMetrics = {
    evidenceQuality: 0,
    industryRelevance: 0,
    recommendationAlignment: 0,
    scoreConsistency: 0
  };

  // Basic structure validation
  if (!auditData || typeof auditData !== 'object') {
    errors.push("Invalid audit data structure");
    return { isValid: false, errors, warnings, qualityScore: 0, validationMetrics };
  }

  // Required fields validation
  const requiredFields = ['title', 'sections', 'overallScore'];
  for (const field of requiredFields) {
    if (!auditData[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Enhanced sections validation
  if (auditData.sections && Array.isArray(auditData.sections)) {
    if (auditData.sections.length !== 10) {
      errors.push(`Expected 10 sections, found ${auditData.sections.length}`);
    }

    let evidenceQualitySum = 0;
    let industryRelevanceSum = 0;
    let recommendationAlignmentSum = 0;
    let scoreConsistencySum = 0;

    auditData.sections.forEach((section: any, index: number) => {
      // Validate section structure
      const requiredSectionFields = ['name', 'score', 'issues', 'recommendations', 'details'];
      for (const field of requiredSectionFields) {
        if (section[field] === undefined) {
          errors.push(`Section ${index}: missing ${field}`);
        }
      }

      // Enhanced score validation
      if (typeof section.score === 'number') {
        if (section.score < 0 || section.score > 100) {
          errors.push(`Section ${section.name}: invalid score ${section.score}`);
        } else {
          qualityScore += 8;

          // Score consistency check
          const expectedScoreRange = calculateExpectedScoreRange(section);
          if (section.score >= expectedScoreRange.min && section.score <= expectedScoreRange.max) {
            scoreConsistencySum += 10;
          } else {
            warnings.push(`Section ${section.name}: score ${section.score} may be inconsistent with findings`);
          }
        }
      }

      // Enhanced evidence quality validation
      if (section.details && typeof section.details === 'string') {
        const evidenceMetrics = analyzeEvidenceQuality(section.details);
        evidenceQualitySum += evidenceMetrics.score;

        if (evidenceMetrics.score < 60) {
          warnings.push(`Section ${section.name}: evidence quality below threshold (${evidenceMetrics.score}%)`);
        }

        // Recommendation-score alignment
        const alignmentScore = validateRecommendationScoreAlignment(section);
        recommendationAlignmentSum += alignmentScore;

        if (alignmentScore < 70) {
          warnings.push(`Section ${section.name}: recommendations may not align with score`);
        }
      }
    });

    // Calculate validation metrics
    const sectionCount = auditData.sections.length;
    validationMetrics.evidenceQuality = evidenceQualitySum / sectionCount;
    validationMetrics.industryRelevance = industryRelevanceSum / sectionCount;
    validationMetrics.recommendationAlignment = recommendationAlignmentSum / sectionCount;
    validationMetrics.scoreConsistency = scoreConsistencySum / sectionCount;

    qualityScore += (validationMetrics.evidenceQuality + validationMetrics.recommendationAlignment) / 2;
  }

  // Industry-specific enhanced validation
  if (businessContext.industry) {
    const industryValidation = validateIndustrySpecificContent(auditData, businessContext);
    validationMetrics.industryRelevance = industryValidation.score;
    qualityScore += industryValidation.score / 5; // Weighted contribution

    if (industryValidation.score < 70) {
      warnings.push(`Analysis lacks comprehensive industry-specific focus for ${businessContext.industry}`);
    }
  }

  const isValid = errors.length === 0;
  const finalQualityScore = Math.min(qualityScore, 100);

  return {
    isValid,
    errors,
    warnings,
    qualityScore: finalQualityScore,
    validationMetrics,
    hasEvidence: validationMetrics.evidenceQuality >= 60,
    isIndustryRelevant: validationMetrics.industryRelevance >= 70,
    isRecommendationAligned: validationMetrics.recommendationAlignment >= 70
  };
}

// Helper function to analyze evidence quality
function analyzeEvidenceQuality(content: string): { score: number, hasNumbers: boolean, hasExamples: boolean, hasMetrics: boolean } {
  let score = 40; // Base score

  const hasNumbers = /\b\d+\b/.test(content);
  const hasPercentages = /%/.test(content);
  const hasMetrics = /(score|percent|pages?|images?|forms?|seconds?|kb|mb|pixels?)/.test(content.toLowerCase());
  const hasSpecificExamples = /(e\.g\.|for example|such as|including)/.test(content.toLowerCase());
  const hasComparisons = /(compared to|vs\.|versus|than|better|worse)/.test(content.toLowerCase());
  const contentLength = content.length;

  if (hasNumbers) score += 15;
  if (hasPercentages) score += 10;
  if (hasMetrics) score += 15;
  if (hasSpecificExamples) score += 10;
  if (hasComparisons) score += 10;
  if (contentLength > 200) score += 10;
  if (contentLength > 500) score += 5;

  return {
    score: Math.min(score, 100),
    hasNumbers,
    hasExamples: hasSpecificExamples,
    hasMetrics
  };
}

// Helper function to calculate expected score range based on findings
function calculateExpectedScoreRange(section: any): { min: number, max: number } {
  const issues = section.issues || 0;
  const recommendations = section.recommendations || 0;

  // More issues should correlate with lower scores
  let maxScore = 100 - (issues * 8); // Each issue reduces max by ~8 points
  let minScore = Math.max(0, maxScore - 30); // Allow for 30-point range

  // High recommendation count suggests more problems
  if (recommendations > 7) {
    maxScore = Math.min(maxScore, 80);
  } else if (recommendations > 4) {
    maxScore = Math.min(maxScore, 90);
  }

  return { min: Math.max(minScore, 0), max: Math.min(maxScore, 100) };
}

// Helper function to validate recommendation-score alignment
function validateRecommendationScoreAlignment(section: any): number {
  const score = section.score || 0;
  const recommendations = section.recommendations || 0;
  const issues = section.issues || 0;

  let alignmentScore = 70; // Base alignment score

  // High scores should have fewer recommendations
  if (score > 85 && recommendations > 5) {
    alignmentScore -= 20;
  } else if (score > 75 && recommendations > 7) {
    alignmentScore -= 15;
  }

  // Low scores should have more recommendations
  if (score < 60 && recommendations < 5) {
    alignmentScore -= 15;
  } else if (score < 50 && recommendations < 7) {
    alignmentScore -= 20;
  }

  // Issue count should correlate with score
  if (score > 80 && issues > 4) {
    alignmentScore -= 10;
  } else if (score < 60 && issues < 3) {
    alignmentScore -= 10;
  }

  return Math.max(alignmentScore, 0);
}

// Helper function to validate industry-specific content
function validateIndustrySpecificContent(auditData: any, businessContext: any): { score: number, foundTerms: string[] } {
  const industrySpecificTerms = {
    ecommerce: ['product', 'cart', 'checkout', 'conversion', 'purchase', 'inventory', 'payment', 'shipping'],
    saas: ['onboarding', 'trial', 'features', 'dashboard', 'subscription', 'user experience', 'api', 'integration'],
    healthcare: ['credibility', 'accessibility', 'privacy', 'compliance', 'patient', 'medical', 'hipaa', 'healthcare'],
    finance: ['security', 'trust', 'compliance', 'transparency', 'regulation', 'financial', 'investment', 'banking'],
    consulting: ['expertise', 'consultation', 'professional', 'advisory', 'strategy', 'consulting', 'business'],
    portfolio: ['portfolio', 'creative', 'showcase', 'design', 'visual', 'artistic', 'gallery', 'projects']
  };

  const terms = industrySpecificTerms[businessContext.industry as keyof typeof industrySpecificTerms] || [];
  if (terms.length === 0) return { score: 75, foundTerms: [] }; // Default for unknown industries

  const auditText = JSON.stringify(auditData).toLowerCase();
  const foundTerms = terms.filter(term => auditText.includes(term));

  // Calculate score based on term coverage
  const coverage = foundTerms.length / terms.length;
  let score = Math.round(coverage * 100);

  // Bonus for comprehensive coverage
  if (coverage >= 0.75) score += 10;
  if (coverage >= 0.5) score += 5;

  return { score: Math.min(score, 100), foundTerms };
}

// 6. Dynamic Criteria Weighting Based on Business Context
function getDynamicSectionWeights(businessContext: any): number[] {
  const { industry, businessType, features } = businessContext;

  // Base weights: [Branding, Design, Messaging, Usability, Content Strategy, Digital Presence, Customer Experience, Competitor Analysis, Conversion Optimization, Consistency & Compliance]
  const baseWeights = [0.18, 0.13, 0.13, 0.13, 0.09, 0.09, 0.05, 0.05, 0.10, 0.05];

  const industryAdjustments = {
    ecommerce: {
      // Emphasize conversion and customer experience
      adjustments: { 8: +0.05, 6: +0.03, 0: +0.02, 3: +0.02 }, // Conversion Opt, Customer Exp, Branding, Usability
      reductions: { 1: -0.02, 2: -0.02, 4: -0.01 } // Design, Messaging, Content Strategy
    },
    saas: {
      // Emphasize usability and onboarding experience
      adjustments: { 3: +0.07, 4: +0.03, 5: +0.02, 6: +0.03 }, // Usability, Content Strategy, Digital Presence, Customer Exp
      reductions: { 1: -0.03, 7: -0.02 } // Design, Competitor Analysis
    },
    healthcare: {
      // Emphasize compliance, credibility, and accessibility
      adjustments: { 9: +0.10, 6: +0.05, 3: +0.03, 0: +0.02 }, // Compliance, Customer Exp, Usability, Branding
      reductions: { 8: -0.05, 7: -0.03, 1: -0.02 } // Conversion Opt, Competitor Analysis, Design
    },
    finance: {
      // Emphasize compliance, security, and trust
      adjustments: { 9: +0.12, 6: +0.05, 0: +0.03 }, // Compliance, Customer Exp, Branding
      reductions: { 8: -0.05, 1: -0.03, 7: -0.02 } // Conversion Opt, Design, Competitor Analysis
    },
    consulting: {
      // Emphasize credibility and content strategy
      adjustments: { 4: +0.06, 0: +0.04, 8: +0.03, 6: +0.02 }, // Content Strategy, Branding, Conversion Opt, Customer Exp
      reductions: { 1: -0.03, 3: -0.02 } // Design, Usability
    },
    portfolio: {
      // Emphasize design and branding
      adjustments: { 1: +0.10, 0: +0.07, 5: +0.03 }, // Design, Branding, Digital Presence
      reductions: { 9: -0.03, 8: -0.03, 7: -0.02, 3: -0.02 } // Compliance, Conversion Opt, Competitor Analysis, Usability
    }
  };

  const businessTypeAdjustments = {
    b2b: {
      // Emphasize credibility and professional appearance
      adjustments: { 0: +0.02, 4: +0.02, 9: +0.01 }, // Branding, Content Strategy, Compliance
      reductions: { 1: -0.01, 8: -0.02 } // Design, Conversion Optimization
    },
    b2c: {
      // Emphasize user experience and conversion
      adjustments: { 8: +0.02, 6: +0.02, 1: +0.01 }, // Conversion Opt, Customer Exp, Design
      reductions: { 4: -0.01, 9: -0.01 } // Content Strategy, Compliance
    },
    marketplace: {
      // Emphasize trust and usability
      adjustments: { 3: +0.03, 6: +0.02, 9: +0.02 }, // Usability, Customer Exp, Compliance
      reductions: { 2: -0.01, 1: -0.01 } // Messaging, Design
    }
  };

  // Feature-based adjustments
  const featureAdjustments = {
    hasEcommerce: { 8: +0.03, 6: +0.02 }, // Conversion Opt, Customer Exp
    hasBooking: { 3: +0.02, 6: +0.02 }, // Usability, Customer Exp
    hasBlog: { 4: +0.03, 5: +0.02 }, // Content Strategy, Digital Presence
    hasLogin: { 3: +0.02, 9: +0.01 } // Usability, Compliance
  };

  // Apply adjustments
  let adjustedWeights = [...baseWeights];

  // Industry adjustments
  const industryAdj = industryAdjustments[industry as keyof typeof industryAdjustments];
  if (industryAdj) {
    Object.entries(industryAdj.adjustments || {}).forEach(([index, adjustment]) => {
      adjustedWeights[parseInt(index)] += adjustment as number;
    });
    Object.entries(industryAdj.reductions || {}).forEach(([index, reduction]) => {
      adjustedWeights[parseInt(index)] += reduction as number;
    });
  }

  // Business type adjustments
  const businessAdj = businessTypeAdjustments[businessType as keyof typeof businessTypeAdjustments];
  if (businessAdj) {
    Object.entries(businessAdj.adjustments || {}).forEach(([index, adjustment]) => {
      adjustedWeights[parseInt(index)] += adjustment as number;
    });
    Object.entries(businessAdj.reductions || {}).forEach(([index, reduction]) => {
      adjustedWeights[parseInt(index)] += reduction as number;
    });
  }

  // Feature adjustments
  Object.entries(features).forEach(([feature, hasFeature]) => {
    if (hasFeature && featureAdjustments[feature as keyof typeof featureAdjustments]) {
      const adjustments = featureAdjustments[feature as keyof typeof featureAdjustments];
      Object.entries(adjustments).forEach(([index, adjustment]) => {
        adjustedWeights[parseInt(index)] += adjustment as number;
      });
    }
  });

  // Normalize weights to sum to 1.0
  const sum = adjustedWeights.reduce((a, b) => a + b, 0);
  return adjustedWeights.map(w => w / sum);
}

// 7. Enhanced Quality Enhancement with All Improvements
function enhanceAuditQuality(auditData: any, validationResults: any, businessContext: any) {
  const enhanced = { ...auditData };

  // Get dynamic weights for this business context
  const dynamicWeights = getDynamicSectionWeights(businessContext);

  // Enhanced metadata with all validation metrics
  enhanced.metadata = {
    analysisConfidence: validationResults.qualityScore / 100,
    industryDetected: businessContext.industry,
    businessType: businessContext.businessType,
    evidenceQuality: validationResults.validationMetrics?.evidenceQuality >= 70 ? 'high' :
                    validationResults.validationMetrics?.evidenceQuality >= 50 ? 'medium' : 'low',
    qualityScore: validationResults.qualityScore,
    validationWarnings: validationResults.warnings.length,
    industryRelevanceScore: validationResults.validationMetrics?.industryRelevance || 0,
    recommendationAlignment: validationResults.validationMetrics?.recommendationAlignment || 0,
    scoreConsistency: validationResults.validationMetrics?.scoreConsistency || 0,
    dynamicWeightsApplied: true,
    scoringEnhancementsApplied: ['evidence_weighted', 'industry_calibrated', 'confidence_adjusted', 'impact_weighted']
  };

  // Apply all scoring enhancements to each section
  enhanced.sections = enhanced.sections?.map((section: any, index: number) => {
    const enhanced_section = { ...section };
    let baseScore = enhanced_section.score;

    // Apply evidence-weighted scoring
    const evidenceData = analyzeEvidenceQuality(section.details || '');
    const evidenceLevel = evidenceData.score >= 80 ? 'high' : evidenceData.score >= 60 ? 'medium' : 'low';
    enhanced_section.evidenceLevel = evidenceLevel;
    enhanced_section.evidenceScore = evidenceData.score;

    baseScore = calculateEvidenceWeightedScore(baseScore, evidenceLevel, evidenceData);

    // Apply industry benchmark calibration
    const benchmarkResult = calibrateScoreToIndustryBenchmarks(baseScore, section.name, businessContext.industry);
    enhanced_section.industryComparison = benchmarkResult.comparison;
    enhanced_section.industryPercentile = benchmarkResult.percentile;

    // Apply confidence adjustment
    const confidence = section.confidence || 0.8;
    const hasEvidence = validationResults.hasEvidence && evidenceData.score >= 60;
    baseScore = adjustScoreForConfidence(baseScore, confidence, hasEvidence);
    enhanced_section.confidence = confidence;

    // Apply implementation impact weighting
    const implementationDifficulty = section.implementationDifficulty || 'medium';
    const estimatedImpactLevel = section.estimatedImpact?.includes('high') ? 'high' :
                                section.estimatedImpact?.includes('low') ? 'low' : 'medium';

    const impactResult = calculateImplementationImpactScore(baseScore, implementationDifficulty, estimatedImpactLevel);
    enhanced_section.score = Math.max(0, Math.min(100, impactResult.score));
    enhanced_section.priorityLevel = impactResult.priorityLevel;
    enhanced_section.implementationDifficulty = implementationDifficulty;

    // Add quality indicators
    enhanced_section.qualityIndicators = {
      evidenceQuality: evidenceLevel,
      industryRelevant: benchmarkResult.percentile >= 50,
      scoreReliable: confidence >= 0.7,
      implementationFeasible: implementationDifficulty !== 'very_hard',
      highPriority: impactResult.priorityLevel === 'critical' || impactResult.priorityLevel === 'high'
    };

    return enhanced_section;
  });

  // Recalculate overall score with dynamic weights
  if (enhanced.sections && enhanced.sections.length > 0) {
    const weightedScore = enhanced.sections.reduce((sum: number, section: any, index: number) => {
      const weight = dynamicWeights[index] || (1 / enhanced.sections.length);
      return sum + (section.score * weight);
    }, 0);

    enhanced.overallScore = Math.round(weightedScore);
    enhanced.weightingMethod = 'dynamic_context_based';
    enhanced.appliedWeights = dynamicWeights;
  }

  // Add improvement impact analysis
  enhanced.improvementImpact = {
    highPriority: enhanced.sections
      .filter((s: any) => s.priorityLevel === 'critical' || s.priorityLevel === 'high')
      .map((s: any) => s.name.toLowerCase().replace(/\s+/g, '_')),
    estimatedROI: calculateEstimatedROI(enhanced.sections, businessContext),
    implementationTimeframe: calculateImplementationTimeframe(enhanced.sections),
    quickWins: enhanced.sections
      .filter((s: any) => s.implementationDifficulty === 'easy' && s.priorityLevel === 'high')
      .map((s: any) => s.name)
  };

  // Add reasoning chain for transparency
  enhanced.reasoningChain = [
    `Industry identification: Detected ${businessContext.industry} business based on content analysis`,
    `Dynamic weighting: Applied ${businessContext.industry} industry-specific criteria weights`,
    `Evidence analysis: Evaluated evidence quality across all sections`,
    `Benchmark calibration: Compared against ${businessContext.industry} industry standards`,
    `Confidence adjustment: Applied confidence-based score modifications`,
    `Impact weighting: Prioritized based on implementation difficulty and estimated impact`,
    `Quality assurance: Validated recommendation-score alignment and consistency`
  ];

  return enhanced;
}

// Helper function to calculate estimated ROI
function calculateEstimatedROI(sections: any[], businessContext: any): string {
  const highImpactSections = sections.filter(s =>
    s.priorityLevel === 'critical' || s.priorityLevel === 'high'
  ).length;

  const overallScoreImprovement = sections.reduce((sum, section) => {
    const potentialImprovement = Math.max(0, 85 - section.score); // Assuming 85 as target
    return sum + (potentialImprovement * 0.3); // Conservative estimate
  }, 0) / sections.length;

  if (businessContext.industry === 'ecommerce') {
    return `${Math.round(overallScoreImprovement * 0.8)}-${Math.round(overallScoreImprovement * 1.2)}% improvement in conversion rate`;
  } else if (businessContext.industry === 'saas') {
    return `${Math.round(overallScoreImprovement * 0.6)}-${Math.round(overallScoreImprovement * 1.0)}% improvement in trial conversion`;
  } else {
    return `${Math.round(overallScoreImprovement * 0.5)}-${Math.round(overallScoreImprovement * 1.0)}% improvement in key business metrics`;
  }
}

// Helper function to calculate implementation timeframe
function calculateImplementationTimeframe(sections: any[]): string {
  const difficulties = sections.map(s => s.implementationDifficulty || 'medium');
  const hardCount = difficulties.filter(d => d === 'hard' || d === 'very_hard').length;
  const easyCount = difficulties.filter(d => d === 'easy').length;

  if (hardCount > 5) {
    return '6-12 months for comprehensive improvements';
  } else if (hardCount > 2) {
    return '3-6 months for core improvements';
  } else {
    return '1-3 months for core improvements';
  }
}

// Visual Analysis Enhancement
async function enhanceWithVisualAnalysis(websiteData: any) {
  try {
    // For now, we'll simulate visual analysis based on extracted data
    // In a production environment, this could integrate with Puppeteer or similar
    const visualAnalysis = {
      hasResponsiveDesign: websiteData.performance?.mobileViewport || false,
      colorSchemeAnalysis: analyzeColorScheme(websiteData),
      layoutConsistency: analyzeLayoutConsistency(websiteData),
      visualHierarchy: analyzeVisualHierarchy(websiteData),
      brandingVisuals: analyzeBrandingVisuals(websiteData),
      accessibilityVisual: analyzeVisualAccessibility(websiteData)
    };

    return {
      ...websiteData,
      visualAnalysis,
      analysisDepth: 'comprehensive-with-visual'
    };
  } catch (error) {
    console.warn('Visual analysis failed, proceeding with standard analysis:', error);
    return websiteData;
  }
}

function analyzeColorScheme(websiteData: any): any {
  const { brandElements, headings, paragraphs } = websiteData;
  const allText = [brandElements, ...headings, ...paragraphs].join(' ');

  // Look for color mentions in content
  const colorPatterns = {
    hasColorMentions: /color|brand|palette|theme/i.test(allText),
    suggestedColors: extractColorsFromContent(allText),
    consistencyScore: websiteData.multiPageAnalysis?.crossPageConsistency?.brandConsistency?.score || 75
  };

  return colorPatterns;
}

function extractColorsFromContent(text: string): string[] {
  // Extract hex colors, color names, etc.
  const hexColors = text.match(/#[0-9A-Fa-f]{6}/g) || [];
  const colorNames = text.match(/\b(red|blue|green|yellow|purple|orange|black|white|gray|grey)\b/gi) || [];
  return [...hexColors, ...colorNames].slice(0, 5);
}

function analyzeLayoutConsistency(websiteData: any): any {
  const multiPageData = websiteData.multiPageAnalysis;
  if (!multiPageData) {
    return { score: 50, analysis: 'Limited data for layout analysis' };
  }

  return {
    score: multiPageData.crossPageConsistency?.navigationConsistency?.score || 70,
    navigationConsistency: multiPageData.crossPageConsistency?.navigationConsistency?.score > 80,
    contentStructure: multiPageData.pageDetails?.length > 3,
    analysis: `Analyzed ${multiPageData.pagesAnalyzed} pages for layout consistency`
  };
}

function analyzeVisualHierarchy(websiteData: any): any {
  const { headings, uxFeatures } = websiteData;

  return {
    headingStructure: headings?.length > 5,
    hasProperH1Usage: true, // This would be determined by actual DOM analysis
    interactiveElements: uxFeatures?.interactivity?.buttons > 2,
    score: calculateHierarchyScore(headings, uxFeatures),
    recommendations: generateHierarchyRecommendations(headings, uxFeatures)
  };
}

function calculateHierarchyScore(headings: string[], uxFeatures: any): number {
  let score = 60; // Base score

  if (headings?.length >= 5) score += 15;
  if (uxFeatures?.interactivity?.buttons >= 3) score += 10;
  if (uxFeatures?.media?.images >= 5) score += 10;
  if (uxFeatures?.accessibility?.hasAriaLabels) score += 5;

  return Math.min(score, 100);
}

function generateHierarchyRecommendations(headings: string[], uxFeatures: any): string[] {
  const recommendations = [];

  if (!headings || headings.length < 3) {
    recommendations.push('Add more descriptive headings to improve content structure');
  }

  if (!uxFeatures?.accessibility?.hasAriaLabels) {
    recommendations.push('Implement ARIA labels for better accessibility');
  }

  if (uxFeatures?.interactivity?.buttons < 2) {
    recommendations.push('Consider adding more interactive elements for user engagement');
  }

  return recommendations;
}

function analyzeBrandingVisuals(websiteData: any): any {
  const brandText = websiteData.brandElements || '';
  const logoPresent = brandText.toLowerCase().includes('logo') ||
                    websiteData.multiPageAnalysis?.pageDetails?.some((page: any) =>
                      page.brandElements?.logo) || false;

  return {
    logoConsistency: logoPresent,
    brandElementsFound: brandText.length > 0,
    score: logoPresent ? 85 : 60,
    recommendations: logoPresent ?
      ['Maintain consistent logo placement across all pages'] :
      ['Add consistent logo placement', 'Establish visual brand identity']
  };
}

function analyzeVisualAccessibility(websiteData: any): any {
  const { uxFeatures } = websiteData;

  return {
    altTextCoverage: uxFeatures?.accessibility?.hasAltText || false,
    missingAltText: uxFeatures?.accessibility?.missingAltText || 0,
    hasSkipLinks: uxFeatures?.accessibility?.hasSkipLinks || false,
    score: calculateAccessibilityScore(uxFeatures?.accessibility),
    criticalIssues: identifyAccessibilityIssues(uxFeatures?.accessibility)
  };
}

function calculateAccessibilityScore(accessibility: any): number {
  if (!accessibility) return 40;

  let score = 50;
  if (accessibility.hasAltText) score += 20;
  if (accessibility.hasSkipLinks) score += 15;
  if (accessibility.hasAriaLabels) score += 15;
  if (accessibility.missingAltText === 0) score += 10;

  return Math.min(score, 100);
}

function identifyAccessibilityIssues(accessibility: any): string[] {
  const issues = [];

  if (!accessibility?.hasAltText) {
    issues.push('Missing alt text for images');
  }

  if (accessibility?.missingAltText > 0) {
    issues.push(`${accessibility.missingAltText} images without alt text`);
  }

  if (!accessibility?.hasSkipLinks) {
    issues.push('No skip navigation links found');
  }

  return issues;
}

// Dynamic Prompt Adaptation
function getDynamicPromptInstructions(businessContext: any, websiteData: any): string {
  const { industry, businessType, features } = businessContext;

  const baseInstructions = {
    ecommerce: {
      focus: 'conversion optimization, product presentation, checkout flow, trust signals, and mobile commerce experience',
      scoringWeights: 'Increase weight for Conversion Optimization (15%) and Customer Experience (10%)',
      specificChecks: [
        'Product page clarity and appeal',
        'Shopping cart functionality indicators',
        'Trust badges and security certificates',
        'Mobile checkout experience',
        'Customer reviews and testimonials',
        'Return/refund policy accessibility'
      ],
      successMetrics: 'conversion rate, cart abandonment reduction, mobile sales performance'
    },
    saas: {
      focus: 'user onboarding clarity, feature communication, trial conversion elements, and support accessibility',
      scoringWeights: 'Increase weight for Usability (20%) and Content Strategy (15%)',
      specificChecks: [
        'Free trial or demo accessibility',
        'Feature documentation quality',
        'Onboarding flow clarity',
        'Support and help resources',
        'Pricing transparency',
        'Dashboard/app screenshots or demos'
      ],
      successMetrics: 'trial conversion rate, user activation, support ticket reduction'
    },
    healthcare: {
      focus: 'credibility indicators, accessibility compliance, privacy policies, and appointment booking functionality',
      scoringWeights: 'Increase weight for Consistency & Compliance (15%) and Customer Experience (10%)',
      specificChecks: [
        'Professional credentials display',
        'HIPAA compliance indicators',
        'Appointment booking system',
        'Patient testimonials and reviews',
        'Accessibility features (ADA compliance)',
        'Contact information and location details'
      ],
      successMetrics: 'appointment bookings, patient trust indicators, compliance adherence'
    },
    finance: {
      focus: 'security indicators, regulatory compliance, trust building elements, and clear financial communication',
      scoringWeights: 'Increase weight for Consistency & Compliance (20%) and Customer Experience (10%)',
      specificChecks: [
        'Security certifications and badges',
        'Regulatory compliance statements',
        'Clear fee structure and terms',
        'Customer protection information',
        'Professional team credentials',
        'Risk disclosure statements'
      ],
      successMetrics: 'customer trust, compliance score, security perception'
    },
    portfolio: {
      focus: 'visual presentation, project showcases, contact accessibility, and personal branding',
      scoringWeights: 'Increase weight for Design (20%) and Branding (25%)',
      specificChecks: [
        'Portfolio project presentation',
        'Visual quality and consistency',
        'Contact form and information',
        'Social media integration',
        'Skills and expertise display',
        'Client testimonials or case studies'
      ],
      successMetrics: 'inquiry generation, portfolio engagement, professional credibility'
    },
    consulting: {
      focus: 'expertise demonstration, case studies, client testimonials, and lead generation optimization',
      scoringWeights: 'Increase weight for Content Strategy (15%) and Conversion Optimization (15%)',
      specificChecks: [
        'Service offering clarity',
        'Case studies and success stories',
        'Client testimonials and logos',
        'Lead capture forms',
        'Expert positioning content',
        'Consultation booking process'
      ],
      successMetrics: 'lead generation, consultation bookings, credibility indicators'
    }
  };

  const instructions = baseInstructions[industry as keyof typeof baseInstructions] || {
    focus: 'user experience, content quality, mobile optimization, and general best practices',
    scoringWeights: 'Apply standard weighting across all criteria',
    specificChecks: [
      'General user experience quality',
      'Content readability and structure',
      'Mobile responsiveness',
      'Loading speed and performance',
      'Contact information accessibility',
      'Professional appearance'
    ],
    successMetrics: 'user engagement, bounce rate reduction, overall user satisfaction'
  };

  // Add business type modifiers
  const businessTypeModifiers = {
    b2b: 'Focus on professional credibility, lead generation, and enterprise trust signals.',
    b2c: 'Emphasize user experience, emotional connection, and consumer conversion optimization.',
    marketplace: 'Prioritize platform usability, seller/buyer trust, and transaction security.'
  };

  // Add feature-based adaptations
  const featureAdaptations = [];
  if (features.hasEcommerce) featureAdaptations.push('E-commerce functionality evaluation');
  if (features.hasBooking) featureAdaptations.push('Appointment/booking system assessment');
  if (features.hasLogin) featureAdaptations.push('User account and login experience review');
  if (features.hasBlog) featureAdaptations.push('Content marketing and blog effectiveness analysis');

  return `
**PRIMARY FOCUS**: ${instructions.focus}

**BUSINESS TYPE MODIFIER**: ${businessTypeModifiers[businessType as keyof typeof businessTypeModifiers] || ''}

**SCORING ADAPTATIONS**: ${instructions.scoringWeights}

**INDUSTRY-SPECIFIC EVALUATION CRITERIA**:
${instructions.specificChecks.map(check => `- ${check}`).join('\n')}

**FEATURE-BASED ADAPTATIONS**:
${featureAdaptations.map(adaptation => `- ${adaptation}`).join('\n')}

**SUCCESS METRICS TO EMPHASIZE**: ${instructions.successMetrics}

**COMPETITIVE CONTEXT**: Compare against typical ${industry} industry standards and ${businessType} best practices.

**RECOMMENDATION PRIORITY**: Focus on improvements that directly impact ${instructions.successMetrics} for ${industry} businesses.
  `.trim();
}

// Function to generate audit using Gemini
async function generateAudit(websiteData: any) {
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      temperature: 0.4, // Balanced creativity vs consistency
      topP: 0.8, // Focus on high-probability tokens
      topK: 40, // Limit vocabulary for more focused responses
      maxOutputTokens: 8192, // Allow for detailed analysis
      responseMimeType: "application/json", // Ensure JSON response
    },
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE",
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_MEDIUM_AND_ABOVE",
      },
    ],
  });

  // Enhance with visual analysis
  const enhancedWebsiteData = await enhanceWithVisualAnalysis(websiteData);

  // Detect business context and industry
  const businessContext = detectBusinessContext(enhancedWebsiteData);

  const prompt = `
You are a senior digital consultant with 15+ years of experience conducting comprehensive brand audits for Fortune 500 companies. You excel at systematic analysis, data-driven insights, and actionable recommendations.

BUSINESS CONTEXT ANALYSIS:
- Detected Industry: ${businessContext.industry} (confidence: ${Math.round(businessContext.confidence * 100)}%)
- Business Type: ${businessContext.businessType}
- Key Features: ${Object.entries(businessContext.features).filter(([_, value]) => value).map(([key, _]) => key).join(', ')}
- Industry Benchmarks: ${businessContext.industryBenchmarks.priorities.join(', ')}

INDUSTRY-SPECIFIC ANALYSIS FOCUS & SCORING ADAPTATION:
${getDynamicPromptInstructions(businessContext, enhancedWebsiteData)}

ANALYSIS METHODOLOGY:
1. First, understand the business context and industry-specific requirements
2. Analyze each criterion systematically with concrete evidence
3. Compare against industry benchmarks: Load time <${businessContext.industryBenchmarks.loadTime}s, Mobile score >${businessContext.industryBenchmarks.mobileScore}%
4. Identify specific, measurable improvement opportunities
5. Provide actionable recommendations with estimated ROI impact

EVIDENCE-BASED SCORING REQUIREMENTS:
- Every score must include specific evidence (e.g., "Logo present on 8/8 pages analyzed")
- Compare metrics against industry standards (e.g., "Load time 3.2s vs industry benchmark 2.0s")
- Cite exact examples from the website analysis
- Quantify issues found (e.g., "15 images missing alt text out of 23 total")

EXAMPLE ANALYSIS PATTERN:
For Branding (Score: 78):
REASONING: "Website demonstrates strong brand consistency with logo placement on all 8 analyzed pages and systematic color usage (#2B4C8C primary, #F8F9FA secondary). However, messaging tone varies between formal on About page ('We provide professional solutions') and casual on Services page ('Let's get started!'), reducing brand voice coherence."
EVIDENCE: "Logo present on 8/8 pages, consistent color palette across sections, but 3 different tone variations detected across page types"
INDUSTRY_COMPARISON: "Brand consistency score above ${businessContext.industry} industry average of 72%"
RECOMMENDATION: "Develop brand voice guidelines document specifying tone for each page type. Audit all copy for consistency. Estimated impact: 15-20% improvement in brand recognition."

Now analyze the following website data using this systematic, evidence-based approach:

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

Performance Analysis:
- Page Size: ${websiteData.performance?.pageSizeKB || 0}KB
- Response Time: ${websiteData.performance?.responseTime || 0}ms
- SSL/HTTPS: ${websiteData.performance?.hasSSL ? "Yes" : "No"}
- Mobile Viewport: ${websiteData.performance?.mobileViewport ? "Yes" : "No"}
- Service Worker: ${websiteData.performance?.hasServiceWorker ? "Yes" : "No"}

Site Structure:
- Discovered Pages: ${websiteData.siteStructure?.pageCount || 0} pages
- Navigation Items: ${websiteData.siteStructure?.navigation?.menuItems?.join(", ") || "Limited"}
- Has Search: ${websiteData.siteStructure?.navigation?.hasSearch ? "Yes" : "No"}
- Has Contact Info: ${websiteData.siteStructure?.contentStructure?.hasContactInfo ? "Yes" : "No"}
- Has About Page: ${websiteData.siteStructure?.contentStructure?.hasAboutPage ? "Yes" : "No"}

UX Features:
- Forms: ${websiteData.uxFeatures?.forms?.count || 0} forms found
- Form Labels: ${websiteData.uxFeatures?.forms?.hasLabels ? "Present" : "Missing"}
- Interactive Elements: ${websiteData.uxFeatures?.interactivity?.buttons || 0} buttons, ${websiteData.uxFeatures?.interactivity?.dropdowns || 0} dropdowns
- Images: ${websiteData.uxFeatures?.media?.images || 0} images
- Missing Alt Text: ${websiteData.uxFeatures?.accessibility?.missingAltText || 0} images without alt text
- Accessibility Features: ${websiteData.uxFeatures?.accessibility?.hasSkipLinks ? "Skip links present" : "No skip links"}, ${websiteData.uxFeatures?.accessibility?.hasAriaLabels ? "ARIA labels present" : "Limited ARIA labels"}
- Social Integration: ${websiteData.uxFeatures?.social?.socialLinks || 0} social links

Analysis Depth: ${enhancedWebsiteData.analysisDepth || "basic"}

Visual Analysis Results:
${enhancedWebsiteData.visualAnalysis ? `
- Color Scheme Analysis: ${enhancedWebsiteData.visualAnalysis.colorSchemeAnalysis.hasColorMentions ? 'Colors mentioned in content' : 'No explicit color strategy'}
- Layout Consistency Score: ${enhancedWebsiteData.visualAnalysis.layoutConsistency.score}%
- Visual Hierarchy Score: ${enhancedWebsiteData.visualAnalysis.visualHierarchy.score}%
- Branding Visuals: ${enhancedWebsiteData.visualAnalysis.brandingVisuals.logoConsistency ? 'Logo consistently placed' : 'Logo placement inconsistent'}
- Visual Accessibility Score: ${enhancedWebsiteData.visualAnalysis.accessibilityVisual.score}%
- Critical Accessibility Issues: ${enhancedWebsiteData.visualAnalysis.accessibilityVisual.criticalIssues.join(', ') || 'None'}
- Suggested Colors: ${enhancedWebsiteData.visualAnalysis.colorSchemeAnalysis.suggestedColors.join(', ') || 'None detected'}
` : 'Visual analysis not available'}

Multi-Page Analysis Results:
${
  websiteData.multiPageAnalysis
    ? `
- Pages Analyzed: ${websiteData.multiPageAnalysis.pagesAnalyzed} pages across the website
- Page Types Found: ${websiteData.multiPageAnalysis.pageTypes.map((p) => `${p.type} (${p.url})`).join(", ")}
- Total Content Length: ${Math.round(websiteData.multiPageAnalysis.totalContentLength / 1000)}K characters
- Average Images per Page: ${Math.round(websiteData.multiPageAnalysis.avgImagesPerPage)} images
- Average Forms per Page: ${websiteData.multiPageAnalysis.avgFormsPerPage.toFixed(1)} forms

Cross-Page Consistency Analysis:
- Brand Consistency Score: ${websiteData.multiPageAnalysis.crossPageConsistency.brandConsistency.score}%
- Navigation Consistency Score: ${websiteData.multiPageAnalysis.crossPageConsistency.navigationConsistency.score}%
- Content Consistency Score: ${websiteData.multiPageAnalysis.crossPageConsistency.contentConsistency.score}%
- Brand Issues Found: ${websiteData.multiPageAnalysis.crossPageConsistency.brandConsistency.issues.join("; ") || "None"}
- Navigation Issues: ${websiteData.multiPageAnalysis.crossPageConsistency.navigationConsistency.issues.join("; ") || "None"}
- Content Issues: ${websiteData.multiPageAnalysis.crossPageConsistency.contentConsistency.issues.join("; ") || "None"}

Individual Page Analysis:
${websiteData.multiPageAnalysis.pageDetails
  .slice(0, 5)
  .map(
    (page) => `
- ${page.pageType.toUpperCase()}: ${page.url}
  * Title: "${page.title}"
  * H1 headings: ${page.headings.h1.length} (${page.headings.h1.slice(0, 2).join(", ")})
  * Images: ${page.images.total} total, ${page.images.missingAlt} without alt text
  * Forms: ${page.forms.count} forms, Labels: ${page.forms.hasLabels ? "Yes" : "No"}
  * Content Length: ${Math.round(page.contentLength / 1000)}K characters`,
  )
  .join("\n")}
`
    : "Single page analysis only - multi-page crawling not available"
}

SCORING GUIDELINES: Use these exact criteria for consistency:
- 90-100: Exceptional - Industry-leading, best practices fully implemented
- 80-89: Strong - Good implementation with minor areas for improvement
- 70-79: Adequate - Meets basic standards but has notable gaps
- 60-69: Below Average - Significant issues requiring attention
- 50-59: Poor - Major problems affecting user experience
- 0-49: Critical - Fundamental issues requiring immediate action

SCORING RATIONALE TEMPLATE: Always justify scores using this format:
"Score: [X] because [2-3 specific positive findings] but [1-2 specific areas for improvement]"

Example: "Score: 78 because the brand logo is consistently placed across all pages and color scheme maintains coherence, but messaging tone varies between sections and lacks unified brand voice throughout the customer journey."

CONTENT QUALITY EXAMPLES:

EXCELLENT (85-95): "The homepage immediately communicates value proposition with clear, benefit-focused headlines like 'Reduce Customer Support Tickets by 40% with AI-Powered Solutions.' Navigation uses action-oriented labels ('Get Started,' 'View Pricing') rather than generic terms. Content hierarchy guides users through logical progression from problem identification to solution demonstration."

POOR (45-65): "Homepage features vague headline like 'Welcome to Our Company' with no clear value proposition. Navigation uses unclear labels like 'Solutions' without context. Content lacks logical flow and fails to address user pain points or demonstrate benefits."

USABILITY SCORING EXAMPLES:

EXCELLENT (90-100): "Site loads in under 2 seconds, features consistent navigation across all 8 analyzed pages, includes comprehensive alt text for all 47 images, implements proper heading hierarchy (single H1 per page), and provides clear contact information on every page. Mobile responsiveness verified across different viewport sizes."

POOR (50-65): "Page load times exceed 5 seconds, navigation structure varies between pages, 23 of 34 images lack alt text, multiple H1 tags per page breaking accessibility standards, and contact information difficult to locate."

BRANDING EXAMPLES:

STRONG (80-90): "Brand logo appears consistently in header across all analyzed pages, color palette (#2B4C8C primary, #F8F9FA secondary) used systematically throughout site, typography hierarchy (Roboto headlines, Open Sans body) maintained across content sections, and brand voice remains professional yet approachable in all copy."

WEAK (55-70): "Logo placement inconsistent between homepage and internal pages, color usage varies significantly across sections, mixing serif and sans-serif fonts without clear hierarchy, and tone shifts from formal on About page to casual on Services page."

PROFESSIONAL TONE TEMPLATES:
- Use "demonstrates strong foundation" instead of "looks good"
- Write "requires strategic enhancement" instead of "needs work"
- State "implementation gaps identified" rather than "problems found"
- Employ "optimization opportunities" instead of "issues"
- Use "strategic recommendations" rather than "suggestions"

RECOMMENDATION SPECIFICITY:
Instead of: "Improve navigation"
Write: "Implement breadcrumb navigation on all internal pages, reduce main menu items from 8 to 5 core categories, and add search functionality to header for improved user wayfinding."

Instead of: "Fix SEO"
Write: "Optimize title tags to include primary keywords within 55 characters, add meta descriptions to 12 pages currently missing them, and implement proper H1-H6 heading hierarchy across all content sections."

Please provide a detailed analysis covering these 9 key areas based on the updated comprehensive audit framework:

1. **Branding** (Score 0-100, Weight: 18%): Core identity, positioning, and market perception:
   - Logo presence and placement consistency across all analyzed pages
   - Brand element consistency (colors, fonts, imagery) throughout the site
   - Title tag patterns and brand name usage across different page types
   - Brand voice and messaging alignment across different content areas
   - Visual identity coherence from homepage to internal pages
   - Market positioning clarity and differentiation

2. **Design** (Score 0-100, Weight: 13%): Visual consistency and aesthetic effectiveness:
   - Visual hierarchy and layout consistency across pages
   - Color scheme usage and brand alignment
   - Typography choices and readability
   - White space usage and overall aesthetic appeal
   - Mobile-responsive design implementation
   - Cross-page design consistency

3. **Messaging** (Score 0-100, Weight: 13%): Communication tone, clarity, and alignment:
   - Content clarity and messaging effectiveness
   - Brand voice consistency across all pages
   - Value proposition clarity and communication
   - Call-to-action strength and placement
   - Audience-appropriate messaging tone
   - Messaging hierarchy and information flow

4. **Usability** (Score 0-100, Weight: 13%): User-friendliness across digital touchpoints:
   - Navigation consistency across all analyzed pages and user journey flow
   - Page performance metrics (actual load times, page sizes, optimization)
   - Mobile responsiveness indicators and cross-device usability
   - Accessibility compliance across the entire site (alt text coverage, form labeling, ARIA usage)
   - Interactive elements and their consistency across pages
   - Site architecture and information hierarchy based on actual page discovery
   - Content organization and user flow patterns across different page types

5. **Content Strategy** (Score 0-100, Weight: 9%): Content creation, distribution, and effectiveness:
   - Content quality and relevance across all pages
   - Information architecture and content organization
   - Content freshness and regular updates
   - SEO content optimization and keyword strategy
   - Content variety and engagement potential
   - Cross-page content consistency and flow

6. **Digital Presence** (Score 0-100, Weight: 9%): Online visibility and performance:
   - SEO optimization (title tags, meta descriptions, heading structure)
   - Technical SEO elements visible in the HTML
   - Social media integration and presence
   - Online discoverability and search visibility
   - Digital marketing integration
   - Cross-platform consistency

7. **Customer Experience** (Score 0-100, Weight: 5%): Interactions and satisfaction across touchpoints:
   - User journey optimization and flow
   - Contact information accessibility and clarity
   - Customer support integration and visibility
   - Trust signals and credibility indicators
   - Conversion optimization elements
   - Customer feedback and review integration

8. **Competitor Analysis** (Score 0-100, Weight: 5%): Benchmarks against rivals in positioning, performance, and market opportunities:
   - **Strengths Analysis**: Identify 3-4 specific competitive advantages (e.g., "Faster page load times than industry average", "Unique value proposition in pricing transparency")
   - **Weaknesses Analysis**: Pinpoint 3-4 areas where competitors likely outperform (e.g., "Limited social proof compared to market leaders", "Fewer customer testimonials than top competitors")
   - **Market Opportunities**: List 3-4 actionable opportunities (e.g., "Untapped mobile optimization", "Emerging voice search optimization", "Local SEO gaps")
   - **Competitive Threats**: Identify 3-4 specific threats (e.g., "Competitors using AI chatbots", "Industry moving toward subscription models", "New entrants with lower pricing")
   - **Digital Presence Comparison**: Compare website performance, SEO optimization, and user experience against likely industry standards
   - **Positioning Gap Analysis**: Identify unique positioning opportunities and differentiation strategies

   Format as: "SWOT ANALYSIS:\nStrengths:\n- [specific strength 1]\n- [specific strength 2]\n\nWeaknesses:\n- [specific weakness 1]\n- [specific weakness 2]\n\nOpportunities:\n- [specific opportunity 1]\n- [specific opportunity 2]\n\nThreats:\n- [specific threat 1]\n- [specific threat 2]"

9. **Conversion Optimization** (Score 0-100, Weight: 10%): Business results and revenue generation effectiveness:
   - Lead capture form design, placement, and effectiveness across all pages
   - Call-to-action (CTA) strength, visibility, and conversion-focused language
   - Sales funnel optimization and user journey conversion points
   - Trust signals implementation (testimonials, reviews, security badges, certifications)
   - Contact and checkout process optimization and friction reduction
   - Landing page conversion elements and persuasive design
   - Social proof integration and credibility indicators
   - Value proposition clarity and benefit communication
   - Pricing transparency and purchase decision support
   - Mobile conversion optimization and responsive form design

10. **Consistency & Compliance** (Score 0-100, Weight: 5%): Uniformity and legal adherence across brand assets:
   - HTTPS usage and security compliance
   - Privacy policy presence and accessibility
   - Legal compliance and professional credibility indicators
   - Brand consistency across all touchpoints
   - Regulatory compliance indicators
   - Professional standards adherence

For each section, provide:
- A numerical score (0-100) - this will be enhanced with evidence-weighting, industry calibration, and confidence adjustments
- Number of issues found (estimate based on analysis) - used for score-recommendation alignment validation
- Number of recommendations (estimate based on analysis) - should correlate inversely with score
- Confidence level (0.0-1.0) - higher confidence for sections with concrete evidence
- Evidence level ('high', 'medium', 'low') - based on quantifiable data and specific examples
- Implementation difficulty ('easy', 'medium', 'hard', 'very_hard') - for impact weighting
- Estimated impact description (include 'high', 'medium', or 'low' impact keywords) - for priority calculation
- Priority level ('critical', 'high', 'medium', 'low') - will be auto-calculated but can be suggested
- Detailed explanation of findings with QUANTIFIABLE EVIDENCE

EVIDENCE REQUIREMENTS for HIGH-QUALITY SCORING:
- Include specific numbers, percentages, and metrics wherever possible
- Cite exact examples from the website analysis (e.g., "Logo missing on 3 of 8 analyzed pages")
- Reference cross-page consistency data when available
- Use comparative language ("compared to industry standard", "vs. benchmark")
- Quantify issues found (e.g., "15 images missing alt text out of 23 total")

CONFIDENCE LEVEL GUIDELINES:
- 0.9-1.0: Concrete evidence with quantifiable metrics and cross-page validation
- 0.7-0.8: Good evidence with some quantifiable data
- 0.5-0.6: Limited evidence or single-page analysis only
- 0.3-0.4: Minimal evidence or fallback analysis

IMPLEMENTATION DIFFICULTY GUIDELINES:
- 'easy': Simple changes, no technical expertise required, 1-2 hours
- 'medium': Moderate changes, some technical knowledge, 1-3 days
- 'hard': Complex changes, technical expertise required, 1-2 weeks
- 'very_hard': Major overhaul, significant resources, months

CRITICAL: Format the "details" field for each section using this EXACT structure:

Overview: [Brief overview with quantifiable evidence - e.g., "Analysis of 8 pages shows logo consistency at 87.5% (7/8 pages)"]

Issues:
- [Specific issue 1 with quantified evidence - e.g., "Logo missing on contact page (1 of 8 pages analyzed)"]
- [Specific issue 2 with metrics - e.g., "Color inconsistency detected on 25% of analyzed pages"]
- [Additional issues with evidence as needed]

Recommendations:
- [Actionable recommendation 1 with implementation details and estimated impact - e.g., "Add consistent logo placement across all pages - estimated 15% brand recognition improvement"]
- [Actionable recommendation 2 with specific steps - e.g., "Implement color style guide with primary (#2B4C8C) and secondary colors"]
- [Additional recommendations with implementation timeframes as needed]

Example details field:
Overview: The website demonstrates strong brand consistency with logo placement on all 8 analyzed pages and systematic color usage. However, messaging tone varies between pages, reducing brand voice coherence.

Issues:
- Messaging tone inconsistency detected across 3 different page types
- Logo size varies between desktop (120px) and mobile (80px) versions
- Color scheme lacks secondary brand colors for visual hierarchy

Recommendations:
- Develop comprehensive brand voice guidelines document specifying tone for each page type
- Standardize logo dimensions to 120px desktop, 100px mobile across all pages
- Implement secondary color palette (#F8F9FA for backgrounds, #E5E7EB for borders)
- Conduct brand consistency audit quarterly to maintain standards

CRITICAL - Use ALL Multi-Page Data: This analysis includes comprehensive crawling of multiple pages. Use the cross-page consistency scores, individual page analysis, and multi-page metrics to provide:

- Specific recommendations based on actual page-by-page findings
- Cross-page consistency issues and solutions
- Site-wide accessibility improvements based on missing alt text counts and form analysis
- Navigation improvements based on actual navigation consistency scores
- Performance optimizations based on real page size and load time data
- Brand consistency fixes based on logo presence and title tag patterns across pages
- Content strategy improvements based on heading structure analysis across all pages
- User experience enhancements based on actual site architecture and page type distribution

Reference specific pages, metrics, and cross-page issues found in your recommendations. This is a comprehensive multi-page audit, not a single-page analysis.

Also provide:
- An overall score calculated using the weighted average: (0.18 × Branding) + (0.13 × Design) + (0.13 × Messaging) + (0.13 × Usability) + (0.09 × Content Strategy) + (0.09 × Digital Presence) + (0.05 × Customer Experience) + (0.05 × Competitor Analysis) + (0.10 × Conversion Optimization) + (0.05 × Consistency & Compliance)
- A brief summary of the website's strengths and key areas for improvement
- A professional title for this audit report

Respond in this exact JSON format with ALL 10 sections:
{
  "title": "Professional audit title",
  "description": "Brief description of the audit scope",
  "overallScore": 75,
  "metadata": {
    "analysisConfidence": 0.92,
    "industryDetected": "${businessContext.industry}",
    "businessType": "${businessContext.businessType}",
    "evidenceQuality": "high",
    "analysisDepth": "${websiteData.analysisDepth}",
    "pagesAnalyzed": ${websiteData.multiPageAnalysis?.pagesAnalyzed || 1},
    "benchmarkComparison": "above_average"
  },
  "reasoningChain": [
    "Industry identification: Detected ${businessContext.industry} business based on content analysis",
    "Competitive benchmarking: Compared against ${businessContext.industry} industry standards",
    "Multi-page analysis: Evaluated consistency across ${websiteData.multiPageAnalysis?.pagesAnalyzed || 1} pages",
    "Evidence-based scoring: Each score supported by quantifiable metrics",
    "Actionable recommendations: Prioritized by business impact and implementation difficulty"
  ],
  "improvementImpact": {
    "highPriority": ["conversion_optimization", "mobile_performance", "trust_signals"],
    "estimatedROI": "15-25% improvement in key business metrics",
    "implementationTimeframe": "2-6 months for core improvements"
  },
  "sections": [
    {
      "name": "Branding",
      "score": 85,
      "maxScore": 100,
      "issues": 3,
      "recommendations": 5,
      "confidence": 0.88,
      "evidenceLevel": "high",
      "industryComparison": "above_average",
      "priorityLevel": "high",
      "implementationDifficulty": "medium",
      "estimatedImpact": "15-20% improvement in brand recognition",
      "keyEvidence": [
        "Logo present on 8/8 analyzed pages",
        "Consistent color palette (#2B4C8C primary, #F8F9FA secondary)",
        "3 different tone variations detected across page types"
      ],
      "reasoning": "Website demonstrates strong brand consistency with systematic color usage and logo placement. However, messaging tone varies between formal and casual approaches, reducing brand voice coherence.",
      "details": "Overview: The website demonstrates strong brand consistency with logo placement on all 8 analyzed pages and systematic color usage (#2B4C8C primary, #F8F9FA secondary). However, messaging tone varies between formal on About page and casual on Services page, reducing brand voice coherence.\\n\\nIssues:\\n- Messaging tone inconsistency detected across 3 different page types\\n- Logo size varies between desktop and mobile versions\\n- Missing brand guidelines documentation\\n\\nRecommendations:\\n- Develop comprehensive brand voice guidelines document\\n- Standardize logo dimensions across all devices and pages\\n- Implement quarterly brand consistency audits\\n- Create brand asset library for team reference\\n- Establish tone of voice matrix for different content types"
    },
    {
      "name": "Design",
      "score": 78,
      "maxScore": 100,
      "issues": 4,
      "recommendations": 6,
      "details": "Overview: Visual design shows modern aesthetic with good use of whitespace and typography hierarchy. Color scheme is professional but could benefit from more visual interest and improved contrast ratios.\\n\\nIssues:\\n- Low contrast ratios on secondary text (3.2:1, should be 4.5:1)\\n- Inconsistent button styles across pages\\n- Missing visual hierarchy in content sections\\n- Limited use of visual elements to break up text\\n\\nRecommendations:\\n- Increase contrast ratios to meet WCAG AA standards\\n- Standardize button designs and hover states\\n- Implement consistent heading styles and spacing\\n- Add visual elements like icons and graphics to improve engagement\\n- Create design system documentation for consistency"
    },
    {
      "name": "Messaging",
      "score": 82,
      "maxScore": 100,
      "issues": 2,
      "recommendations": 4,
      "details": "Detailed analysis and recommendations for this section..."
    },
    {
      "name": "Usability",
      "score": 75,
      "maxScore": 100,
      "issues": 5,
      "recommendations": 7,
      "details": "Detailed analysis and recommendations for this section..."
    },
    {
      "name": "Content Strategy",
      "score": 80,
      "maxScore": 100,
      "issues": 3,
      "recommendations": 5,
      "details": "Detailed analysis and recommendations for this section..."
    },
    {
      "name": "Digital Presence",
      "score": 65,
      "maxScore": 100,
      "issues": 6,
      "recommendations": 8,
      "details": "Detailed analysis and recommendations for this section..."
    },
    {
      "name": "Customer Experience",
      "score": 72,
      "maxScore": 100,
      "issues": 4,
      "recommendations": 6,
      "details": "Detailed analysis and recommendations for this section..."
    },
    {
      "name": "Competitor Analysis",
      "score": 78,
      "maxScore": 100,
      "issues": 4,
      "recommendations": 6,
      "details": "Detailed analysis including Strengths Comparison, Market Positioning, Performance Metrics, and Opportunities/Threats with specific competitive insights and recommendations..."
    },
    {
      "name": "Conversion Optimization",
      "score": 68,
      "maxScore": 100,
      "issues": 5,
      "recommendations": 7,
      "details": "Detailed analysis of lead capture forms, CTA effectiveness, sales funnel optimization, trust signals, and conversion-focused design elements with specific recommendations for improving business results..."
    },
    {
      "name": "Consistency & Compliance",
      "score": 90,
      "maxScore": 100,
      "issues": 1,
      "recommendations": 2,
      "details": "Detailed analysis and recommendations for this section..."
    }
  ],
  "summary": "Overall assessment and key recommendations..."
}

Be thorough, professional, and provide actionable insights based on the available data.
`;

  const startTime = Date.now();

  try {
    console.log("Calling Gemini AI for audit generation...");

    // Check if we have a valid API key
    if (!genAI) {
      throw new Error("AI service not properly initialized");
    }

    const result = await model.generateContent(prompt);

    if (!result || !result.response) {
      throw new Error("Empty response from AI service");
    }

    const response = await result.response;
    const text = response.text();

    if (!text || text.trim().length === 0) {
      throw new Error("Empty text response from AI service");
    }

    console.log("AI response received, length:", text.length);

    // Parse the JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in AI response:", text.substring(0, 500));
      throw new Error("Invalid response format from AI service - no JSON found");
    }

    let auditData;
    try {
      auditData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Matched JSON text:", jsonMatch[0].substring(0, 500));
      throw new Error("Failed to parse AI response - invalid JSON format");
    }

    // Quality Assurance Validation
    const validationResults = validateAuditOutput(auditData, businessContext);
    if (!validationResults.isValid) {
      console.error("Audit validation failed:", validationResults.errors);
      throw new Error(`Audit quality validation failed: ${validationResults.errors.join(', ')}`);
    }

    // Apply quality improvements based on validation
    auditData = enhanceAuditQuality(auditData, validationResults, businessContext);

    console.log("Audit data validated successfully");

    // Performance monitoring
    const performanceMetrics = {
      responseTime: Date.now() - startTime,
      tokensUsed: text.length / 4, // Approximate token count
      qualityScore: validationResults.qualityScore,
      industryAccuracy: businessContext.confidence,
      evidenceLevel: validationResults.hasEvidence,
      completenessScore: auditData.sections?.length === 10 ? 100 : (auditData.sections?.length * 10) || 0
    };

    // Log performance for learning
    console.log('Audit Performance Metrics:', {
      url: websiteData.url,
      industry: businessContext.industry,
      ...performanceMetrics,
      validationWarnings: validationResults.warnings.length
    });

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
      description: auditData.description || "Comprehensive brand audit analysis",
      overallScore: auditData.overallScore,
      date: currentDate,
      status: "completed",
      sections: auditData.sections,
      summary: auditData.summary || "Audit completed successfully",
      metadata: auditData.metadata || {},
      reasoningChain: auditData.reasoningChain || [],
      improvementImpact: auditData.improvementImpact || {},
      performanceMetrics,
    };
  } catch (error) {
    console.error("Error generating audit:", error);
    console.error("Error type:", error instanceof Error ? error.constructor.name : typeof error);

    if (error instanceof Error) {
      if (error.message.includes("quota") || error.message.includes("limit")) {
        throw new Error("AI service quota exceeded. Please try again later.");
      } else if (error.message.includes("authentication") || error.message.includes("API key")) {
        throw new Error("AI service authentication error. Please contact support.");
      } else if (error.message.includes("timeout")) {
        throw new Error("AI service timeout. Please try again.");
      } else if (error.message.includes("network") || error.message.includes("connection")) {
        throw new Error("Network error connecting to AI service. Please try again.");
      } else {
        // Re-throw our custom errors as-is
        throw error;
      }
    }

    throw new Error("Failed to generate audit analysis. Please try again.");
  }
}

export const handler: Handler = async (event, context) => {
  // Handle both direct function calls and redirected API calls
  let path = event.path;
  if (path.startsWith("/.netlify/functions/api")) {
    path = path.replace("/.netlify/functions/api", "");
  } else if (path.startsWith("/api")) {
    path = path.replace("/api", "");
  }

  // If path is empty, default to root
  if (!path) path = "/";

  const method = event.httpMethod;

  console.log(
    `Function called with path: ${event.path}, processed path: ${path}, method: ${method}`,
  );

  // Set CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Content-Type": "application/json",
  };

  // Handle preflight requests
  if (method === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  try {
    // Handle different routes
    if (path === "/ping" && method === "GET") {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: "ping pong" }),
      };
    }

    if (path === "/audit" && method === "POST") {
      const body = event.body ? JSON.parse(event.body) : {};
      const { url } = body;

      if (!url) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "URL is required" }),
        };
      }

      // Validate URL format
      try {
        new URL(url);
      } catch {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error:
              "Invalid URL format. Please enter a valid URL starting with http:// or https://",
          }),
        };
      }

      // Check if Gemini API key is configured
      if (!Netlify.env.get("GEMINI_API_KEY")) {
        console.error("GEMINI_API_KEY environment variable is not set");
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            error: "Server configuration error. Please contact support.",
          }),
        };
      }

      console.log("Starting comprehensive audit for URL:", url);

      try {
        // Step 1: Scrape website content with comprehensive analysis
        console.log("Step 1: Starting website scraping for:", url);
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
        console.log("Step 2: Starting AI audit generation");
        const auditResult = await generateAudit(websiteData);
        console.log(
          "Audit generated successfully. Overall score:",
          auditResult.overallScore,
        );

        // Step 3: Store audit result for sharing
        console.log("Step 3: Storing audit result");
        auditStorage.set(auditResult.id, auditResult);
        console.log(`Stored audit ${auditResult.id} for sharing`);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(auditResult),
        };
      } catch (auditError) {
        console.error("Audit generation error:", auditError);
        console.error("Error stack:", auditError instanceof Error ? auditError.stack : "No stack trace");

        // Log additional debugging information
        if (auditError instanceof Error) {
          console.error("Error name:", auditError.name);
          console.error("Error message:", auditError.message);
        }

        // Provide more specific error messages
        let errorMessage = "Internal server error";
        let statusCode = 500;

        if (auditError instanceof Error) {
          if (
            auditError.message.includes("fetch") ||
            auditError.message.includes("timeout") ||
            auditError.message.includes("ENOTFOUND") ||
            auditError.message.includes("ECONNREFUSED")
          ) {
            errorMessage =
              "Unable to access the website. Please check the URL and try again.";
            statusCode = 400;
          } else if (
            auditError.message.includes("Invalid response format") ||
            auditError.message.includes("AI service") ||
            auditError.message.includes("generateContent")
          ) {
            errorMessage = "AI service error. Please try again in a moment.";
            statusCode = 503;
          } else if (
            auditError.message.includes("API key") ||
            auditError.message.includes("authentication")
          ) {
            errorMessage = "Server configuration error. Please contact support.";
            statusCode = 500;
          } else {
            // Use the actual error message but sanitize it
            errorMessage = auditError.message.substring(0, 200);
          }
        }

        return {
          statusCode,
          headers,
          body: JSON.stringify({
            error: errorMessage,
            ...(process.env.NODE_ENV === 'development' && {
              debug: {
                originalError: auditError instanceof Error ? auditError.message : String(auditError),
                timestamp: new Date().toISOString()
              }
            })
          }),
        };
      }
    }

    if (path === "/audits" && method === "GET") {
      const auditList = Array.from(auditStorage.values()).map((audit) => ({
        id: audit.id,
        url: audit.url,
        title: audit.title,
        date: audit.date,
        overallScore: audit.overallScore,
        status: audit.status,
      }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ audits: auditList }),
      };
    }

    if (path.startsWith("/audits/") && method === "GET") {
      const auditId = path.split("/audits/")[1];
      const audit = auditStorage.get(auditId);

      if (!audit) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: "Audit not found" }),
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(audit),
      };
    }

    if (path === "/audits" && method === "POST") {
      const body = event.body ? JSON.parse(event.body) : {};
      const audit = auditStorage.get(body.id);

      if (!audit) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: "Audit not found" }),
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, id: body.id }),
      };
    }

    // Default 404
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: "Not found" }),
    };
  } catch (error) {
    console.error("Function error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
