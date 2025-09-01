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

// Function to generate audit using Gemini
async function generateAudit(websiteData: any) {
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

Analysis Depth: ${websiteData.analysisDepth || "basic"}

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

1. **Branding** (Score 0-100, Weight: 20%): Core identity, positioning, and market perception:
   - Logo presence and placement consistency across all analyzed pages
   - Brand element consistency (colors, fonts, imagery) throughout the site
   - Title tag patterns and brand name usage across different page types
   - Brand voice and messaging alignment across different content areas
   - Visual identity coherence from homepage to internal pages
   - Market positioning clarity and differentiation

2. **Design** (Score 0-100, Weight: 15%): Visual consistency and aesthetic effectiveness:
   - Visual hierarchy and layout consistency across pages
   - Color scheme usage and brand alignment
   - Typography choices and readability
   - White space usage and overall aesthetic appeal
   - Mobile-responsive design implementation
   - Cross-page design consistency

3. **Messaging** (Score 0-100, Weight: 15%): Communication tone, clarity, and alignment:
   - Content clarity and messaging effectiveness
   - Brand voice consistency across all pages
   - Value proposition clarity and communication
   - Call-to-action strength and placement
   - Audience-appropriate messaging tone
   - Messaging hierarchy and information flow

4. **Usability** (Score 0-100, Weight: 15%): User-friendliness across digital touchpoints:
   - Navigation consistency across all analyzed pages and user journey flow
   - Page performance metrics (actual load times, page sizes, optimization)
   - Mobile responsiveness indicators and cross-device usability
   - Accessibility compliance across the entire site (alt text coverage, form labeling, ARIA usage)
   - Interactive elements and their consistency across pages
   - Site architecture and information hierarchy based on actual page discovery
   - Content organization and user flow patterns across different page types

5. **Content Strategy** (Score 0-100, Weight: 10%): Content creation, distribution, and effectiveness:
   - Content quality and relevance across all pages
   - Information architecture and content organization
   - Content freshness and regular updates
   - SEO content optimization and keyword strategy
   - Content variety and engagement potential
   - Cross-page content consistency and flow

6. **Digital Presence** (Score 0-100, Weight: 10%): Online visibility and performance:
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

8. **Competitor Analysis** (Score 0-100, Weight: 10%): Benchmarks against rivals in positioning, performance, and market opportunities:
   - **Strengths Comparison (0-30)**: Conduct SWOT analysis to identify where the brand excels or lags compared to competitors
   - **Market Positioning (0-30)**: Evaluate relative market share, pricing, and differentiation strategies
   - **Performance Metrics (0-20)**: Compare KPIs such as website performance, social engagement, and online presence
   - **Opportunities/Threats (0-20)**: Identify market gaps, untapped channels, and emerging competitive risks
   - Competitive advantage identification and leverage opportunities
   - Market differentiation analysis and recommendations

9. **Consistency & Compliance** (Score 0-100, Weight: 5%): Uniformity and legal adherence across brand assets:
   - HTTPS usage and security compliance
   - Privacy policy presence and accessibility
   - Legal compliance and professional credibility indicators
   - Brand consistency across all touchpoints
   - Regulatory compliance indicators
   - Professional standards adherence

For each section, provide:
- A numerical score (0-100)
- Number of issues found (estimate based on analysis)
- Number of recommendations (estimate based on issues)
- Detailed explanation of findings and specific recommendations

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
- An overall score calculated using the weighted average: (0.20 × Branding) + (0.15 × Design) + (0.15 × Messaging) + (0.15 × Usability) + (0.10 × Content Strategy) + (0.10 × Digital Presence) + (0.05 × Customer Experience) + (0.10 × Competitor Analysis) + (0.05 × Consistency & Compliance)
- A brief summary of the website's strengths and key areas for improvement
- A professional title for this audit report

Respond in this exact JSON format with ALL 9 sections:
{
  "title": "Professional audit title",
  "description": "Brief description of the audit scope",
  "overallScore": 75,
  "sections": [
    {
      "name": "Branding",
      "score": 85,
      "maxScore": 100,
      "issues": 3,
      "recommendations": 5,
      "details": "Detailed analysis and recommendations for this section..."
    },
    {
      "name": "Design",
      "score": 78,
      "maxScore": 100,
      "issues": 4,
      "recommendations": 6,
      "details": "Detailed analysis and recommendations for this section..."
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

    // Validate required fields
    if (!auditData || typeof auditData !== 'object') {
      console.error("Invalid audit data type:", typeof auditData);
      throw new Error("Invalid audit response structure - not an object");
    }

    if (!auditData.title || typeof auditData.title !== 'string') {
      console.error("Missing or invalid title:", auditData.title);
      throw new Error("Invalid audit response structure - missing title");
    }

    if (!auditData.sections || !Array.isArray(auditData.sections)) {
      console.error("Missing or invalid sections:", auditData.sections);
      throw new Error("Invalid audit response structure - missing sections array");
    }

    if (auditData.sections.length === 0) {
      console.error("Empty sections array");
      throw new Error("Invalid audit response structure - empty sections");
    }

    // Validate overallScore
    if (typeof auditData.overallScore !== 'number' || auditData.overallScore < 0 || auditData.overallScore > 100) {
      console.warn("Invalid overall score, using default:", auditData.overallScore);
      auditData.overallScore = 75; // Default fallback score
    }

    console.log("Audit data validated successfully");

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
