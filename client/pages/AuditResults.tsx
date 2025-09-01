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
} from "lucide-react";

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
            <div className="space-y-6">
              {auditData.sections.map((section, index) => {
                const parsedContent = parseAuditContent(section.details);

                return (
                  <Card key={index} className="overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg ${getScoreBg(section.score)}`}
                          >
                            <Info className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="text-xl font-semibold text-gray-900">
                              {section.name}
                            </div>
                            <div className="text-sm text-gray-600 font-normal">
                              {section.issues} issues •{" "}
                              {section.recommendations} recommendations
                            </div>
                          </div>
                        </span>
                        <div
                          className={`px-4 py-2 rounded-full text-lg font-bold ${getScoreColor(section.score)} ${getScoreBg(section.score)} border`}
                        >
                          {section.score}%
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {parsedContent.map((contentSection, cIndex) => (
                        <div
                          key={cIndex}
                          className="p-6 border-b last:border-b-0"
                        >
                          {contentSection.type === "overview" && (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 mb-4">
                                <Info className="h-5 w-5 text-blue-600" />
                                <h4 className="text-lg font-semibold text-gray-900">
                                  Overview
                                </h4>
                              </div>
                              {(() => {
                                let currentSection = "overview";
                                return contentSection.content.map(
                                  (item, itemIndex) => {
                                    // Check if this item is an "Issues:" or "Recommendations:" header
                                    if (item.match(/^Issues?:?$/i)) {
                                      currentSection = "issues";
                                      return (
                                        <h4
                                          key={itemIndex}
                                          className="text-lg font-bold text-gray-900 mt-6 mb-2 flex items-center gap-2"
                                        >
                                          <XCircle className="h-5 w-5 text-red-600" />
                                          Issues:
                                        </h4>
                                      );
                                    }
                                    if (item.match(/^Recommendations?:?$/i)) {
                                      currentSection = "recommendations";
                                      return (
                                        <h4
                                          key={itemIndex}
                                          className="text-lg font-bold text-gray-900 mt-6 mb-2 flex items-center gap-2"
                                        >
                                          <Lightbulb className="h-5 w-5 text-green-600" />
                                          Recommendations:
                                        </h4>
                                      );
                                    }

                                    // Style bullets based on current section
                                    const bulletColor =
                                      currentSection === "issues"
                                        ? "bg-red-500"
                                        : currentSection === "recommendations"
                                          ? "bg-green-500"
                                          : "bg-gray-400";
                                    const textColor =
                                      currentSection === "issues"
                                        ? "text-gray-700"
                                        : currentSection === "recommendations"
                                          ? "text-gray-700"
                                          : "text-gray-700";

                                    return (
                                      <div
                                        key={itemIndex}
                                        className="flex gap-3 items-start p-2 rounded-lg hover:bg-gray-50 transition-colors"
                                      >
                                        <div
                                          className={`w-2 h-2 ${bulletColor} rounded-full mt-2 flex-shrink-0`}
                                        ></div>
                                        <p
                                          className={`${textColor} leading-relaxed flex-1`}
                                        >
                                          {item}
                                        </p>
                                      </div>
                                    );
                                  },
                                );
                              })()}
                            </div>
                          )}

                          {contentSection.type === "issues" && (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 mb-4">
                                <XCircle className="h-5 w-5 text-red-600" />
                                <h4 className="text-lg font-bold text-gray-900">
                                  Issues:
                                </h4>
                              </div>
                              <ul className="space-y-3">
                                {contentSection.content.map(
                                  (issue, itemIndex) => (
                                    <li
                                      key={itemIndex}
                                      className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                                    >
                                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                                      <p className="text-red-800 leading-relaxed">
                                        {issue}
                                      </p>
                                    </li>
                                  ),
                                )}
                              </ul>
                            </div>
                          )}

                          {contentSection.type === "recommendations" && (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 mb-4">
                                <Lightbulb className="h-5 w-5 text-green-600" />
                                <h4 className="text-lg font-bold text-gray-900">
                                  Recommendations:
                                </h4>
                              </div>
                              <ul className="space-y-3">
                                {contentSection.content.map(
                                  (recommendation, itemIndex) => (
                                    <li
                                      key={itemIndex}
                                      className="flex gap-3 p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                                    >
                                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                                      <p className="text-green-800 leading-relaxed">
                                        {recommendation}
                                      </p>
                                    </li>
                                  ),
                                )}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
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
