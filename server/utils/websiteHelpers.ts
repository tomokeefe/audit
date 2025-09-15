/**
 * Website Helper Utilities
 * Common utilities for processing website data
 */

/**
 * Extract company name from URL or website data
 */
export function extractCompanyName(url: string, websiteData?: any): string {
  // First try to get from website data if available
  if (websiteData?.title) {
    const title = websiteData.title.toLowerCase();
    // Remove common suffixes
    const cleanTitle = title
      .replace(/\s*-\s*(home|homepage|welcome)$/i, "")
      .replace(/\s*\|\s*.*$/i, "") // Remove everything after |
      .replace(/\s*-\s*.*$/i, ""); // Remove everything after -

    if (cleanTitle.length > 0 && cleanTitle.length < 50) {
      return cleanTitle
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    }
  }

  try {
    const urlObj = new URL(url);
    let domain = urlObj.hostname;

    // Remove www prefix
    domain = domain.replace(/^www\./, "");

    // Remove common TLDs to get base name
    const domainParts = domain.split(".");
    if (domainParts.length > 1) {
      domain = domainParts[0];
    }

    // Capitalize first letter
    return domain.charAt(0).toUpperCase() + domain.slice(1);
  } catch (error) {
    return "Website";
  }
}

/**
 * Normalize URL for consistent processing
 */
export function normalizeUrl(url: string): string {
  try {
    // Add protocol if missing
    if (!url.match(/^https?:\/\//i)) {
      url = `https://${url}`;
    }

    const urlObj = new URL(url);

    // Remove trailing slash
    urlObj.pathname = urlObj.pathname.replace(/\/+$/, "") || "/";

    // Sort query parameters for consistency
    urlObj.searchParams.sort();

    return urlObj.toString();
  } catch (error) {
    return url;
  }
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, "");
  } catch (error) {
    return url;
  }
}

/**
 * Check if URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
