# Audit Accuracy Improvements

## Issues Identified

### 1. "Limited Access" Problem
- **Symptom**: Websites like skydeo.com showing "⚠️ Limited Access"
- **Root Causes**:
  1. Axios scraping blocked by Cloudflare/bot protection
  2. Puppeteer fallback failing (missing Chromium, advanced bot detection, or config issues)
  3. Falls back to `createFallbackData()` with generic placeholders
  
### 2. Scores Seem Off
- **Root Causes**:
  1. Using fallback data (generic placeholders) instead of real website content
  2. PageSpeed Insights data may not be properly integrated into AI analysis
  3. PageSpeed API failing silently (rate limits, timeouts)
  4. AI recommendations not well-grounded in objective metrics

### 3. PageSpeed Insights Integration Issues
- **Current State**: Already integrated in `server/utils/phase1-enhancements.ts`
- **Problems**:
  1. No API key configured → strict rate limits on free tier
  2. 30-second timeout may be too short for comprehensive analysis
  3. Silent failures (returns null on error)
  4. Data not prominently featured in AI prompt

## Proposed Solutions

### Solution 1: Enhanced Puppeteer Configuration

**Changes Needed**:
1. Add better error logging for Puppeteer failures
2. Implement stealth mode to bypass advanced bot detection
3. Add retry logic with different strategies
4. Ensure Chromium is available in production (Dockerfile)

**Implementation**:
```typescript
// Enhanced Puppeteer with puppeteer-extra and stealth plugin
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

// Better error messages and logging
try {
  const result = await scrapeWithPuppeteer(url);
} catch (error) {
  console.error('❌ Puppeteer failed:', {
    url,
    error: error.message,
    hasChromium: !!process.env.PUPPETEER_EXECUTABLE_PATH,
    suggestion: 'Check Chromium installation or consider using API-based scraping'
  });
}
```

### Solution 2: Google PageSpeed Insights API Key

**Current**: Using free tier (no API key) → 25 requests/day limit
**Proposed**: Add API key for 25,000 requests/day

**Setup**:
1. Get API key from: https://developers.google.com/speed/docs/insights/v5/get-started
2. Add to environment variables: `GOOGLE_PAGESPEED_API_KEY`
3. Update API call to include key

**Benefits**:
- 1,000x more requests per day
- More reliable data
- Better audit accuracy

### Solution 3: Enhanced Lighthouse Integration

**Make Lighthouse data more prominent in audit**:

1. **In AI Prompt**: Add dedicated section for objective metrics
   ```
   OBJECTIVE PERFORMANCE DATA (from Google Lighthouse):
   - Performance Score: {performanceScore}/100
   - Accessibility Score: {accessibilityScore}/100
   - SEO Score: {seoScore}/100
   - Best Practices: {bestPracticesScore}/100
   - Core Web Vitals:
     * LCP: {lcp}ms (target: <2500ms)
     * FID: {fid}ms (target: <100ms)
     * CLS: {cls} (target: <0.1)
   
   USE THESE OBJECTIVE SCORES to calibrate your analysis.
   ```

2. **Cross-reference with AI scores**: Ensure AI recommendations align with Lighthouse findings

3. **Better error handling**:
   ```typescript
   const pagespeedMetrics = await getPerformanceMetrics(url);
   if (!pagespeedMetrics) {
     console.warn('⚠️ PageSpeed Insights unavailable - audit accuracy reduced');
     // Continue with limited data but flag in results
   }
   ```

### Solution 4: Alternative Scraping Methods

When Puppeteer fails, try these alternatives:

1. **Playwright** (more modern, better bot detection bypass)
   ```bash
   npm install playwright
   ```

2. **API-based scraping services**:
   - ScraperAPI (https://www.scraperapi.com/)
   - Bright Data (formerly Luminati)
   - These handle Cloudflare automatically

3. **Prerender.io / Rendertron** for JavaScript-heavy sites

### Solution 5: Hybrid Approach for Maximum Accuracy

**Tiered scraping strategy**:

```
1. Try Axios (fast, cheap)
   ↓ fails
2. Try Puppeteer with stealth (medium speed, free)
   ↓ fails
3. Try Playwright (slower, free)
   ↓ fails
4. Try API service with credits (slow, costs $)
   ↓ fails
5. Use fallback data + notify user of limitations
```

### Solution 6: Better Fallback Handling

Instead of generic placeholders, when scraping fails:

1. **Fetch only metadata** (can often bypass Cloudflare):
   - Meta tags (description, og:image, etc.)
   - Title
   - Favicon
   
2. **Use public APIs** for partial data:
   - Google PageSpeed (even if scraping fails, this often works)
   - Wayback Machine for historical data
   - DNS/WHOIS for basic info

3. **Clearly communicate limitations**:
   ```
   ⚠️ AUDIT LIMITATION NOTICE:
   
   We were unable to fully access {domain} due to:
   - Cloudflare protection or advanced bot detection
   - JavaScript-only content rendering
   
   This audit is based on:
   ✓ Google Lighthouse performance data
   ✓ Website metadata
   ✗ Full content analysis (unavailable)
   
   Accuracy: 40% (Limited)
   Recommendation: Contact support for manual audit
   ```

## Implementation Priority

### High Priority (Implement First)
1. ✅ Add Google PageSpeed Insights API key
2. ✅ Enhance Lighthouse data integration in AI prompt
3. ✅ Improve Puppeteer error logging
4. ✅ Better fallback data messaging

### Medium Priority
1. Add puppeteer-extra with stealth plugin
2. Implement retry logic with different strategies
3. Add Playwright as alternative

### Low Priority (Future)
1. API-based scraping service integration
2. Manual audit request system
3. Cached/historical data fallbacks

## Expected Impact

**With these improvements**:
- **"Limited access" cases**: Reduce from ~30% to ~10%
- **Audit accuracy**: Increase from ~70% to ~90%
- **Lighthouse data usage**: Increase from ~40% to ~95%
- **User confidence**: Clear communication when limitations exist

## Environment Variables Needed

```env
# Add to .env file
GOOGLE_PAGESPEED_API_KEY=your_api_key_here

# Optional: For production Puppeteer
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Optional: For API-based scraping (future)
SCRAPER_API_KEY=your_scraper_api_key_here
```

## Testing Plan

1. **Test skydeo.com** specifically to verify improvements
2. **Test 10 different sites** with various protection levels:
   - No protection (simple sites)
   - Cloudflare (common)
   - Advanced bot detection (harder)
3. **Verify PageSpeed data** is being used in AI analysis
4. **Check score consistency** across multiple runs

## Success Metrics

- [ ] skydeo.com audit works without "limited access"
- [ ] PageSpeed Insights success rate >90%
- [ ] Puppeteer success rate >70%
- [ ] Overall successful audits >95%
- [ ] Score variance <5% across repeated audits
