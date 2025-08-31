import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuditRequest, AuditResponse } from "@shared/api";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Globe, Calendar, TrendingUp, BarChart3 } from "lucide-react";

// Mock data for previous audits
const mockAudits = [
  {
    id: "1",
    url: "https://castle-placement.com",
    title: "Castle Placement Website",
    score: 69,
    date: "August 31, 2025",
    status: "completed",
    category: "Investment Banking"
  },
  {
    id: "2", 
    url: "https://techstartup.io",
    title: "TechStartup.io",
    score: 85,
    date: "August 28, 2025",
    status: "completed",
    category: "Technology"
  },
  {
    id: "3",
    url: "https://retailbrand.com", 
    title: "Retail Brand",
    score: 72,
    date: "August 25, 2025",
    status: "completed",
    category: "E-commerce"
  }
];

export default function Index() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    setError("");

    try {
      const auditRequest: AuditRequest = { url };

      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(auditRequest),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start audit');
      }

      const auditResult: AuditResponse = await response.json();

      // Store audit result in localStorage for the results page
      localStorage.setItem(`audit_${auditResult.id}`, JSON.stringify(auditResult));

      // Navigate to audit results page
      navigate(`/audit/${auditResult.id}`);

    } catch (error) {
      console.error("Audit error:", error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50";
    if (score >= 60) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
              AI-Powered{" "}
              <span className="brand-text-gradient">Brand Audits</span>
            </h1>
            <p className="mt-6 max-w-3xl mx-auto text-xl text-gray-600">
              Get comprehensive website analysis with detailed scoring, insights, and actionable recommendations 
              to enhance your brand's digital presence.
            </p>
          </div>

          {/* URL Input Form */}
          <div className="mt-12 max-w-2xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    type="url"
                    placeholder="Enter website URL to audit (e.g., https://example.com)"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="pl-10 h-12 text-lg"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="h-12 px-8 bg-brand-500 hover:bg-brand-600 text-white font-semibold"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Analyzing...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Search className="h-5 w-5" />
                      Start Audit
                    </div>
                  )}
                </Button>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {isLoading && (
                <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">
                  <p className="text-sm">
                    Analyzing website content and generating comprehensive brand audit... This may take up to 30 seconds.
                  </p>
                </div>
              )}
            </form>
          </div>

          {/* Stats Cards */}
          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="bg-brand-50 rounded-lg p-6 text-center">
              <div className="flex justify-center items-center mb-3">
                <BarChart3 className="h-8 w-8 text-brand-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">150+</div>
              <div className="text-gray-600">Audits Completed</div>
            </div>
            <div className="bg-brand-50 rounded-lg p-6 text-center">
              <div className="flex justify-center items-center mb-3">
                <TrendingUp className="h-8 w-8 text-brand-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">85%</div>
              <div className="text-gray-600">Average Score Improvement</div>
            </div>
            <div className="bg-brand-50 rounded-lg p-6 text-center">
              <div className="flex justify-center items-center mb-3">
                <Globe className="h-8 w-8 text-brand-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">50+</div>
              <div className="text-gray-600">Industries Analyzed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Previous Audits Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Recent Audits</h2>
          <Button variant="outline" asChild>
            <Link to="/audits">View All Audits</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {mockAudits.map((audit) => (
            <Card key={audit.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-gray-900 mb-1">
                      {audit.title}
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-600 mb-2">
                      {audit.url}
                    </CardDescription>
                    <Badge variant="secondary" className="text-xs">
                      {audit.category}
                    </Badge>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-semibold ${getScoreColor(audit.score)}`}>
                    {audit.score}%
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {audit.date}
                  </div>
                  <Link 
                    to={`/audit/${audit.id}`}
                    className="text-brand-600 hover:text-brand-700 font-medium"
                  >
                    View Report →
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {mockAudits.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No audits yet</h3>
            <p className="text-gray-600 mb-6">
              Enter a website URL above to get started with your first brand audit.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
