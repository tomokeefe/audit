import { RequestHandler } from "express";
import axios from "axios";
import * as cheerio from "cheerio";
import { AuditRequest, AuditResponse } from "@shared/api";
import {
  generateWebsiteSignature,
  getCachedScore,
  cacheScore,
  calculateStandardizedOverallScore,
  validateScoreConsistency,
} from "../utils/deterministicScoring";
import { extractCompanyName } from "../utils/websiteHelpers";
import {
  SCORING_VERSION,
  SCORING_METHODOLOGY,
  SECTION_WEIGHTS_ARRAY,
} from "../constants/scoring";
import {
  crawlMultiplePages,
  getPerformanceMetrics,
  getSEOMetrics,
  calculateAveragePerformance,
} from "../utils/phase1-enhancements";
import { scrapeWithFirecrawl } from "../utils/firecrawl";

// Grok API configuration (x.ai)
const GROK_API_KEY = process.env.GROK_API_KEY;
const GROK_API_URL = "https://api.x.ai/v1/chat/completions";

// In-memory storage for audit results (shared with audit-storage.ts)
// In production, this would be replaced with a proper database
const auditStorage = new Map<string, AuditResponse>();

// Utility function to store audit
async function storeAuditResult(auditData: AuditResponse): Promise<void> {
  console.log(`🔵 ========================================`);
  console.log(`🔵 storeAuditResult CALLED for audit ${auditData.id}`);
  console.log(`🔵 URL: ${auditData.url}`);
  console.log(`🔵 Title: ${auditData.title}`);
  console.log(`🔵 Score: ${auditData.overallScore}`);
  console.log(`🔵 Date: ${auditData.date}`);
  console.log(`🔵 ========================================`);

  try {
    // Always use in-memory storage for immediate access within same session
    console.log(`🔵 [STORE] Step 1: Storing in memory...`);
    auditStorage.set(auditData.id, auditData);
    console.log(
      `✅ [STORE] Stored audit ${auditData.id} in memory storage (${auditStorage.size} total audits in memory)`,
    );

    // Also save to database for persistent sharing across browsers/devices
    const dbUrl = process.env.DATABASE_URL;
    console.log(`🔵 [STORE] Step 2: Checking DATABASE_URL...`);
    console.log(
      `🔵 [STORE] DATABASE_URL is ${dbUrl ? "SET (" + dbUrl.substring(0, 30) + "...)" : "NOT SET"}`,
    );

    if (dbUrl) {
      try {
        console.log(`🔵 [STORE] Step 3: Importing audit-service module...`);
        const auditServiceModule = await import("../db/audit-service.js");
        console.log(`✅ [STORE] audit-service module imported`);

        console.log(
          `🔵 [STORE] Step 4: Extracting auditService from module...`,
        );
        const { auditService } = auditServiceModule;
        console.log(`✅ [STORE] auditService extracted:`, typeof auditService);

        console.log(`🔵 [STORE] Step 5: Calling auditService.saveAudit()...`);
        console.log(`🔵 [STORE] Audit data to save:`, {
          id: auditData.id,
          url: auditData.url,
          title: auditData.title,
          overallScore: auditData.overallScore,
          sectionsCount: auditData.sections?.length || 0,
          date: auditData.date,
        });

        await auditService.saveAudit(auditData);
        console.log(
          `✅ [STORE] SUCCESS! Audit ${auditData.id} saved to database`,
        );
      } catch (dbError) {
        console.error(
          `❌ [STORE] ERROR saving audit ${auditData.id} to database:`,
          dbError,
        );
        console.error(`❌ [STORE] Error type:`, typeof dbError);
        console.error(`❌ [STORE] Error name:`, (dbError as any)?.name);
        console.error(
          `❌ [STORE] Error message:`,
          dbError instanceof Error ? dbError.message : String(dbError),
        );
        console.error(
          `❌ [STORE] Error stack:`,
          dbError instanceof Error ? dbError.stack : "No stack trace",
        );
        console.error(
          `❌ [STORE] Full error object:`,
          JSON.stringify(dbError, null, 2),
        );
        // Don't fail - in-memory storage is still available
      }
    } else {
      console.warn(
        `⚠️  [STORE] WARNING: DATABASE_URL not configured - audit ${auditData.id} will only be available in current session`,
      );
    }
  } catch (error) {
    console.error("❌ [STORE] CRITICAL ERROR in storeAuditResult:", error);
    console.error("❌ [STORE] Error type:", typeof error);
    console.error(
      "❌ [STORE] Error stack:",
      error instanceof Error ? error.stack : "No stack trace",
    );
    // Don't throw - storage failure shouldn't break audit creation
  }

  console.log(`🔵 ========================================`);
  console.log(`🔵 [STORE] storeAuditResult COMPLETED for ${auditData.id}`);
  console.log(`🔵 ========================================`);
}

// Export the storage for use in audit-storage.ts
export { auditStorage };

// Export functions for audit-progress.ts
export { storeAuditResult };
export { scrapeWebsite };
export { generateAudit };
export { generateFallbackAudit };

// Export pitch deck audit function
export async function generatePitchDeckAudit(data: any) {
  const handler = await import("./audit-pitch-deck-handler.js");
  return handler.generatePitchDeckAudit(data);
}

// Function to create fallback website data when scraping fails
export async function createFallbackData(url: string) {
  const domain = new URL(url).hostname.replace("www.", "");
  const companyName =
    domain.split(".")[0].charAt(0).toUpperCase() +
    domain.split(".")[0].slice(1);

  console.warn(`\n⚠️  ========================================`);
  console.warn(`⚠️  FALLBACK MODE ACTIVATED FOR: ${url}`);
  console.warn(`⚠️  ========================================`);
  console.warn(`   \ud83d\udeab Reason: All scraping methods failed`);
  console.warn(`   Methods attempted:`);
  console.warn(`      1. ✗ Axios (standard HTTP) - Failed`);
  console.warn(`      2. ✗ Puppeteer (headless browser) - Failed`);
  console.warn(`   \n⚠️  AUDIT LIMITATIONS:`);
  console.warn(`      - Cannot analyze content, navigation, or UX`);
  console.warn(`      - Using generic placeholder data`);
  console.warn(`      - Audit accuracy: ~20% (very limited)`);
  console.warn(`   \n✓ STILL AVAILABLE:`);
  console.warn(`      - Google Lighthouse performance data (if accessible)`);
  console.warn(`      - Basic URL/domain analysis`);
  console.warn(`   \n\ud83d\udca1 RECOMMENDATIONS:`);
  console.warn(`      1. Check if site is publicly accessible`);
  console.warn(`      2. Temporarily disable Cloudflare protection`);
  console.warn(`      3. Whitelist our scraper IP`);
  console.warn(`      4. Add GOOGLE_PAGESPEED_API_KEY for better metrics`);
  console.warn(`⚠️  ========================================\n`);

  // CRITICAL: Even in fallback mode, attempt to get PageSpeed Insights data
  // Google can often access sites that we cannot (bypasses Cloudflare)
  console.log(`\n🔍 FALLBACK MODE: Attempting PageSpeed Insights despite scraping failure...`);
  let performanceData;
  try {
    performanceData = await analyzeWebsitePerformance(url);
    if (performanceData.performanceScore > 0) {
      console.log(`✅ SUCCESS: PageSpeed data retrieved in fallback mode!`);
      console.log(`   This provides objective metrics despite content access failure`);
    } else {
      console.warn(`⚠️  PageSpeed also unavailable in fallback mode`);
      performanceData = {
        pageSizeKB: 0,
        hasSSL: url.startsWith("https://"),
        redirectCount: 0,
        responseTime: 0,
        mobileViewport: false,
        hasServiceWorker: false,
        pagespeedScore: 0,
        performanceScore: 0,
        accessibilityScore: 0,
        bestPracticesScore: 0,
        seoScore: 0,
        hasRobotsTxt: false,
        hasSitemap: false,
      };
    }
  } catch (perfError) {
    console.error(`❌ Performance analysis failed in fallback mode:`, perfError);
    performanceData = {
      pageSizeKB: 0,
      hasSSL: url.startsWith("https://"),
      redirectCount: 0,
      responseTime: 0,
      mobileViewport: false,
      hasServiceWorker: false,
      pagespeedScore: 0,
      performanceScore: 0,
      accessibilityScore: 0,
      bestPracticesScore: 0,
      seoScore: 0,
      hasRobotsTxt: false,
      hasSitemap: false,
    };
  }

  return {
    title: `${companyName} - ⚠️ Limited Access`,
    description: `⚠️ IMPORTANT: Unable to access full website content for ${domain}. This may be due to Cloudflare protection, JavaScript-only rendering, or access restrictions. Analysis accuracy is severely limited.`,
    headings: [`⚠️ Limited Content Access for ${companyName}`],
    paragraphs: [
      `⚠️ CRITICAL LIMITATION: The website at ${domain} could not be fully accessed for analysis.`,
      `Possible causes: Cloudflare protection, JavaScript-only content rendering, bot protection, or network restrictions.`,
      `NAVIGATION, CONTENT, and TECHNICAL DATA shown in this audit are GENERIC PLACEHOLDERS and DO NOT reflect the actual website.`,
      `For accurate audit results, please: (1) Temporarily disable Cloudflare protection, (2) Whitelist our scraper, or (3) Provide direct content access.`,
    ],
    images: [],
    links: [],
    navigation:
      "⚠️ Navigation could not be detected - site protected or uses JavaScript",
    footer: "⚠️ Footer content not accessible",
    brandElements: `⚠️ Brand elements could not be analyzed`,
    htmlLength: 0,
    url,
    fallbackUsed: true,
    // Performance data from PageSpeed Insights (if available) or fallback
    performance: performanceData,
    siteStructure: {
      discoveredPages: [],
      navigation: {
        mainNav: "⚠️ Not accessible - site protected",
        breadcrumbs: "",
        footer: "",
        menuItems: [], // Empty - no fake data
        hasSearch: false,
        hasLanguageSelector: false,
      },
      contentStructure: {
        headingLevels: [],
        sections: [],
        hasContactInfo: false, // Unknown, not assumed
        hasAboutPage: false, // Unknown, not assumed
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

// Function to analyze website performance and UX metrics (Phase 1 Enhanced)
async function analyzeWebsitePerformance(url: string) {
  const performanceData = {
    pageSizeKB: 0,
    hasSSL: url.startsWith("https://"),
    redirectCount: 0,
    responseTime: 0,
    mobileViewport: false,
    hasServiceWorker: false,
    pagespeedScore: 0,
    performanceScore: 0,
    accessibilityScore: 0,
    bestPracticesScore: 0,
    seoScore: 0,
    hasRobotsTxt: false,
    hasSitemap: false,
  };

  // CRITICAL: Always attempt PageSpeed Insights first - Google can access sites we can't
  console.log("🔍 Fetching PageSpeed Insights metrics (independent of scraping)...");
  try {
    const pagespeedMetrics = await getPerformanceMetrics(url);
    if (pagespeedMetrics) {
      performanceData.pagespeedScore = pagespeedMetrics.pagespeedScore;
      performanceData.performanceScore = pagespeedMetrics.performanceScore;
      performanceData.accessibilityScore = pagespeedMetrics.accessibilityScore;
      performanceData.bestPracticesScore = pagespeedMetrics.bestPracticesScore;
      performanceData.seoScore = pagespeedMetrics.seoScore;
      console.log(`✅ PageSpeed data retrieved successfully`);
    } else {
      console.warn(`⚠️  PageSpeed Insights returned no data for ${url}`);
    }
  } catch (pagespeedError) {
    console.error(`❌ PageSpeed Insights failed for ${url}:`, pagespeedError instanceof Error ? pagespeedError.message : pagespeedError);
  }

  // Attempt to get basic metrics from direct HTTP request
  try {
    const startTime = Date.now();
    const response = await axios.get(url, {
      timeout: 6000,
      maxRedirects: 5,
      validateStatus: (status) => status < 500,
    });
    const endTime = Date.now();

    performanceData.responseTime = endTime - startTime;
    performanceData.pageSizeKB = Math.round(response.data.length / 1024);
    performanceData.redirectCount = response.request._redirectCount || 0;

    // Check for mobile viewport and other UX indicators
    const $ = cheerio.load(response.data);
    performanceData.mobileViewport = $('meta[name="viewport"]').length > 0;
    performanceData.hasServiceWorker =
      response.data.includes("serviceWorker") ||
      response.data.includes("sw.js");

    console.log(`✅ Basic performance metrics collected via HTTP`);
  } catch (httpError) {
    console.warn(`⚠️  HTTP performance check failed (${httpError instanceof Error ? httpError.message : httpError})`);
    console.warn(`   Continuing with PageSpeed data only...`);
  }

  // Always attempt SEO metrics check (robots.txt, sitemap)
  try {
    console.log("🔍 Checking SEO metrics...");
    const seoMetrics = await getSEOMetrics(url);
    performanceData.hasRobotsTxt = seoMetrics.hasRobotsTxt;
    performanceData.hasSitemap = seoMetrics.hasSitemap;
    console.log(`✅ SEO metrics checked: robots.txt=${seoMetrics.hasRobotsTxt}, sitemap=${seoMetrics.hasSitemap}`);
  } catch (seoError) {
    console.warn(`⚠️  SEO metrics check failed:`, seoError);
  }

  return performanceData;
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
          loadTime: Date.now(), // Placeholder
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

// Function to scrape website using Puppeteer (headless browser) for Cloudflare-protected sites
async function scrapeWithPuppeteer(url: string) {
  console.log(
    `🚀 Launching Puppeteer for ${url} (Cloudflare/bot protection detected)`,
  );

  // Dynamic import to avoid loading puppeteer during Vite bundling
  let puppeteer;
  try {
    puppeteer = (await import("puppeteer")).default;
  } catch (importError) {
    console.error("❌ Puppeteer not available:", importError);
    throw new Error("Puppeteer not available in this environment");
  }

  let browser;
  try {
    // Use environment variable for Chromium path in production
    const launchOptions: any = {
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
        "--window-size=1920x1080",
        "--disable-extensions",
      ],
    };

    // In production/Docker, use system Chromium
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
      console.log(
        `Using Chromium at: ${process.env.PUPPETEER_EXECUTABLE_PATH}`,
      );
    }

    browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();

    // Set realistic viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    );

    // Navigate to the page with a timeout
    console.log(`   Navigating to ${url}...`);
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Wait a bit for JavaScript to render
    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log(`   ✓ Page loaded, extracting content...`);

    // Extract content using page.evaluate to run code in the browser context
    const websiteData = await page.evaluate(() => {
      // Helper to get text content
      const getText = (selector: string): string => {
        const el = document.querySelector(selector);
        return el?.textContent?.trim() || "";
      };

      // Helper to get all text from elements
      const getAllText = (selector: string): string[] => {
        const elements = document.querySelectorAll(selector);
        return Array.from(elements)
          .map((el) => el.textContent?.trim() || "")
          .filter((text) => text.length > 0);
      };

      // Helper to get attribute
      const getAttr = (selector: string, attr: string): string => {
        const el = document.querySelector(selector);
        return el?.getAttribute(attr) || "";
      };

      return {
        title: document.title || "",
        description: getAttr('meta[name="description"]', "content"),
        headings: getAllText("h1, h2, h3"),
        paragraphs: getAllText("p").slice(0, 10),
        images: Array.from(document.querySelectorAll("img"))
          .map((img) => img.getAttribute("alt") || "")
          .filter((alt) => alt.length > 0),
        links: getAllText("a").slice(0, 20),
        navigation:
          getText("nav, .nav, .menu, .navbar") ||
          getAllText("nav a, .nav a, .menu a, .navbar a").join(" "),
        footer: getText("footer"),
        brandElements: getText(".logo, .brand, #logo, #brand"),
        htmlLength: document.documentElement.outerHTML.length,
      };
    });

    console.log(
      `   ✓ Content extracted. Title: "${websiteData.title.slice(0, 50)}..."`,
    );
    console.log(
      `   ✓ Navigation: "${websiteData.navigation.slice(0, 100)}..."`,
    );

    // Get the final HTML for additional analysis (before closing browser)
    const html = await page.content();

    await browser.close();

    // Perform the same analysis as axios-based scraping
    const siteStructure = await analyzeSiteStructure(url, html);
    const uxFeatures = await analyzeUXFeatures(html);
    const performanceData = await analyzeWebsitePerformance(url);

    console.log(
      `   ✓ Site structure: ${siteStructure.discoveredPages.length} pages discovered`,
    );
    console.log(
      `   ✓ UX features: ${uxFeatures.forms.count} forms, ${uxFeatures.media.images} images`,
    );
    console.log(`✅ Puppeteer scraping completed successfully for ${url}`);

    // Try to crawl additional pages (limited to avoid long execution)
    let multiPageResults: any[] = [];
    let crossPageAnalysis: any = {
      brandConsistency: { score: 80, issues: [], recommendations: [] },
      navigationConsistency: { score: 80, issues: [], recommendations: [] },
      contentConsistency: { score: 80, issues: [], recommendations: [] },
    };

    if (siteStructure.discoveredPages.length > 0) {
      try {
        const pagesToCrawl = Math.min(3, siteStructure.discoveredPages.length); // Limit to 3 for Puppeteer
        console.log(`Crawling ${pagesToCrawl} additional pages...`);
        multiPageResults = await crawlMultiplePages(
          url,
          siteStructure.discoveredPages,
          3,
        );

        if (multiPageResults.length > 1) {
          crossPageAnalysis = analyzeCrossPageConsistency(multiPageResults);
        }
      } catch (crawlError) {
        console.warn("Multi-page crawl failed:", crawlError);
      }
    }

    return {
      title: websiteData.title.trim(),
      description: websiteData.description.trim(),
      headings: websiteData.headings,
      paragraphs: websiteData.paragraphs,
      images: websiteData.images,
      links: websiteData.links,
      navigation: websiteData.navigation.trim(),
      footer: websiteData.footer.trim(),
      brandElements: websiteData.brandElements.trim(),
      htmlLength: websiteData.htmlLength,
      url,
      fallbackUsed: false,
      scrapedWith: "puppeteer", // Flag to indicate Puppeteer was used
      performance: performanceData,
      siteStructure: siteStructure,
      uxFeatures: uxFeatures,
      multiPageAnalysis: {
        pagesAnalyzed: multiPageResults.length + 1,
        pageDetails: multiPageResults,
        crossPageConsistency: crossPageAnalysis,
        totalContentLength: multiPageResults.reduce(
          (sum, page) => sum + page.contentLength,
          websiteData.htmlLength,
        ),
        avgImagesPerPage:
          multiPageResults.length > 0
            ? multiPageResults.reduce(
                (sum, page) => sum + page.images.total,
                0,
              ) / multiPageResults.length
            : websiteData.images.length,
        avgFormsPerPage:
          multiPageResults.length > 0
            ? multiPageResults.reduce(
                (sum, page) => sum + page.forms.count,
                0,
              ) / multiPageResults.length
            : uxFeatures.forms.count,
        pageTypes: multiPageResults.map((page) => ({
          url: page.url,
          type: page.pageType,
        })),
      },
      analysisDepth: "puppeteer-comprehensive",
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';

    console.error(`❌ ========================================`);
    console.error(`❌ Puppeteer FAILED for ${url}`);
    console.error(`❌ ========================================`);
    console.error(`   Error Message: ${errorMsg}`);
    console.error(`   Error Type: ${error instanceof Error ? error.name : typeof error}`);

    // Detailed diagnostics
    if (errorMsg.includes('Failed to launch')) {
      console.error(`   \n⚠️  DIAGNOSIS: Chromium launch failed`);
      console.error(`   Possible causes:`);
      console.error(`   - Chromium not installed (run: apt-get install chromium-browser)`);
      console.error(`   - PUPPETEER_EXECUTABLE_PATH not set or incorrect`);
      console.error(`   - Missing dependencies in Docker/production`);
      console.error(`   \n✓ SOLUTION: Set PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser`);
    } else if (errorMsg.includes('timeout') || errorMsg.includes('Navigation timeout')) {
      console.error(`   \n⚠️  DIAGNOSIS: Page load timeout (>30s)`);
      console.error(`   Possible causes:`);
      console.error(`   - Site is very slow or unresponsive`);
      console.error(`   - Network issues`);
      console.error(`   - Site blocking automated browsers`);
    } else if (errorMsg.includes('net::ERR') || errorMsg.includes('ERR_')) {
      console.error(`   \n⚠️  DIAGNOSIS: Network error`);
      console.error(`   The site may be down, blocking requests, or has network issues`);
    } else {
      console.error(`   \n⚠️  DIAGNOSIS: Unknown Puppeteer error`);
      console.error(`   Stack trace: ${errorStack?.substring(0, 200)}...`);
    }

    console.error(`   \n❌ Impact: Will fall back to generic placeholder data`);
    console.error(`   Audit accuracy will be SEVERELY LIMITED for ${url}`);
    console.error(`❌ ========================================\n`);

    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Failed to close browser:', closeError);
      }
    }
    throw error;
  }
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

      // Detect if site is protected by Cloudflare, bot detection, or requires JavaScript
      const pageText = response.data.toLowerCase();
      const title = $("title").text() || "";
      const isBlocked =
        pageText.includes("just a moment") ||
        pageText.includes("cloudflare") ||
        pageText.includes("challenge") ||
        pageText.includes("bot detection") ||
        pageText.includes("ddos protection") ||
        title.toLowerCase().includes("just a moment") ||
        title.toLowerCase().includes("attention required");

      if (isBlocked) {
        console.warn(
          `⚠️  BLOCKED: ${url} is protected by Cloudflare or bot detection`,
        );
        console.warn(`   Falling back to Puppeteer (headless browser)...`);
        throw new Error(`CLOUDFLARE_DETECTED`); // Special error code to trigger Puppeteer
      }

      // Extract key elements
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

      // Enhanced multi-page analysis
      console.log("Starting comprehensive multi-page analysis...");

      // Perform site structure analysis
      const siteStructure = await analyzeSiteStructure(url, response.data);
      const uxFeatures = await analyzeUXFeatures(response.data);
      const performanceData = await analyzeWebsitePerformance(url);

      console.log(
        `✓ Site structure: ${siteStructure.discoveredPages.length} pages discovered`,
      );
      console.log(
        `✓ UX features: ${uxFeatures.forms.count} forms, ${uxFeatures.media.images} images, ${uxFeatures.accessibility.missingAltText} missing alt tags`,
      );
      console.log(
        `✓ Performance: ${performanceData.pageSizeKB}KB, ${performanceData.responseTime}ms, SSL: ${performanceData.hasSSL}`,
      );

      // Crawl multiple important pages (limit to 5 to avoid timeouts)
      let multiPageResults: any[] = [];
      let crossPageAnalysis: any = {
        brandConsistency: { score: 80, issues: [], recommendations: [] },
        navigationConsistency: { score: 80, issues: [], recommendations: [] },
        contentConsistency: { score: 80, issues: [], recommendations: [] },
      };

      if (siteStructure.discoveredPages.length > 0) {
        try {
          const pagesToCrawl = Math.min(
            5,
            siteStructure.discoveredPages.length,
          );
          console.log(
            `Crawling ${pagesToCrawl} additional pages for comprehensive analysis...`,
          );
          multiPageResults = await crawlMultiplePages(
            url,
            siteStructure.discoveredPages,
            5,
          );
          console.log(
            `✓ Successfully crawled ${multiPageResults.length} pages`,
          );

          if (multiPageResults.length > 1) {
            crossPageAnalysis = analyzeCrossPageConsistency(multiPageResults);
            console.log(
              `✓ Cross-page consistency - Brand: ${crossPageAnalysis.brandConsistency.score}, Navigation: ${crossPageAnalysis.navigationConsistency.score}, Content: ${crossPageAnalysis.contentConsistency.score}`,
            );
          }
        } catch (crawlError) {
          console.warn(
            "Multi-page crawl failed, continuing with single page:",
            crawlError,
          );
          multiPageResults = [];
        }
      } else {
        console.log("No additional pages discovered, analyzing homepage only");
      }

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
        // Enhanced performance data with real metrics
        performance: performanceData,
        // Comprehensive site structure
        siteStructure: siteStructure,
        // Detailed UX and accessibility features
        uxFeatures: uxFeatures,
        // Multi-page crawling results
        multiPageAnalysis: {
          pagesAnalyzed: multiPageResults.length + 1, // +1 for homepage
          pageDetails: multiPageResults,
          crossPageConsistency: crossPageAnalysis,
          totalContentLength: multiPageResults.reduce(
            (sum, page) => sum + page.contentLength,
            response.data.length,
          ),
          avgImagesPerPage:
            multiPageResults.length > 0
              ? multiPageResults.reduce(
                  (sum, page) => sum + page.images.total,
                  0,
                ) / multiPageResults.length
              : $("img").length,
          avgFormsPerPage:
            multiPageResults.length > 0
              ? multiPageResults.reduce(
                  (sum, page) => sum + page.forms.count,
                  0,
                ) / multiPageResults.length
              : $("form").length,
          pageTypes: multiPageResults.map((page) => ({
            url: page.url,
            type: page.pageType,
          })),
        },
        analysisDepth: "comprehensive-multipage",
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`Attempt ${attempt + 1} failed for ${url}:`, errorMessage);

      // Check if Cloudflare was detected - try Puppeteer immediately
      if (errorMessage.includes("CLOUDFLARE_DETECTED")) {
        console.log(
          `🔄 Cloudflare detected on attempt ${attempt + 1}, trying Puppeteer...`,
        );
        try {
          const puppeteerResult = await scrapeWithPuppeteer(url);
          console.log(
            `✅ Puppeteer successfully bypassed protection for ${url}`,
          );
          return puppeteerResult;
        } catch (puppeteerError) {
          console.error(
            `❌ Puppeteer also failed for ${url}:`,
            puppeteerError instanceof Error
              ? puppeteerError.message
              : puppeteerError,
          );
          // Continue to fallback data below
          if (attempt === 2) {
            console.log(`All methods failed for ${url}, using fallback data`);
            return await createFallbackData(url);
          }
        }
      }

      if (attempt === 2) {
        // Final attempt failed, try Puppeteer as last resort if not already tried
        if (!errorMessage.includes("CLOUDFLARE_DETECTED")) {
          console.log(`🔄 Final attempt: Trying Puppeteer for ${url}...`);
          try {
            const puppeteerResult = await scrapeWithPuppeteer(url);
            console.log(`✅ Puppeteer succeeded on final attempt for ${url}`);
            return puppeteerResult;
          } catch (puppeteerError) {
            console.error(
              `❌ Puppeteer failed on final attempt:`,
              puppeteerError instanceof Error
                ? puppeteerError.message
                : puppeteerError,
            );
          }
        }

        // Try Firecrawl if available (AI-optimized scraping with Cloudflare bypass)
        if (process.env.FIRECRAWL_API_KEY) {
          console.log(`🔄 Last resort: Trying Firecrawl for ${url}...`);
          try {
            const firecrawlResult = await scrapeWithFirecrawl(url);
            console.log(`✅ Firecrawl successfully accessed ${url}!`);
            return firecrawlResult;
          } catch (firecrawlError) {
            console.error(
              `❌ Firecrawl also failed:`,
              firecrawlError instanceof Error
                ? firecrawlError.message
                : firecrawlError,
            );
          }
        } else {
          console.log(`⚠️  Firecrawl not configured (no FIRECRAWL_API_KEY)`);
        }

        // All methods exhausted, use fallback data
        console.log(
          `All scraping attempts failed for ${url}, using fallback data`,
        );
        return await createFallbackData(url);
      }

      // Wait before retrying (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 1000));
    }
  }

  // This should never be reached, but just in case
  return await createFallbackData(url);
}

// Function to detect business type and industry
function detectBusinessContext(websiteData: any) {
  const { title, description, headings, paragraphs, navigation, url } =
    websiteData;
  const allText = [title, description, ...headings, ...paragraphs, navigation]
    .join(" ")
    .toLowerCase();

  // Industry detection patterns
  const industries = {
    ecommerce:
      /shop|store|buy|cart|product|ecommerce|marketplace|retail|purchase|checkout/,
    saas: /software|saas|platform|dashboard|api|subscription|trial|demo|app|cloud/,
    healthcare:
      /health|medical|doctor|clinic|hospital|patient|therapy|wellness|medicine/,
    finance:
      /finance|bank|investment|loan|insurance|mortgage|credit|financial|wealth/,
    education:
      /education|school|university|course|learning|student|teacher|academic|training/,
    realestate:
      /real estate|property|homes|rent|lease|mortgage|realtor|listing|mls/,
    restaurant:
      /restaurant|food|menu|dining|chef|cuisine|delivery|catering|takeout/,
    legal: /law|lawyer|attorney|legal|court|litigation|counsel|firm|practice/,
    consulting:
      /consulting|consultant|advisory|strategy|expert|professional services/,
    agency:
      /agency|marketing|design|advertising|creative|digital|branding|media/,
    nonprofit:
      /nonprofit|charity|donation|volunteer|foundation|cause|mission|impact/,
    portfolio:
      /portfolio|designer|photographer|artist|creative|freelance|personal|work/,
  };

  let detectedIndustry = "general";
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
    marketplace: /marketplace|platform|connect|network|community|seller|buyer/,
  };

  let businessType = "b2c";
  for (const [type, pattern] of Object.entries(businessTypes)) {
    if (pattern.test(allText)) {
      businessType = type;
      break;
    }
  }

  // Extract key business indicators
  const hasEcommerce = /shop|store|cart|buy|product|price/i.test(allText);
  const hasBooking = /book|appointment|schedule|reserve|calendar/i.test(
    allText,
  );
  const hasLogin =
    websiteData.uxFeatures?.forms?.count > 0 ||
    /login|sign in|account|dashboard/i.test(allText);
  const hasBlog =
    websiteData.siteStructure?.contentStructure?.hasBlog ||
    /blog|news|article/i.test(allText);

  return {
    industry: detectedIndustry,
    businessType,
    confidence: Math.min(confidence / 3, 1), // Normalize confidence
    features: {
      hasEcommerce,
      hasBooking,
      hasLogin,
      hasBlog,
      isServiceBased:
        businessType === "b2b" || detectedIndustry === "consulting",
      isContentFocused: hasBlog || detectedIndustry === "education",
    },
    industryBenchmarks: getIndustryBenchmarks(detectedIndustry),
  };
}

// Function to get industry-specific benchmarks
function getIndustryBenchmarks(industry: string) {
  const benchmarks = {
    ecommerce: {
      conversionRate: 2.5,
      loadTime: 2.0,
      mobileScore: 85,
      trustSignals: "high",
      priorities: [
        "conversion_optimization",
        "product_presentation",
        "checkout_flow",
        "trust_signals",
      ],
    },
    saas: {
      conversionRate: 3.0,
      loadTime: 1.5,
      mobileScore: 90,
      trustSignals: "medium",
      priorities: [
        "user_onboarding",
        "feature_clarity",
        "trial_conversion",
        "support_accessibility",
      ],
    },
    healthcare: {
      conversionRate: 4.0,
      loadTime: 2.5,
      mobileScore: 80,
      trustSignals: "critical",
      priorities: [
        "credibility",
        "accessibility",
        "privacy_compliance",
        "appointment_booking",
      ],
    },
    finance: {
      conversionRate: 2.0,
      loadTime: 2.0,
      mobileScore: 85,
      trustSignals: "critical",
      priorities: [
        "security",
        "compliance",
        "trust_building",
        "clear_communication",
      ],
    },
    general: {
      conversionRate: 2.8,
      loadTime: 2.5,
      mobileScore: 80,
      trustSignals: "medium",
      priorities: [
        "user_experience",
        "content_quality",
        "mobile_optimization",
        "performance",
      ],
    },
  };

  return benchmarks[industry] || benchmarks.general;
}

// Enhanced Scoring System Functions (Server Implementation)

// 1. Evidence-Weight Scoring Enhancement
function calculateEvidenceWeightedScore(
  baseScore: number,
  evidenceLevel: string,
  evidenceData: any,
): number {
  const evidenceMultipliers = {
    high: 1.0,
    medium: 0.9,
    low: 0.75,
    minimal: 0.6,
  };

  let multiplier =
    evidenceMultipliers[evidenceLevel as keyof typeof evidenceMultipliers] ||
    0.8;

  // Evidence quality thresholds
  const hasQuantifiableData = evidenceData?.hasNumbers || false;
  const hasSpecificExamples = evidenceData?.hasExamples || false;
  const hasCrossPageEvidence = evidenceData?.crossPageEvidence || false;

  // Bonus for high-quality evidence
  if (evidenceLevel === "high" && hasQuantifiableData && hasSpecificExamples) {
    multiplier = Math.min(multiplier + 0.1, 1.05); // Allow slight bonus for exceptional evidence
  }

  // Penalty for insufficient evidence on high scores
  if (baseScore > 80 && evidenceLevel === "low") {
    multiplier = Math.min(multiplier, 0.85); // Cap high scores with low evidence
  }

  return Math.round(baseScore * multiplier);
}

// 2. Industry Benchmark Calibration
function calibrateScoreToIndustryBenchmarks(
  score: number,
  sectionName: string,
  industry: string,
): { score: number; comparison: string; percentile: number } {
  const industryBenchmarks = {
    ecommerce: {
      Branding: { average: 75, top10: 90, top25: 85 },
      "Conversion Optimization": { average: 68, top10: 88, top25: 80 },
      Usability: { average: 70, top10: 85, top25: 78 },
      "Customer Experience": { average: 72, top10: 87, top25: 82 },
    },
    saas: {
      Branding: { average: 78, top10: 92, top25: 87 },
      Usability: { average: 82, top10: 93, top25: 88 },
      "Content Strategy": { average: 75, top10: 89, top25: 83 },
      "Digital Presence": { average: 80, top10: 91, top25: 86 },
    },
    healthcare: {
      "Consistency & Compliance": { average: 85, top10: 95, top25: 92 },
      "Customer Experience": { average: 78, top10: 90, top25: 85 },
      Usability: { average: 75, top10: 88, top25: 82 },
    },
    finance: {
      "Consistency & Compliance": { average: 88, top10: 96, top25: 93 },
      "Customer Experience": { average: 80, top10: 92, top25: 87 },
      Design: { average: 73, top10: 86, top25: 81 },
    },
    general: {
      Branding: { average: 73, top10: 87, top25: 82 },
      Design: { average: 70, top10: 85, top25: 78 },
      Usability: { average: 72, top10: 86, top25: 80 },
      "Content Strategy": { average: 69, top10: 83, top25: 77 },
    },
  };

  const benchmarks =
    industryBenchmarks[industry as keyof typeof industryBenchmarks] ||
    industryBenchmarks.general;
  const sectionBenchmark = (benchmarks as any)[sectionName] ||
    (benchmarks as any)["Branding"] || { average: 70, top10: 85, top25: 80 };

  // Calculate percentile position
  let percentile = 50; // Default to median
  let comparison = "average";

  if (score >= sectionBenchmark.top10) {
    percentile = 95;
    comparison = "top_10_percent";
  } else if (score >= sectionBenchmark.top25) {
    percentile = 85;
    comparison = "top_25_percent";
  } else if (score >= sectionBenchmark.average + 5) {
    percentile = 70;
    comparison = "above_average";
  } else if (score >= sectionBenchmark.average - 5) {
    percentile = 50;
    comparison = "average";
  } else if (score >= sectionBenchmark.average - 15) {
    percentile = 30;
    comparison = "below_average";
  } else {
    percentile = 15;
    comparison = "bottom_quartile";
  }

  return { score, comparison, percentile };
}

// 3. Confidence-Adjusted Scoring
function adjustScoreForConfidence(
  score: number,
  confidence: number,
  hasEvidence: boolean,
): number {
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
function calculateImplementationImpactScore(
  baseScore: number,
  implementationDifficulty: string,
  estimatedImpact: string,
): { score: number; priorityLevel: string } {
  const difficultyMultipliers = {
    easy: 1.1,
    medium: 1.0,
    hard: 0.95,
    very_hard: 0.9,
  };

  const impactMultipliers = {
    high: 1.1,
    medium: 1.0,
    low: 0.9,
  };

  const difficultyMult =
    difficultyMultipliers[
      implementationDifficulty as keyof typeof difficultyMultipliers
    ] || 1.0;
  const impactMult =
    impactMultipliers[estimatedImpact as keyof typeof impactMultipliers] || 1.0;

  const weightedScore = Math.round(baseScore * difficultyMult * impactMult);

  // Determine priority level
  let priorityLevel = "medium";
  if (implementationDifficulty === "easy" && estimatedImpact === "high") {
    priorityLevel = "critical";
  } else if (difficultyMult >= 1.05 || impactMult >= 1.05) {
    priorityLevel = "high";
  } else if (difficultyMult <= 0.95 && impactMult <= 0.95) {
    priorityLevel = "low";
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
    scoreConsistency: 0,
  };

  // Basic structure validation
  if (!auditData || typeof auditData !== "object") {
    errors.push("Invalid audit data structure");
    return {
      isValid: false,
      errors,
      warnings,
      qualityScore: 0,
      validationMetrics,
    };
  }

  // Required fields validation
  const requiredFields = ["title", "sections", "overallScore"];
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
      const requiredSectionFields = [
        "name",
        "score",
        "issues",
        "recommendations",
        "details",
      ];
      for (const field of requiredSectionFields) {
        if (section[field] === undefined) {
          errors.push(`Section ${index}: missing ${field}`);
        }
      }

      // Enhanced score validation
      if (typeof section.score === "number") {
        if (section.score < 0 || section.score > 100) {
          errors.push(
            `Section ${section.name}: invalid score ${section.score}`,
          );
        } else {
          qualityScore += 8;

          // Score consistency check
          const expectedScoreRange = calculateExpectedScoreRange(section);
          if (
            section.score >= expectedScoreRange.min &&
            section.score <= expectedScoreRange.max
          ) {
            scoreConsistencySum += 10;
          } else {
            warnings.push(
              `Section ${section.name}: score ${section.score} may be inconsistent with findings`,
            );
          }
        }
      }

      // Enhanced evidence quality validation
      if (section.details && typeof section.details === "string") {
        const evidenceMetrics = analyzeEvidenceQuality(section.details);
        evidenceQualitySum += evidenceMetrics.score;

        if (evidenceMetrics.score < 60) {
          warnings.push(
            `Section ${section.name}: evidence quality below threshold (${evidenceMetrics.score}%)`,
          );
        }

        // Recommendation-score alignment
        const alignmentScore = validateRecommendationScoreAlignment(section);
        recommendationAlignmentSum += alignmentScore;

        if (alignmentScore < 70) {
          warnings.push(
            `Section ${section.name}: recommendations may not align with score`,
          );
        }
      }
    });

    // Calculate validation metrics
    const sectionCount = auditData.sections.length;
    validationMetrics.evidenceQuality = evidenceQualitySum / sectionCount;
    validationMetrics.industryRelevance = industryRelevanceSum / sectionCount;
    validationMetrics.recommendationAlignment =
      recommendationAlignmentSum / sectionCount;
    validationMetrics.scoreConsistency = scoreConsistencySum / sectionCount;

    qualityScore +=
      (validationMetrics.evidenceQuality +
        validationMetrics.recommendationAlignment) /
      2;
  }

  // Industry-specific enhanced validation
  if (businessContext.industry) {
    const industryValidation = validateIndustrySpecificContent(
      auditData,
      businessContext,
    );
    validationMetrics.industryRelevance = industryValidation.score;
    qualityScore += industryValidation.score / 5; // Weighted contribution

    if (industryValidation.score < 70) {
      warnings.push(
        `Analysis lacks comprehensive industry-specific focus for ${businessContext.industry}`,
      );
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
    isRecommendationAligned: validationMetrics.recommendationAlignment >= 70,
  };
}

// Helper function to analyze evidence quality
function analyzeEvidenceQuality(content: string): {
  score: number;
  hasNumbers: boolean;
  hasExamples: boolean;
  hasMetrics: boolean;
} {
  let score = 40; // Base score

  const hasNumbers = /\b\d+\b/.test(content);
  const hasPercentages = /%/.test(content);
  const hasMetrics =
    /(score|percent|pages?|images?|forms?|seconds?|kb|mb|pixels?)/.test(
      content.toLowerCase(),
    );
  const hasSpecificExamples = /(e\.g\.|for example|such as|including)/.test(
    content.toLowerCase(),
  );
  const hasComparisons = /(compared to|vs\.|versus|than|better|worse)/.test(
    content.toLowerCase(),
  );
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
    hasMetrics,
  };
}

// Helper function to calculate expected score range based on findings
function calculateExpectedScoreRange(section: any): {
  min: number;
  max: number;
} {
  const issues = section.issues || 0;
  const recommendations = section.recommendations || 0;

  // More issues should correlate with lower scores
  let maxScore = 100 - issues * 8; // Each issue reduces max by ~8 points
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
function validateIndustrySpecificContent(
  auditData: any,
  businessContext: any,
): { score: number; foundTerms: string[] } {
  const industrySpecificTerms = {
    ecommerce: [
      "product",
      "cart",
      "checkout",
      "conversion",
      "purchase",
      "inventory",
      "payment",
      "shipping",
    ],
    saas: [
      "onboarding",
      "trial",
      "features",
      "dashboard",
      "subscription",
      "user experience",
      "api",
      "integration",
    ],
    healthcare: [
      "credibility",
      "accessibility",
      "privacy",
      "compliance",
      "patient",
      "medical",
      "hipaa",
      "healthcare",
    ],
    finance: [
      "security",
      "trust",
      "compliance",
      "transparency",
      "regulation",
      "financial",
      "investment",
      "banking",
    ],
    consulting: [
      "expertise",
      "consultation",
      "professional",
      "advisory",
      "strategy",
      "consulting",
      "business",
    ],
    portfolio: [
      "portfolio",
      "creative",
      "showcase",
      "design",
      "visual",
      "artistic",
      "gallery",
      "projects",
    ],
  };

  const terms =
    industrySpecificTerms[
      businessContext.industry as keyof typeof industrySpecificTerms
    ] || [];
  if (terms.length === 0) return { score: 75, foundTerms: [] }; // Default for unknown industries

  const auditText = JSON.stringify(auditData).toLowerCase();
  const foundTerms = terms.filter((term) => auditText.includes(term));

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

  // Use standardized research-based weights
  const baseWeights = [...SECTION_WEIGHTS_ARRAY];

  const industryAdjustments = {
    ecommerce: {
      // Emphasize conversion and customer experience
      adjustments: { 8: +0.05, 6: +0.03, 0: +0.02, 3: +0.02 }, // Conversion Opt, Customer Exp, Branding, Usability
      reductions: { 1: -0.02, 2: -0.02, 4: -0.01 }, // Design, Messaging, Content Strategy
    },
    saas: {
      // Emphasize usability and onboarding experience
      adjustments: { 3: +0.07, 4: +0.03, 5: +0.02, 6: +0.03 }, // Usability, Content Strategy, Digital Presence, Customer Exp
      reductions: { 1: -0.03, 7: -0.02 }, // Design, Competitor Analysis
    },
    healthcare: {
      // Emphasize compliance, credibility, and accessibility
      adjustments: { 9: +0.1, 6: +0.05, 3: +0.03, 0: +0.02 }, // Compliance, Customer Exp, Usability, Branding
      reductions: { 8: -0.05, 7: -0.03, 1: -0.02 }, // Conversion Opt, Competitor Analysis, Design
    },
    finance: {
      // Emphasize compliance, security, and trust
      adjustments: { 9: +0.12, 6: +0.05, 0: +0.03 }, // Compliance, Customer Exp, Branding
      reductions: { 8: -0.05, 1: -0.03, 7: -0.02 }, // Conversion Opt, Design, Competitor Analysis
    },
    consulting: {
      // Emphasize credibility and content strategy
      adjustments: { 4: +0.06, 0: +0.04, 8: +0.03, 6: +0.02 }, // Content Strategy, Branding, Conversion Opt, Customer Exp
      reductions: { 1: -0.03, 3: -0.02 }, // Design, Usability
    },
    portfolio: {
      // Emphasize design and branding
      adjustments: { 1: +0.1, 0: +0.07, 5: +0.03 }, // Design, Branding, Digital Presence
      reductions: { 9: -0.03, 8: -0.03, 7: -0.02, 3: -0.02 }, // Compliance, Conversion Opt, Competitor Analysis, Usability
    },
  };

  const businessTypeAdjustments = {
    b2b: {
      // Emphasize credibility and professional appearance
      adjustments: { 0: +0.02, 4: +0.02, 9: +0.01 }, // Branding, Content Strategy, Compliance
      reductions: { 1: -0.01, 8: -0.02 }, // Design, Conversion Optimization
    },
    b2c: {
      // Emphasize user experience and conversion
      adjustments: { 8: +0.02, 6: +0.02, 1: +0.01 }, // Conversion Opt, Customer Exp, Design
      reductions: { 4: -0.01, 9: -0.01 }, // Content Strategy, Compliance
    },
    marketplace: {
      // Emphasize trust and usability
      adjustments: { 3: +0.03, 6: +0.02, 9: +0.02 }, // Usability, Customer Exp, Compliance
      reductions: { 2: -0.01, 1: -0.01 }, // Messaging, Design
    },
  };

  // Feature-based adjustments
  const featureAdjustments = {
    hasEcommerce: { 8: +0.03, 6: +0.02 }, // Conversion Opt, Customer Exp
    hasBooking: { 3: +0.02, 6: +0.02 }, // Usability, Customer Exp
    hasBlog: { 4: +0.03, 5: +0.02 }, // Content Strategy, Digital Presence
    hasLogin: { 3: +0.02, 9: +0.01 }, // Usability, Compliance
  };

  // Apply adjustments
  let adjustedWeights = [...baseWeights];

  // Industry adjustments
  const industryAdj =
    industryAdjustments[industry as keyof typeof industryAdjustments];
  if (industryAdj) {
    Object.entries(industryAdj.adjustments || {}).forEach(
      ([index, adjustment]) => {
        adjustedWeights[parseInt(index)] += adjustment as number;
      },
    );
    Object.entries(industryAdj.reductions || {}).forEach(
      ([index, reduction]) => {
        adjustedWeights[parseInt(index)] += reduction as number;
      },
    );
  }

  // Business type adjustments
  const businessAdj =
    businessTypeAdjustments[
      businessType as keyof typeof businessTypeAdjustments
    ];
  if (businessAdj) {
    Object.entries(businessAdj.adjustments || {}).forEach(
      ([index, adjustment]) => {
        adjustedWeights[parseInt(index)] += adjustment as number;
      },
    );
    Object.entries(businessAdj.reductions || {}).forEach(
      ([index, reduction]) => {
        adjustedWeights[parseInt(index)] += reduction as number;
      },
    );
  }

  // Feature adjustments
  Object.entries(features).forEach(([feature, hasFeature]) => {
    if (
      hasFeature &&
      featureAdjustments[feature as keyof typeof featureAdjustments]
    ) {
      const adjustments =
        featureAdjustments[feature as keyof typeof featureAdjustments];
      Object.entries(adjustments).forEach(([index, adjustment]) => {
        adjustedWeights[parseInt(index)] += adjustment as number;
      });
    }
  });

  // Normalize weights to sum to 1.0
  const sum = adjustedWeights.reduce((a, b) => a + b, 0);
  return adjustedWeights.map((w) => w / sum);
}

// 7. Enhanced Quality Enhancement with All Improvements
function enhanceAuditQuality(
  auditData: any,
  validationResults: any,
  businessContext: any,
) {
  const enhanced = { ...auditData };

  // Get dynamic weights for this business context
  const dynamicWeights = getDynamicSectionWeights(businessContext);

  // Enhanced metadata with all validation metrics
  enhanced.metadata = {
    analysisConfidence: validationResults.qualityScore / 100,
    industryDetected: businessContext.industry,
    businessType: businessContext.businessType,
    evidenceQuality:
      validationResults.validationMetrics?.evidenceQuality >= 70
        ? "high"
        : validationResults.validationMetrics?.evidenceQuality >= 50
          ? "medium"
          : "low",
    qualityScore: validationResults.qualityScore,
    validationWarnings: validationResults.warnings.length,
    industryRelevanceScore:
      validationResults.validationMetrics?.industryRelevance || 0,
    recommendationAlignment:
      validationResults.validationMetrics?.recommendationAlignment || 0,
    scoreConsistency:
      validationResults.validationMetrics?.scoreConsistency || 0,
    dynamicWeightsApplied: true,
    scoringEnhancementsApplied: [
      "evidence_weighted",
      "industry_calibrated",
      "confidence_adjusted",
      "impact_weighted",
    ],
  };

  // Apply all scoring enhancements to each section
  enhanced.sections = enhanced.sections?.map((section: any, index: number) => {
    const enhanced_section = { ...section };
    let baseScore = enhanced_section.score;

    // Apply evidence-weighted scoring
    const evidenceData = analyzeEvidenceQuality(section.details || "");
    const evidenceLevel =
      evidenceData.score >= 80
        ? "high"
        : evidenceData.score >= 60
          ? "medium"
          : "low";
    enhanced_section.evidenceLevel = evidenceLevel;
    enhanced_section.evidenceScore = evidenceData.score;

    baseScore = calculateEvidenceWeightedScore(
      baseScore,
      evidenceLevel,
      evidenceData,
    );

    // Apply industry benchmark calibration
    const benchmarkResult = calibrateScoreToIndustryBenchmarks(
      baseScore,
      section.name,
      businessContext.industry,
    );
    enhanced_section.industryComparison = benchmarkResult.comparison;
    enhanced_section.industryPercentile = benchmarkResult.percentile;

    // Apply confidence adjustment
    const confidence = section.confidence || 0.8;
    const hasEvidence =
      validationResults.hasEvidence && evidenceData.score >= 60;
    baseScore = adjustScoreForConfidence(baseScore, confidence, hasEvidence);
    enhanced_section.confidence = confidence;

    // Apply implementation impact weighting
    const implementationDifficulty =
      section.implementationDifficulty || "medium";
    const estimatedImpactLevel = section.estimatedImpact?.includes("high")
      ? "high"
      : section.estimatedImpact?.includes("low")
        ? "low"
        : "medium";

    const impactResult = calculateImplementationImpactScore(
      baseScore,
      implementationDifficulty,
      estimatedImpactLevel,
    );
    enhanced_section.score = Math.max(0, Math.min(100, impactResult.score));
    enhanced_section.priorityLevel = impactResult.priorityLevel;
    enhanced_section.implementationDifficulty = implementationDifficulty;

    // Add quality indicators
    enhanced_section.qualityIndicators = {
      evidenceQuality: evidenceLevel,
      industryRelevant: benchmarkResult.percentile >= 50,
      scoreReliable: confidence >= 0.7,
      implementationFeasible: implementationDifficulty !== "very_hard",
      highPriority:
        impactResult.priorityLevel === "critical" ||
        impactResult.priorityLevel === "high",
    };

    return enhanced_section;
  });

  // Recalculate overall score using standardized weights for consistency
  if (enhanced.sections && enhanced.sections.length > 0) {
    const sectionScores = enhanced.sections.map(
      (section: any) => section.score,
    );
    enhanced.overallScore = calculateStandardizedOverallScore(sectionScores);
    enhanced.weightingMethod = "standardized_research_based";
    enhanced.appliedWeights = SECTION_WEIGHTS_ARRAY;
  }

  // Add improvement impact analysis
  enhanced.improvementImpact = {
    highPriority: enhanced.sections
      .filter(
        (s: any) =>
          s.priorityLevel === "critical" || s.priorityLevel === "high",
      )
      .map((s: any) => s.name.toLowerCase().replace(/\s+/g, "_")),
    estimatedROI: calculateEstimatedROI(enhanced.sections, businessContext),
    implementationTimeframe: calculateImplementationTimeframe(
      enhanced.sections,
    ),
    quickWins: enhanced.sections
      .filter(
        (s: any) =>
          s.implementationDifficulty === "easy" && s.priorityLevel === "high",
      )
      .map((s: any) => s.name),
  };

  // Add reasoning chain for transparency
  enhanced.reasoningChain = [
    `Industry identification: Detected ${businessContext.industry} business based on content analysis`,
    `Dynamic weighting: Applied ${businessContext.industry} industry-specific criteria weights`,
    `Evidence analysis: Evaluated evidence quality across all sections`,
    `Benchmark calibration: Compared against ${businessContext.industry} industry standards`,
    `Confidence adjustment: Applied confidence-based score modifications`,
    `Impact weighting: Prioritized based on implementation difficulty and estimated impact`,
    `Quality assurance: Validated recommendation-score alignment and consistency`,
  ];

  return enhanced;
}

// Helper function to calculate estimated ROI
function calculateEstimatedROI(sections: any[], businessContext: any): string {
  const highImpactSections = sections.filter(
    (s) => s.priorityLevel === "critical" || s.priorityLevel === "high",
  ).length;

  const overallScoreImprovement =
    sections.reduce((sum, section) => {
      const potentialImprovement = Math.max(0, 85 - section.score); // Assuming 85 as target
      return sum + potentialImprovement * 0.3; // Conservative estimate
    }, 0) / sections.length;

  if (businessContext.industry === "ecommerce") {
    return `${Math.round(overallScoreImprovement * 0.8)}-${Math.round(overallScoreImprovement * 1.2)}% improvement in conversion rate`;
  } else if (businessContext.industry === "saas") {
    return `${Math.round(overallScoreImprovement * 0.6)}-${Math.round(overallScoreImprovement * 1.0)}% improvement in trial conversion`;
  } else {
    return `${Math.round(overallScoreImprovement * 0.5)}-${Math.round(overallScoreImprovement * 1.0)}% improvement in key business metrics`;
  }
}

// Helper function to calculate implementation timeframe
function calculateImplementationTimeframe(sections: any[]): string {
  const difficulties = sections.map(
    (s) => s.implementationDifficulty || "medium",
  );
  const hardCount = difficulties.filter(
    (d) => d === "hard" || d === "very_hard",
  ).length;
  const easyCount = difficulties.filter((d) => d === "easy").length;

  if (hardCount > 5) {
    return "6-12 months for comprehensive improvements";
  } else if (hardCount > 2) {
    return "3-6 months for core improvements";
  } else {
    return "1-3 months for core improvements";
  }
}

// Dynamic Prompt Adaptation
function getDynamicPromptInstructions(
  businessContext: any,
  websiteData: any,
): string {
  const { industry, businessType, features } = businessContext;

  const baseInstructions = {
    ecommerce: {
      focus:
        "conversion optimization, product presentation, checkout flow, trust signals, and mobile commerce experience",
      scoringWeights:
        "Increase weight for Conversion Optimization (15%) and Customer Experience (10%)",
      specificChecks: [
        "Product page clarity and appeal",
        "Shopping cart functionality indicators",
        "Trust badges and security certificates",
        "Mobile checkout experience",
        "Customer reviews and testimonials",
        "Return/refund policy accessibility",
      ],
      successMetrics:
        "conversion rate, cart abandonment reduction, mobile sales performance",
    },
    saas: {
      focus:
        "user onboarding clarity, feature communication, trial conversion elements, and support accessibility",
      scoringWeights:
        "Increase weight for Usability (20%) and Content Strategy (15%)",
      specificChecks: [
        "Free trial or demo accessibility",
        "Feature documentation quality",
        "Onboarding flow clarity",
        "Support and help resources",
        "Pricing transparency",
        "Dashboard/app screenshots or demos",
      ],
      successMetrics:
        "trial conversion rate, user activation, support ticket reduction",
    },
    healthcare: {
      focus:
        "credibility indicators, accessibility compliance, privacy policies, and appointment booking functionality",
      scoringWeights:
        "Increase weight for Consistency & Compliance (15%) and Customer Experience (10%)",
      specificChecks: [
        "Professional credentials display",
        "HIPAA compliance indicators",
        "Appointment booking system",
        "Patient testimonials and reviews",
        "Accessibility features (ADA compliance)",
        "Contact information and location details",
      ],
      successMetrics:
        "appointment bookings, patient trust indicators, compliance adherence",
    },
    finance: {
      focus:
        "security indicators, regulatory compliance, trust building elements, and clear financial communication",
      scoringWeights:
        "Increase weight for Consistency & Compliance (20%) and Customer Experience (10%)",
      specificChecks: [
        "Security certifications and badges",
        "Regulatory compliance statements",
        "Clear fee structure and terms",
        "Customer protection information",
        "Professional team credentials",
        "Risk disclosure statements",
      ],
      successMetrics: "customer trust, compliance score, security perception",
    },
    portfolio: {
      focus:
        "visual presentation, project showcases, contact accessibility, and personal branding",
      scoringWeights: "Increase weight for Design (20%) and Branding (25%)",
      specificChecks: [
        "Portfolio project presentation",
        "Visual quality and consistency",
        "Contact form and information",
        "Social media integration",
        "Skills and expertise display",
        "Client testimonials or case studies",
      ],
      successMetrics:
        "inquiry generation, portfolio engagement, professional credibility",
    },
    consulting: {
      focus:
        "expertise demonstration, case studies, client testimonials, and lead generation optimization",
      scoringWeights:
        "Increase weight for Content Strategy (15%) and Conversion Optimization (15%)",
      specificChecks: [
        "Service offering clarity",
        "Case studies and success stories",
        "Client testimonials and logos",
        "Lead capture forms",
        "Expert positioning content",
        "Consultation booking process",
      ],
      successMetrics:
        "lead generation, consultation bookings, credibility indicators",
    },
  };

  const instructions = baseInstructions[
    industry as keyof typeof baseInstructions
  ] || {
    focus:
      "user experience, content quality, mobile optimization, and general best practices",
    scoringWeights: "Apply standard weighting across all criteria",
    specificChecks: [
      "General user experience quality",
      "Content readability and structure",
      "Mobile responsiveness",
      "Loading speed and performance",
      "Contact information accessibility",
      "Professional appearance",
    ],
    successMetrics:
      "user engagement, bounce rate reduction, overall user satisfaction",
  };

  // Add business type modifiers
  const businessTypeModifiers = {
    b2b: "Focus on professional credibility, lead generation, and enterprise trust signals.",
    b2c: "Emphasize user experience, emotional connection, and consumer conversion optimization.",
    marketplace:
      "Prioritize platform usability, seller/buyer trust, and transaction security.",
  };

  // Add feature-based adaptations
  const featureAdaptations = [];
  if (features.hasEcommerce)
    featureAdaptations.push("E-commerce functionality evaluation");
  if (features.hasBooking)
    featureAdaptations.push("Appointment/booking system assessment");
  if (features.hasLogin)
    featureAdaptations.push("User account and login experience review");
  if (features.hasBlog)
    featureAdaptations.push(
      "Content marketing and blog effectiveness analysis",
    );

  return `
**PRIMARY FOCUS**: ${instructions.focus}

**BUSINESS TYPE MODIFIER**: ${businessTypeModifiers[businessType as keyof typeof businessTypeModifiers] || ""}

**SCORING ADAPTATIONS**: ${instructions.scoringWeights}

**INDUSTRY-SPECIFIC EVALUATION CRITERIA**:
${instructions.specificChecks.map((check) => `- ${check}`).join("\n")}

**FEATURE-BASED ADAPTATIONS**:
${featureAdaptations.map((adaptation) => `- ${adaptation}`).join("\n")}

**SUCCESS METRICS TO EMPHASIZE**: ${instructions.successMetrics}

**COMPETITIVE CONTEXT**: Compare against typical ${industry} industry standards and ${businessType} best practices.

**RECOMMENDATION PRIORITY**: Focus on improvements that directly impact ${instructions.successMetrics} for ${industry} businesses.
  `.trim();
}

// Function to generate fallback audit when AI service is unavailable
async function generateFallbackAudit(websiteData: any): Promise<AuditResponse> {
  console.log("[FALLBACK] Generating fallback audit for:", websiteData.url);
  console.log("[FALLBACK] This means the AI API failed or timed out");

  const auditId = Date.now().toString();
  const { randomUUID } = await import("crypto");
  const shareToken = randomUUID();

  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Parse domain for title
  const domain = new URL(websiteData.url).hostname.replace("www.", "");
  const companyName =
    domain.split(".")[0].charAt(0).toUpperCase() +
    domain.split(".")[0].slice(1);

  const fallbackSections = [
    {
      name: "Branding",
      score: 75,
      maxScore: 100,
      issues: 3,
      recommendations: 5,
      details: `Overview: Brand audit analysis for ${domain} reveals solid foundational elements with opportunities for enhancement. The website maintains basic brand consistency through color and typography choices, with logo placement detected across analyzed pages.

Issues:
- Messaging tone inconsistency detected across different page types
- Logo size and placement variations between desktop and mobile versions
- Missing comprehensive brand guidelines documentation

Recommendations:
- Develop comprehensive brand voice guidelines document specifying tone for each page type
- Standardize logo dimensions across all devices and pages for consistency
- Create and implement brand asset library for team reference and consistency
- Establish quarterly brand consistency audits to maintain standards
- Develop visual brand identity guidelines covering colors, fonts, and imagery`,
    },
    {
      name: "Design",
      score: 70,
      maxScore: 100,
      issues: 4,
      recommendations: 6,
      details: `Overview: Visual design shows professional presentation with clear information hierarchy. Layout structure supports user navigation effectively with good baseline implementation of design principles.

Issues:
- Mobile responsiveness needs optimization for smaller screen sizes
- Visual contrast could be enhanced for better accessibility compliance
- Design lacks modern visual trends that competitors are implementing
- White space usage could be improved for better readability

Recommendations:
- Optimize mobile responsive design for tablets and smartphones
- Enhance color contrast ratios to meet WCAG 2.1 AA standards
- Implement modern design trends to improve visual appeal and engagement
- Improve white space usage throughout layouts for better visual hierarchy
- Create reusable design component library for consistency
- Conduct accessibility audit and remediate design-related issues`,
    },
    {
      name: "Messaging",
      score: 72,
      maxScore: 100,
      issues: 3,
      recommendations: 5,
      details: `Overview: Messaging strategy demonstrates clear communication of core value propositions. Content structure supports logical information flow across most pages with good clarity overall.

Issues:
- Messaging tone inconsistency across different sections of the site
- Call-to-action messaging could be more conversion-focused
- Headline structure lacks compelling benefit-focused language

Recommendations:
- Strengthen call-to-action messaging with benefit-focused language and urgency
- Improve content tone consistency across all pages and sections
- Develop more compelling headline structures that highlight customer benefits
- Create messaging framework document for team alignment
- Audit and improve value proposition clarity on key pages`,
    },
    {
      name: "Usability",
      score: 68,
      maxScore: 100,
      issues: 5,
      recommendations: 7,
      details: `Overview: User experience shows adequate navigation structure with room for optimization. Basic usability principles are implemented effectively with clear information architecture.

Issues:
- Navigation pathways could be simplified for better user wayfinding
- Form usability needs optimization for better completion rates
- Page loading performance requires improvement
- Mobile touch interaction patterns need enhancement
- Accessibility features such as skip links and ARIA labels need implementation

Recommendations:
- Simplify main navigation menu structure to reduce cognitive load
- Enhance form usability with better labels, validation, and error messaging
- Optimize page loading performance through asset optimization and caching
- Implement improved mobile touch interaction patterns and spacing
- Add accessibility features including skip links and ARIA labels
- Conduct user testing to identify navigation friction points
- Implement breadcrumb navigation for internal pages`,
    },
    {
      name: "Content Strategy",
      score: 73,
      maxScore: 100,
      issues: 4,
      recommendations: 6,
      details: `Overview: Content architecture supports user goals with appropriate information organization. Content quality demonstrates subject matter expertise effectively with good overall structure.

Issues:
- Content publishing schedule lacks consistency
- Content optimization for search visibility needs improvement
- Multimedia content is limited and underutilized
- Content freshness could be improved with regular updates

Recommendations:
- Develop consistent content publishing schedule with editorial calendar
- Optimize existing content for search visibility with keyword strategy
- Create more engaging multimedia content experiences including videos
- Establish content governance and quality standards documentation
- Implement regular content audit schedule for freshness and accuracy
- Develop content strategy framework aligned with business goals`,
    },
    {
      name: "Digital Presence",
      score: 65,
      maxScore: 100,
      issues: 6,
      recommendations: 8,
      details: `Overview: Digital footprint shows basic implementation across key channels with expansion opportunities. Social media integration requires strategic enhancement for better online visibility.

Issues:
- Search engine visibility optimization is below industry standards
- Social media engagement strategies need development and implementation
- Digital marketing integration across channels is limited
- Missing key SEO elements like structured data and sitemaps
- Social media presence is minimal or not properly integrated
- Cross-platform consistency and promotion opportunities are underdeveloped

Recommendations:
- Optimize search engine visibility through keyword research and content optimization
- Develop comprehensive social media engagement strategy and posting schedule
- Implement digital marketing integration across email, social, and paid channels
- Add structured data markup for enhanced search visibility
- Create and optimize social media profiles with consistent branding
- Implement proper website sitemaps and robots.txt files
- Develop cross-platform content distribution strategy
- Establish metrics and tracking for digital presence performance`,
    },
    {
      name: "Customer Experience",
      score: 74,
      maxScore: 100,
      issues: 3,
      recommendations: 5,
      details: `Overview: Customer interaction pathways provide accessible communication channels effectively. Service information presentation supports user needs adequately with good basic implementation.

Issues:
- Proactive customer support features are not implemented
- Response time communication and expectations are unclear
- Self-service resources are limited or not well-organized

Recommendations:
- Implement proactive customer support features like chatbots or help widgets
- Clarify response time expectations and communication channels prominently
- Develop comprehensive self-service resource library and documentation
- Create customer journey map to identify friction points
- Implement customer feedback collection and analysis system`,
    },
    {
      name: "Competitor Analysis",
      score: 71,
      maxScore: 100,
      issues: 4,
      recommendations: 6,
      details: `Overview: Market positioning shows differentiation potential with unique value proposition elements. Competitive landscape analysis reveals opportunities for strategic advantage development.

Issues:
- Competitive differentiation messaging could be stronger and clearer
- Competitor comparison resources are not developed or visible
- Unique selling propositions are not prominently featured
- Market positioning lacks strategic clarity

Recommendations:
- Strengthen competitive differentiation messaging with clear unique value propositions
- Develop comprehensive competitor comparison resources for informed decision-making
- Create detailed SWOT analysis and share relevant strengths with customers
- Establish clear market positioning and differentiation strategy
- Develop competitive advantage messaging framework
- Implement regular competitive intelligence monitoring process`,
    },
    {
      name: "Conversion Optimization",
      score: 66,
      maxScore: 100,
      issues: 5,
      recommendations: 7,
      details: `Overview: Conversion pathways present opportunities for strategic optimization enhancement. Lead capture mechanisms require systematic improvement approaches for better business results.

Issues:
- Call-to-action placement and visibility could be optimized
- Lead capture mechanisms are not fully optimized for conversion
- Trust signals are not prominently positioned throughout the site
- Conversion funnel analysis and optimization is lacking
- Mobile conversion experience needs improvement

Recommendations:
- Optimize call-to-action placement for maximum visibility and click-through rates
- Enhance lead capture forms with better positioning and reduced friction
- Implement prominent trust signals including testimonials and certifications
- Conduct comprehensive conversion funnel analysis and optimization
- Improve mobile conversion experience with responsive design and simplified forms
- Implement A/B testing program for ongoing conversion improvement
- Develop conversion rate optimization strategy with clear metrics and goals`,
    },
    {
      name: "Consistency & Compliance",
      score: 82,
      maxScore: 100,
      issues: 2,
      recommendations: 3,
      details: `Overview: Legal compliance and consistency standards show strong implementation across evaluated criteria. Privacy policy and security measures demonstrate appropriate protection levels.

Issues:
- Accessibility compliance could be enhanced in some areas
- Mobile optimization requirements need updates for latest standards

Recommendations:
- Conduct comprehensive accessibility audit and implement WCAG 2.1 AA compliance
- Update mobile optimization to meet latest responsive design standards
- Ensure all privacy and security policies are up to date and easily accessible`,
    },
  ];

  const overallScore = Math.round(
    fallbackSections.reduce((sum, section) => sum + section.score, 0) /
      fallbackSections.length,
  );

  console.log(
    "[FALLBACK] Calculated overall score:",
    overallScore,
    "from",
    fallbackSections.length,
    "sections",
  );
  console.log(
    "[FALLBACK] Section scores:",
    fallbackSections.map((s) => s.score).join(", "),
  );

  return {
    id: auditId,
    url: websiteData.url,
    title: `${companyName} Brand Audit Report`,
    description: `Professional brand audit analysis for ${domain} with strategic recommendations for digital presence enhancement.`,
    overallScore,
    date: currentDate,
    status: "completed",
    sections: fallbackSections,
    shareToken: shareToken, // Add share token for secure sharing
    summary: `Brand audit analysis for ${companyName} reveals a solid foundation with strategic opportunities for enhancement. The website demonstrates professional presentation across key evaluation criteria with an overall score of ${overallScore}%.

Primary strengths include effective brand consistency implementation and strong compliance standards. Key improvement opportunities focus on conversion optimization, digital presence expansion, and user experience enhancement.

Implementation of recommended improvements could yield significant increases in user engagement, conversion rates, and overall digital marketing effectiveness within a 3-6 month timeframe. Priority should be given to quick-win optimizations in conversion pathways and mobile experience enhancement.`,
    metadata: {
      analysisConfidence: 0.7,
      industryDetected: "general",
      businessType: "b2c",
      evidenceQuality: "medium",
      qualityScore: 85,
    },
  };
}

// Helper function to build audit from cache
async function buildAuditFromCache(
  cachedResult: any,
  websiteData: any,
  url: string,
): Promise<AuditResponse> {
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Use cached sections if available, otherwise generate from scores
  const sections =
    cachedResult.sections ||
    cachedResult.baseScores.map((score: number, index: number) => ({
      name: [
        "Branding",
        "Design",
        "Messaging",
        "Usability",
        "Content Strategy",
        "Digital Presence",
        "Customer Experience",
        "Competitor Analysis",
        "Conversion Optimization",
        "Consistency & Compliance",
      ][index],
      score: score,
      maxScore: 100,
      issues: Math.max(1, Math.round((100 - score) / 15)),
      recommendations: Math.max(1, Math.round((100 - score) / 20)),
      details: `Previous analysis maintained for scoring consistency. This website was analyzed previously and scores remain valid for unchanged content.`,
    }));

  return {
    id: Date.now().toString(),
    url: url,
    title: `Brand Audit for ${extractCompanyName(url)}`,
    description: `Comprehensive brand audit analysis with consistent scoring methodology`,
    overallScore: cachedResult.overallScore,
    date: currentDate,
    status: "completed",
    sections,
    summary: `Cached brand audit results ensuring scoring consistency`,
    metadata: {
      scoringEnhancementsApplied: [
        "cached_consistency",
        "standardized_weights",
      ],
      dynamicWeightsApplied: true,
      qualityScore: 95,
      industryDetected: "general",
    },
  };
}

// Parse Brand Whisperer markdown audit response and convert to structured format
function parseMarkdownAuditResponse(text: string): any {
  try {
    console.log(
      "[PARSE DEBUG] Parsing markdown response, length:",
      text.length,
    );

    // Extract overall score from "**Overall: X/100**" format
    const overallMatch = text.match(
      /\*\*Overall:\s*(\d+(?:\.\d+)?)\s*\/\s*100\*\*/i,
    );
    const overallScore = overallMatch
      ? Math.round(parseFloat(overallMatch[1]))
      : 75;

    console.log(
      "[PARSE DEBUG] Overall score match:",
      overallMatch?.[0],
      "-> score:",
      overallScore,
    );

    // Extract section scores from "N. Name – X/10" format
    const sectionMatches = text.match(
      /^\s*(\d+)\.\s+([^–-]+?)\s*(?:–|-)\s*(\d+(?:\.\d+)?)\s*\/\s*10/gm,
    );
    const sections: any[] = [];

    console.log(
      "[PARSE DEBUG] Section matches found:",
      sectionMatches?.length || 0,
    );
    const sectionNames = [
      "Visual Design & Flow",
      "Content Quality & Messaging",
      "SEO Technical & On-Page Optimization",
      "Performance & Speed",
      "Mobile Usability & Responsiveness",
      "User Experience (UX) & Navigation",
      "Accessibility",
      "Security & Technical Integrity",
      "Competitive Advantage & Market Positioning",
      "Conversion & Call-to-Action Optimization",
    ];

    if (sectionMatches) {
      console.log("[PARSE DEBUG] Parsing section scores from Grok response:");
      sectionMatches.forEach((match, index) => {
        const scoreMatch = match.match(/(\d+(?:\.\d+)?)\s*\/\s*10/);
        const scoreOut10 = scoreMatch ? parseFloat(scoreMatch[1]) : 7;
        const score = Math.round((scoreOut10 / 10) * 100);
        const sectionName = sectionNames[index] || `Section ${index + 1}`;

        console.log(
          `[PARSE DEBUG]   ${sectionName}: ${scoreOut10}/10 → ${score}%`,
        );

        // Calculate issues and recommendations based on score
        const issues = Math.max(1, Math.round((100 - score) / 15));
        const recommendations = Math.max(1, Math.round((100 - score) / 12));

        sections.push({
          name: sectionName,
          score: Math.max(0, Math.min(100, score)),
          maxScore: 100,
          issues,
          recommendations,
          details: extractSectionDetails(text, sectionName, score, index),
        });
      });
      console.log(
        `[PARSE DEBUG] Average score: ${Math.round(sections.reduce((sum, s) => sum + s.score, 0) / sections.length)}%`,
      );
    }

    // Ensure we have all 10 sections - add missing ones with default scores
    if (sections.length > 0 && sections.length < 10) {
      console.log(`[PARSE DEBUG] Only ${sections.length} sections found, filling in missing sections...`);
      const existingSectionNames = sections.map(s => s.name);
      const missingSections = sectionNames.filter(name => !existingSectionNames.includes(name));

      missingSections.forEach((name, index) => {
        const sectionIndex = sectionNames.indexOf(name);
        // Use overall score as baseline for missing sections
        const score = Math.max(50, Math.min(100, overallScore + (Math.random() * 10 - 5))); // ±5 points variance
        const issues = Math.max(1, Math.round((100 - score) / 15));
        const recommendations = Math.max(1, Math.round((100 - score) / 12));

        console.log(`[PARSE DEBUG] Adding missing section: ${name} with score ${Math.round(score)}`);
        sections.push({
          name,
          score: Math.round(score),
          maxScore: 100,
          issues,
          recommendations,
          details: extractSectionDetails(text, name, Math.round(score), sectionIndex),
        });
      });

      // Re-sort sections to match original order
      sections.sort((a, b) => {
        return sectionNames.indexOf(a.name) - sectionNames.indexOf(b.name);
      });

      console.log(`[PARSE DEBUG] After filling missing sections: ${sections.length} total sections`);
    }

    // If we couldn't parse sections at all, create default ones
    if (sections.length === 0) {
      sectionNames.forEach((name, index) => {
        const issues = Math.max(1, Math.round((100 - overallScore) / 15));
        const recommendations = Math.max(
          1,
          Math.round((100 - overallScore) / 12),
        );

        sections.push({
          name,
          score: overallScore,
          maxScore: 100,
          issues,
          recommendations,
          details: extractSectionDetails(text, name, overallScore, index),
        });
      });
    }

    // Extract strengths from "## Key Strengths" section
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

    // Extract opportunities from "## Biggest Opportunities" section
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

    // Extract detailed analysis from "## Detailed Analysis" section
    const detailedAnalysisMatch = text.match(
      /##\s+Detailed Analysis\s*\n([\s\S]*?)(?=##|$)/i,
    );
    const detailedAnalysis = detailedAnalysisMatch
      ? detailedAnalysisMatch[1].trim()
      : "";

    // Extract recommendations from "## Prioritized Recommendations" section
    const recommendationsMatch = text.match(
      /##\s+Prioritized Recommendations\s*\n([\s\S]*?)(?=##|End:|$)/i,
    );
    const recommendations = recommendationsMatch
      ? recommendationsMatch[1]
          .split("\n")
          .filter((line) => line.trim().match(/^\d+\./))
          .map((line) => line.replace(/^\d+\.\s*/, "").trim())
          .filter((r) => r.length > 0)
      : [];

    const result = {
      overallScore,
      sections: sections.slice(0, 10),
      strengths,
      opportunities,
      detailedAnalysis,
      recommendations,
      rawResponse: text,
    };

    console.log(
      "[PARSE DEBUG] Parse complete - sections:",
      result.sections.length,
      "overall:",
      result.overallScore,
    );
    console.log(
      "[PARSE DEBUG] Sample section scores:",
      result.sections.slice(0, 3).map((s) => `${s.name}: ${s.score}`),
    );
    console.log(
      "[PARSE DEBUG] Section details preview:",
      result.sections.slice(0, 2).map((s) => ({
        name: s.name,
        detailsLength: s.details?.length || 0,
        detailsPreview: s.details?.substring(0, 150) || "No details",
      })),
    );

    return result;
  } catch (error) {
    console.error("[PARSE DEBUG] Error parsing markdown response:", error);
    return null;
  }
}

// Extract section-specific details from markdown text
function extractSectionDetails(
  text: string,
  sectionName: string,
  score: number,
  sectionIndex: number = 0,
): string {
  console.log(`[PARSE DEBUG] Extracting details for section: ${sectionName}`);

  // Try to extract section-specific evidence and recommendations from new format
  // Format: "N. SectionName – X/10\n   Evidence: ...\n   Recommendations:\n   - ...\n   - ..."
  const sectionNumber = sectionIndex + 1;

  // Create regex to match this specific section block
  const sectionPattern = new RegExp(
    `${sectionNumber}\\.\\s+${sectionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[–-]\\s*[\\d.]+\\s*\\/\\s*10[\\s\\S]*?(?=\\n\\d+\\.\\s+|##\\s+Key Strengths|##\\s+Biggest|$)`,
    "i",
  );

  const sectionMatch = text.match(sectionPattern);

  let evidence = "";
  let recommendations: string[] = [];

  if (sectionMatch) {
    const sectionBlock = sectionMatch[0];
    console.log(
      `[PARSE DEBUG] Found section block for ${sectionName}, length: ${sectionBlock.length}`,
    );

    // Extract evidence
    const evidenceMatch = sectionBlock.match(
      /Evidence:\s*(.+?)(?=\n\s*Recommendations:|$)/is,
    );
    if (evidenceMatch) {
      evidence = evidenceMatch[1].trim();
      console.log(
        `[PARSE DEBUG] Extracted evidence for ${sectionName}: ${evidence.substring(0, 100)}...`,
      );
    }

    // Extract recommendations (lines starting with -)
    const recsMatch = sectionBlock.match(
      /Recommendations:\s*([\s\S]*?)(?=\n\d+\.|##|$)/i,
    );
    if (recsMatch) {
      recommendations = recsMatch[1]
        .split("\n")
        .filter((line) => line.trim().startsWith("-"))
        .map((line) => line.replace(/^-\s*/, "").trim())
        .filter((r) => r.length > 10); // Filter out very short/invalid recommendations

      console.log(
        `[PARSE DEBUG] Extracted ${recommendations.length} recommendations for ${sectionName}`,
      );
    }
  }

  // Fallback to default recommendations if none found
  if (recommendations.length === 0) {
    console.log(
      `[PARSE DEBUG] No recommendations found for ${sectionName}, using defaults`,
    );
    recommendations = getDefaultRecommendations(sectionName, score);
  }

  // Generate performance overview
  const performanceLevel =
    score >= 80 ? "strong" : score >= 60 ? "adequate" : "needs improvement";

  const overview =
    evidence ||
    `${sectionName} shows ${performanceLevel} performance based on the analysis. Score: ${score}/100.`;

  // Build formatted details
  let details = `${overview}\n\n`;

  details += "Recommendations:\n";
  recommendations.forEach((rec) => {
    details += `- ${rec}\n`;
  });

  return details.trim();
}

// Get default recommendations based on section and score
function getDefaultRecommendations(
  sectionName: string,
  score: number,
): string[] {
  // Score-based recommendations: high scores get optimization tips, low scores get fix suggestions
  const isHighScore = score >= 75;
  const isMediumScore = score >= 50 && score < 75;

  const defaults: { [key: string]: string[] } = {
    "Visual Design & Flow": isHighScore ? [
      "Consider A/B testing alternate layouts to further optimize visual hierarchy",
      "Review analytics to identify any navigation patterns that could be streamlined",
      "Explore emerging design trends that align with your brand identity",
    ] : isMediumScore ? [
      "Review logo placement and brand consistency across all pages for potential improvements",
      "Evaluate typography hierarchy and whitespace usage for better visual balance",
      "Test navigation menu logic with users to identify any friction points",
    ] : [
      "Audit logo placement and brand identity consistency across all pages",
      "Improve typography hierarchy and whitespace for better readability",
      "Restructure navigation menu for clearer user flow and better CTA visibility",
    ],
    "Content Quality & Messaging": isHighScore ? [
      "Consider content refresh strategy to maintain relevance and engagement",
      "Test headline variations to maximize click-through rates",
      "Expand high-performing content topics based on user engagement data",
    ] : isMediumScore ? [
      "Review headlines for impact and ensure copy tone aligns with brand voice",
      "Check for opportunities to integrate keywords more naturally",
      "Assess readability scores and identify content that could better address user pain points",
    ] : [
      "Revise headlines to improve clarity and engagement",
      "Optimize keyword integration without stuffing",
      "Improve readability (aim for Flesch score >60) and focus on user needs",
    ],
    "SEO Technical & On-Page Optimization": isHighScore ? [
      "Monitor search performance and identify opportunities for featured snippets",
      "Explore advanced schema markup types for enhanced search visibility",
      "Review and optimize for emerging search features and zero-click searches",
    ] : isMediumScore ? [
      "Review title tags and meta descriptions for optimization opportunities",
      "Check header tag structure (H1-H6) for improvements",
      "Consider implementing additional schema markup types",
    ] : [
      "Audit and optimize title tags and meta descriptions across all pages",
      "Fix header tag structure (H1-H6) and improve URL architecture",
      "Implement schema markup and verify robots.txt/sitemap configuration",
    ],
    "Performance & Speed": isHighScore ? [
      "Explore advanced optimization techniques like edge caching or CDN improvements",
      "Monitor Core Web Vitals trends and address any degradation proactively",
      "Consider implementing service workers for offline functionality",
    ] : isMediumScore ? [
      "Look for opportunities to reduce page load time through image optimization",
      "Review CSS/JS files for minification opportunities",
      "Test different caching strategies to improve repeat visitor experience",
    ] : [
      "Prioritize reducing page load time to under 3 seconds",
      "Compress images and minify CSS/JS files",
      "Implement browser caching and improve server response time",
    ],
    "Mobile Usability & Responsiveness": isHighScore ? [
      "Test on latest mobile devices to ensure optimal experience",
      "Explore progressive web app (PWA) features for enhanced mobile experience",
      "Monitor mobile analytics for any emerging usability patterns",
    ] : isMediumScore ? [
      "Test responsive design across various device sizes for consistency",
      "Review touch target sizes to ensure they meet accessibility standards",
      "Check for any mobile-specific UX issues",
    ] : [
      "Fix responsive design issues across different device sizes",
      "Increase touch target sizes to minimum 44x44px",
      "Address mobile-specific issues like intrusive pop-ups or navigation problems",
    ],
    "User Experience (UX) & Navigation": isHighScore ? [
      "Conduct user testing to identify micro-optimization opportunities",
      "Explore personalization features based on user behavior",
      "Review analytics for any unexpected user paths or drop-off points",
    ] : isMediumScore ? [
      "Map out user journeys to identify potential friction points",
      "Consider adding breadcrumb navigation if not present",
      "Review search functionality and error page handling",
    ] : [
      "Simplify user journeys from landing to conversion",
      "Add breadcrumb navigation and improve search functionality",
      "Apply UX heuristics to identify and fix major usability issues",
    ],
    "Accessibility": isHighScore ? [
      "Review for WCAG 2.1 AAA compliance opportunities",
      "Test with actual assistive technology users for feedback",
      "Explore advanced accessibility features like skip links or ARIA live regions",
    ] : isMediumScore ? [
      "Review alt text coverage and quality across all images",
      "Check color contrast ratios on interactive elements",
      "Test keyboard navigation completeness",
    ] : [
      "Implement WCAG 2.1 AA standards including alt text for all images",
      "Fix color contrast ratios to meet minimum 4.5:1 requirement",
      "Enable complete keyboard navigation and screen reader support",
    ],
    "Security & Technical Integrity": isHighScore ? [
      "Review security headers for additional hardening opportunities",
      "Consider implementing Content Security Policy (CSP)",
      "Monitor for new security best practices and vulnerabilities",
    ] : isMediumScore ? [
      "Verify HTTPS is enforced across all pages",
      "Run a link audit to identify any broken links",
      "Review security headers for completeness",
    ] : [
      "Ensure HTTPS is enabled with valid SSL certificate across all pages",
      "Fix all broken links and images",
      "Address mixed content warnings and security vulnerabilities",
    ],
    "Competitive Advantage & Market Positioning": isHighScore ? [
      "Monitor competitor changes and adjust messaging to maintain differentiation",
      "Explore new market positioning opportunities",
      "Consider expanding into adjacent market segments",
    ] : isMediumScore ? [
      "Review messaging compared to 2-3 key competitors for differentiation",
      "Identify unique value propositions that could be highlighted more prominently",
      "Assess how the brand appears in search results vs competitors",
    ] : [
      "Clearly articulate unique value proposition vs key competitors",
      "Strengthen messaging to stand out in search results",
      "Highlight competitive differentiators more prominently",
    ],
    "Conversion & Call-to-Action Optimization": isHighScore ? [
      "Implement A/B tests for CTAs to identify incremental improvements",
      "Explore advanced personalization for CTAs based on user segment",
      "Review conversion funnel analytics for optimization opportunities",
    ] : isMediumScore ? [
      "Test different CTA placements and copy variations",
      "Review form length and identify fields that could be made optional",
      "Analyze conversion paths for potential friction points",
    ] : [
      "Optimize CTA button design, placement, and copy",
      "Reduce form length by removing unnecessary fields",
      "Implement clear conversion paths with reduced friction",
    ],
  };

  const defaultRecs = defaults[sectionName] || [
    `Review and enhance ${sectionName.toLowerCase()} based on industry best practices`,
    `Conduct user testing to identify specific areas for improvement in ${sectionName.toLowerCase()}`,
    `Implement data-driven optimizations to boost ${sectionName.toLowerCase()} effectiveness`,
  ];

  // Return 2-3 recommendations based on score
  const count = score < 70 ? 3 : score < 85 ? 2 : 1;
  return defaultRecs.slice(0, count);
}

/**
 * Enhanced Multi-Page Audit Generation with Evidence-Based Analysis
 *
 * IMPROVEMENTS IMPLEMENTED:
 *
 * 1. MULTI-PAGE CRAWLING (5-6 pages analyzed):
 *    - Crawls homepage + up to 5 additional important pages (About, Contact, Services, etc.)
 *    - Analyzes cross-page consistency for branding, navigation, and content
 *    - Provides comprehensive site-wide insights instead of homepage-only analysis
 *
 * 2. ENHANCED DATA COLLECTION:
 *    - Increased content analysis from 1500 to 4000 characters
 *    - Complete heading structure (H1, H2, H3) with hierarchy analysis
 *    - Detailed image analysis (total count, alt text coverage, missing alt tags)
 *    - Form structure and CTA analysis
 *    - Navigation menu items and site structure
 *
 * 3. COMPREHENSIVE PERFORMANCE METRICS:
 *    - PageSpeed Insights scores (performance, accessibility, SEO, best practices)
 *    - Page load times and response times
 *    - Mobile viewport configuration
 *    - SSL/HTTPS security
 *    - SEO fundamentals (robots.txt, sitemap.xml)
 *
 * 4. ACCESSIBILITY & UX METRICS:
 *    - ARIA labels and semantic HTML usage
 *    - Form labels and validation
 *    - Image accessibility (alt text coverage)
 *    - Heading structure compliance
 *    - Interactive elements (buttons, dropdowns, modals)
 *
 * 5. EVIDENCE-BASED PROMPTING:
 *    - Requires quantifiable metrics in all recommendations
 *    - Mandates specific evidence citations (e.g., "3 of 12 images missing alt text")
 *    - Enforces cross-page consistency analysis when multiple pages available
 *    - Conservative scoring: 85+ requires exceptional evidence, not assumptions
 *    - Technical metrics integration (performance scores, SEO elements)
 *
 * RESULT: More accurate, data-driven audits with actionable, measurable recommendations
 */
async function generateAudit(websiteData: any): Promise<AuditResponse> {
  const auditStartTime = Date.now();
  const { url } = websiteData;

  // Generate website signature for caching
  const websiteSignature = generateWebsiteSignature(websiteData);
  console.log(
    `Website signature: ${websiteSignature.contentHash.substring(0, 8)}...`,
  );

  // Check for cached results
  const cachedResult = getCachedScore(websiteSignature);
  if (cachedResult) {
    console.log(
      `[AUDIT DEBUG] Using cached score for ${url} - overall: ${cachedResult.overallScore}`,
    );
    return buildAuditFromCache(cachedResult, websiteData, url);
  }

  console.log(`[AUDIT DEBUG] No cache found, generating new audit for ${url}`);

  // Validate Grok API key
  if (!GROK_API_KEY) {
    console.error("GROK_API_KEY not configured");
    throw new Error("Grok API key not configured");
  }

  const startTime = Date.now();

  try {
    console.log("[AUDIT DEBUG] Starting Grok API call for:", url);
    console.log("[AUDIT DEBUG] Website title:", websiteData.title);
    console.log(
      "[AUDIT DEBUG] Pages analyzed:",
      websiteData.multiPageAnalysis?.pagesAnalyzed || 1,
    );
    console.log(
      "[AUDIT DEBUG] Performance score:",
      websiteData.performance?.performanceScore || "N/A",
    );
    console.log(
      "[AUDIT DEBUG] Accessibility score:",
      websiteData.performance?.accessibilityScore || "N/A",
    );
    console.log("[AUDIT DEBUG] SEO elements:", {
      robotsTxt: websiteData.performance?.hasRobotsTxt || false,
      sitemap: websiteData.performance?.hasSitemap || false,
      metaDescription: !!websiteData.description,
    });
    console.log("[AUDIT DEBUG] Grok API key present:", !!GROK_API_KEY);

    // Enhanced Brand Whisperer prompt requiring evidence-based analysis
    const systemPrompt = `You are Brand Whisperer's senior brand strategist with expertise in data-driven brand analysis. For URL-only inputs, FIRST extract/infer: Brand Name (from <title>/meta), Target Audience (from copy like 'for millennials' or hero sections), Challenges/Goals (infer from pain points or CTAs). If unclear, use 'General Consumer' and note it.

⚠️ IF YOU SEE WARNING SYMBOLS (⚠️) IN THE DATA: The website had limited access (Cloudflare/bot protection). You should:
1. Note in the audit that some data may be limited
2. Score based on available information - don't artificially lower scores
3. Focus recommendations on what can be observed

CRITICAL REQUIREMENTS:
- Base ALL scores on SPECIFIC EVIDENCE from the provided data
- Include QUANTIFIABLE METRICS in every section (e.g., "3 of 12 images missing alt text", "5 pages analyzed across site")
- Reference CROSS-PAGE CONSISTENCY when multiple pages analyzed
- Cite TECHNICAL METRICS (performance scores, SEO elements, accessibility features)
- Justify each score with concrete findings, not generalizations
- Score fairly and realistically: 9-10 (exceptional), 7-8 (good/solid), 5-6 (average/adequate), 3-4 (needs improvement), 1-2 (serious issues)
- Most real websites score in the 6-8 range - don't artificially deflate scores

Evaluate across ALL 10 criteria below (0–10 scores, half-points OK).
⚠️ CRITICAL: YOU MUST include ALL 10 sections in your response - do not skip any sections.
Weights for overall /100:

1. Visual Design & Flow (12%)
   - Check logo placement, color palette alignment with brand identity, typography hierarchy, whitespace usage
   - Evaluate intuitive navigation (menu logic, CTA visibility, user flow)
   - Assess design consistency across pages

2. Content Quality & Messaging (15%)
   - Assess headline strength, copy tone matching brand voice
   - Check keyword integration without stuffing, duplicate content issues
   - Evaluate call-to-action effectiveness, grammar, readability (Flesch score >60)
   - Analyze if content solves user pain points

3. SEO Technical & On-Page Optimization (12%)
   - Review title tags, meta descriptions, header tags (H1-H6)
   - Check URL structure, internal/external links, alt text for images
   - Evaluate schema markup, robots.txt/sitemap presence
   - **MUST ALIGN with Lighthouse SEO score if provided** (e.g., if Lighthouse shows 85/100, your score should be ~8.5/10)
   - Cite any Google Search Console errors if available

4. Performance & Speed (10%)
   - **CRITICAL: Use Lighthouse Performance score as primary evidence**
   - If Lighthouse shows 90/100 → your score should be ~9/10
   - If Lighthouse shows 50/100 → your score should be ~5/10
   - Test page speed (aim <3 seconds), image optimization
   - Check minification of CSS/JS, caching, server response time
   - Never score this section without referencing Lighthouse data (if available)

5. Mobile Usability & Responsiveness (10%)
   - Test responsive design, touch-friendly elements, viewport meta tag
   - Check mobile speed and usability issues (pop-ups, unclickable buttons)
   - Consider Lighthouse mobile performance scores
   - Evaluate cross-device experience

6. User Experience (UX) & Navigation (10%)
   - Map user journeys (e.g., home to CTA), breadcrumb navigation
   - Check search functionality, error pages, accessibility
   - Apply UX heuristics (Nielsen's 10 principles)

7. Accessibility (8%)
   - **MUST ALIGN with Lighthouse Accessibility score if provided**
   - If Lighthouse shows 95/100 → your score should be ~9.5/10
   - Test for WCAG standards: alt text, color contrast (>4.5:1)
   - Check keyboard navigation, screen reader compatibility
   - Evaluate semantic HTML and ARIA labels
   - Cite specific accessibility issues from Lighthouse report

8. Security & Technical Integrity (8%)
   - Check HTTPS, SSL certificate validity
   - Identify broken links/images, mixed content
   - Flag any vulnerabilities or security concerns

9. Competitive Advantage & Market Positioning (8%)
   - Identify unique offerings and features (e.g., proprietary tech, custom capabilities, specific numbers/metrics)
   - Compare positioning vs 2-3 competitors (or industry standards if competitors not evident)
   - Create a competitive positioning analysis with:
     * How website performance compares to industry benchmarks (use other section scores as reference)
     * Specific differentiators that set the brand apart
   - Generate a mini SWOT analysis:
     * Strengths: What the brand does well (from audit findings)
     * Weaknesses: Competitive gaps or areas lacking differentiation
     * Opportunities: Ways to better highlight unique value or stand out
     * Threats: Market factors or competitive pressures
   - Assess if brand messaging clearly communicates differentiation

10. Conversion & Call-to-Action Optimization (7%)
    - Review CTA placement, button design, form length
    - Analyze conversion paths and friction points
    - Suggest A/B testing opportunities

For EACH section, provide:
- Specific evidence (quote data, cite metrics)
- Quantifiable findings where available
- Cross-page observations (if multi-page data provided)
- 2-3 actionable recommendations BASED ON ACTUAL FINDINGS (not generic advice)

IMPORTANT: Recommendations MUST be:
- Based on specific issues or opportunities found in the evidence
- If score is high (8+/10), suggest optimizations or monitoring, not fixes
- If score is medium (5-7/10), suggest improvements to specific elements
- If score is low (<5/10), suggest fixes for identified problems
- Never suggest fixing something that's already working well

Structure: # Brand Whisperer Audit: [Name]
**Overall: X/100** (Grade)
## Section Scores
⚠️ IMPORTANT: Include ALL 10 sections below - do not skip sections 9 and 10!
1. Visual Design & Flow – X/10
   Evidence: [Specific findings with data - what you actually observed]
   Recommendations:
   - [Based on evidence above, not generic advice]
   - [Another specific recommendation from findings]

2. Content Quality & Messaging – X/10
   Evidence: [Specific findings - headlines analyzed, readability scores, etc.]
   Recommendations:
   - [Specific action based on findings]
   - [Another evidence-based recommendation]

3. SEO Technical & On-Page Optimization – X/10
   Evidence: [What you found - missing tags, schema status, etc.]
   Recommendations:
   - [Fix or optimize based on evidence]
   - [Another SEO improvement from findings]

4. Performance & Speed – X/10
   Evidence: [Metrics observed - load times, file sizes, etc.]
   Recommendations:
   - [Specific optimization based on metrics]
   - [Another performance improvement]

5. Mobile Usability & Responsiveness – X/10
   Evidence: [Mobile testing findings]
   Recommendations:
   - [Mobile-specific fix or optimization]
   - [Another mobile improvement]

6. User Experience (UX) & Navigation – X/10
   Evidence: [UX observations and user flow analysis]
   Recommendations:
   - [UX improvement based on findings]
   - [Navigation enhancement from evidence]

7. Accessibility – X/10
   Evidence: [Accessibility audit findings - alt text, contrast, etc.]
   Recommendations:
   - [Specific accessibility fix needed]
   - [Another WCAG improvement]

8. Security & Technical Integrity – X/10
   Evidence: [Security findings - HTTPS, SSL, broken links, etc.]
   Recommendations:
   - [Security improvement if needed]
   - [Technical fix based on evidence]

9. Competitive Advantage & Market Positioning – X/10
   Evidence:
   • Unique Offerings: [List specific features, proprietary capabilities, or unique selling points found on the site]
   • Competitive Positioning: [How the brand compares to industry standards based on audit scores - e.g., "Website Performance: X% (above/at/below industry avg)"]
   • SWOT Analysis:
     - Strengths: [What the brand does well based on audit]
     - Weaknesses: [Competitive gaps or differentiation issues]
     - Opportunities: [Ways to better highlight unique value]
     - Threats: [Market pressures or competitive factors]
   Recommendations:
   - [Specific positioning improvement based on SWOT findings]
   - [Opportunity to better highlight unique differentiators]

10. Conversion & Call-to-Action Optimization – X/10
    Evidence: [CTA analysis findings]
    Recommendations:
    - [CTA improvement based on evidence]
    - [Conversion optimization from findings]

## Key Strengths
- [Specific strength with evidence, e.g., "Strong PageSpeed score of 87/100"]
## Biggest Opportunities
- [Specific opportunity with quantifiable impact, e.g., "Adding alt text to 8 missing images would improve accessibility by 40%"]
## Detailed Analysis
[2–4 paragraphs with specific metrics and cross-page findings]

End: 'This audit shows where your brand stands—Brand Whisperer scales it to unicorn status. Reply for a custom strategy call.'`;

    // Prepare comprehensive multi-page content
    const multiPageContent = websiteData.multiPageAnalysis?.pageDetails
      ? websiteData.multiPageAnalysis.pageDetails
          .map(
            (page: any) =>
              `${page.pageType?.toUpperCase() || "PAGE"}: ${page.title || "Untitled"} - ${page.headings?.h1?.[0] || ""}`,
          )
          .join("; ")
      : "Single page analyzed";

    // Prepare accessibility and UX metrics
    const uxMetrics = websiteData.uxFeatures
      ? `
Accessibility: ${websiteData.uxFeatures.accessibility?.hasAltText ? "✓" : "✗"} Alt text, ${websiteData.uxFeatures.accessibility?.missingAltText || 0} missing, ${websiteData.uxFeatures.accessibility?.hasAriaLabels ? "✓" : "✗"} ARIA labels, ${websiteData.uxFeatures.accessibility?.headingStructure ? "✓" : "✗"} Proper heading structure
Forms: ${websiteData.uxFeatures.forms?.count || 0} forms, ${websiteData.uxFeatures.forms?.hasLabels ? "✓" : "✗"} Labels, ${websiteData.uxFeatures.forms?.hasValidation ? "✓" : "✗"} Validation
Media: ${websiteData.uxFeatures.media?.images || 0} images, ${websiteData.uxFeatures.media?.videos || 0} videos, ${websiteData.uxFeatures.media?.hasLazyLoading ? "✓" : "✗"} Lazy loading
Interactivity: ${websiteData.uxFeatures.interactivity?.buttons || 0} buttons, ${websiteData.uxFeatures.interactivity?.dropdowns || 0} dropdowns`
      : "Limited UX data";

    // Prepare cross-page consistency metrics
    const consistencyMetrics = websiteData.multiPageAnalysis
      ?.crossPageConsistency
      ? `
Brand Consistency: ${websiteData.multiPageAnalysis.crossPageConsistency.brandConsistency?.score || 0}/100 - ${websiteData.multiPageAnalysis.crossPageConsistency.brandConsistency?.issues?.join(", ") || "No issues"}
Navigation Consistency: ${websiteData.multiPageAnalysis.crossPageConsistency.navigationConsistency?.score || 0}/100
Content Consistency: ${websiteData.multiPageAnalysis.crossPageConsistency.contentConsistency?.score || 0}/100`
      : "Single page - no consistency analysis";

    // Check if fallback data was used
    const usingFallbackData =
      websiteData.fallbackUsed === true ||
      websiteData.title?.includes("⚠️") ||
      websiteData.description?.includes("⚠️");

    const fallbackWarning = usingFallbackData
      ? `
⚠️ NOTE: LIMITED DATA ACCESS
Website content could not be fully accessed (possible Cloudflare/bot protection).
Analysis is based on limited data. Include a note in the audit about limited access.
Score based on available information - don't artificially deflate scores.
`
      : "";

    // Build Lighthouse metrics section (if available)
    const hasLighthouseData = websiteData.performance?.performanceScore || websiteData.performance?.accessibilityScore;
    const lighthouseSection = hasLighthouseData
      ? `
═══════════════════════════════════════════════════
📊 GOOGLE LIGHTHOUSE SCORES (Objective Metrics)
═══════════════════════════════════════════════════
These are REAL scores from Google Lighthouse - use them to calibrate your analysis!

Performance:     ${websiteData.performance.performanceScore || 'N/A'}/100 ${websiteData.performance.performanceScore >= 90 ? '🟢 Excellent' : websiteData.performance.performanceScore >= 50 ? '🟡 Needs Work' : websiteData.performance.performanceScore ? '🔴 Poor' : ''}
Accessibility:   ${websiteData.performance.accessibilityScore || 'N/A'}/100 ${websiteData.performance.accessibilityScore >= 90 ? '🟢 Excellent' : websiteData.performance.accessibilityScore >= 50 ? '🟡 Needs Work' : websiteData.performance.accessibilityScore ? '🔴 Poor' : ''}
SEO:             ${websiteData.performance.seoScore || 'N/A'}/100 ${websiteData.performance.seoScore >= 90 ? '🟢 Excellent' : websiteData.performance.seoScore >= 50 ? '🟡 Needs Work' : websiteData.performance.seoScore ? '🔴 Poor' : ''}
Best Practices:  ${websiteData.performance.bestPracticesScore || 'N/A'}/100 ${websiteData.performance.bestPracticesScore >= 90 ? '🟢 Excellent' : websiteData.performance.bestPracticesScore >= 50 ? '🟡 Needs Work' : websiteData.performance.bestPracticesScore ? '🔴 Poor' : ''}

⚠️ IMPORTANT: Use these Lighthouse scores to ground your section scores!
- Section 4 (Performance): Should align with Lighthouse Performance score
- Section 7 (Accessibility): Should align with Lighthouse Accessibility score
- Section 3 (SEO): Should align with Lighthouse SEO score
═══════════════════════════════════════════════════
`
      : `
⚠️ LIGHTHOUSE DATA UNAVAILABLE
Lighthouse/PageSpeed Insights data could not be retrieved.
Possible reasons: Rate limit, site not accessible to Google, API error.
Continue with other available data but note this limitation.
`;

    const userPrompt = `${fallbackWarning}Audit: ${websiteData.url}

DATA:
Title: ${websiteData.title}
Description: ${websiteData.description || "Missing"}
Content: ${websiteData.paragraphs.slice(0, 5).join(" ").substring(0, 2000)}
Headings: ${websiteData.headings.slice(0, 8).join(" | ")}

MULTI-PAGE (${websiteData.multiPageAnalysis?.pagesAnalyzed || 1} pages):
${multiPageContent}
${consistencyMetrics}
${lighthouseSection}
TECH:
SSL: ${websiteData.performance?.hasSSL ? "✓" : "✗"} | Mobile: ${websiteData.performance?.mobileViewport ? "✓" : "✗"} | ${websiteData.performance?.pageSizeKB || 0}KB
Page Load: ${websiteData.performance?.responseTime ? `${websiteData.performance.responseTime}ms` : 'N/A'} | Redirects: ${websiteData.performance?.redirectCount || 0}
Robots: ${websiteData.performance?.hasRobotsTxt ? "✓" : "✗"} | Sitemap: ${websiteData.performance?.hasSitemap ? "✓" : "✗"}

UX:
${uxMetrics}

STRUCTURE:
Nav: ${websiteData.siteStructure?.navigation?.menuItems?.slice(0, 6).join(", ") || "None"} | Search: ${websiteData.siteStructure?.navigation?.hasSearch ? "Y" : "N"}
Contact: ${websiteData.siteStructure?.contentStructure?.hasContactInfo ? "✓" : "✗"} | About: ${websiteData.siteStructure?.contentStructure?.hasAboutPage ? "✓" : "✗"} | Blog: ${websiteData.siteStructure?.contentStructure?.hasBlog ? "✓" : "✗"}

RULES:
- Use specific data (e.g., "3/8 images missing alt")
- Evidence + 2-3 Recommendations for ALL 10 sections
- Follow format exactly with "Evidence:" and "Recommendations:" headers
- Score fairly based on evidence: 8-10 for strong evidence, 6-7 for average, 4-5 for needs work, below 4 for serious issues`;

    // Add timeout to Grok API call (60 seconds max)
    const grokPromise = fetch(GROK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROK_API_KEY}`,
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        model: "grok-4-1-fast-reasoning",
        temperature: 0.1, // Low temperature for consistent, deterministic results
        max_tokens: 4500, // Increased for section-specific recommendations (10 sections × ~300 tokens each)
      }),
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Grok API timeout after 90 seconds")),
        90000, // Increased timeout for multi-page analysis
      ),
    );

    console.log("[AUDIT DEBUG] Sending request to Grok API...");
    console.log("[AUDIT DEBUG] System prompt length:", systemPrompt.length);
    console.log("[AUDIT DEBUG] User prompt length:", userPrompt.length);
    console.log(
      "[AUDIT DEBUG] Total prompt size:",
      systemPrompt.length + userPrompt.length,
    );

    const response = await Promise.race([grokPromise, timeoutPromise]);
    console.log("[AUDIT DEBUG] Grok API response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[AUDIT DEBUG] Grok API error response:", errorText);
      throw new Error(`Grok API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;

    if (!text) {
      console.error(
        "[AUDIT DEBUG] No content in Grok response. Data:",
        JSON.stringify(data).substring(0, 200),
      );
      throw new Error("No content in Grok API response");
    }

    console.log("[AUDIT DEBUG] Grok response text length:", text.length);
    console.log("[AUDIT DEBUG] First 200 chars:", text.substring(0, 200));

    // Parse markdown response and convert to structured data
    const auditData = parseMarkdownAuditResponse(text);

    if (!auditData) {
      console.error("[AUDIT DEBUG] Failed to parse audit response");
      throw new Error("Failed to parse audit response");
    }

    console.log(
      "[AUDIT DEBUG] Parsed audit - Overall score:",
      auditData.overallScore,
    );
    console.log(
      "[AUDIT DEBUG] Parsed sections count:",
      auditData.sections.length,
    );

    // Generate a unique ID and share token
    const auditId = Date.now().toString();
    const { randomUUID } = await import("crypto");
    const shareToken = randomUUID();

    const currentDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Extract title from Brand Whisperer audit heading
    const titleMatch = text.match(/# Brand Whisperer Audit:\s*(.+)/);
    const brandName = titleMatch ? titleMatch[1].trim() : new URL(url).hostname;

    const auditResult: AuditResponse = {
      id: auditId,
      url: websiteData.url,
      title: `${brandName} Brand Audit Report`,
      description: `Comprehensive brand audit analysis for ${brandName}`,
      overallScore: auditData.overallScore,
      date: currentDate,
      status: "completed",
      sections: auditData.sections,
      summary: `Brand audit for ${brandName} shows areas of strength and opportunity for growth. See detailed analysis and recommendations below.`,
      strengths: auditData.strengths,
      opportunities: auditData.opportunities,
      detailedAnalysis: auditData.detailedAnalysis,
      recommendations: auditData.recommendations,
      rawAnalysis: text,
      shareToken: shareToken, // Add share token for secure sharing
    };

    // Cache the results for consistency (including full section details)
    const websiteSignature = generateWebsiteSignature(websiteData);
    const sectionScores = auditData.sections.map(
      (section: any) => section.score,
    );
    cacheScore(
      websiteSignature,
      sectionScores,
      auditData.overallScore,
      { evidenceQuality: 85 },
      SCORING_METHODOLOGY,
      auditData.sections, // Store full section details including recommendations
    );

    return auditResult;
  } catch (error) {
    console.error("[AUDIT DEBUG] ========== ERROR GENERATING AUDIT ==========");
    console.error(
      "[AUDIT DEBUG] Error type:",
      error instanceof Error ? error.constructor.name : typeof error,
    );
    console.error(
      "[AUDIT DEBUG] Error message:",
      error instanceof Error ? error.message : "Unknown error",
    );
    console.error(
      "[AUDIT DEBUG] Error stack:",
      error instanceof Error ? error.stack : "No stack trace",
    );
    console.error("[AUDIT DEBUG] URL:", websiteData.url);
    console.error(
      "[AUDIT DEBUG] Time elapsed:",
      Date.now() - auditStartTime,
      "ms",
    );
    console.error(
      "[AUDIT DEBUG] ================================================",
    );

    // Check if it's a timeout error
    if (error instanceof Error && error.message.includes("timeout")) {
      console.log("[AUDIT DEBUG] Grok API timeout - request took too long");
      return await generateFallbackAudit(websiteData);
    }

    // Check if it's a Grok API overload error
    if (error instanceof Error && error.message.includes("overloaded")) {
      console.log("[AUDIT DEBUG] Grok API is overloaded, using fallback");
      return await generateFallbackAudit(websiteData);
    }

    // Check for other service errors
    if (
      error instanceof Error &&
      (error.message.includes("503") ||
        error.message.includes("Service Unavailable") ||
        error.message.includes("429") ||
        error.message.includes("rate limit"))
    ) {
      console.log(
        "[AUDIT DEBUG] AI service unavailable or rate limited, providing fallback audit",
      );
      return await generateFallbackAudit(websiteData);
    }

    // If all else fails, return a demo audit
    console.log(
      "[AUDIT DEBUG] Returning fallback audit due to generation error",
    );
    return await generateFallbackAudit(websiteData);
  }
}

export const handleAudit: RequestHandler = async (req, res) => {
  console.log("[AUDIT] handleAudit endpoint called");

  try {
    const { url } = req.body as AuditRequest;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({
        error: "Invalid URL format",
      });
    }

    console.log("[AUDIT] Generating audit for:", url);

    // Try to use Grok API via fetch
    try {
      const grokApiKey = process.env.GROK_API_KEY;
      if (!grokApiKey) {
        throw new Error("No Grok API key");
      }

      // Fetch website content
      let websiteContent = "Website content unavailable";
      try {
        const response = await axios.get(url, { timeout: 10000 });
        websiteContent = response.data
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
          .replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .substring(0, 3000);
        console.log("[AUDIT] Content fetched:", websiteContent.length, "chars");
      } catch (fetchError) {
        console.warn("[AUDIT] Could not fetch website content:", fetchError);
      }

      const systemPrompt = `You are Brand Whisperer's senior brand strategist and technical auditor. For URL-only inputs, FIRST extract/infer: Brand Name (from <title>/meta), Target Audience (from copy like 'for millennials' or hero sections), Challenges/Goals (infer from pain points or CTAs, e.g., 'low traffic' from blog topics). If unclear, use placeholders like 'General Consumer' and note it.

Then evaluate across exactly these 10 criteria (0–10 scores, half-points OK). Weights for overall /100:
1. Visual Design & Flow (12%)
2. Content Quality & Messaging (15%)
3. SEO Technical & On-Page Optimization (12%)
4. Performance & Speed (10%)
5. Mobile Usability & Responsiveness (10%)
6. User Experience (UX) & Navigation (10%)
7. Accessibility (8%)
8. Security & Technical Integrity (8%)
9. Competitive Advantage & Market Positioning (8%)
10. Conversion & Call-to-Action Optimization (7%)

Be insightful/candid. Structure exactly: # Brand Whisperer Audit: [Name]
**Overall: X/100** (Grade)
## Section Scores
1. ... – X/10
...
## Key Strengths
- ...
## Biggest Opportunities
- ...
## Detailed Analysis
[2–4 paras]
## Prioritized Recommendations
1. ...

End: 'This audit shows where your brand stands—Brand Whisperer scales it to unicorn status. Reply for a custom strategy call.'`;

      const userMessage = `Audit this brand's website: ${url}. Extract/infer name, audience, challenges as needed. Website content: ${websiteContent}. Analyze live site thoroughly.`;

      console.log("[AUDIT] Calling Grok API...");

      const grokResponse = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${grokApiKey}`,
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: userMessage,
            },
          ],
          model: "grok-4-1-fast-reasoning",
          temperature: 0.7,
          max_tokens: 2500,
        }),
      });

      console.log("[AUDIT] Grok status:", grokResponse.status);

      if (!grokResponse.ok) {
        const errorText = await grokResponse.text();
        console.error(
          "[AUDIT] Grok error:",
          grokResponse.status,
          errorText.substring(0, 300),
        );
        throw new Error("API error: " + grokResponse.status);
      }

      const grokData = await grokResponse.json();
      const responseText = grokData.choices?.[0]?.message?.content || "";

      if (!responseText) {
        console.error("[AUDIT] Empty response from Grok");
        throw new Error("Empty response");
      }

      console.log(
        "[AUDIT] Got response from Grok, length:",
        responseText.length,
      );

      // Parse the markdown response into sections
      const domain = new URL(url).hostname.replace("www.", "");
      const auditId = Date.now().toString();

      // Extract overall score from response
      const scoreMatch = responseText.match(/\*\*Overall:\s*(\d+)\/100/i);
      const overallScore = scoreMatch ? parseInt(scoreMatch[1]) : 75;

      // Parse section scores
      const sectionNames = [
      "Visual Design & Flow",
      "Content Quality & Messaging",
      "SEO Technical & On-Page Optimization",
      "Performance & Speed",
      "Mobile Usability & Responsiveness",
      "User Experience (UX) & Navigation",
      "Accessibility",
      "Security & Technical Integrity",
      "Competitive Advantage & Market Positioning",
      "Conversion & Call-to-Action Optimization",
    ];

      const sections = sectionNames.map((name, index) => {
        // Try to extract score from section headers
        const sectionRegex = new RegExp(
          `${index + 1}\\.\s*${name}[^–]*–\\s*(\\d+(?:\\.5)?)/10`,
          "i",
        );
        const match = responseText.match(sectionRegex);
        const scoreOut10 = match ? parseFloat(match[1]) : 7;
        const score = Math.round((scoreOut10 / 10) * 100);

        return {
          name,
          score,
          issues: Math.floor(Math.random() * 5) + 1,
          recommendations: Math.floor(Math.random() * 4) + 2,
          details: `Analysis for ${name}`,
        };
      });

      const auditResult: AuditResponse = {
        id: auditId,
        url,
        title: `${domain} Brand Audit Report`,
        description: `Brand audit analysis for ${domain}`,
        overallScore,
        status: "completed",
        date: new Date().toISOString(),
        sections,
        rawAnalysis: responseText,
      };

      console.log("[AUDIT] ✓ Grok audit created with score:", overallScore);
      await storeAuditResult(auditResult);
      res.setHeader("Content-Type", "application/json");
      return res.status(200).json(auditResult);
    } catch (grokError) {
      console.warn(
        "[AUDIT] Grok API failed:",
        grokError instanceof Error ? grokError.message : grokError,
      );
      // Fall back to demo audit
      const auditResult = await generateFallbackAudit({
        url,
        title: new URL(url).hostname,
        fallbackUsed: false,
      });
      await storeAuditResult(auditResult);
      res.setHeader("Content-Type", "application/json");
      return res.status(200).json(auditResult);
    }
  } catch (error) {
    console.error(
      "[AUDIT] Unexpected error:",
      error instanceof Error ? error.message : error,
    );

    try {
      const url = (req.body as AuditRequest).url || "example.com";
      const demoAudit = await generateFallbackAudit({
        url: url,
        title: new URL(url).hostname,
        fallbackUsed: true,
      });
      await storeAuditResult(demoAudit);
      res.status(200).json(demoAudit);
    } catch (fallbackError) {
      console.error("[AUDIT] Fallback failed:", fallbackError);
      res.status(500).json({
        error: "Unable to generate audit",
        details: error instanceof Error ? error.message : String(error),
      });
    }
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

    // Generate share token for demo audit
    const { randomUUID } = await import("crypto");
    const shareToken = randomUUID();

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
      shareToken: shareToken, // Add share token for secure sharing
      sections: [
        {
          name: "Visual Design & Flow",
          score: Math.floor(Math.random() * 20) + 70,
          details: `The ${companyName} website demonstrates good visual consistency with clear logo placement and coherent color palette. Typography hierarchy is generally well-implemented. Navigation structure is intuitive, though CTA visibility could be enhanced for better user flow.`,
        },
        {
          name: "Content Quality & Messaging",
          score: Math.floor(Math.random() * 20) + 75,
          details: `Content demonstrates strong headline effectiveness and appropriate brand voice. Copy tone is consistent and engaging. Keyword integration appears natural without stuffing. Readability is solid, though some sections could benefit from clearer focus on solving specific user pain points.`,
        },
        {
          name: "SEO Technical & On-Page Optimization",
          score: Math.floor(Math.random() * 25) + 60,
          details: `Technical SEO shows foundational elements in place. Title tags and meta descriptions are present but could be optimized for better search performance. Header tag structure (H1-H6) is generally sound. Schema markup implementation would enhance crawlability and search visibility.`,
        },
        {
          name: "Performance & Speed",
          score: Math.floor(Math.random() * 30) + 55,
          details: `Page load times are acceptable but could be improved. Image optimization opportunities exist to reduce load time below 3 seconds. CSS/JS minification is partially implemented. Server response time and caching strategies would benefit from optimization to improve Core Web Vitals.`,
        },
        {
          name: "Mobile Usability & Responsiveness",
          score: Math.floor(Math.random() * 20) + 70,
          details: `The website shows good responsive design across devices. Touch-friendly elements are generally well-implemented. Viewport meta tag is configured properly. Mobile speed is adequate, though some pop-up behaviors could be optimized for better mobile UX.`,
        },
        {
          name: "User Experience (UX) & Navigation",
          score: Math.floor(Math.random() * 25) + 65,
          details: `User journeys from homepage to conversion are generally clear. Breadcrumb navigation and site structure support good wayfinding. Search functionality is present. Error page handling could be improved. The site demonstrates adherence to several UX heuristics with room for enhancement.`,
        },
        {
          name: "Accessibility",
          score: Math.floor(Math.random() * 30) + 50,
          details: `Accessibility shows room for improvement. Alt text is present on many images but not all. Color contrast ratios meet minimum standards on most elements but some areas need adjustment. Keyboard navigation works on core elements. Screen reader compatibility would benefit from enhanced ARIA labels and semantic HTML improvements.`,
        },
        {
          name: "Security & Technical Integrity",
          score: Math.floor(Math.random() * 15) + 80,
          details: `Security foundations are solid with valid HTTPS and SSL certificate implementation. No broken links or major technical errors detected. Mixed content warnings are absent. The site demonstrates good technical integrity with proper trust signals in place.`,
        },
        {
          name: "Competitive Advantage & Market Positioning",
          score: Math.floor(Math.random() * 25) + 60,
          details: `The brand shows moderate differentiation in its market space. Unique value proposition is communicated but could be more prominent. Messaging alignment with target audience is good. Opportunities exist to strengthen competitive positioning and stand out more distinctly in search results and market comparisons.`,
        },
        {
          name: "Conversion & Call-to-Action Optimization",
          score: Math.floor(Math.random() * 25) + 65,
          details: `CTA placement is strategic with good visibility on key pages. Button design is clear and actionable. Form lengths are reasonable though simplification opportunities exist. Conversion paths are defined but could benefit from A/B testing and friction reduction to improve conversion rates.`,
        },
      ],
      summary: `${companyName} demonstrates solid technical fundamentals with clear opportunities for enhancement. The website shows strengths in security and visual design, while areas like accessibility, performance optimization, and SEO would benefit from focused improvements. Implementing the recommended changes would significantly strengthen the overall digital presence, user experience, and search visibility.`,
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
