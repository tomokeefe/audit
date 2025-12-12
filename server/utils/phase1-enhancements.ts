import axios from "axios";
import * as cheerio from "cheerio";
import https from "https";
import { URL } from "url";

/**
 * Phase 1 Enhancements:
 * 1. Multi-page crawling (5-10 key pages)
 * 2. Google PageSpeed Insights integration (free Lighthouse data)
 * 3. Real SEO checks (robots.txt, sitemap.xml, SSL certificate)
 */

interface PageData {
  url: string;
  title: string;
  description: string;
  isHomepage: boolean;
}

interface PerformanceMetrics {
  pagespeedScore: number;
  performanceScore: number;
  accessibilityScore: number;
  bestPracticesScore: number;
  seoScore: number;
  coreWebVitals: {
    lcp: number; // Largest Contentful Paint
    fid: number; // First Input Delay
    cls: number; // Cumulative Layout Shift
  };
}

interface SEOMetrics {
  hasRobotsTxt: boolean;
  hasSitemap: boolean;
  hasSSL: boolean;
  mobileOptimized: boolean;
  canonicalUrl: string | null;
}

/**
 * Multi-page crawler - identifies and crawls 5-10 key pages
 */
export async function crawlMultiplePages(baseUrl: string): Promise<PageData[]> {
  const pages: PageData[] = [];
  const visited = new Set<string>();
  const baseUrlObj = new URL(baseUrl);
  const domain = baseUrlObj.hostname;

  try {
    // Always crawl homepage first
    const homepageHtml = await fetchPage(baseUrl);
    if (homepageHtml) {
      const homepage = extractPageData(baseUrl, homepageHtml, true);
      if (homepage) {
        pages.push(homepage);
        visited.add(normalizeUrl(baseUrl));
      }

      // Extract internal links from homepage
      const links = extractInternalLinks(homepageHtml, domain);

      // Crawl up to 9 more pages
      for (const link of links) {
        if (pages.length >= 10) break;
        if (visited.has(normalizeUrl(link))) continue;

        try {
          const pageHtml = await fetchPage(link);
          if (pageHtml) {
            const pageData = extractPageData(link, pageHtml, false);
            if (pageData) {
              pages.push(pageData);
              visited.add(normalizeUrl(link));
            }
          }
        } catch (error) {
          console.warn(`Failed to crawl ${link}:`, error);
          continue;
        }
      }
    }
  } catch (error) {
    console.error("Multi-page crawl failed:", error);
  }

  // Return at least the homepage
  return pages.length > 0
    ? pages
    : [{ url: baseUrl, title: "Homepage", description: "", isHomepage: true }];
}

/**
 * Fetch page content with timeout and error handling
 */
async function fetchPage(url: string): Promise<string | null> {
  try {
    const response = await axios.get(url, {
      timeout: 8000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      maxRedirects: 3,
    });

    return response.data;
  } catch (error) {
    console.warn(
      `Failed to fetch ${url}:`,
      error instanceof Error ? error.message : "Unknown error",
    );
    return null;
  }
}

/**
 * Extract page data from HTML
 */
function extractPageData(
  url: string,
  html: string,
  isHomepage: boolean,
): PageData | null {
  try {
    const $ = cheerio.load(html);
    const title = $("title").text() || $("h1:first").text() || "Page";
    const description =
      $('meta[name="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content") ||
      "";

    return {
      url,
      title: title.substring(0, 100),
      description: description.substring(0, 160),
      isHomepage,
    };
  } catch (error) {
    console.warn(`Failed to extract data from ${url}:`, error);
    return null;
  }
}

/**
 * Extract internal links from HTML
 */
function extractInternalLinks(html: string, domain: string): string[] {
  try {
    const $ = cheerio.load(html);
    const links = new Set<string>();

    $("a[href]").each((_, el) => {
      let href = $(el).attr("href");
      if (!href) return;

      // Skip certain link types
      if (
        href.startsWith("#") ||
        href.startsWith("tel:") ||
        href.startsWith("mailto:")
      ) {
        return;
      }

      // Make URL absolute
      try {
        const baseHref = $(el).attr("href");
        const absoluteUrl = href.startsWith("http")
          ? href
          : `https://${domain}${href.startsWith("/") ? "" : "/"}${href}`;
        const url = new URL(absoluteUrl);
        // Only include internal links
        if (url.hostname === domain) {
          links.add(url.toString());
        }
      } catch {
        // Ignore invalid URLs
      }
    });

    return Array.from(links).slice(0, 10);
  } catch (error) {
    console.warn("Failed to extract internal links:", error);
    return [];
  }
}

/**
 * Get performance metrics from Google PageSpeed Insights
 * Uses API key if available (GOOGLE_PAGESPEED_API_KEY env var) for higher rate limits
 * Free tier: 25 requests/day | With API key: 25,000 requests/day
 */
export async function getPerformanceMetrics(
  url: string,
): Promise<PerformanceMetrics | null> {
  try {
    const encodedUrl = encodeURIComponent(url);
    const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY;

    // Build API URL with optional API key
    let apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodedUrl}&category=performance&category=accessibility&category=best-practices&category=seo`;

    if (apiKey) {
      apiUrl += `&key=${apiKey}`;
      console.log(`🔑 Using PageSpeed Insights API key for ${url}`);
    } else {
      console.warn(`⚠️  No PageSpeed API key - using free tier (25 requests/day limit)`);
      console.warn(`   Get API key: https://developers.google.com/speed/docs/insights/v5/get-started`);
    }

    console.log(`📊 Fetching Lighthouse data for ${url}...`);
    const startTime = Date.now();

    const response = await axios.get(apiUrl, {
      timeout: 45000, // Increased timeout for comprehensive analysis
      headers: {
        'User-Agent': 'Brand-Whisperer-Audit/1.0',
      },
    });

    const elapsed = Date.now() - startTime;
    console.log(`✅ Lighthouse data fetched in ${elapsed}ms`);

    const lighthouses = response.data.lighthouseResult;
    const categories = lighthouses.categories || {};

    // Extract Core Web Vitals
    const metrics = lighthouses.audits?.metrics?.details?.items?.[0] || {};

    const result = {
      pagespeedScore: Math.round((categories.performance?.score || 0) * 100),
      performanceScore: Math.round((categories.performance?.score || 0) * 100),
      accessibilityScore: Math.round(
        (categories.accessibility?.score || 0) * 100,
      ),
      bestPracticesScore: Math.round(
        (categories["best-practices"]?.score || 0) * 100,
      ),
      seoScore: Math.round((categories.seo?.score || 0) * 100),
      coreWebVitals: {
        lcp: metrics.largestContentfulPaint || 0,
        fid: metrics.firstInputDelay || 0,
        cls: metrics.cumulativeLayoutShift || 0,
      },
    };

    console.log(`📈 Lighthouse Scores:`, {
      performance: result.performanceScore,
      accessibility: result.accessibilityScore,
      seo: result.seoScore,
      bestPractices: result.bestPracticesScore,
    });

    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    const statusCode = (error as any)?.response?.status;

    console.error(`❌ PageSpeed Insights FAILED for ${url}:`);
    console.error(`   Error: ${errorMsg}`);

    if (statusCode === 429) {
      console.error(`   ⚠️  RATE LIMIT EXCEEDED - Add GOOGLE_PAGESPEED_API_KEY to .env for higher limits`);
    } else if (statusCode === 400) {
      console.error(`   ⚠️  Invalid URL or site not accessible to Google`);
    } else if (statusCode) {
      console.error(`   HTTP Status: ${statusCode}`);
    }

    console.error(`   Impact: Audit will continue with reduced accuracy (no Lighthouse data)`);

    return null;
  }
}

/**
 * Check SEO metrics: robots.txt, sitemap, SSL, mobile optimization
 */
export async function getSEOMetrics(url: string): Promise<SEOMetrics> {
  const baseUrl = new URL(url);
  const seoMetrics: SEOMetrics = {
    hasRobotsTxt: false,
    hasSitemap: false,
    hasSSL: baseUrl.protocol === "https:",
    mobileOptimized: false,
    canonicalUrl: null,
  };

  try {
    // Check robots.txt
    try {
      const robotsUrl = `${baseUrl.protocol}//${baseUrl.hostname}/robots.txt`;
      const robotsResponse = await axios.get(robotsUrl, { timeout: 5000 });
      seoMetrics.hasRobotsTxt = robotsResponse.status === 200;
    } catch {
      seoMetrics.hasRobotsTxt = false;
    }

    // Check sitemap.xml
    try {
      const sitemapUrl = `${baseUrl.protocol}//${baseUrl.hostname}/sitemap.xml`;
      const sitemapResponse = await axios.get(sitemapUrl, { timeout: 5000 });
      seoMetrics.hasSitemap = sitemapResponse.status === 200;
    } catch {
      seoMetrics.hasSitemap = false;
    }

    // Check SSL certificate
    seoMetrics.hasSSL = await checkSSLCertificate(baseUrl.hostname);

    // Check mobile optimization from homepage
    try {
      const homepageHtml = await fetchPage(url);
      if (homepageHtml) {
        const $ = cheerio.load(homepageHtml);
        const viewportMeta = $('meta[name="viewport"]').attr("content");
        seoMetrics.mobileOptimized =
          !!viewportMeta && viewportMeta.includes("width=device-width");

        seoMetrics.canonicalUrl =
          $('link[rel="canonical"]').attr("href") || null;
      }
    } catch {
      // Continue with other checks
    }
  } catch (error) {
    console.warn("Failed to get SEO metrics:", error);
  }

  return seoMetrics;
}

/**
 * Check SSL certificate validity
 */
function checkSSLCertificate(hostname: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const req = https.request(
        {
          hostname,
          port: 443,
          method: "HEAD",
          timeout: 5000,
        },
        (res) => {
          const cert = (res.socket as any).getPeerCertificate?.();
          resolve(cert && !cert.subject?.CN?.includes("self-signed"));
        },
      );

      req.on("error", () => {
        resolve(false);
      });

      req.on("timeout", () => {
        req.destroy();
        resolve(false);
      });

      req.end();
    } catch {
      resolve(false);
    }
  });
}

/**
 * Normalize URL for comparison
 */
function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
  } catch {
    return url;
  }
}

/**
 * Calculate average performance across all pages
 */
export function calculateAveragePerformance(
  metrics: PerformanceMetrics[],
): PerformanceMetrics {
  if (metrics.length === 0) {
    return {
      pagespeedScore: 50,
      performanceScore: 50,
      accessibilityScore: 50,
      bestPracticesScore: 50,
      seoScore: 50,
      coreWebVitals: { lcp: 0, fid: 0, cls: 0 },
    };
  }

  const avg = {
    pagespeedScore: Math.round(
      metrics.reduce((sum, m) => sum + m.pagespeedScore, 0) / metrics.length,
    ),
    performanceScore: Math.round(
      metrics.reduce((sum, m) => sum + m.performanceScore, 0) / metrics.length,
    ),
    accessibilityScore: Math.round(
      metrics.reduce((sum, m) => sum + m.accessibilityScore, 0) /
        metrics.length,
    ),
    bestPracticesScore: Math.round(
      metrics.reduce((sum, m) => sum + m.bestPracticesScore, 0) /
        metrics.length,
    ),
    seoScore: Math.round(
      metrics.reduce((sum, m) => sum + m.seoScore, 0) / metrics.length,
    ),
    coreWebVitals: {
      lcp: Math.round(
        metrics.reduce((sum, m) => sum + m.coreWebVitals.lcp, 0) /
          metrics.length,
      ),
      fid: Math.round(
        metrics.reduce((sum, m) => sum + m.coreWebVitals.fid, 0) /
          metrics.length,
      ),
      cls: Math.round(
        metrics.reduce((sum, m) => sum + m.coreWebVitals.cls, 0) /
          metrics.length,
      ),
    },
  };

  return avg;
}
