import { RequestHandler } from "express";
import axios from "axios";
import * as cheerio from "cheerio";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { AuditRequest, AuditResponse } from "@shared/api";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Function to scrape website content
async function scrapeWebsite(url: string) {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    
    // Extract key elements
    const title = $('title').text() || '';
    const description = $('meta[name="description"]').attr('content') || '';
    const headings = $('h1, h2, h3').map((_, el) => $(el).text()).get();
    const paragraphs = $('p').map((_, el) => $(el).text()).get().slice(0, 10); // Limit to first 10 paragraphs
    const images = $('img').map((_, el) => $(el).attr('alt') || '').get();
    const links = $('a').map((_, el) => $(el).text()).get().slice(0, 20); // Limit to first 20 links
    
    // Extract navigation and menu items
    const navigation = $('nav, .nav, .menu, .navbar').text();
    
    // Extract footer content
    const footer = $('footer').text();
    
    // Extract any brand-related elements
    const brandElements = $('.logo, .brand, #logo, #brand').text();
    
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
      url
    };
  } catch (error) {
    console.error('Error scraping website:', error);
    throw new Error('Failed to analyze website. Please check the URL and try again.');
  }
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
      throw new Error('Invalid response format from AI');
    }
    
    const auditData = JSON.parse(jsonMatch[0]);
    
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
    const { url } = req.body as AuditRequest;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    
    console.log('Starting audit for URL:', url);
    
    // Step 1: Scrape website content
    const websiteData = await scrapeWebsite(url);
    console.log('Website data extracted successfully');
    
    // Step 2: Generate audit using Gemini AI
    const auditResult = await generateAudit(websiteData);
    console.log('Audit generated successfully');
    
    res.status(200).json(auditResult);
    
  } catch (error) {
    console.error('Audit error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
};
