import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { AuditResponse } from "@shared/api";
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
} from "lucide-react";

// SWOT Matrix Component for Competitor Analysis
function SWOTMatrix({ sectionName, auditData }: { sectionName: string; auditData?: any }) {
  // Parse SWOT data from audit content if available
  const parseSWOTFromContent = (content: string) => {
    const defaultData = {
      strengths: ["Strong brand positioning", "User-friendly interface", "Quality content"],
      weaknesses: ["Limited competitive analysis", "Missing industry benchmarks", "Unclear market position"],
      opportunities: ["Market differentiation", "Enhanced digital presence", "Strategic partnerships"],
      threats: ["Increased competition", "Market saturation", "Technology changes"],
    };

    if (!content) return defaultData;

    const sections = {
      strengths: [] as string[],
      weaknesses: [] as string[],
      opportunities: [] as string[],
      threats: [] as string[],
    };

    // Extract SWOT items from content using regex patterns
    const strengthsMatch = content.match(/Strengths?[:\s]*([\s\S]*?)(?=\n\s*Weaknesses?|$)/i);
    const weaknessesMatch = content.match(/Weaknesses?[:\s]*([\s\S]*?)(?=\n\s*Opportunities?|$)/i);
    const opportunitiesMatch = content.match(/Opportunities?[:\s]*([\s\S]*?)(?=\n\s*Threats?|$)/i);
    const threatsMatch = content.match(/Threats?[:\s]*([\s\S]*?)(?=\n|$)/i);

    const extractItems = (text: string): string[] => {
      return text
        .split(/[-•*]\s*/)
        .map(item => item.trim())
        .filter(item => item.length > 10 && item.length < 100)
        .slice(0, 4);
    };

    if (strengthsMatch) sections.strengths = extractItems(strengthsMatch[1]);
    if (weaknessesMatch) sections.weaknesses = extractItems(weaknessesMatch[1]);
    if (opportunitiesMatch) sections.opportunities = extractItems(opportunitiesMatch[1]);
    if (threatsMatch) sections.threats = extractItems(threatsMatch[1]);

    // Use defaults for empty sections
    Object.keys(sections).forEach(key => {
      if (sections[key as keyof typeof sections].length === 0) {
        sections[key as keyof typeof sections] = defaultData[key as keyof typeof defaultData];
      }
    });

    return sections;
  };

  const competitorSection = auditData?.sections?.find((s: any) =>
    s.name.toLowerCase().includes('competitor')
  );

  const swotData = parseSWOTFromContent(competitorSection?.details || "");

  return (
    <div className="mt-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border">
      <div className="flex items-center gap-2 mb-4">
        <Target className="h-5 w-5 text-blue-600" />
        <h4 className="text-lg font-semibold text-gray-900">SWOT Analysis Matrix</h4>
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

// Function to parse and style audit section content
function parseAuditContent(content: string) {
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
    // Check for both markdown (**Issues**:) and plain text (Issues:) formats
    if (line.match(/(\*\*)?Issues?\*?\*?:?/i)) {
      if (currentContent.length > 0) {
        sections.push({ type: currentSection, content: [...currentContent] });
        currentContent = [];
      }
      currentSection = "issues";
    } else if (line.match(/(\*\*)?Recommendations?\*?\*?:?/i)) {
      if (currentContent.length > 0) {
        sections.push({ type: currentSection, content: [...currentContent] });
        currentContent = [];
      }
      currentSection = "recommendations";
    } else if (!line.match(/(\*\*)?(Issues?|Recommendations?)\*?\*?:?/i)) {
      // Clean up markdown formatting and numbered lists
      const cleanLine = line
        .replace(/^\*\*|\*\*$/g, "") // Remove bold markdown
        .replace(/^\d+\.\s*/, "") // Remove numbered list formatting
        .trim();

      if (cleanLine) {
        currentContent.push(cleanLine);
      }
    }
  }

  // Add the final section
  if (currentContent.length > 0) {
    sections.push({ type: currentSection, content: currentContent });
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

    // Set share URL to the dedicated sharing route
    const shareLink = `${window.location.origin}/share/audit/${id}`;
    setShareUrl(shareLink);

    const loadAuditData = async () => {
      try {
        // First, try to load from server
        const response = await fetch(`/api/audits/${id}`);

        if (response.ok) {
          const serverAudit: AuditResponse = await response.json();
          setAuditData(serverAudit);
          console.log("Loaded audit from server");
          return;
        }

        // If server load fails, try localStorage as fallback
        console.log("Server load failed, trying localStorage...");
        const storedData = localStorage.getItem(`audit_${id}`);
        if (storedData) {
          const audit: AuditResponse = JSON.parse(storedData);
          setAuditData(audit);
          console.log("Loaded audit from localStorage");
          return;
        }

        // If both fail, show error
        setError(
          "Audit not found. The audit may have expired or the link is invalid.",
        );
      } catch (error) {
        console.error("Error loading audit data:", error);

        // Try localStorage as last resort
        try {
          const storedData = localStorage.getItem(`audit_${id}`);
          if (storedData) {
            const audit: AuditResponse = JSON.parse(storedData);
            setAuditData(audit);
            console.log("Loaded audit from localStorage as fallback");
            return;
          }
        } catch (localError) {
          console.error("localStorage fallback also failed:", localError);
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

                {/* Copy Link Button */}
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
                      Based on {auditData.sections.length} evaluation criteria
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
              {auditData.sections.map((section, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{section.name}</CardTitle>
                      <div
                        className={`text-2xl font-bold ${getScoreColor(section.score)}`}
                      >
                        {section.score}%
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
                  Expand each section below to view specific recommendations and action items.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" className="w-full">
                  {auditData.sections.map((section, index) => {
                    const parsedContent = parseAuditContent(section.details);
                    const recommendationsContent = parsedContent.find(
                      (content) => content.type === "recommendations"
                    );

                    // Only show sections that have recommendations
                    if (!recommendationsContent || recommendationsContent.content.length === 0) {
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
                                  {section.recommendations} recommendations • Score: {section.score}%
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
                            {/* Show Overview if available */}
                            {parsedContent.find((content) => content.type === "overview") && (
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 mb-3">
                                  <Info className="h-4 w-4 text-blue-600" />
                                  <h5 className="font-semibold text-gray-900">Overview</h5>
                                </div>
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                  {parsedContent
                                    .find((content) => content.type === "overview")
                                    ?.content.map((item, itemIndex) => (
                                      <div key={itemIndex} className="flex gap-3 items-start">
                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                                        <p className="text-blue-800 text-sm leading-relaxed">
                                          {item}
                                        </p>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}

                            {/* Show Issues if available */}
                            {parsedContent.find((content) => content.type === "issues") && (
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 mb-3">
                                  <XCircle className="h-4 w-4 text-red-600" />
                                  <h5 className="font-semibold text-gray-900">Issues Found</h5>
                                </div>
                                <div className="space-y-2">
                                  {parsedContent
                                    .find((content) => content.type === "issues")
                                    ?.content.map((issue, itemIndex) => (
                                      <div
                                        key={itemIndex}
                                        className="flex gap-3 p-3 bg-red-50 border border-red-200 rounded-lg"
                                      >
                                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                                        <p className="text-red-800 text-sm leading-relaxed">
                                          {issue}
                                        </p>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}

                            {/* Show Recommendations */}
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 mb-3">
                                <Lightbulb className="h-4 w-4 text-green-600" />
                                <h5 className="font-semibold text-gray-900">Recommended Actions</h5>
                              </div>
                              <div className="space-y-2">
                                {recommendationsContent.content.map((recommendation, itemIndex) => (
                                  <div
                                    key={itemIndex}
                                    className="flex gap-3 p-3 bg-green-50 border border-green-200 rounded-lg"
                                  >
                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                                    <p className="text-green-800 text-sm leading-relaxed">
                                      {recommendation}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Show SWOT Matrix for Competitor Analysis */}
                            {section.name.toLowerCase().includes("competitor") && (
                              <SWOTMatrix sectionName={section.name} />
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Executive Summary & Action Plan
                </CardTitle>
                <CardDescription>
                  Key findings and prioritized recommendations for{" "}
                  {auditData.title}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none text-gray-700">
                  {auditData.summary.split("\n").map(
                    (paragraph, index) =>
                      paragraph.trim() && (
                        <p key={index} className="mb-4">
                          {paragraph.trim()}
                        </p>
                      ),
                  )}
                </div>

                {/* Priority Matrix */}
                <div className="mt-8 p-6 bg-brand-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-4">
                    Implementation Priority
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h5 className="font-medium text-red-800 mb-2">
                        High Priority
                      </h5>
                      <div className="text-sm text-red-700">
                        {auditData.sections
                          .filter((s) => s.score < 60)
                          .map((s) => s.name)
                          .join(", ") || "No critical issues found"}
                      </div>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h5 className="font-medium text-yellow-800 mb-2">
                        Medium Priority
                      </h5>
                      <div className="text-sm text-yellow-700">
                        {auditData.sections
                          .filter((s) => s.score >= 60 && s.score < 80)
                          .map((s) => s.name)
                          .join(", ") || "No moderate issues found"}
                      </div>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h5 className="font-medium text-green-800 mb-2">
                        Strengths to Maintain
                      </h5>
                      <div className="text-sm text-green-700">
                        {auditData.sections
                          .filter((s) => s.score >= 80)
                          .map((s) => s.name)
                          .join(", ") || "Focus on improving other areas"}
                      </div>
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
