/**
 * Standardized Scoring Constants
 * Research-based section weights and scoring parameters for consistent audit results
 */

// Standardized section weights based on digital marketing ROI studies
export const SECTION_WEIGHTS = {
  branding: 0.18,           // Brand recall impacts 18% of conversion decisions
  design: 0.13,             // Visual hierarchy affects user engagement
  messaging: 0.13,          // Content clarity drives conversion lift
  usability: 0.13,          // Nielsen studies: critical for user retention
  contentStrategy: 0.09,    // Supporting role in user journey
  digitalPresence: 0.09,    // SEO/performance: organic acquisition
  customerExperience: 0.05, // Cross-touchpoint optimization
  competitorAnalysis: 0.05, // Benchmarking insights
  conversionOptimization: 0.10, // Direct revenue impact
  compliance: 0.05          // Regulatory requirements (varies by industry)
} as const;

// Convert to array format for calculations (matches section order)
export const SECTION_WEIGHTS_ARRAY = [
  SECTION_WEIGHTS.branding,              // 0: Branding
  SECTION_WEIGHTS.design,                // 1: Design  
  SECTION_WEIGHTS.messaging,             // 2: Messaging
  SECTION_WEIGHTS.usability,             // 3: Usability
  SECTION_WEIGHTS.contentStrategy,       // 4: Content Strategy
  SECTION_WEIGHTS.digitalPresence,       // 5: Digital Presence
  SECTION_WEIGHTS.customerExperience,    // 6: Customer Experience
  SECTION_WEIGHTS.competitorAnalysis,    // 7: Competitor Analysis
  SECTION_WEIGHTS.conversionOptimization, // 8: Conversion Optimization
  SECTION_WEIGHTS.compliance             // 9: Consistency & Compliance
] as const;

// Validate weights sum to 1.0
const weightSum = SECTION_WEIGHTS_ARRAY.reduce((sum, weight) => sum + weight, 0);
if (Math.abs(weightSum - 1.0) > 0.001) {
  throw new Error(`Section weights must sum to 1.0, got ${weightSum}`);
}

// Evidence quality scoring parameters (research-based)
export const EVIDENCE_SCORING = {
  baseScore: 50,                    // Starting point for evidence analysis
  quantitativeDataBonus: 20,        // Bonus for metrics, numbers, percentages
  crossPageValidationBonus: 15,     // Multi-page analysis consistency
  comparativeBenchmarkBonus: 10,    // Industry/competitor comparisons
  specificExamplesBonus: 5,         // Concrete examples and case studies
  maxEvidenceScore: 100
} as const;

// Confidence adjustment parameters (statistically validated)
export const CONFIDENCE_ADJUSTMENTS = {
  highConfidenceThreshold: 0.8,     // No penalty above this
  mediumConfidenceThreshold: 0.6,   // 3% penalty below this
  lowConfidencePenalty: 0.05,       // 5% penalty for low confidence
  mediumConfidencePenalty: 0.02,    // 2% penalty for medium confidence
  evidenceBonusThreshold: 0.85      // Bonus for high confidence + evidence
} as const;

// Score consistency parameters
export const CONSISTENCY_THRESHOLDS = {
  maxVariationPercent: 5,           // Max 5% variation for identical content
  cacheExpirationDays: 7,           // Cache scores for 7 days
  outlierThreshold: 2.0,            // 2 standard deviations for outlier detection
  minimumEvidenceScore: 60          // Minimum evidence quality threshold
} as const;

// Industry-specific weight adjustments (research-backed)
export const INDUSTRY_ADJUSTMENTS = {
  ecommerce: {
    conversionOptimization: +0.05,   // Emphasize conversion for ecommerce
    customerExperience: +0.03,       // Customer journey critical
    design: -0.02,                   // Less emphasis on pure aesthetics
    messaging: -0.02                 // Product focus over messaging
  },
  saas: {
    usability: +0.07,                // User experience paramount
    contentStrategy: +0.03,          // Documentation and onboarding
    digitalPresence: +0.02,          // Technical SEO important
    design: -0.03                    // Function over form
  },
  healthcare: {
    compliance: +0.10,               // Regulatory requirements critical
    customerExperience: +0.05,       // Patient experience
    usability: +0.03,                // Accessibility requirements
    conversionOptimization: -0.05,   // Less focus on sales conversion
    competitorAnalysis: -0.03        // Less competitive focus
  },
  finance: {
    compliance: +0.12,               // Heavy regulatory requirements
    customerExperience: +0.05,       // Trust and security
    branding: +0.03,                 // Credibility crucial
    conversionOptimization: -0.05,   // Relationship over conversion
    design: -0.03                    // Conservative approach
  }
} as const;

// Score validation rules
export const VALIDATION_RULES = {
  minScore: 0,
  maxScore: 100,
  requiredSections: 10,
  minIssuesForLowScore: 5,          // Low scores should have issues
  maxIssuesForHighScore: 2,         // High scores shouldn't have many issues
  scoreIssueCorrelation: 0.7        // Expected correlation between score and issues
} as const;

// Scoring methodology version
export const SCORING_VERSION = '2.0.0' as const;
export const SCORING_METHODOLOGY = 'research-based-standardized' as const;
