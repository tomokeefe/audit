import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { AuditResponse } from "@shared/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Globe, TrendingUp, AlertTriangle, CheckCircle, Info } from "lucide-react";

// Mock audit data - in a real app this would be fetched based on the ID
const mockAuditData = {
  id: "1",
  url: "https://castle-placement.com",
  title: "Castle Placement Website Audit",
  description: "Comprehensive analysis and recommendations for enhancing your investment banking platform",
  overallScore: 69,
  date: "August 31, 2025",
  status: "completed",
  sections: [
    {
      name: "Brand Consistency",
      score: 85,
      maxScore: 100,
      issues: 3,
      recommendations: 5
    },
    {
      name: "User Experience (UX)",
      score: 72,
      maxScore: 100,
      issues: 7,
      recommendations: 8
    },
    {
      name: "Visual Design",
      score: 68,
      maxScore: 100,
      issues: 5,
      recommendations: 6
    },
    {
      name: "Content Quality",
      score: 61,
      maxScore: 100,
      issues: 12,
      recommendations: 15
    },
    {
      name: "SEO & Performance",
      score: 55,
      maxScore: 100,
      issues: 9,
      recommendations: 11
    },
    {
      name: "Security & Compliance",
      score: 78,
      maxScore: 100,
      issues: 4,
      recommendations: 6
    }
  ]
};

export default function AuditResults() {
  const { id } = useParams();

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
                {mockAuditData.url}
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {mockAuditData.title}
              </h1>
              <p className="text-lg text-gray-600 max-w-3xl">
                {mockAuditData.description}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 mb-1">Audit Report</div>
              <div className="font-semibold text-gray-900">{mockAuditData.date}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Overall Score Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center mb-8">
          <Card className={`w-80 ${getScoreBg(mockAuditData.overallScore)}`}>
            <CardContent className="pt-6 text-center">
              <div className={`text-4xl font-bold mb-2 ${getScoreColor(mockAuditData.overallScore)}`}>
                {mockAuditData.overallScore}%
              </div>
              <div className="text-gray-600 mb-4">Overall Score</div>
              <Progress 
                value={mockAuditData.overallScore} 
                className="h-3 mb-2"
              />
              <div className="text-sm text-gray-500">
                Based on {mockAuditData.sections.length} evaluation criteria
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
                  This audit evaluates the website of {mockAuditData.title} as of {mockAuditData.date}, 
                  focusing on messaging, user experience (UX), usability, and additional aspects such as 
                  design, content quality, SEO, security, and compliance. The analysis provides detailed 
                  insights and actionable recommendations.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Section Scores */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {mockAuditData.sections.map((section, index) => (
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Detailed Recommendations
                </CardTitle>
                <CardDescription>
                  Comprehensive recommendations to improve your brand's digital presence
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-gray-600">
                  Detailed recommendations will be displayed here based on the audit analysis.
                  This section would contain specific, actionable advice for each evaluated area.
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="next-steps" className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Implementation Roadmap
                </CardTitle>
                <CardDescription>
                  Prioritized action plan for implementing improvements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-gray-600">
                  A detailed implementation roadmap will be provided here, outlining priorities 
                  and timelines for addressing the identified issues and opportunities.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
