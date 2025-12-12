/**
 * Standardized Scoring Constants
 * Research-based section weights and scoring parameters for consistent audit results
 */

// Standardized section weights based on technical auditing best practices
export const SECTION_WEIGHTS = {
  visualDesignFlow: 0.12, // Layout consistency, aesthetics, navigation logic
  contentMessaging: 0.15, // Copy clarity, brand voice, keyword integration
  seoTechnical: 0.12, // Meta tags, schema markup, crawlability
  performanceSpeed: 0.1, // Load times, Core Web Vitals, optimization
  mobileUsability: 0.1, // Responsive design, mobile UX
  userExperienceNav: 0.1, // Intuitiveness, user journeys, accessibility
  accessibility: 0.08, // WCAG compliance, inclusivity standards
  securityIntegrity: 0.08, // HTTPS, SSL, trust signals
  competitivePositioning: 0.08, // Market differentiation, unique value
  conversionCTA: 0.07, // CTA effectiveness, persuasion elements
} as const;

// Convert to array format for calculations (matches section order)
export const SECTION_WEIGHTS_ARRAY = [
  SECTION_WEIGHTS.visualDesignFlow, // 0: Visual Design & Flow
  SECTION_WEIGHTS.contentMessaging, // 1: Content Quality & Messaging
  SECTION_WEIGHTS.seoTechnical, // 2: SEO Technical & On-Page
  SECTION_WEIGHTS.performanceSpeed, // 3: Performance & Speed
  SECTION_WEIGHTS.mobileUsability, // 4: Mobile Usability & Responsiveness
  SECTION_WEIGHTS.userExperienceNav, // 5: User Experience & Navigation
  SECTION_WEIGHTS.accessibility, // 6: Accessibility
  SECTION_WEIGHTS.securityIntegrity, // 7: Security & Technical Integrity
  SECTION_WEIGHTS.competitivePositioning, // 8: Competitive Advantage & Market Positioning
  SECTION_WEIGHTS.conversionCTA, // 9: Conversion & CTA Optimization
] as const;

// Validate weights sum to 1.0
const weightSum = SECTION_WEIGHTS_ARRAY.reduce(
  (sum, weight) => sum + weight,
  0,
);
if (Math.abs(weightSum - 1.0) > 0.001) {
  throw new Error(`Section weights must sum to 1.0, got ${weightSum}`);
}

// Evidence quality scoring parameters (research-based)
export const EVIDENCE_SCORING = {
  baseScore: 50, // Starting point for evidence analysis
  quantitativeDataBonus: 20, // Bonus for metrics, numbers, percentages
  crossPageValidationBonus: 15, // Multi-page analysis consistency
  comparativeBenchmarkBonus: 10, // Industry/competitor comparisons
  specificExamplesBonus: 5, // Concrete examples and case studies
  maxEvidenceScore: 100,
} as const;

// Confidence adjustment parameters (statistically validated)
export const CONFIDENCE_ADJUSTMENTS = {
  highConfidenceThreshold: 0.8, // No penalty above this
  mediumConfidenceThreshold: 0.6, // 3% penalty below this
  lowConfidencePenalty: 0.05, // 5% penalty for low confidence
  mediumConfidencePenalty: 0.02, // 2% penalty for medium confidence
  evidenceBonusThreshold: 0.85, // Bonus for high confidence + evidence
} as const;

// Score consistency parameters
export const CONSISTENCY_THRESHOLDS = {
  maxVariationPercent: 5, // Max 5% variation for identical content
  cacheExpirationDays: 7, // Cache scores for 7 days
  outlierThreshold: 2.0, // 2 standard deviations for outlier detection
  minimumEvidenceScore: 60, // Minimum evidence quality threshold
} as const;

// Industry-specific weight adjustments (research-backed)
export const INDUSTRY_ADJUSTMENTS = {
  ecommerce: {
    conversionCTA: +0.05, // Emphasize conversion for ecommerce
    performanceSpeed: +0.03, // Fast loading critical for sales
    visualDesignFlow: -0.02, // Less emphasis on pure aesthetics
    contentMessaging: -0.02, // Product focus over long-form content
  },
  saas: {
    userExperienceNav: +0.07, // User experience paramount
    contentMessaging: +0.03, // Documentation and onboarding copy
    seoTechnical: +0.02, // Technical SEO important
    visualDesignFlow: -0.03, // Function over form
  },
  healthcare: {
    accessibility: +0.1, // Regulatory requirements critical
    securityIntegrity: +0.05, // Patient data security
    userExperienceNav: +0.03, // Accessibility requirements
    conversionCTA: -0.05, // Less focus on sales conversion
    competitivePositioning: -0.03, // Less competitive focus
  },
  finance: {
    securityIntegrity: +0.12, // Heavy security requirements
    accessibility: +0.05, // Compliance and trust
    contentMessaging: +0.03, // Credibility through clear messaging
    conversionCTA: -0.05, // Relationship over conversion
    visualDesignFlow: -0.03, // Conservative approach
  },
} as const;

// Score validation rules
export const VALIDATION_RULES = {
  minScore: 0,
  maxScore: 100,
  requiredSections: 10,
  minIssuesForLowScore: 5, // Low scores should have issues
  maxIssuesForHighScore: 2, // High scores shouldn't have many issues
  scoreIssueCorrelation: 0.7, // Expected correlation between score and issues
} as const;

// Scoring methodology version
export const SCORING_VERSION = "3.0.0" as const; // Major update: New technical criteria focus
export const SCORING_METHODOLOGY = "technical-audit-based" as const;
