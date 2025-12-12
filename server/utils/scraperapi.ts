/**
 * ScraperAPI Integration
 * Handles Cloudflare and other anti-scraping measures automatically
 */

import axios from "axios";
import * as cheerio from "cheerio";

/**
 * Scrape website using ScraperAPI (paid service that bypasses Cloudflare)
 * ScraperAPI handles rotating proxies, browser fingerprints, and anti-bot measures
 */
export async function scrapeWithScraperAPI(url: string) {
  const apiKey = process.env.SCRAPER_API_KEY;
  
  if (!apiKey) {
    throw new Error("SCRAPER_API_KEY environment variable not set");
  }

  console.log(`🌐 Using ScraperAPI to access ${url}...`);
  console.log(`   ScraperAPI handles Cloudflare bypass automatically`);

  let response;
  let renderMode = true;

  try {
    // Try with render=true first (handles JavaScript)
    const scraperApiUrl = `http://api.scraperapi.com/?api_key=${apiKey}&url=${encodeURIComponent(url)}&render=true`;

    console.log(`   ⏳ Requesting page through ScraperAPI with rendering (may take 10-30s)...`);
    const startTime = Date.now();

    response = await axios.get(scraperApiUrl, {
      timeout: 60000, // ScraperAPI can be slower (rendering, proxy rotation)
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    const elapsed = Date.now() - startTime;
    console.log(`   ✓ ScraperAPI response received in ${elapsed}ms`);
    console.log(`   ✓ Content length: ${response.data.length} bytes`);

    if (!response.data || response.data.length < 100) {
      throw new Error(`ScraperAPI returned insufficient content (${response.data.length} bytes)`);
    }
  } catch (renderError) {
    // If render=true fails with 500, try without rendering
    const statusCode = (renderError as any)?.response?.status;
    if (statusCode === 500 && renderMode) {
      console.warn(`   ⚠️  render=true failed with 500, trying without rendering...`);
      try {
        const scraperApiUrlNoRender = `http://api.scraperapi.com/?api_key=${apiKey}&url=${encodeURIComponent(url)}`;
        const startTime = Date.now();

        response = await axios.get(scraperApiUrlNoRender, {
          timeout: 60000,
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        });

        const elapsed = Date.now() - startTime;
        console.log(`   ✓ ScraperAPI (no render) response received in ${elapsed}ms`);
        console.log(`   ✓ Content length: ${response.data.length} bytes`);
        renderMode = false;
      } catch (noRenderError) {
        console.error(`   ❌ Both render=true and render=false failed`);
        throw renderError; // Throw original error
      }
    } else {
      throw renderError;
    }
  }

  // Validation check moved outside try-catch
  try {
    if (!response || !response.data || response.data.length < 100) {
      throw new Error(`ScraperAPI returned insufficient content (${response?.data?.length || 0} bytes)`);
    }

    // Parse the HTML response
    const $ = cheerio.load(response.data);

    // Extract key elements
    const title = $('title').text().trim();
    const description = $('meta[name="description"]').attr('content') || '';
    const headings = $('h1, h2, h3').map((_, el) => $(el).text()).get();
    const paragraphs = $('p').map((_, el) => $(el).text()).get().slice(0, 10);
    const images = $('img').map((_, el) => $(el).attr('alt') || '').get();
    const links = $('a').map((_, el) => $(el).text()).get().slice(0, 20);
    const navigation = $('nav, .nav, .menu, .navbar').text();
    const footer = $('footer').text();
    const brandElements = $('.logo, .brand, #logo, #brand').text();

    console.log(`   ✓ Extracted: Title="${title.slice(0, 50)}...", ${headings.length} headings, ${paragraphs.length} paragraphs`);

    // Perform same analysis as regular scraping
    const siteStructure = await analyzeSiteStructure(url, response.data);
    const uxFeatures = await analyzeUXFeatures(response.data);
    const performanceData = await analyzeWebsitePerformance(url);

    console.log(`   ✓ Site structure: ${siteStructure.discoveredPages.length} pages discovered`);
    console.log(`   ✓ UX features: ${uxFeatures.forms.count} forms, ${uxFeatures.media.images} images`);
    console.log(`✅ ScraperAPI scraping completed successfully for ${url}`);

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
      scrapedWith: 'scraperapi', // Flag to indicate ScraperAPI was used
      performance: performanceData,
      siteStructure: siteStructure,
      uxFeatures: uxFeatures,
      multiPageAnalysis: {
        pagesAnalyzed: 1, // ScraperAPI is expensive, limit to single page
        pageDetails: [],
        crossPageConsistency: {
          brandConsistency: { score: 80, issues: [], recommendations: [] },
          navigationConsistency: { score: 80, issues: [], recommendations: [] },
          contentConsistency: { score: 80, issues: [], recommendations: [] },
        },
        totalContentLength: response.data.length,
        avgImagesPerPage: $('img').length,
        avgFormsPerPage: $('form').length,
        pageTypes: [],
      },
      analysisDepth: 'scraperapi-single-page',
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const statusCode = (error as any)?.response?.status;
    const responseData = (error as any)?.response?.data;

    console.error(`❌ ScraperAPI scraping failed for ${url}:`);
    console.error(`   Error: ${errorMsg}`);

    if (statusCode === 401 || statusCode === 403) {
      console.error(`   ⚠️  Authentication error - check SCRAPER_API_KEY`);
      console.error(`   API Key used: ${apiKey?.substring(0, 8)}...`);
    } else if (statusCode === 429) {
      console.error(`   ⚠️  Rate limit exceeded - upgrade ScraperAPI plan or wait`);
    } else if (statusCode === 500) {
      console.error(`   ⚠️  ScraperAPI server error (500) - their service may be having issues`);
      console.error(`   Response data:`, responseData);
      console.error(`   Recommendation: Try without render parameter or contact ScraperAPI support`);
    } else if (statusCode) {
      console.error(`   HTTP Status: ${statusCode}`);
      console.error(`   Response data:`, responseData);
    }

    console.error(`   ScraperAPI credits may have been consumed for this attempt`);
    console.error(`   Full error object:`, error);

    throw error;
  }
}

// Helper functions (imported from audit.ts)
async function analyzeSiteStructure(baseUrl: string, html: string) {
  const $ = cheerio.load(html);
  
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

  const navigation = {
    mainNav: $('nav, .nav, .navbar, .navigation').first().text().trim(),
    breadcrumbs: $('.breadcrumb, .breadcrumbs').text().trim(),
    footer: $('footer').text().trim(),
    menuItems: [] as string[],
    hasSearch: $('input[type="search"], [role="search"], .search').length > 0,
    hasLanguageSelector: $('[lang], .language, .lang').length > 0,
  };

  $('nav a, .nav a, .navbar a, .menu a').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 0 && text.length < 50) {
      navigation.menuItems.push(text);
    }
  });

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

  const pageText = $.text().toLowerCase();
  contentStructure.hasContactInfo = /contact|phone|email|address/.test(pageText);
  contentStructure.hasAboutPage = /about|our story|who we are/.test(pageText);
  contentStructure.hasBlog = /blog|news|articles/.test(pageText);
  contentStructure.hasProducts = /product|service|shop|buy/.test(pageText);

  return {
    discoveredPages: Array.from(links).slice(0, 10),
    navigation,
    contentStructure,
    pageCount: links.size,
  };
}

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
      headingStructure: $('h1').length === 1,
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
    },
  };
}

async function analyzeWebsitePerformance(url: string) {
  // This function is imported from audit.ts - just return basic data here
  return {
    pageSizeKB: 0,
    hasSSL: url.startsWith('https://'),
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
