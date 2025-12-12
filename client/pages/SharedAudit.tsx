import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { AuditResponse } from "@shared/api";
import { apiGet } from "@/lib/api-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Calendar,
  Globe,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Info,
  XCircle,
  Lightbulb,
  Target,
  TrendingDown,
  Shield,
  Zap,
  BarChart3,
  Activity,
  Users,
  Clock,
  DollarSign,
  CheckSquare,
  AlertCircle,
  Star,
  PlayCircle,
  Timer,
  Award,
  Briefcase,
  ArrowRight,
} from "lucide-react";

// SWOT Matrix Component for Competitor Analysis
function SWOTMatrix({
  sectionName,
  auditData,
}: {
  sectionName: string;
  auditData?: any;
}) {
  // Parse SWOT data from audit content if available
  const parseSWOTFromContent = (content: string) => {
    const defaultData = {
      strengths: [
        "Strong brand positioning",
        "User-friendly interface",
        "Quality content",
      ],
      weaknesses: [
        "Limited competitive analysis",
        "Missing industry benchmarks",
        "Unclear market position",
      ],
      opportunities: [
        "Market differentiation",
        "Enhanced digital presence",
        "Strategic partnerships",
      ],
      threats: [
        "Increased competition",
        "Market saturation",
        "Technology changes",
      ],
    };

    if (!content) return defaultData;

    const sections = {
      strengths: [] as string[],
      weaknesses: [] as string[],
      opportunities: [] as string[],
      threats: [] as string[],
    };

    // Extract SWOT items from content using regex patterns
    const strengthsMatch = content.match(
      /Strengths?[:\s]*([\s\S]*?)(?=\n\s*Weaknesses?|$)/i,
    );
    const weaknessesMatch = content.match(
      /Weaknesses?[:\s]*([\s\S]*?)(?=\n\s*Opportunities?|$)/i,
    );
    const opportunitiesMatch = content.match(
      /Opportunities?[:\s]*([\s\S]*?)(?=\n\s*Threats?|$)/i,
    );
    const threatsMatch = content.match(/Threats?[:\s]*([\s\S]*?)(?=\n|$)/i);

    const extractItems = (text: string): string[] => {
      return text
        .split(/[-•*]\s*/)
        .map((item) => item.trim())
        .filter((item) => item.length > 10 && item.length < 100)
        .slice(0, 4);
    };

    if (strengthsMatch) sections.strengths = extractItems(strengthsMatch[1]);
    if (weaknessesMatch) sections.weaknesses = extractItems(weaknessesMatch[1]);
    if (opportunitiesMatch)
      sections.opportunities = extractItems(opportunitiesMatch[1]);
    if (threatsMatch) sections.threats = extractItems(threatsMatch[1]);

    // Use defaults for empty sections
    Object.keys(sections).forEach((key) => {
      if (sections[key as keyof typeof sections].length === 0) {
        sections[key as keyof typeof sections] =
          defaultData[key as keyof typeof defaultData];
      }
    });

    return sections;
  };

  const competitorSection = auditData?.sections?.find((s: any) =>
    s.name.toLowerCase().includes("competitor"),
  );

  const swotData = parseSWOTFromContent(competitorSection?.details || "");

  return (
    <div className="mt-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border">
      <div className="flex items-center gap-2 mb-4">
        <Target className="h-5 w-5 text-blue-600" />
        <h4 className="text-lg font-semibold text-gray-900">
          SWOT Analysis Matrix
        </h4>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Strengths */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-green-600" />
            <h5 className="font-semibold text-green-800">Strengths</h5>
          </div>
          <ul className="space-y-2">
            {swotData.strengths.map((item, index) => (
              <li key={index} className="flex gap-2 text-sm">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <span className="text-green-700">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Weaknesses */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="h-4 w-4 text-red-600" />
            <h5 className="font-semibold text-red-800">Weaknesses</h5>
          </div>
          <ul className="space-y-2">
            {swotData.weaknesses.map((item, index) => (
              <li key={index} className="flex gap-2 text-sm">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                <span className="text-red-700">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Opportunities */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <h5 className="font-semibold text-blue-800">Opportunities</h5>
          </div>
          <ul className="space-y-2">
            {swotData.opportunities.map((item, index) => (
              <li key={index} className="flex gap-2 text-sm">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <span className="text-blue-700">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Threats */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-orange-600" />
            <h5 className="font-semibold text-orange-800">Threats</h5>
          </div>
          <ul className="space-y-2">
            {swotData.threats.map((item, index) => (
              <li key={index} className="flex gap-2 text-sm">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                <span className="text-orange-700">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// Competitive Metrics Dashboard Component
function CompetitiveMetrics({ auditData }: { auditData: any }) {
  // Extract performance data from audit
  const overallScore = auditData?.overallScore || 0;
  const sections = auditData?.sections || [];

  // Calculate competitive positioning metrics
  const metrics = [
    {
      name: "Website Performance",
      yourScore:
        sections.find((s: any) => s.name.toLowerCase().includes("usability"))
          ?.score || 0,
      industryAverage: 72,
      icon: Activity,
      color: "blue",
    },
    {
      name: "Brand Strength",
      yourScore:
        sections.find((s: any) => s.name.toLowerCase().includes("branding"))
          ?.score || 0,
      industryAverage: 75,
      icon: Target,
      color: "purple",
    },
    {
      name: "User Experience",
      yourScore:
        sections.find((s: any) => s.name.toLowerCase().includes("customer"))
          ?.score || 0,
      industryAverage: 68,
      icon: Users,
      color: "green",
    },
    {
      name: "Digital Presence",
      yourScore:
        sections.find((s: any) => s.name.toLowerCase().includes("digital"))
          ?.score || 0,
      industryAverage: 70,
      icon: Globe,
      color: "orange",
    },
  ];

  const getMetricColor = (yourScore: number, industryAverage: number) => {
    if (yourScore >= industryAverage + 10)
      return "text-green-600 bg-green-50 border-green-200";
    if (yourScore >= industryAverage - 5)
      return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const getCompetitivePosition = (
    yourScore: number,
    industryAverage: number,
  ) => {
    if (yourScore >= industryAverage + 10) return "Leading";
    if (yourScore >= industryAverage - 5) return "Competitive";
    return "Behind";
  };

  return (
    <div className="mt-6 p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-5 w-5 text-gray-600" />
        <h4 className="text-lg font-semibold text-gray-900">
          Competitive Positioning
        </h4>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          const colorClasses = getMetricColor(
            metric.yourScore,
            metric.industryAverage,
          );
          const position = getCompetitivePosition(
            metric.yourScore,
            metric.industryAverage,
          );

          return (
            <div key={index} className="bg-white border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 text-${metric.color}-600`} />
                  <h5 className="font-medium text-gray-900">{metric.name}</h5>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium border ${colorClasses}`}
                >
                  {position}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Your Score</span>
                  <span className="font-semibold text-gray-900">
                    {metric.yourScore}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`bg-${metric.color}-500 h-2 rounded-full`}
                    style={{ width: `${metric.yourScore}%` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">
                    Industry Avg: {metric.industryAverage}%
                  </span>
                  <span
                    className={
                      metric.yourScore >= metric.industryAverage
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    {metric.yourScore >= metric.industryAverage ? "+" : ""}
                    {metric.yourScore - metric.industryAverage}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Competitive Insight:</strong> Your overall score of{" "}
          {overallScore}% places you{" "}
          {overallScore >= 75
            ? "in the top tier"
            : overallScore >= 65
              ? "in the competitive range"
              : "below average"}{" "}
          compared to industry benchmarks.
        </p>
      </div>
    </div>
  );
}

// Enhanced Implementation Roadmap Component
function ImplementationRoadmap({ auditData }: { auditData: any }) {
  const sections = auditData?.sections || [];
  const improvementImpact = auditData?.improvementImpact;

  // Extract implementation phases based on enhanced scoring system
  const quickWins = sections.filter(
    (s: any) =>
      s.implementationDifficulty === "easy" &&
      (s.priorityLevel === "critical" || s.priorityLevel === "high"),
  );

  const shortTerm = sections.filter(
    (s: any) =>
      s.implementationDifficulty === "medium" &&
      (s.priorityLevel === "critical" || s.priorityLevel === "high"),
  );

  const longTerm = sections.filter(
    (s: any) =>
      s.implementationDifficulty === "hard" ||
      s.implementationDifficulty === "very_hard",
  );

  const phases = [
    {
      title: "Phase 1: Quick Wins",
      timeframe: "1-2 weeks",
      description: "High-impact, easy-to-implement improvements",
      items: quickWins,
      icon: Zap,
      color: "green",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      textColor: "text-green-800",
    },
    {
      title: "Phase 2: Short-term Goals",
      timeframe: "1-3 months",
      description: "Medium complexity improvements with significant impact",
      items: shortTerm,
      icon: Target,
      color: "blue",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      textColor: "text-blue-800",
    },
    {
      title: "Phase 3: Long-term Strategy",
      timeframe: "3-6 months",
      description: "Complex improvements requiring significant resources",
      items: longTerm,
      icon: Award,
      color: "purple",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
      textColor: "text-purple-800",
    },
  ];

  return (
    <div className="mt-8 space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-5 w-5 text-gray-600" />
        <h4 className="text-lg font-semibold text-gray-900">
          Implementation Roadmap
        </h4>
      </div>

      {phases.map((phase, index) => {
        const Icon = phase.icon;
        return (
          <div
            key={index}
            className={`${phase.bgColor} border ${phase.borderColor} rounded-lg p-6`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`p-2 rounded-lg bg-white border ${phase.borderColor}`}
              >
                <Icon className={`h-5 w-5 text-${phase.color}-600`} />
              </div>
              <div>
                <h5 className={`font-semibold ${phase.textColor}`}>
                  {phase.title}
                </h5>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-3 w-3" />
                  {phase.timeframe}
                </div>
              </div>
            </div>

            <p className={`text-sm ${phase.textColor} mb-4`}>
              {phase.description}
            </p>

            {phase.items.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {phase.items.map((item: any, itemIndex: number) => (
                  <div
                    key={itemIndex}
                    className="bg-white border rounded-lg p-3"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h6 className="font-medium text-gray-900 text-sm">
                        {item.name}
                      </h6>
                      <Badge variant="outline" className="text-xs">
                        {item.score}%
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-600">
                      {item.recommendations} recommendations •{" "}
                      {item.estimatedImpact || "Impact: Medium"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-600 italic">
                No items identified for this phase based on current analysis.
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ROI Calculator Component
function ROICalculator({ auditData }: { auditData: any }) {
  const improvementImpact = auditData?.improvementImpact;
  const metadata = auditData?.metadata;

  return (
    <div className="mt-8 p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="h-5 w-5 text-green-600" />
        <h4 className="text-lg font-semibold text-gray-900">
          Expected ROI & Impact
        </h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-white border border-green-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600 mb-1">
            {improvementImpact?.estimatedROI || "15-25%"}
          </div>
          <div className="text-sm text-gray-600">Expected Improvement</div>
        </div>

        <div className="bg-white border border-green-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600 mb-1">
            {improvementImpact?.implementationTimeframe || "2-6 months"}
          </div>
          <div className="text-sm text-gray-600">Implementation Timeline</div>
        </div>

        <div className="bg-white border border-green-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600 mb-1">
            {improvementImpact?.highPriority?.length || 0}
          </div>
          <div className="text-sm text-gray-600">High Priority Areas</div>
        </div>
      </div>

      <div className="text-sm text-green-800">
        <strong>Business Impact:</strong> Based on industry benchmarks and your
        current performance, implementing these recommendations could result in
        significant improvements to user engagement, conversion rates, and
        overall digital performance.
      </div>
    </div>
  );
}

// Success Metrics Component
function SuccessMetrics({ auditData }: { auditData: any }) {
  const businessType = auditData?.metadata?.businessType || "general";
  const industry = auditData?.metadata?.industryDetected || "general";

  const getMetricsForIndustry = () => {
    const baseMetrics = [
      {
        name: "Overall Audit Score",
        target: "85%+",
        current: `${auditData.overallScore}%`,
      },
      { name: "Page Load Speed", target: "< 2.5s", current: "Monitor" },
      { name: "Mobile Usability Score", target: "90%+", current: "Monitor" },
      { name: "User Engagement", target: "+25%", current: "Baseline" },
    ];

    const industrySpecific = {
      ecommerce: [
        { name: "Conversion Rate", target: "+20%", current: "Baseline" },
        { name: "Cart Abandonment", target: "-15%", current: "Monitor" },
      ],
      saas: [
        { name: "Trial Conversion", target: "+30%", current: "Baseline" },
        { name: "User Activation", target: "+25%", current: "Monitor" },
      ],
      healthcare: [
        { name: "Appointment Bookings", target: "+20%", current: "Baseline" },
        { name: "Patient Trust Score", target: "90%+", current: "Monitor" },
      ],
    };

    return [
      ...baseMetrics,
      ...(industrySpecific[industry as keyof typeof industrySpecific] || []),
    ];
  };

  return (
    <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-5 w-5 text-blue-600" />
        <h4 className="text-lg font-semibold text-gray-900">
          Success Metrics to Track
        </h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {getMetricsForIndustry().map((metric, index) => (
          <div key={index} className="bg-white border rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <h6 className="font-medium text-gray-900">{metric.name}</h6>
              <Badge variant="outline" className="text-xs">
                Target: {metric.target}
              </Badge>
            </div>
            <div className="text-sm text-gray-600">
              Current: {metric.current}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-blue-100 border border-blue-300 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Recommendation:</strong> Set up Google Analytics 4 and other
          tracking tools to monitor these metrics before and after
          implementation to measure success.
        </p>
      </div>
    </div>
  );
}

// Resource Center Component
function ResourceCenter() {
  const resources = [
    {
      category: "Tools & Platforms",
      items: [
        {
          name: "Google PageSpeed Insights",
          description: "Test page speed and performance",
          url: "https://pagespeed.web.dev/",
        },
        {
          name: "Google Analytics 4",
          description: "Track website performance metrics",
          url: "https://analytics.google.com/",
        },
        {
          name: "Google Search Console",
          description: "Monitor search performance",
          url: "https://search.google.com/search-console",
        },
        {
          name: "GTmetrix",
          description: "Comprehensive performance analysis",
          url: "https://gtmetrix.com/",
        },
      ],
    },
    {
      category: "Best Practices",
      items: [
        {
          name: "Web Content Accessibility Guidelines",
          description: "WCAG 2.1 compliance standards",
          url: "https://www.w3.org/WAI/WCAG21/quickref/",
        },
        {
          name: "Core Web Vitals",
          description: "Google's page experience metrics",
          url: "https://web.dev/vitals/",
        },
        {
          name: "SEO Starter Guide",
          description: "Google's official SEO guidelines",
          url: "https://developers.google.com/search/docs/fundamentals/seo-starter-guide",
        },
      ],
    },
    {
      category: "Design & UX",
      items: [
        {
          name: "Material Design",
          description: "Google's design system guidelines",
          url: "https://material.io/design",
        },
        {
          name: "Human Interface Guidelines",
          description: "Apple's UX design principles",
          url: "https://developer.apple.com/design/human-interface-guidelines/",
        },
        {
          name: "Nielsen Norman Group",
          description: "UX research and usability insights",
          url: "https://www.nngroup.com/",
        },
      ],
    },
  ];

  return (
    <div className="mt-8 p-6 bg-gray-50 border border-gray-200 rounded-lg">
      <div className="flex items-center gap-2 mb-4">
        <Briefcase className="h-5 w-5 text-gray-600" />
        <h4 className="text-lg font-semibold text-gray-900">
          Helpful Resources
        </h4>
      </div>

      <div className="space-y-6">
        {resources.map((category, index) => (
          <div key={index}>
            <h5 className="font-semibold text-gray-900 mb-3">
              {category.category}
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {category.items.map((resource, resourceIndex) => (
                <div
                  key={resourceIndex}
                  className="bg-white border rounded-lg p-3 hover:shadow-sm transition-shadow"
                >
                  <h6 className="font-medium text-gray-900 text-sm mb-1">
                    {resource.name}
                  </h6>
                  <p className="text-xs text-gray-600 mb-2">
                    {resource.description}
                  </p>
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                  >
                    Visit Resource
                    <ArrowRight className="h-3 w-3" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Function to parse and style audit section content
function parseAuditContent(content: string) {
  if (!content || typeof content !== "string") {
    return [];
  }

  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const sections: Array<{
    type: "overview" | "issues" | "recommendations";
    content: string[];
  }> = [];

  let currentSection: "overview" | "issues" | "recommendations" = "overview";
  let currentContent: string[] = [];

  for (const line of lines) {
    // Enhanced pattern matching for different heading formats
    const issuePatterns = [
      /(\*\*)?Issues?\s*(Found)?\*?\*?:?/i,
      /(\*\*)?Problems?\*?\*?:?/i,
      /(\*\*)?Areas?\s*for\s*Improvement\*?\*?:?/i,
      /^Issues?:/i,
      /^Problems?:/i,
    ];

    const recommendationPatterns = [
      /(\*\*)?Recommendations?\*?\*?:?/i,
      /(\*\*)?Suggested?\s*Actions?\*?\*?:?/i,
      /(\*\*)?Action\s*Items?\*?\*?:?/i,
      /(\*\*)?Improvements?\*?\*?:?/i,
      /^Recommendations?:/i,
      /^Actions?:/i,
      /^Improvements?:/i,
    ];

    const overviewPatterns = [
      /(\*\*)?Overview\*?\*?:?/i,
      /(\*\*)?Analysis\*?\*?:?/i,
      /(\*\*)?Summary\*?\*?:?/i,
      /^Overview:/i,
      /^Analysis:/i,
    ];

    let sectionFound = false;

    // Check for issues section
    if (issuePatterns.some((pattern) => pattern.test(line))) {
      if (currentContent.length > 0) {
        sections.push({ type: currentSection, content: [...currentContent] });
        currentContent = [];
      }
      currentSection = "issues";
      sectionFound = true;
    }
    // Check for recommendations section
    else if (recommendationPatterns.some((pattern) => pattern.test(line))) {
      if (currentContent.length > 0) {
        sections.push({ type: currentSection, content: [...currentContent] });
        currentContent = [];
      }
      currentSection = "recommendations";
      sectionFound = true;
    }
    // Check for overview section
    else if (overviewPatterns.some((pattern) => pattern.test(line))) {
      if (currentContent.length > 0) {
        sections.push({ type: currentSection, content: [...currentContent] });
        currentContent = [];
      }
      currentSection = "overview";
      sectionFound = true;
    }

    // If it's not a section header, add to current content
    if (!sectionFound) {
      // Clean up markdown formatting and numbered lists
      let cleanLine = line
        .replace(/^\*\*|\*\*$/g, "") // Remove bold markdown
        .replace(/^\d+\.\s*/, "") // Remove numbered list formatting
        .replace(/^[-*]\s*/, "") // Remove bullet points
        .replace(/^>\s*/, "") // Remove quote markers
        .trim();

      // Skip empty lines and section headers we might have missed
      if (
        cleanLine &&
        !cleanLine.match(
          /^(issues?|recommendations?|overview|analysis|summary):\s*$/i,
        )
      ) {
        currentContent.push(cleanLine);
      }
    }
  }

  // Add the final section
  if (currentContent.length > 0) {
    sections.push({ type: currentSection, content: currentContent });
  }

  // If no specific sections were found, treat entire content as overview
  if (sections.length === 0 && content.trim()) {
    sections.push({
      type: "overview",
      content: content
        .split("\n\n")
        .filter((p) => p.trim())
        .map((p) => p.trim()),
    });
  }

  return sections;
}

export default function SharedAudit() {
  const { id } = useParams(); // This is actually the share token in the URL
  const [auditData, setAuditData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-green-50 border-green-200";
    if (score >= 60) return "bg-yellow-50 border-yellow-200";
    return "bg-red-50 border-red-200";
  };

  useEffect(() => {
    if (!id) {
      setError("Share token not provided");
      setLoading(false);
      return;
    }

    const loadAuditData = async () => {
      try {
        console.log(`Loading shared audit with token ${id.substring(0, 8)}...`);

        // Fetch from backend API using share token endpoint
        // Try share token endpoint first (for new secure links)
        let auditData: AuditResponse | null = null;

        try {
          auditData = await apiGet<AuditResponse>(`/api/audits/share/${id}`);
          console.log("✓ Loaded audit using share token");
        } catch (tokenError) {
          // Fallback: try as direct ID for old links
          console.log(
            "Share token failed, trying as direct ID (old link format)...",
          );
          try {
            auditData = await apiGet<AuditResponse>(`/api/audits/${id}`);
            console.log("✓ Loaded audit using direct ID (old format)");
          } catch (idError) {
            throw new Error("Audit not found with share token or ID");
          }
        }

        if (!auditData) {
          console.error("Failed to fetch audit data");
          setError(
            "Audit not found. The link may be invalid or the audit may have expired.",
          );
          return;
        }

        setAuditData(auditData);
        console.log("✓ Loaded shared audit from API");
      } catch (error) {
        console.error("Error loading shared audit:", error);
        setError(
          "Failed to load audit data. Please check the link and try again.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadAuditData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900">
            Loading audit report...
          </h2>
          <p className="text-gray-600 mt-2">
            Please wait while we retrieve the audit data.
          </p>
        </div>
      </div>
    );
  }

  if (error || !auditData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Audit Report Not Found
          </h2>
          <p className="text-gray-600 mb-8">{error}</p>
          <p className="text-sm text-gray-500">
            This audit report may have been removed or the link may be
            incorrect.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Read-Only Shared Audit Header - No Navigation */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col items-center justify-center space-y-2">
            {/* Non-clickable logo - just branding */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">B</span>
              </div>
              <span className="text-xl font-bold text-gray-900">
                Brand Whisperer
              </span>
            </div>
            {/* Read-only indicator */}
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full">
              <Info className="h-3 w-3 text-blue-600" />
              <span className="text-xs font-medium text-blue-700">
                Shared Audit Report (Read-Only)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Figma-inspired Header Design - Same as AuditResults */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8">
            {/* Hero Section Layout - Figma Design */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
              {/* Left Column - Website Info and Content */}
              <div className="flex-1 lg:max-w-xl">
                {/* URL Bar */}
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-4 p-3 bg-gray-50 rounded-lg border">
                  <Globe className="h-4 w-4" />
                  <span className="font-medium">{auditData.url}</span>
                </div>

                {/* Date */}
                <div className="text-xs text-gray-500 mb-2">
                  Audit Report - {auditData.date}
                </div>

                {/* Main Title */}
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">
                  {auditData.title}
                </h1>

                {/* Description */}
                <p className="text-gray-600 leading-relaxed mb-6">
                  {auditData.description}
                </p>
              </div>

              {/* Right Column - Large Score Panel */}
              <div className="flex justify-center lg:justify-end">
                <Card className="w-80 h-52 bg-yellow-50 border-yellow-200 border-2 shadow-lg">
                  <CardContent className="pt-8 text-center h-full flex flex-col justify-center">
                    <div className="text-6xl font-bold mb-2 text-orange-600">
                      {auditData.overallScore}%
                    </div>
                    <div className="text-gray-700 font-semibold text-lg mb-4">
                      Overall Score
                    </div>
                    <Progress
                      value={auditData.overallScore}
                      className="h-3 mb-3"
                    />
                    <div className="text-sm text-gray-600">
                      Based on 10 evaluation criteria
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-8">
            <TabsTrigger value="overview">Audit Overview</TabsTrigger>
            <TabsTrigger value="next-steps">Next Steps</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-orange-600" />
                  Audit Results by Category
                </CardTitle>
                <CardDescription>
                  Expand each section below to view scores, analysis, and
                  detailed recommendations.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" className="w-full">
                  {auditData.sections.map((section, index) => {
                    const parsedContent = parseAuditContent(section.details);
                    const recommendationsContent = parsedContent.find(
                      (content) => content.type === "recommendations",
                    );

                    // Show section if it has recommendations count or any content
                    const hasRecommendations =
                      recommendationsContent &&
                      recommendationsContent.content.length > 0;
                    const hasContent =
                      section.details && section.details.length > 0;
                    const hasRecommendationCount =
                      (section.recommendations || 0) > 0;

                    if (!hasContent && !hasRecommendationCount) {
                      return null;
                    }

                    return (
                      <AccordionItem key={index} value={`item-${index}`}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center justify-between w-full pr-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`p-2 rounded-lg ${getScoreBg(section.score)}`}
                              >
                                <Lightbulb className="h-4 w-4" />
                              </div>
                              <div className="text-left">
                                <div className="text-lg font-semibold text-gray-900">
                                  {section.name}
                                </div>
                                <div className="text-sm text-gray-600 font-normal">
                                  {section.recommendations} recommendations •
                                  Score: {section.score}%
                                </div>
                              </div>
                            </div>
                            <div
                              className={`px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(section.score)} ${getScoreBg(section.score)} border mr-2`}
                            >
                              {section.score}%
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="pt-4 space-y-4">
                            {(() => {
                              const hasRecommendationsContent =
                                recommendationsContent &&
                                recommendationsContent.content.length > 0;
                              const overviewContent = parsedContent.find(
                                (content) => content.type === "overview",
                              );
                              const issuesContent = parsedContent.find(
                                (content) => content.type === "issues",
                              );

                              return (
                                <>
                                  {/* Show Overview if available */}
                                  {overviewContent &&
                                    overviewContent.content.length > 0 && (
                                      <div className="space-y-3">
                                        <div className="flex items-center gap-2 mb-3">
                                          <Info className="h-4 w-4 text-blue-600" />
                                          <h5 className="font-semibold text-gray-900">
                                            Overview
                                          </h5>
                                        </div>
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                          {overviewContent.content.map(
                                            (item, itemIndex) => (
                                              <div
                                                key={itemIndex}
                                                className="flex gap-3 items-start mb-2 last:mb-0"
                                              >
                                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                                                <p className="text-blue-800 text-sm leading-relaxed">
                                                  {item}
                                                </p>
                                              </div>
                                            ),
                                          )}
                                        </div>
                                      </div>
                                    )}

                                  {/* Show Issues if available */}
                                  {issuesContent &&
                                    issuesContent.content.length > 0 && (
                                      <div className="space-y-3">
                                        <div className="flex items-center gap-2 mb-3">
                                          <XCircle className="h-4 w-4 text-red-600" />
                                          <h5 className="font-semibold text-gray-900">
                                            Issues Found
                                          </h5>
                                        </div>
                                        <div className="space-y-2">
                                          {issuesContent.content.map(
                                            (issue, itemIndex) => (
                                              <div
                                                key={itemIndex}
                                                className="flex gap-3 p-3 bg-red-50 border border-red-200 rounded-lg"
                                              >
                                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                                                <p className="text-red-800 text-sm leading-relaxed">
                                                  {issue}
                                                </p>
                                              </div>
                                            ),
                                          )}
                                        </div>
                                      </div>
                                    )}

                                  {/* Show Recommendations/Analysis - Always show this section */}
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2 mb-3">
                                      <Lightbulb className="h-4 w-4 text-green-600" />
                                      <h5 className="font-semibold text-gray-900">
                                        {hasRecommendationsContent
                                          ? "Recommendations"
                                          : "Analysis & Insights"}
                                      </h5>
                                    </div>
                                    <div className="space-y-2">
                                      {hasRecommendationsContent ? (
                                        // Show parsed recommendations if available
                                        recommendationsContent.content.map(
                                          (recommendation, itemIndex) => (
                                            <div
                                              key={itemIndex}
                                              className="flex gap-3 p-3 bg-green-50 border border-green-200 rounded-lg"
                                            >
                                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                                              <p className="text-green-800 text-sm leading-relaxed">
                                                {recommendation}
                                              </p>
                                            </div>
                                          ),
                                        )
                                      ) : (
                                        // Fallback: show full content with better formatting
                                        <div className="space-y-3">
                                          {section.details
                                            .split("\n\n")
                                            .filter((paragraph) =>
                                              paragraph.trim(),
                                            )
                                            .map((paragraph, pIndex) => (
                                              <div
                                                key={pIndex}
                                                className="p-4 bg-gray-50 border border-gray-200 rounded-lg"
                                              >
                                                <div className="prose prose-sm max-w-none">
                                                  <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                                                    {paragraph.trim()}
                                                  </p>
                                                </div>
                                              </div>
                                            ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </>
                              );
                            })()}

                            {/* Show SWOT Matrix and Competitive Metrics for Competitor Analysis */}
                            {section.name
                              .toLowerCase()
                              .includes("competitor") && (
                              <>
                                <CompetitiveMetrics auditData={auditData} />
                                <SWOTMatrix
                                  sectionName={section.name}
                                  auditData={auditData}
                                />
                              </>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="next-steps" className="mt-8">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Strategic Implementation Plan
                </CardTitle>
                <CardDescription>
                  Comprehensive action plan with prioritized recommendations,
                  timelines, and success metrics for {auditData.title}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Executive Summary */}
                <div className="prose prose-sm max-w-none text-gray-700 mb-8">
                  {auditData.summary?.split("\n").map(
                    (paragraph, index) =>
                      paragraph.trim() && (
                        <p key={index} className="mb-4">
                          {paragraph.trim()}
                        </p>
                      ),
                  )}
                </div>

                {/* Enhanced Implementation Roadmap */}
                <ImplementationRoadmap auditData={auditData} />

                {/* ROI Calculator */}
                <ROICalculator auditData={auditData} />

                {/* Success Metrics */}
                <SuccessMetrics auditData={auditData} />

                {/* Enhanced Priority Matrix */}
                <div className="mt-8 p-6 bg-gradient-to-br from-orange-50 to-red-50 rounded-lg border border-orange-200">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                    Priority Action Matrix
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h5 className="font-medium text-red-800 mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Critical Priority
                      </h5>
                      <div className="text-sm text-red-700 space-y-1">
                        {auditData.sections
                          .filter(
                            (s) =>
                              s.priorityLevel === "critical" || s.score < 50,
                          )
                          .map((s, index) => (
                            <div key={index} className="flex justify-between">
                              <span>{s.name}</span>
                              <Badge variant="destructive" className="text-xs">
                                {s.score}%
                              </Badge>
                            </div>
                          )) || <span>No critical issues found</span>}
                      </div>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h5 className="font-medium text-yellow-800 mb-2 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        High Priority
                      </h5>
                      <div className="text-sm text-yellow-700 space-y-1">
                        {auditData.sections
                          .filter(
                            (s) =>
                              s.priorityLevel === "high" ||
                              (s.score >= 50 && s.score < 70),
                          )
                          .map((s, index) => (
                            <div key={index} className="flex justify-between">
                              <span>{s.name}</span>
                              <Badge variant="secondary" className="text-xs">
                                {s.score}%
                              </Badge>
                            </div>
                          )) || <span>No high priority items</span>}
                      </div>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h5 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                        <Star className="h-4 w-4" />
                        Strengths to Leverage
                      </h5>
                      <div className="text-sm text-green-700 space-y-1">
                        {auditData.sections
                          .filter((s) => s.score >= 80)
                          .map((s, index) => (
                            <div key={index} className="flex justify-between">
                              <span>{s.name}</span>
                              <Badge
                                variant="default"
                                className="text-xs bg-green-600"
                              >
                                {s.score}%
                              </Badge>
                            </div>
                          )) || <span>Focus on improving other areas</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resource Center */}
                <ResourceCenter />

                {/* Next Steps - Multi-Path Actions */}
                <div className="mt-8 space-y-6">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-2">
                    <ArrowRight className="h-6 w-6 text-blue-600" />
                    <h4 className="text-2xl font-bold text-gray-900">
                      Ready to Improve Your Brand?
                    </h4>
                  </div>
                  <p className="text-gray-600 mb-6">
                    Choose the path that works best for your team:
                  </p>

                  {/* Three Action Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* DIY Path */}
                    <Card className="border-2 hover:border-green-500 hover:shadow-lg transition-all cursor-pointer">
                      <CardContent className="p-6">
                        <div className="flex flex-col h-full">
                          <div className="mb-4">
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                              <CheckSquare className="h-6 w-6 text-green-600" />
                            </div>
                            <h5 className="font-semibold text-lg mb-2">
                              Start Implementing
                            </h5>
                            <p className="text-sm text-gray-600 mb-4">
                              Use this audit to guide your internal team
                            </p>
                          </div>

                          <div className="mt-auto space-y-2">
                            <div className="text-sm text-gray-700 space-y-1">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span>Download PDF report</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span>Share with your team</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span>Follow the roadmap</span>
                              </div>
                            </div>
                            <button
                              onClick={() => window.print()}
                              className="w-full mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors"
                            >
                              Download Report
                            </button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Guided Path */}
                    <Card className="border-2 border-blue-500 shadow-lg relative">
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-blue-600 text-white">
                          Most Popular
                        </Badge>
                      </div>
                      <CardContent className="p-6">
                        <div className="flex flex-col h-full">
                          <div className="mb-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                              <Briefcase className="h-6 w-6 text-blue-600" />
                            </div>
                            <h5 className="font-semibold text-lg mb-2">
                              Get Expert Help
                            </h5>
                            <p className="text-sm text-gray-600 mb-4">
                              Work with our team to implement improvements
                            </p>
                          </div>

                          <div className="mt-auto space-y-2">
                            <div className="text-sm text-gray-700 space-y-1">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-blue-600" />
                                <span>30-min strategy call</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-blue-600" />
                                <span>Custom action plan</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-blue-600" />
                                <span>Implementation support</span>
                              </div>
                            </div>
                            <a
                              href="https://calendly.com/brandwhisperer/strategy"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block w-full mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md text-center transition-colors"
                            >
                              Schedule Consultation
                            </a>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Done-for-You Path */}
                    <Card className="border-2 hover:border-purple-500 hover:shadow-lg transition-all cursor-pointer">
                      <CardContent className="p-6">
                        <div className="flex flex-col h-full">
                          <div className="mb-4">
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
                              <Award className="h-6 w-6 text-purple-600" />
                            </div>
                            <h5 className="font-semibold text-lg mb-2">
                              Full Service
                            </h5>
                            <p className="text-sm text-gray-600 mb-4">
                              Let us handle the complete transformation
                            </p>
                          </div>

                          <div className="mt-auto space-y-2">
                            <div className="text-sm text-gray-700 space-y-1">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-purple-600" />
                                <span>Dedicated project manager</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-purple-600" />
                                <span>Full implementation</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-purple-600" />
                                <span>Ongoing optimization</span>
                              </div>
                            </div>
                            <a
                              href="mailto:hello@brandwhisperer.com?subject=Full Service Request - Audit"
                              className="block w-full mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-md text-center transition-colors"
                            >
                              Request Proposal
                            </a>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Quick Actions - Read-Only (No Product Access) */}
                  <div className="mt-8 p-6 bg-gray-50 rounded-lg border">
                    <h5 className="font-semibold text-gray-900 mb-4">
                      Quick Actions You Can Take Today:
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <button
                        onClick={() => {
                          if (navigator.share) {
                            navigator.share({
                              title: auditData.title,
                              text: `Brand Audit Report - ${auditData.overallScore}% Overall Score`,
                              url: window.location.href,
                            });
                          } else {
                            navigator.clipboard.writeText(window.location.href);
                            alert("Link copied to clipboard!");
                          }
                        }}
                        className="flex items-center justify-start px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Share this audit with your team
                      </button>
                      <button
                        onClick={() => window.print()}
                        className="flex items-center justify-start px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                      >
                        <Lightbulb className="h-4 w-4 mr-2" />
                        Download/Print this report
                      </button>
                      <a
                        href="mailto:hello@brandwhisperer.com?subject=Audit Implementation Inquiry"
                        className="flex items-center justify-start px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Contact us for implementation help
                      </a>
                      <a
                        href="https://calendly.com/brandwhisperer/kickoff"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-start px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Schedule a consultation
                      </a>
                    </div>
                  </div>

                  {/* Read-Only Notice */}
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                    <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800">
                      <strong>Viewing Shared Report:</strong> This is a
                      read-only audit report. To create your own audit or access
                      advanced features, please contact us at{" "}
                      <a
                        href="mailto:hello@brandwhisperer.com"
                        className="underline hover:text-amber-900 font-semibold"
                      >
                        hello@brandwhisperer.com
                      </a>
                    </div>
                  </div>

                  {/* Brand Footer */}
                  <div className="mt-6 pt-6 border-t text-center">
                    <div className="text-sm text-gray-500">
                      Generated by Brand Whisperer - Professional Brand Audit
                      Platform
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="text-center mt-12 pt-8 border-t border-gray-200">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <img
              src="https://cdn.builder.io/api/v1/image/assets%2F57f3921c477141799725b87f2761d2c2%2Ff2dd7552d6e3445893146adbf2af6d10?format=webp&width=800"
              alt="Brand Whisperer Logo"
              className="h-6 w-auto"
            />
            <span>Generated by Brand Whisperer</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Professional brand audit and recommendations platform
          </p>
        </div>
      </div>
    </div>
  );
}
