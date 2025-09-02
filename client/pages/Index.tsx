import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuditRequest, AuditResponse } from "@shared/api";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Globe,
  Calendar,
  TrendingUp,
  BarChart3,
  Target,
  Award,
  Activity,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

interface AuditSummary {
  id: string;
  title: string;
  url: string;
  date: string;
  overallScore: number;
}

export default function Index() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [recentAudits, setRecentAudits] = useState<AuditSummary[]>([]);
  const [loadingAudits, setLoadingAudits] = useState(true);
  const [allAudits, setAllAudits] = useState<AuditSummary[]>([]);
  const [apiStatus, setApiStatus] = useState<{
    ping: boolean;
    audits: boolean;
    error?: string;
  }>({ ping: false, audits: false });
  const navigate = useNavigate();

  const loadRecentAudits = async () => {
    try {
      setLoadingAudits(true);
      const response = await fetch("/api/audits");

      if (!response.ok) {
        const errorMsg = `API returned ${response.status}: ${response.statusText}`;
        console.warn(errorMsg);
        setApiStatus(prev => ({ ...prev, audits: false, error: errorMsg }));
        // Handle non-200 responses gracefully
        setRecentAudits([]);
        setAllAudits([]);
        return;
      }

      const data = await response.json();
      const audits = data.audits || [];

      // Update API status to reflect success
      setApiStatus(prev => ({ ...prev, audits: true, error: undefined }));

      // Store all audits for analytics
      setAllAudits(audits);

      // Get the 3 most recent audits
      const recent = audits
        .sort(
          (a: AuditSummary, b: AuditSummary) =>
            new Date(b.date).getTime() - new Date(a.date).getTime(),
        )
        .slice(0, 3);
      setRecentAudits(recent);
    } catch (error) {
      console.error("Failed to load recent audits:", error);
      // Provide more detailed error information
      let errorMsg = "Unknown error";
      if (error instanceof TypeError && error.message.includes("fetch")) {
        errorMsg = "Network error: Unable to connect to the API server";
        console.error(errorMsg);
      } else if (error instanceof Error) {
        errorMsg = error.message;
      }
      setApiStatus(prev => ({ ...prev, audits: false, error: errorMsg }));
      // Fallback to empty array on error
      setRecentAudits([]);
      setAllAudits([]);
    } finally {
      setLoadingAudits(false);
    }
  };

  // Improved API connectivity test with timeout and retry
  const testAPIConnection = async () => {
    console.log("Testing API connection...");
    let pingOk = false;
    let auditsOk = false;
    let errorMsg = "";

    // Helper function to create fetch with timeout
    const fetchWithTimeout = async (url: string, timeout = 5000) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    };

    try {
      // Test ping endpoint with timeout
      console.log("Testing /api/ping...");
      try {
        const pingResponse = await fetchWithTimeout("/api/ping", 5000);
        console.log("Ping response status:", pingResponse.status);
        console.log("Ping response ok:", pingResponse.ok);

        pingOk = pingResponse.ok;
        if (pingResponse.ok) {
          try {
            const pingData = await pingResponse.json();
            console.log("Ping data:", pingData);
          } catch (jsonError) {
            console.warn("Ping response not JSON:", jsonError);
            // Still consider it successful if status is ok
          }
        } else {
          errorMsg = `Ping failed: ${pingResponse.status} ${pingResponse.statusText}`;
        }
      } catch (pingError) {
        console.error("Ping request failed:", pingError);
        if (pingError instanceof Error) {
          if (pingError.name === 'AbortError') {
            errorMsg = "Ping request timed out";
          } else if (pingError.message.includes('fetch')) {
            errorMsg = "Network error: Cannot reach API server";
          } else {
            errorMsg = `Ping error: ${pingError.message}`;
          }
        }
      }

      // Test audits endpoint only if ping succeeded or with retry
      console.log("Testing /api/audits...");
      try {
        const auditsResponse = await fetchWithTimeout("/api/audits", 5000);
        console.log("Audits response status:", auditsResponse.status);
        console.log("Audits response ok:", auditsResponse.ok);
        console.log("Audits response url:", auditsResponse.url);

        auditsOk = auditsResponse.ok;
        if (auditsResponse.ok) {
          try {
            const auditsData = await auditsResponse.json();
            console.log("Audits data:", auditsData);
          } catch (jsonError) {
            console.warn("Audits response not JSON:", jsonError);
            // Still consider it successful if status is ok
          }
        } else {
          const errorText = await auditsResponse.text().catch(() => 'Unable to read error response');
          console.log("Audits error response:", errorText);
          if (!errorMsg) { // Only set if ping didn't already fail
            errorMsg = `Audits API error: ${auditsResponse.status} ${auditsResponse.statusText}`;
          }
        }
      } catch (auditsError) {
        console.error("Audits request failed:", auditsError);
        if (!errorMsg) { // Only set if ping didn't already fail
          if (auditsError instanceof Error) {
            if (auditsError.name === 'AbortError') {
              errorMsg = "Audits request timed out";
            } else if (auditsError.message.includes('fetch')) {
              errorMsg = "Network error: Cannot reach audits API";
            } else {
              errorMsg = `Audits error: ${auditsError.message}`;
            }
          } else {
            errorMsg = "Unknown audits API error";
          }
        }
      }

      // If both failed, provide more helpful error message
      if (!pingOk && !auditsOk && !errorMsg) {
        errorMsg = "API server appears to be offline or unreachable";
      }

    } catch (generalError) {
      console.error("General API test failed:", generalError);
      errorMsg = generalError instanceof Error ? generalError.message : "Unexpected API test failure";
    }

    // Update API status
    setApiStatus({ ping: pingOk, audits: auditsOk, error: errorMsg });
    console.log("API test completed:", { ping: pingOk, audits: auditsOk, error: errorMsg });
  };

  useEffect(() => {
    // Add debug logging
    console.log("Component mounted, loading recent audits...");
    testAPIConnection();
    loadRecentAudits();
  }, []);

  // Analytics calculations
  const getAnalyticsData = () => {
    if (allAudits.length === 0) return null;

    const totalAudits = allAudits.length;
    const averageScore = Math.round(
      allAudits.reduce((sum, audit) => sum + audit.overallScore, 0) /
        totalAudits,
    );

    // Score distribution for pie chart
    const excellent = allAudits.filter((a) => a.overallScore >= 80).length;
    const good = allAudits.filter(
      (a) => a.overallScore >= 60 && a.overallScore < 80,
    ).length;
    const needsImprovement = allAudits.filter(
      (a) => a.overallScore < 60,
    ).length;

    const scoreDistribution = [
      { name: "Excellent", value: excellent, color: "#22c55e" },
      { name: "Good", value: good, color: "#eab308" },
      { name: "Needs Improvement", value: needsImprovement, color: "#ef4444" },
    ].filter((item) => item.value > 0);

    // Recent trend data (last 7 audits)
    const recentTrend = allAudits
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-7)
      .map((audit, index) => ({
        audit: `Audit ${index + 1}`,
        score: audit.overallScore,
        date: new Date(audit.date).toLocaleDateString(),
      }));

    // Top improvement opportunities
    const improvementOpportunities = Math.round(
      (allAudits.filter((a) => a.overallScore < 80).length / totalAudits) * 100,
    );

    return {
      totalAudits,
      averageScore,
      scoreDistribution,
      recentTrend,
      improvementOpportunities,
    };
  };

  const analytics = getAnalyticsData();

  const testApiConnectivity = async () => {
    try {
      const response = await fetch("/api/ping");
      const data = await response.json();
      console.log("API test successful:", data);
      return true;
    } catch (error) {
      console.error("API test failed:", error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    setError("");

    try {
      // Test API connectivity first
      const isConnected = await testApiConnectivity();
      if (!isConnected) {
        throw new Error("Unable to connect to server. Please try again.");
      }

      const auditRequest: AuditRequest = { url };

      console.log("Starting audit request for:", url);

      // Add timeout with proper AbortSignal reason (prevents "aborted without reason")
      const createTimeoutSignal = (ms: number): AbortSignal => {
        const anyAbortSignal: any = AbortSignal as any;
        if (anyAbortSignal && typeof anyAbortSignal.timeout === "function") {
          return anyAbortSignal.timeout(ms);
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => {
          try {
            // Provide a reason when aborting to avoid generic AbortError messages
            (controller as any).abort(
              new DOMException("Timeout", "TimeoutError"),
            );
          } catch {
            controller.abort();
          }
        }, ms);
        // If fetch completes, the caller won't use this timeout anymore
        // Return the signal; caller does not need the timer reference
        return controller.signal;
      };

      const response = await fetch("/api/audit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(auditRequest),
        signal: createTimeoutSignal(120000), // 120s timeout for multi-page crawl
      });

      console.log("API response status:", response.status);

      // Check if response is valid
      if (!response.ok) {
        let errorMessage = `Server error: ${response.status}`;

        // Try to extract a meaningful error message safely
        const contentType = response.headers.get("content-type") || "";
        let responseText: string | null = null;

        try {
          if (!response.bodyUsed) {
            // Prefer text to avoid JSON stream issues
            responseText = await response.text();
          }
        } catch (readError) {
          // If body was already consumed or unreadable, fall back to status text
          console.warn("Unable to read error body:", readError);
        }

        if (responseText && responseText.trim()) {
          if (contentType.includes("application/json")) {
            try {
              const errorData = JSON.parse(responseText);
              errorMessage = errorData.error || errorMessage;
              console.error("API error details:", errorData);
            } catch {
              errorMessage = `Server error: ${response.status} - ${responseText.substring(0, 120)}`;
            }
          } else {
            errorMessage = `Server error: ${response.status} - ${responseText.substring(0, 120)}`;
          }
        } else {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }

        throw new Error(errorMessage);
      }

      // Parse successful response
      let responseData;
      try {
        responseData = await response.json();
      } catch (parseError) {
        throw new Error("Invalid response from server. Please try again.");
      }

      // Validate response structure
      if (!responseData.id || !responseData.sections) {
        throw new Error("Invalid audit response format. Please try again.");
      }

      const auditResult: AuditResponse = responseData;

      // Store audit result in localStorage for the results page
      localStorage.setItem(
        `audit_${auditResult.id}`,
        JSON.stringify(auditResult),
      );

      // Store audit server-side for sharing and persistence
      try {
        await fetch("/api/audits", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(auditResult),
        });
        console.log("Audit stored server-side successfully");
        // Reload recent audits to show the new one
        loadRecentAudits();
      } catch (storeError) {
        console.warn("Failed to store audit server-side:", storeError);
        // Continue anyway as we have localStorage backup
      }

      // Navigate to audit results page
      navigate(`/audit/${auditResult.id}`);
    } catch (error) {
      console.error("Audit error:", error);

      if (error instanceof Error) {
        if (
          error.name === "AbortError" ||
          error.message.toLowerCase().includes("aborted")
        ) {
          setError(
            "Request timed out while analyzing the site. Please try again or use a different URL.",
          );
        } else if (
          error.message.includes("fetch") ||
          error.message.includes("network") ||
          error.message.includes("Failed to fetch")
        ) {
          setError(
            "Network error. Unable to connect to the server. Please check your connection and try again.",
          );
        } else if (error.message.includes("timeout")) {
          setError(
            "Request timed out. Please try with a different website or try again later.",
          );
        } else {
          setError(error.message);
        }
      } else {
        setError(
          "An unexpected error occurred. Please check the URL and try again.",
        );
      }
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

      {/* Debug Panel - Remove this in production */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-yellow-50 border-b border-yellow-200 p-3">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h3 className="text-sm font-medium text-yellow-800 mb-2">Debug: API Status</h3>
            <div className="flex gap-4 text-xs">
              <span className={`flex items-center gap-1 ${apiStatus.ping ? 'text-green-700' : 'text-red-700'}`}>
                {apiStatus.ping ? '✓' : '✗'} Ping API
              </span>
              <span className={`flex items-center gap-1 ${apiStatus.audits ? 'text-green-700' : 'text-red-700'}`}>
                {apiStatus.audits ? '✓' : '✗'} Audits API
              </span>
              {apiStatus.error && (
                <span className="text-red-700">Error: {apiStatus.error}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
              Professional{" "}
              <span className="brand-text-gradient">Brand Audits</span>
            </h1>
            <p className="mt-6 max-w-3xl mx-auto text-xl text-gray-600">
              Get comprehensive website analysis with detailed scoring,
              insights, and actionable recommendations to enhance your brand's
              digital presence.
            </p>
          </div>

          {/* URL Input Form */}
          <div className="mt-12 max-w-3xl mx-auto">
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
                    Analyzing website content and generating comprehensive brand
                    audit... This may take up to 30 seconds.
                  </p>
                </div>
              )}
            </form>
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

        {loadingAudits ? (
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-brand-600 mx-auto mb-4 animate-pulse" />
            <p className="text-gray-600">Loading recent audits...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {recentAudits.map((audit) => (
                <Card
                  key={audit.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                >
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
                          {audit.overallScore >= 80
                            ? "Excellent"
                            : audit.overallScore >= 60
                              ? "Good"
                              : "Needs Improvement"}
                        </Badge>
                      </div>
                      <div
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${getScoreColor(audit.overallScore)}`}
                      >
                        {audit.overallScore}%
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(audit.date).toLocaleDateString()}
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

            {recentAudits.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No audits yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Enter a website URL above to get started with your first brand
                  audit.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
