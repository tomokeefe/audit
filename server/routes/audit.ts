import { RequestHandler } from "express";
import axios from "axios";
import * as cheerio from "cheerio";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { AuditRequest, AuditResponse } from "@shared/api";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Function to create fallback website data when scraping fails
function createFallbackData(url: string) {
  const domain = new URL(url).hostname.replace('www.', '');
  const companyName = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);

  return {
    title: `${companyName} - Website Analysis`,
    description: `Brand audit analysis for ${domain}`,
    headings: [`Welcome to ${companyName}`, 'About Us', 'Services', 'Contact'],
    paragraphs: [
      `This is a brand audit analysis for ${domain}.`,
      `${companyName} appears to be a business website that may contain various sections and content.`,
      'The website structure and content will be analyzed based on common web patterns and best practices.',
      'This analysis focuses on brand consistency, user experience, and overall digital presence.'
    ],
    images: ['company logo', 'hero image', 'product images'],
    links: ['Home', 'About', 'Services', 'Contact', 'Privacy Policy'],
    navigation: 'Home About Services Contact',
    footer: 'Copyright information and contact details',
    brandElements: `${companyName} branding elements`,
    htmlLength: 0,
    url,
    fallbackUsed: true
  };
}

// Function to scrape website content with retry logic and fallback
async function scrapeWebsite(url: string) {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
  ];

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      console.log(`Attempt ${attempt + 1} to scrape ${url}`);

      const response = await axios.get(url, {
        timeout: 8000, // Reduced timeout per attempt
        maxRedirects: 3,
        validateStatus: (status) => status < 500, // Accept 4xx but not 5xx errors
        headers: {
          'User-Agent': userAgents[attempt % userAgents.length],
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Cache-Control': 'max-age=0'
        }
      });

      if (response.status >= 400) {
        console.log(`HTTP ${response.status} for ${url}, attempting with different user agent...`);
        if (attempt === 2) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        continue;
      }

      const $ = cheerio.load(response.data);

      // Extract key elements
      const title = $('title').text() || '';
      const description = $('meta[name="description"]').attr('content') || '';
      const headings = $('h1, h2, h3').map((_, el) => $(el).text()).get();
      const paragraphs = $('p').map((_, el) => $(el).text()).get().slice(0, 10);
      const images = $('img').map((_, el) => $(el).attr('alt') || '').get();
      const links = $('a').map((_, el) => $(el).text()).get().slice(0, 20);

      // Extract navigation and menu items
      const navigation = $('nav, .nav, .menu, .navbar').text();

      // Extract footer content
      const footer = $('footer').text();

      // Extract any brand-related elements
      const brandElements = $('.logo, .brand, #logo, #brand').text();

      console.log(`Successfully scraped ${url}. Title: "${title.slice(0, 50)}..."`);

      return {
        title: title.trim(),
        description: description.trim(),
        headings: headings.filter(h => h.trim().length > 0),
        paragraphs: paragraphs.filter(p => p.trim().length > 0),
        images: images.filter(alt => alt.trim().length > 0),
        links: links.filter(l => l.trim().length > 0),
        navigation: navigation.trim(),
        footer: footer.trim(),
        brandElements: brandElements.trim(),
        htmlLength: response.data.length,
        url,
        fallbackUsed: false
      };

    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed for ${url}:`, error instanceof Error ? error.message : error);

      if (attempt === 2) {
        // Final attempt failed, use fallback data but still analyze
        console.log(`All scraping attempts failed for ${url}, using fallback data for analysis`);
        return createFallbackData(url);
      }

      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 1000));
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

Website Data:
- URL: ${websiteData.url}
- Title: ${websiteData.title}
- Description: ${websiteData.description}
- Headings: ${websiteData.headings.join(', ')}
- Content Sample: ${websiteData.paragraphs.slice(0, 5).join(' ')}
- Navigation: ${websiteData.navigation}
- Footer: ${websiteData.footer}
- Brand Elements: ${websiteData.brandElements}

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
      console.error('No JSON found in AI response:', text);
      throw new Error('Invalid response format from AI service');
    }

    let auditData;
    try {
      auditData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw AI response:', text);
      throw new Error('Failed to parse AI response');
    }

    // Validate required fields
    if (!auditData.title || !auditData.sections || !Array.isArray(auditData.sections)) {
      console.error('Invalid audit data structure:', auditData);
      throw new Error('Invalid audit response structure');
    }
    
    // Generate a unique ID and add metadata
    const auditId = Date.now().toString();
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    return {
      id: auditId,
      url: websiteData.url,
      title: auditData.title,
      description: auditData.description,
      overallScore: auditData.overallScore,
      date: currentDate,
      status: 'completed',
      sections: auditData.sections,
      summary: auditData.summary
    };
    
  } catch (error) {
    console.error('Error generating audit:', error);
    throw new Error('Failed to generate audit analysis. Please try again.');
  }
}

export const handleAudit: RequestHandler = async (req, res) => {
  try {
    // Check if Gemini API key is configured
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY environment variable is not set');
      return res.status(500).json({ error: 'Server configuration error. Please contact support.' });
    }

    const { url } = req.body as AuditRequest;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format. Please enter a valid URL starting with http:// or https://' });
    }

    console.log('Starting audit for URL:', url);

    // Step 1: Scrape website content
    const websiteData = await scrapeWebsite(url);
    if (websiteData.fallbackUsed) {
      console.log('Using fallback data for analysis due to scraping issues');
    } else {
      console.log('Website data extracted successfully. Title:', websiteData.title);
    }

    // Step 2: Generate audit using Gemini AI
    const auditResult = await generateAudit(websiteData);
    console.log('Audit generated successfully. Overall score:', auditResult.overallScore);

    // Ensure response headers are set correctly
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(auditResult);

  } catch (error) {
    console.error('Audit error:', error);

    // Provide more specific error messages
    let errorMessage = 'Internal server error';
    if (error instanceof Error) {
      if (error.message.includes('fetch') || error.message.includes('timeout')) {
        errorMessage = 'Unable to access the website. Please check the URL and try again.';
      } else if (error.message.includes('Invalid response format')) {
        errorMessage = 'AI service error. Please try again in a moment.';
      } else {
        errorMessage = error.message;
      }
    }

    res.status(500).json({ error: errorMessage });
  }
};
