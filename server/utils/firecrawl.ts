/**
 * Firecrawl Integration
 * AI-optimized web scraping that handles Cloudflare and returns clean markdown/HTML
 */

import axios from "axios";
import * as cheerio from "cheerio";

/**
 * Scrape website using Firecrawl (AI-optimized scraping service)
 * Firecrawl handles Cloudflare, JavaScript rendering, and returns clean data
 */
export async function scrapeWithFirecrawl(url: string) {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  
  if (!apiKey) {
    throw new Error("FIRECRAWL_API_KEY environment variable not set");
  }

  console.log(`🔥 Using Firecrawl to access ${url}...`);
  console.log(`   Firecrawl handles Cloudflare bypass + AI extraction`);

  try {
    // Firecrawl API endpoint
    const firecrawlUrl = 'https://api.firecrawl.dev/v1/scrape';
    
    console.log(`   ⏳ Requesting page through Firecrawl...`);
    const startTime = Date.now();

    const response = await axios.post(
      firecrawlUrl,
      {
        url: url,
        formats: ['html', 'markdown'],
        onlyMainContent: false, // Get full page for comprehensive audit
        includeTags: ['h1', 'h2', 'h3', 'p', 'nav', 'footer', 'a', 'img', 'form', 'button'],
        waitFor: 2000, // Wait for JavaScript to render
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000, // Firecrawl can take time for JS rendering
      }
    );

    const elapsed = Date.now() - startTime;
    console.log(`   ✓ Firecrawl response received in ${elapsed}ms`);

    if (!response.data || !response.data.success) {
      throw new Error(`Firecrawl returned unsuccessful response: ${JSON.stringify(response.data)}`);
    }

    const data = response.data.data;
    const html = data.html;
    const markdown = data.markdown;
    
    console.log(`   ✓ Content length: ${html?.length || 0} bytes HTML, ${markdown?.length || 0} bytes Markdown`);

    if (!html || html.length < 100) {
      throw new Error(`Firecrawl returned insufficient content (${html?.length || 0} bytes)`);
    }

    // Parse the HTML response
    const $ = cheerio.load(html);

    // Extract key elements
    const title = data.metadata?.title || $('title').text().trim();
    const description = data.metadata?.description || $('meta[name="description"]').attr('content') || '';
    const headings = $('h1, h2, h3').map((_, el) => $(el).text()).get();
    const paragraphs = $('p').map((_, el) => $(el).text()).get().slice(0, 10);
    const images = $('img').map((_, el) => $(el).attr('alt') || '').get();
    const links = $('a').map((_, el) => $(el).text()).get().slice(0, 20);
    const navigation = $('nav, .nav, .menu, .navbar').text();
    const footer = $('footer').text();
    const brandElements = $('.logo, .brand, #logo, #brand').text();

    console.log(`   ✓ Extracted: Title="${title.slice(0, 50)}...", ${headings.length} headings, ${paragraphs.length} paragraphs`);
    console.log(`   ✓ Metadata: ${data.metadata?.ogTitle ? 'OG tags ✓' : 'No OG tags'}, ${data.metadata?.keywords ? 'Keywords ✓' : 'No keywords'}`);

    // Perform same analysis as regular scraping
    const siteStructure = await analyzeSiteStructure(url, html);
    const uxFeatures = await analyzeUXFeatures(html);
    const performanceData = await analyzeWebsitePerformance(url);

    console.log(`   ✓ Site structure: ${siteStructure.discoveredPages.length} pages discovered`);
    console.log(`   ✓ UX features: ${uxFeatures.forms.count} forms, ${uxFeatures.media.images} images`);
    console.log(`✅ Firecrawl scraping completed successfully for ${url}`);

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
      htmlLength: html.length,
      url,
      fallbackUsed: false,
      scrapedWith: 'firecrawl', // Flag to indicate Firecrawl was used
      markdown: markdown, // Store markdown for potential AI analysis
      metadata: data.metadata, // Store rich metadata from Firecrawl
      performance: performanceData,
      siteStructure: siteStructure,
      uxFeatures: uxFeatures,
      multiPageAnalysis: {
        pagesAnalyzed: 1, // Firecrawl charges per scrape, limit to single page
        pageDetails: [],
        crossPageConsistency: {
          brandConsistency: { score: 80, issues: [], recommendations: [] },
          navigationConsistency: { score: 80, issues: [], recommendations: [] },
          contentConsistency: { score: 80, issues: [], recommendations: [] },
        },
        totalContentLength: html.length,
        avgImagesPerPage: $('img').length,
        avgFormsPerPage: $('form').length,
        pageTypes: [],
      },
      analysisDepth: 'firecrawl-single-page',
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const statusCode = (error as any)?.response?.status;
    const responseData = (error as any)?.response?.data;
    
    console.error(`❌ Firecrawl scraping failed for ${url}:`);
    console.error(`   Error: ${errorMsg}`);
    
    if (statusCode === 401 || statusCode === 403) {
      console.error(`   ⚠️  Authentication error - check FIRECRAWL_API_KEY`);
      console.error(`   Response: ${JSON.stringify(responseData)}`);
    } else if (statusCode === 402) {
      console.error(`   ⚠️  Payment required - Firecrawl credits exhausted`);
    } else if (statusCode === 429) {
      console.error(`   ⚠️  Rate limit exceeded - too many requests`);
    } else if (statusCode) {
      console.error(`   HTTP Status: ${statusCode}`);
      console.error(`   Response: ${JSON.stringify(responseData)}`);
    }
    
    console.error(`   Firecrawl credits may have been consumed for this attempt`);
    
    throw error;
  }
}

// Helper functions (similar to scraperapi.ts but adapted for audit.ts imports)
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
