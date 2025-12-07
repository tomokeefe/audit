/**
 * Deterministic Scoring Utilities
 * Ensures consistent scoring for identical content while allowing for legitimate changes
 */

import crypto from "crypto";
import {
  SECTION_WEIGHTS_ARRAY,
  CONSISTENCY_THRESHOLDS,
} from "../constants/scoring";

export interface WebsiteSignature {
  contentHash: string;
  structureHash: string;
  metadataHash: string;
  timestamp: Date;
}

export interface ScoringCache {
  websiteSignature: WebsiteSignature;
  baseScores: number[];
  overallScore: number;
  evidenceData: any;
  methodology: string;
  expiresAt: Date;
  sections?: any[]; // Store full section details including recommendations
}

// In-memory cache (should be replaced with Redis in production)
const scoringCache = new Map<string, ScoringCache>();

/**
 * Generate a deterministic signature for website content
 */
export function generateWebsiteSignature(websiteData: any): WebsiteSignature {
  // Extract key content elements that affect scoring
  const contentElements = {
    title: websiteData.title || "",
    mainContent: websiteData.content || "",
    navigationStructure: websiteData.navigation || [],
    pageCount: websiteData.multiPageAnalysis?.pagesAnalyzed || 1,
    keyMetrics: {
      hasImages: websiteData.hasImages || false,
      hasForms: websiteData.hasForms || false,
      hasSSL: websiteData.hasSSL || false,
      loadTime:
        Math.round((websiteData.performanceMetrics?.loadTime || 0) * 10) / 10,
    },
  };

  // Create hashes for different aspects
  const contentHash = crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        title: contentElements.title,
        content: contentElements.mainContent.substring(0, 5000), // First 5k chars for consistency
      }),
    )
    .digest("hex");

  const structureHash = crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        navigation: contentElements.navigationStructure,
        pageCount: contentElements.pageCount,
        hasImages: contentElements.keyMetrics.hasImages,
        hasForms: contentElements.keyMetrics.hasForms,
      }),
    )
    .digest("hex");

  const metadataHash = crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        hasSSL: contentElements.keyMetrics.hasSSL,
        loadTime: contentElements.keyMetrics.loadTime,
      }),
    )
    .digest("hex");

  return {
    contentHash,
    structureHash,
    metadataHash,
    timestamp: new Date(),
  };
}

/**
 * Check if cached score is still valid
 */
export function getCachedScore(
  websiteSignature: WebsiteSignature,
): ScoringCache | null {
  const cacheKey = `${websiteSignature.contentHash}-${websiteSignature.structureHash}`;
  const cached = scoringCache.get(cacheKey);

  if (!cached) {
    return null;
  }

  // Check if cache has expired
  if (new Date() > cached.expiresAt) {
    scoringCache.delete(cacheKey);
    return null;
  }

  // Verify signature matches (content hasn't changed)
  if (
    cached.websiteSignature.contentHash !== websiteSignature.contentHash ||
    cached.websiteSignature.structureHash !== websiteSignature.structureHash
  ) {
    return null;
  }

  return cached;
}

/**
 * Cache scoring results for future use
 */
export function cacheScore(
  websiteSignature: WebsiteSignature,
  baseScores: number[],
  overallScore: number,
  evidenceData: any,
  methodology: string,
  sections?: any[],
): void {
  const cacheKey = `${websiteSignature.contentHash}-${websiteSignature.structureHash}`;
  const expiresAt = new Date();
  expiresAt.setDate(
    expiresAt.getDate() + CONSISTENCY_THRESHOLDS.cacheExpirationDays,
  );

  const cacheEntry: ScoringCache = {
    websiteSignature,
    baseScores,
    overallScore,
    evidenceData,
    methodology,
    expiresAt,
    sections,
  };

  scoringCache.set(cacheKey, cacheEntry);
}

/**
 * Calculate deterministic score variation based on URL
 * This provides consistent but slightly varied scores for demo purposes
 */
export function getDeterministicVariation(
  url: string,
  sectionIndex: number,
  baseVariance: number = 5,
): number {
  // Create deterministic seed from URL and section
  const urlHash = crypto.createHash("sha256").update(url).digest("hex");
  const seed = parseInt(
    urlHash.substring(sectionIndex * 2, sectionIndex * 2 + 8),
    16,
  );

  // Convert to pseudo-random number between -1 and 1
  const normalizedSeed = ((seed % 10000) - 5000) / 5000;

  // Apply variation within specified range
  return normalizedSeed * baseVariance;
}

/**
 * Validate score consistency against historical data
 */
export function validateScoreConsistency(
  newScore: number,
  historicalScores: number[],
  websiteChanged: boolean = false,
): {
  isConsistent: boolean;
  variance: number;
  expectedRange: { min: number; max: number };
  flaggedAsOutlier: boolean;
} {
  if (historicalScores.length === 0) {
    return {
      isConsistent: true,
      variance: 0,
      expectedRange: { min: newScore - 5, max: newScore + 5 },
      flaggedAsOutlier: false,
    };
  }

  const mean =
    historicalScores.reduce((sum, score) => sum + score, 0) /
    historicalScores.length;
  const variance =
    historicalScores.reduce(
      (sum, score) => sum + Math.pow(score - mean, 2),
      0,
    ) / historicalScores.length;
  const standardDeviation = Math.sqrt(variance);

  // Allow more variation if website has changed
  const allowedVariation = websiteChanged
    ? CONSISTENCY_THRESHOLDS.maxVariationPercent * 2
    : CONSISTENCY_THRESHOLDS.maxVariationPercent;

  const expectedRange = {
    min: Math.max(0, mean - allowedVariation),
    max: Math.min(100, mean + allowedVariation),
  };

  const isConsistent =
    newScore >= expectedRange.min && newScore <= expectedRange.max;
  const flaggedAsOutlier =
    Math.abs(newScore - mean) >
    standardDeviation * CONSISTENCY_THRESHOLDS.outlierThreshold;

  return {
    isConsistent,
    variance: variance,
    expectedRange,
    flaggedAsOutlier,
  };
}

/**
 * Calculate weighted overall score using standardized weights
 */
export function calculateStandardizedOverallScore(
  sectionScores: number[],
): number {
  if (sectionScores.length !== SECTION_WEIGHTS_ARRAY.length) {
    throw new Error(
      `Expected ${SECTION_WEIGHTS_ARRAY.length} section scores, got ${sectionScores.length}`,
    );
  }

  const weightedSum = sectionScores.reduce((sum, score, index) => {
    return sum + score * SECTION_WEIGHTS_ARRAY[index];
  }, 0);

  return Math.round(weightedSum * 10) / 10; // Round to 1 decimal place
}

/**
 * Apply industry-specific weight adjustments
 */
export function applyIndustryWeights(industry: string): number[] {
  // This would implement industry-specific weight adjustments
  // For now, return standard weights
  return [...SECTION_WEIGHTS_ARRAY];
}

/**
 * Clean up expired cache entries
 */
export function cleanupExpiredCache(): number {
  const now = new Date();
  let removedCount = 0;

  for (const [key, entry] of scoringCache.entries()) {
    if (now > entry.expiresAt) {
      scoringCache.delete(key);
      removedCount++;
    }
  }

  return removedCount;
}

/**
 * Get cache statistics for monitoring
 */
export function getCacheStats(): {
  totalEntries: number;
  hitRate: number;
  avgAge: number;
} {
  const now = new Date();
  let totalAge = 0;

  for (const entry of scoringCache.values()) {
    totalAge += now.getTime() - entry.websiteSignature.timestamp.getTime();
  }

  return {
    totalEntries: scoringCache.size,
    hitRate: 0, // Would need to track hits/misses
    avgAge:
      scoringCache.size > 0
        ? totalAge / scoringCache.size / (1000 * 60 * 60 * 24)
        : 0, // days
  };
}
