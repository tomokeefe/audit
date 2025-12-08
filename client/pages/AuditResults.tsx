import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
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
import { Button } from "@/components/ui/button";
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
  Share2,
  Copy,
  Check,
  Mail,
  MessageCircle,
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
  ArrowRight,
  PlayCircle,
  Timer,
  Award,
  Briefcase,
  Wrench,
} from "lucide-react";
import PDFExport from "@/components/PDFExport";

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
                    {typeof metric.yourScore === "number"
                      ? metric.yourScore.toFixed(1)
                      : metric.yourScore}
                    %
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
                    Industry Avg:{" "}
                    {typeof metric.industryAverage === "number"
                      ? metric.industryAverage.toFixed(1)
                      : metric.industryAverage}
                    %
                  </span>
                  <span
                    className={
                      metric.yourScore >= metric.industryAverage
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    {metric.yourScore >= metric.industryAverage ? "+" : ""}
                    {(metric.yourScore - metric.industryAverage).toFixed(1)}
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
          {typeof overallScore === "number"
            ? overallScore.toFixed(1)
            : overallScore}
          % places you{" "}
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
                        {typeof item.score === "number"
                          ? item.score.toFixed(1)
                          : item.score}
                        %
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
        target: "85.0%+",
        current: `${typeof auditData?.overallScore === "number" ? auditData.overallScore.toFixed(1) : auditData?.overallScore || "0"}%`,
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

// Interactive Task Checklist Component
function InteractiveTaskChecklist({ auditData }: { auditData: any }) {
  const [checkedTasks, setCheckedTasks] = useState<Set<string>>(new Set());
  const [activePhase, setActivePhase] = useState(0);

  // Generate actionable tasks from audit sections
  const generateTasks = () => {
    // Guard against missing sections
    if (!auditData || !auditData.sections || !Array.isArray(auditData.sections)) {
      return [];
    }

    const quickWins = auditData.sections
      .filter(
        (s: any) =>
          s.implementationDifficulty === "easy" &&
          (s.priorityLevel === "critical" || s.priorityLevel === "high"),
      )
      .map((s: any) => ({
        id: `quick-${s.name.toLowerCase().replace(/\s+/g, "-")}`,
        phase: 0,
        title: `Optimize ${s.name}`,
        description: `Address ${s.issues} critical issues in ${s.name}`,
        impact: s.estimatedImpact || "Medium impact",
        timeframe: "1-2 weeks",
      }));

    const shortTerm = auditData.sections
      .filter(
        (s: any) =>
          s.implementationDifficulty === "medium" &&
          (s.priorityLevel === "critical" || s.priorityLevel === "high"),
      )
      .map((s: any) => ({
        id: `short-${s.name.toLowerCase().replace(/\s+/g, "-")}`,
        phase: 1,
        title: `Enhance ${s.name}`,
        description: `Implement ${s.recommendations} key improvements`,
        impact: s.estimatedImpact || "High impact",
        timeframe: "1-3 months",
      }));

    const longTerm = auditData.sections
      .filter(
        (s: any) =>
          s.implementationDifficulty === "hard" ||
          s.implementationDifficulty === "very_hard",
      )
      .map((s: any) => ({
        id: `long-${s.name.toLowerCase().replace(/\s+/g, "-")}`,
        phase: 2,
        title: `Transform ${s.name}`,
        description: `Complete overhaul and optimization`,
        impact: s.estimatedImpact || "Transformational impact",
        timeframe: "3-6 months",
      }));

    return [...quickWins, ...shortTerm, ...longTerm];
  };

  const tasks = generateTasks();
  const phases = [
    {
      name: "Quick Wins",
      color: "green",
      tasks: tasks.filter((t) => t.phase === 0),
    },
    {
      name: "Short-term Goals",
      color: "blue",
      tasks: tasks.filter((t) => t.phase === 1),
    },
    {
      name: "Long-term Strategy",
      color: "purple",
      tasks: tasks.filter((t) => t.phase === 2),
    },
  ];

  const toggleTask = (taskId: string) => {
    const newChecked = new Set(checkedTasks);
    if (newChecked.has(taskId)) {
      newChecked.delete(taskId);
    } else {
      newChecked.add(taskId);
    }
    setCheckedTasks(newChecked);
  };

  const getProgress = (phaseIndex: number) => {
    const phaseTasks = phases[phaseIndex]?.tasks || [];
    if (phaseTasks.length === 0) return 0;
    const completed = phaseTasks.filter((task) =>
      checkedTasks.has(task.id),
    ).length;
    return Math.round((completed / phaseTasks.length) * 100);
  };

  return (
    <div className="mt-8 p-6 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg border border-indigo-200">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-indigo-600" />
          <h4 className="text-lg font-semibold text-gray-900">
            Interactive Task Checklist
          </h4>
        </div>
        <div className="text-sm text-gray-600">
          {checkedTasks.size} of {tasks.length} tasks completed
        </div>
      </div>

      {/* Phase Selector */}
      <div className="flex space-x-1 mb-6 bg-white p-1 rounded-lg border">
        {phases.map((phase, index) => (
          <button
            key={index}
            onClick={() => setActivePhase(index)}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activePhase === index
                ? `bg-${phase.color}-100 text-${phase.color}-700 border border-${phase.color}-200`
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <span>{phase.name}</span>
              <Badge variant="outline" className="text-xs">
                {getProgress(index)}%
              </Badge>
            </div>
          </button>
        ))}
      </div>

      {/* Phase Progress */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-900">
            {phases[activePhase]?.name} Progress
          </span>
          <span className="text-sm text-gray-600">
            {getProgress(activePhase)}% Complete
          </span>
        </div>
        <Progress value={getProgress(activePhase)} className="h-2" />
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {phases[activePhase]?.tasks.map((task) => (
          <div
            key={task.id}
            className={`p-4 border rounded-lg transition-all ${
              checkedTasks.has(task.id)
                ? "bg-green-50 border-green-200"
                : "bg-white border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex items-start gap-3">
              <button
                onClick={() => toggleTask(task.id)}
                className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  checkedTasks.has(task.id)
                    ? "bg-green-500 border-green-500 text-white"
                    : "border-gray-300 hover:border-gray-400"
                }`}
              >
                {checkedTasks.has(task.id) && <Check className="h-3 w-3" />}
              </button>
              <div className="flex-1">
                <h6
                  className={`font-medium ${
                    checkedTasks.has(task.id)
                      ? "text-green-800 line-through"
                      : "text-gray-900"
                  }`}
                >
                  {task.title}
                </h6>
                <p
                  className={`text-sm mt-1 ${
                    checkedTasks.has(task.id)
                      ? "text-green-600"
                      : "text-gray-600"
                  }`}
                >
                  {task.description}
                </p>
                <div className="flex gap-4 mt-2">
                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    {task.impact}
                  </span>
                  <span className="text-xs text-gray-600 flex items-center gap-1">
                    <Timer className="h-3 w-3" />
                    {task.timeframe}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Overall Progress Summary */}
      <div className="mt-6 p-4 bg-white border border-indigo-200 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <span className="font-medium text-gray-900">
            Overall Implementation Progress
          </span>
          <span className="text-sm text-gray-600">
            {Math.round((checkedTasks.size / tasks.length) * 100)}% Complete
          </span>
        </div>
        <Progress
          value={(checkedTasks.size / tasks.length) * 100}
          className="h-3"
        />
        <p className="text-xs text-gray-600 mt-2">
          Keep track of your progress and celebrate each milestone!
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

export default function AuditResults() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [auditData, setAuditData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);

  // Sharing functions
  const copyToClipboard = async () => {
    try {
      // Check if clipboard API is available and allowed
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      }
    } catch (error) {
      console.warn("Clipboard API not available:", error);
    }

    // Fallback method for iframe/restricted environments
    try {
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);

      if (successful) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        // If all else fails, select the URL for manual copy
        prompt("Copy this URL:", shareUrl);
      }
    } catch (fallbackError) {
      console.error("Fallback copy failed:", fallbackError);
      // Last resort - show URL to user
      prompt("Copy this URL:", shareUrl);
    }
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(
      `Brand Audit Report: ${auditData?.title || "Audit Results"}`,
    );
    const body = encodeURIComponent(`Hi,

I'd like to share this brand audit report with you:

${auditData?.title || "Brand Audit Report"}
Overall Score: ${auditData?.overallScore || "N/A"}%

View the full report here: ${shareUrl}

Best regards`);

    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const shareViaLinkedIn = () => {
    const text = encodeURIComponent(
      `Check out this brand audit report: ${auditData?.title || "Brand Audit Report"} - Overall Score: ${auditData?.overallScore || "N/A"}%`,
    );
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}&title=${text}`,
    );
  };

  const shareViaTwitter = () => {
    const text = encodeURIComponent(
      `Brand Audit Report: ${auditData?.title || "Audit Results"} - Score: ${auditData?.overallScore || "N/A"}% 📊`,
    );
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(shareUrl)}`,
    );
  };

  useEffect(() => {
    if (!id) {
      setError("Audit ID not provided");
      setLoading(false);
      return;
    }

    const loadAuditData = async () => {
      try {
        let auditToDisplay: AuditResponse | null = null;

        // First try server API
        console.log(`Attempting to load audit ${id} from API...`);
        auditToDisplay = await apiGet<AuditResponse>(`/api/audits/${id}`);

        if (auditToDisplay) {
          console.log("✓ Loaded audit from server API");
        } else {
          // Fallback to localStorage (for current session results)
          console.log("Server API failed, checking localStorage...");
          const storedData = localStorage.getItem(`audit_${id}`);
          if (storedData) {
            try {
              auditToDisplay = JSON.parse(storedData);
              console.log("✓ Loaded audit from localStorage");
            } catch (parseError) {
              console.error("Failed to parse localStorage data:", parseError);
            }
          }
        }

        if (auditToDisplay) {
          setAuditData(auditToDisplay);
          // Generate simple shareable link using just the ID
          // The API will handle fetching from the database
          const shareLink = `${window.location.origin}/share/audit/${id}`;
          setShareUrl(shareLink);
          return;
        }

        // If both fail, show error
        setError(
          "Audit not found. The audit may have expired or the link is invalid.",
        );
      } catch (error) {
        console.error("Error loading audit data:", error);

        // Try localStorage as final fallback
        try {
          const storedData = localStorage.getItem(`audit_${id}`);
          if (storedData) {
            const audit: AuditResponse = JSON.parse(storedData);
            setAuditData(audit);
            // Generate simple shareable link using just the ID
            const shareLink = `${window.location.origin}/share/audit/${id}`;
            setShareUrl(shareLink);
            console.log("✓ Loaded audit from localStorage (fallback)");
            return;
          }
        } catch (localError) {
          console.error("localStorage also failed:", localError);
        }

        setError("Failed to load audit data");
      } finally {
        setLoading(false);
      }
    };

    loadAuditData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900">
              Loading audit results...
            </h2>
            <p className="text-gray-600 mt-2">
              Please wait while we retrieve your audit data.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !auditData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Audit Not Found
            </h2>
            <p className="text-gray-600 mb-8">{error}</p>
            <Button
              onClick={() => navigate("/")}
              className="bg-brand-500 hover:bg-brand-600"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Figma-inspired Header Design */}
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

                {/* Sharing and Export Options */}
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={copyToClipboard}
                    variant="outline"
                    size="sm"
                    className="border-orange-300 text-orange-700 hover:bg-orange-50"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Link
                      </>
                    )}
                  </Button>

                  {/* PDF Export Component */}
                  <PDFExport auditData={auditData} />
                </div>
              </div>

              {/* Right Column - Large Score Panel */}
              <div className="flex justify-center lg:justify-end">
                <Card className="w-80 h-52 bg-yellow-50 border-yellow-200 border-2 shadow-lg">
                  <CardContent className="pt-8 text-center h-full flex flex-col justify-center">
                    <div className="text-6xl font-bold mb-2 text-orange-600">
                      {typeof auditData.overallScore === "number"
                        ? auditData.overallScore.toFixed(1)
                        : auditData.overallScore}
                      %
                    </div>
                    <div className="text-gray-700 font-semibold text-lg mb-4">
                      Overall Score
                    </div>
                    <Progress
                      value={auditData.overallScore}
                      className="h-3 mb-3"
                    />
                    <div className="text-sm text-gray-600">
                      Based on {auditData.sections?.length || 0} evaluation criteria
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <Tabs defaultValue="results" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto mb-8">
            <TabsTrigger value="results">Audit Results</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            <TabsTrigger value="next-steps">Next Steps</TabsTrigger>
          </TabsList>

          <TabsContent value="results" className="mt-8">
            {/* Audit Overview */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-xl">Audit Overview</CardTitle>
                <CardDescription>
                  This audit evaluates the website of {auditData.title} as of{" "}
                  {auditData.date}, focusing on messaging, user experience (UX),
                  usability, and additional aspects such as design, content
                  quality, SEO, security, and compliance. The analysis provides
                  detailed insights and actionable recommendations.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Section Scores */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {(auditData.sections || []).map((section, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{section.name}</CardTitle>
                      <div
                        className={`text-2xl font-bold ${getScoreColor(section.score)}`}
                      >
                        {typeof section.score === "number"
                          ? section.score.toFixed(1)
                          : section.score}
                        %
                      </div>
                    </div>
                    <Progress value={section.score} className="h-2" />
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex justify-between text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        {section.issues} issues found
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        {section.recommendations} recommendations
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="recommendations" className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-green-600" />
                  Detailed Recommendations by Category
                </CardTitle>
                <CardDescription>
                  Expand each section below to view specific recommendations and
                  action items.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" className="w-full">
                  {(auditData.sections || []).map((section, index) => {
                    const parsedContent = parseAuditContent(section.details);
                    const recommendationsContent = parsedContent.find(
                      (content) => content.type === "recommendations",
                    );

                    // Log debug info for troubleshooting
                    console.log(`\n=== SECTION: ${section.name} ===`);
                    console.log(
                      "Raw details:",
                      section.details?.substring(0, 200) + "...",
                    );
                    console.log("Details structure:", {
                      hasDetails: !!section.details,
                      detailsLength: section.details?.length || 0,
                      firstFewLines: section.details?.split("\n").slice(0, 3),
                      containsRecommendations: section.details
                        ?.toLowerCase()
                        .includes("recommendation"),
                      containsIssues: section.details
                        ?.toLowerCase()
                        .includes("issue"),
                    });
                    console.log(
                      "Parsed sections:",
                      parsedContent.map((p) => ({
                        type: p.type,
                        contentLength: p.content.length,
                        firstItem: p.content[0]?.substring(0, 50) + "...",
                      })),
                    );
                    console.log("=== END SECTION ===\n");

                    // Show section if it has recommendations count or any content
                    // Don't filter out sections - show them even if parsing fails
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
                                  Score:{" "}
                                  {typeof section.score === "number"
                                    ? section.score.toFixed(1)
                                    : section.score}
                                  %
                                </div>
                              </div>
                            </div>
                            <div
                              className={`px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(section.score)} ${getScoreBg(section.score)} border mr-2`}
                            >
                              {typeof section.score === "number"
                                ? section.score.toFixed(1)
                                : section.score}
                              %
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="pt-4 space-y-4">
                            {(() => {
                              // Re-calculate these inside the render scope
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
                                      {process.env.NODE_ENV ===
                                        "development" && (
                                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                          {hasRecommendationsContent
                                            ? `${recommendationsContent.content.length} parsed`
                                            : "fallback mode"}
                                        </span>
                                      )}
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

                {/* Interactive Task Checklist */}
                <InteractiveTaskChecklist auditData={auditData} />

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
                        {(auditData.sections || [])
                          .filter(
                            (s) =>
                              s.priorityLevel === "critical" || s.score < 50,
                          )
                          .map((s, index) => (
                            <div key={index} className="flex justify-between">
                              <span>{s.name}</span>
                              <Badge variant="destructive" className="text-xs">
                                {typeof s.score === "number"
                                  ? s.score.toFixed(1)
                                  : s.score}
                                %
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
                        {(auditData.sections || [])
                          .filter(
                            (s) =>
                              s.priorityLevel === "high" ||
                              (s.score >= 50 && s.score < 70),
                          )
                          .map((s, index) => (
                            <div key={index} className="flex justify-between">
                              <span>{s.name}</span>
                              <Badge variant="secondary" className="text-xs">
                                {typeof s.score === "number"
                                  ? s.score.toFixed(1)
                                  : s.score}
                                %
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
                        {(auditData.sections || [])
                          .filter((s) => s.score >= 80)
                          .map((s, index) => (
                            <div key={index} className="flex justify-between">
                              <span>{s.name}</span>
                              <Badge
                                variant="default"
                                className="text-xs bg-green-600"
                              >
                                {typeof s.score === "number"
                                  ? s.score.toFixed(1)
                                  : s.score}
                                %
                              </Badge>
                            </div>
                          )) || <span>Focus on improving other areas</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resource Center */}
                <ResourceCenter />

                {/* Call to Action */}
                <div className="mt-8 p-6 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg text-white">
                  <div className="flex items-center gap-3 mb-4">
                    <PlayCircle className="h-6 w-6" />
                    <h4 className="text-lg font-semibold">
                      Ready to Get Started?
                    </h4>
                  </div>
                  <p className="mb-4 text-blue-100">
                    Your audit analysis is complete. The next step is
                    implementation. Consider scheduling a follow-up meeting to
                    discuss priorities and create a detailed execution timeline.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate("/")}
                      className="flex items-center gap-2"
                    >
                      <ArrowRight className="h-4 w-4" />
                      Run Another Audit
                    </Button>

                    {/* Enhanced Social Sharing Options */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={shareViaEmail}
                        className="flex items-center gap-2 text-white border-white hover:bg-white hover:text-blue-600"
                      >
                        <Mail className="h-4 w-4" />
                        Email
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={shareViaLinkedIn}
                        className="flex items-center gap-2 text-white border-white hover:bg-white hover:text-blue-600"
                      >
                        <Share2 className="h-4 w-4" />
                        LinkedIn
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={shareViaTwitter}
                        className="flex items-center gap-2 text-white border-white hover:bg-white hover:text-blue-600"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Twitter
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyToClipboard}
                        className="flex items-center gap-2 text-white border-white hover:bg-white hover:text-blue-600"
                      >
                        {copied ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                        {copied ? "Copied!" : "Copy"}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
