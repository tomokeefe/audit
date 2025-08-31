import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { AuditResponse } from "@shared/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Globe, TrendingUp, AlertTriangle, CheckCircle, Info, XCircle, Lightbulb, Share2, Copy, Check, Mail, MessageCircle } from "lucide-react";

// Function to parse and style audit section content
function parseAuditContent(content: string) {
  const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  const sections: Array<{
    type: 'overview' | 'issues' | 'recommendations';
    content: string[];
  }> = [];

  let currentSection: 'overview' | 'issues' | 'recommendations' = 'overview';
  let currentContent: string[] = [];

  for (const line of lines) {
    if (line.match(/\*\*Issues?\*\*:?/i)) {
      if (currentContent.length > 0) {
        sections.push({ type: currentSection, content: [...currentContent] });
        currentContent = [];
      }
      currentSection = 'issues';
    } else if (line.match(/\*\*Recommendations?\*\*:?/i)) {
      if (currentContent.length > 0) {
        sections.push({ type: currentSection, content: [...currentContent] });
        currentContent = [];
      }
      currentSection = 'recommendations';
    } else if (!line.match(/\*\*(Issues?|Recommendations?)\*\*:?/i)) {
      // Clean up markdown formatting and numbered lists
      const cleanLine = line
        .replace(/^\*\*|\*\*$/g, '') // Remove bold markdown
        .replace(/^\d+\.\s*/, '') // Remove numbered list formatting
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

  useEffect(() => {
    if (!id) {
      setError("Audit ID not provided");
      setLoading(false);
      return;
    }

    const loadAuditData = async () => {
      try {
        // First, try to load from server
        const response = await fetch(`/api/audits/${id}`);

        if (response.ok) {
          const serverAudit: AuditResponse = await response.json();
          setAuditData(serverAudit);
          console.log('Loaded audit from server');
          return;
        }

        // If server load fails, try localStorage as fallback
        console.log('Server load failed, trying localStorage...');
        const storedData = localStorage.getItem(`audit_${id}`);
        if (storedData) {
          const audit: AuditResponse = JSON.parse(storedData);
          setAuditData(audit);
          console.log('Loaded audit from localStorage');
          return;
        }

        // If both fail, show error
        setError("Audit not found. The audit may have expired or the link is invalid.");

      } catch (error) {
        console.error("Error loading audit data:", error);

        // Try localStorage as last resort
        try {
          const storedData = localStorage.getItem(`audit_${id}`);
          if (storedData) {
            const audit: AuditResponse = JSON.parse(storedData);
            setAuditData(audit);
            console.log('Loaded audit from localStorage as fallback');
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
            <h2 className="text-xl font-semibold text-gray-900">Loading audit results...</h2>
            <p className="text-gray-600 mt-2">Please wait while we retrieve your audit data.</p>
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
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Audit Not Found</h2>
            <p className="text-gray-600 mb-8">{error}</p>
            <Button onClick={() => navigate('/')} className="bg-brand-500 hover:bg-brand-600">
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
      
      {/* Header Section */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Globe className="h-4 w-4" />
              {auditData.url}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {auditData.title}
            </h1>
            <p className="text-lg text-gray-600 max-w-3xl">
              {auditData.description}
            </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 mb-1">Audit Report</div>
              <div className="font-semibold text-gray-900">{auditData.date}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Overall Score Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center mb-8">
          <Card className={`w-80 ${getScoreBg(auditData.overallScore)}`}>
            <CardContent className="pt-6 text-center">
              <div className={`text-4xl font-bold mb-2 ${getScoreColor(auditData.overallScore)}`}>
                {auditData.overallScore}%
              </div>
              <div className="text-gray-600 mb-4">Overall Score</div>
              <Progress
                value={auditData.overallScore}
                className="h-3 mb-2"
              />
              <div className="text-sm text-gray-500">
                Based on {auditData.sections.length} evaluation criteria
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <Tabs defaultValue="results" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
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
                  This audit evaluates the website of {auditData.title} as of {auditData.date},
                  focusing on messaging, user experience (UX), usability, and additional aspects such as
                  design, content quality, SEO, security, and compliance. The analysis provides detailed
                  insights and actionable recommendations.
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
                      <div className={`text-2xl font-bold ${getScoreColor(section.score)}`}>
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
                          <div className={`p-2 rounded-lg ${getScoreBg(section.score)}`}>
                            <Info className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="text-xl font-semibold text-gray-900">{section.name}</div>
                            <div className="text-sm text-gray-600 font-normal">
                              {section.issues} issues • {section.recommendations} recommendations
                            </div>
                          </div>
                        </span>
                        <div className={`px-4 py-2 rounded-full text-lg font-bold ${getScoreColor(section.score)} ${getScoreBg(section.score)} border`}>
                          {section.score}%
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {parsedContent.map((contentSection, cIndex) => (
                        <div key={cIndex} className="p-6 border-b last:border-b-0">
                          {contentSection.type === 'overview' && (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 mb-4">
                                <Info className="h-5 w-5 text-blue-600" />
                                <h4 className="text-lg font-semibold text-gray-900">Overview</h4>
                              </div>
                              {contentSection.content.map((item, itemIndex) => (
                                <p key={itemIndex} className="text-gray-700 leading-relaxed">
                                  {item}
                                </p>
                              ))}
                            </div>
                          )}

                          {contentSection.type === 'issues' && (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 mb-4">
                                <XCircle className="h-5 w-5 text-red-600" />
                                <h4 className="text-lg font-semibold text-gray-900">Issues Identified</h4>
                              </div>
                              <div className="space-y-3">
                                {contentSection.content.map((issue, itemIndex) => (
                                  <div key={itemIndex} className="flex gap-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                                    <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                                    <p className="text-red-800 text-sm leading-relaxed">{issue}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {contentSection.type === 'recommendations' && (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 mb-4">
                                <Lightbulb className="h-5 w-5 text-green-600" />
                                <h4 className="text-lg font-semibold text-gray-900">Recommendations</h4>
                              </div>
                              <div className="space-y-3">
                                {contentSection.content.map((recommendation, itemIndex) => (
                                  <div key={itemIndex} className="flex gap-3 p-3 bg-green-50 border border-green-100 rounded-lg">
                                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                                    <p className="text-green-800 text-sm leading-relaxed">{recommendation}</p>
                                  </div>
                                ))}
                              </div>
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
                  Key findings and prioritized recommendations for {auditData.title}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none text-gray-700">
                  {auditData.summary.split('\n').map((paragraph, index) => (
                    paragraph.trim() && (
                      <p key={index} className="mb-4">
                        {paragraph.trim()}
                      </p>
                    )
                  ))}
                </div>

                {/* Priority Matrix */}
                <div className="mt-8 p-6 bg-brand-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-4">Implementation Priority</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h5 className="font-medium text-red-800 mb-2">High Priority</h5>
                      <div className="text-sm text-red-700">
                        {auditData.sections
                          .filter(s => s.score < 60)
                          .map(s => s.name)
                          .join(', ') || 'No critical issues found'}
                      </div>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h5 className="font-medium text-yellow-800 mb-2">Medium Priority</h5>
                      <div className="text-sm text-yellow-700">
                        {auditData.sections
                          .filter(s => s.score >= 60 && s.score < 80)
                          .map(s => s.name)
                          .join(', ') || 'No moderate issues found'}
                      </div>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h5 className="font-medium text-green-800 mb-2">Strengths to Maintain</h5>
                      <div className="text-sm text-green-700">
                        {auditData.sections
                          .filter(s => s.score >= 80)
                          .map(s => s.name)
                          .join(', ') || 'Focus on improving other areas'}
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
