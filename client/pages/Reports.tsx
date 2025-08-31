import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  TrendingUp, 
  Download, 
  Calendar,
  BarChart3,
  Target,
  Award,
  ArrowUp,
  ArrowDown,
  Minus,
  Filter
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from "recharts";

interface AuditSummary {
  id: string;
  title: string;
  url: string;
  date: string;
  overallScore: number;
}

interface AuditDetail {
  id: string;
  title: string;
  url: string;
  date: string;
  overallScore: number;
  sections?: Array<{
    name: string;
    score: number;
    maxScore: number;
  }>;
}

export default function Reports() {
  const [audits, setAudits] = useState<AuditSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("all");
  const [sortBy, setSortBy] = useState("date");

  useEffect(() => {
    const loadAudits = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/audits");
        if (!response.ok) {
          throw new Error(`Failed to load audits: ${response.status}`);
        }

        const data = await response.json();
        setAudits(data.audits || []);
      } catch (err) {
        console.error("Error loading audits:", err);
        setError(err instanceof Error ? err.message : "Failed to load audits");
      } finally {
        setLoading(false);
      }
    };

    loadAudits();
  }, []);

  // Filter audits by time range
  const filteredAudits = audits.filter(audit => {
    const auditDate = new Date(audit.date);
    const now = new Date();
    
    switch (timeRange) {
      case "7days":
        return (now.getTime() - auditDate.getTime()) <= 7 * 24 * 60 * 60 * 1000;
      case "30days":
        return (now.getTime() - auditDate.getTime()) <= 30 * 24 * 60 * 60 * 1000;
      case "90days":
        return (now.getTime() - auditDate.getTime()) <= 90 * 24 * 60 * 60 * 1000;
      default:
        return true;
    }
  }).sort((a, b) => {
    if (sortBy === "date") {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    if (sortBy === "score") {
      return b.overallScore - a.overallScore;
    }
    return a.title.localeCompare(b.title);
  });

  // Analytics calculations
  const getReportAnalytics = () => {
    if (filteredAudits.length === 0) return null;

    const totalAudits = filteredAudits.length;
    const averageScore = Math.round(
      filteredAudits.reduce((sum, audit) => sum + audit.overallScore, 0) / totalAudits
    );
    
    // Performance distribution
    const excellent = filteredAudits.filter(a => a.overallScore >= 80).length;
    const good = filteredAudits.filter(a => a.overallScore >= 60 && a.overallScore < 80).length;
    const needsImprovement = filteredAudits.filter(a => a.overallScore < 60).length;
    
    // Monthly trend data
    const monthlyData = filteredAudits.reduce((acc, audit) => {
      const month = new Date(audit.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      if (!acc[month]) {
        acc[month] = { month, scores: [], count: 0 };
      }
      acc[month].scores.push(audit.overallScore);
      acc[month].count++;
      return acc;
    }, {} as Record<string, { month: string; scores: number[]; count: number }>);

    const monthlyTrend = Object.values(monthlyData)
      .map(({ month, scores, count }) => ({
        month,
        averageScore: Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length),
        auditCount: count,
        highestScore: Math.max(...scores),
        lowestScore: Math.min(...scores)
      }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

    // Score distribution for radar chart
    const scoreRanges = [
      { range: '90-100', count: filteredAudits.filter(a => a.overallScore >= 90).length },
      { range: '80-89', count: filteredAudits.filter(a => a.overallScore >= 80 && a.overallScore < 90).length },
      { range: '70-79', count: filteredAudits.filter(a => a.overallScore >= 70 && a.overallScore < 80).length },
      { range: '60-69', count: filteredAudits.filter(a => a.overallScore >= 60 && a.overallScore < 70).length },
      { range: '50-59', count: filteredAudits.filter(a => a.overallScore >= 50 && a.overallScore < 60).length },
      { range: '0-49', count: filteredAudits.filter(a => a.overallScore < 50).length },
    ];

    // Calculate trends
    const recentAudits = filteredAudits.slice(0, 5);
    const olderAudits = filteredAudits.slice(5, 10);
    
    let trend = "stable";
    let trendPercentage = 0;
    
    if (recentAudits.length > 0 && olderAudits.length > 0) {
      const recentAvg = recentAudits.reduce((sum, a) => sum + a.overallScore, 0) / recentAudits.length;
      const olderAvg = olderAudits.reduce((sum, a) => sum + a.overallScore, 0) / olderAudits.length;
      trendPercentage = Math.round(((recentAvg - olderAvg) / olderAvg) * 100);
      
      if (trendPercentage > 5) trend = "improving";
      else if (trendPercentage < -5) trend = "declining";
    }

    return {
      totalAudits,
      averageScore,
      excellent,
      good,
      needsImprovement,
      monthlyTrend,
      scoreRanges,
      trend,
      trendPercentage,
      highestScore: Math.max(...filteredAudits.map(a => a.overallScore)),
      lowestScore: Math.min(...filteredAudits.map(a => a.overallScore))
    };
  };

  const analytics = getReportAnalytics();

  const exportReport = () => {
    if (!analytics) return;
    
    const reportData = {
      generatedAt: new Date().toISOString(),
      timeRange,
      summary: {
        totalAudits: analytics.totalAudits,
        averageScore: analytics.averageScore,
        trend: analytics.trend,
        trendPercentage: analytics.trendPercentage
      },
      audits: filteredAudits.map(audit => ({
        title: audit.title,
        url: audit.url,
        score: audit.overallScore,
        date: audit.date
      }))
    };
    
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `brand-audit-report-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "improving": return <ArrowUp className="h-4 w-4 text-green-500" />;
      case "declining": return <ArrowDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const colors = ['#3b82f6', '#22c55e', '#eab308', '#ef4444', '#8b5cf6', '#f97316'];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 text-brand-600 mx-auto mb-4 animate-pulse" />
            <p className="text-gray-600">Loading reports...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-red-700">Error Loading Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>Try Again</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics & Reports</h1>
            <p className="text-gray-600">
              Comprehensive analytics and performance insights
            </p>
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            <Button onClick={exportReport} variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export Report
            </Button>
            <Button asChild>
              <Link to="/" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                New Audit
              </Link>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Time Range</label>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="7days">Last 7 Days</SelectItem>
                    <SelectItem value="30days">Last 30 Days</SelectItem>
                    <SelectItem value="90days">Last 90 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Sort By</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Latest First</SelectItem>
                    <SelectItem value="score">Highest Score</SelectItem>
                    <SelectItem value="title">Alphabetical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {analytics ? (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Audits</p>
                      <p className="text-3xl font-bold text-gray-900">{analytics.totalAudits}</p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-brand-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Average Score</p>
                      <p className="text-3xl font-bold text-gray-900">{analytics.averageScore}%</p>
                    </div>
                    <Target className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Performance Trend</p>
                      <div className="flex items-center gap-2">
                        <p className="text-2xl font-bold text-gray-900">
                          {Math.abs(analytics.trendPercentage)}%
                        </p>
                        {getTrendIcon(analytics.trend)}
                      </div>
                    </div>
                    <TrendingUp className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Top Score</p>
                      <p className="text-3xl font-bold text-gray-900">{analytics.highestScore}%</p>
                    </div>
                    <Award className="h-8 w-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Monthly Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance Over Time</CardTitle>
                  <CardDescription>Average scores and audit count by month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analytics.monthlyTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: number, name: string) => [
                            name === 'averageScore' ? `${value}%` : value,
                            name === 'averageScore' ? 'Average Score' : 'Audit Count'
                          ]}
                        />
                        <Area
                          type="monotone"
                          dataKey="averageScore"
                          stroke="#3b82f6"
                          fill="#3b82f6"
                          fillOpacity={0.3}
                        />
                        <Line
                          type="monotone"
                          dataKey="auditCount"
                          stroke="#22c55e"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Score Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Score Range Distribution</CardTitle>
                  <CardDescription>Number of audits in each score range</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.scoreRanges}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="range" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Summary */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
                <CardDescription>Key insights from your audit data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 mb-2">{analytics.excellent}</div>
                    <p className="text-sm text-gray-600">Excellent Performance (80%+)</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600 mb-2">{analytics.good}</div>
                    <p className="text-sm text-gray-600">Good Performance (60-79%)</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600 mb-2">{analytics.needsImprovement}</div>
                    <p className="text-sm text-gray-600">Needs Improvement (&lt;60%)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Audits Table */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Audits</CardTitle>
                <CardDescription>Detailed view of recent audit results</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredAudits.slice(0, 10).map((audit) => (
                    <div
                      key={audit.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{audit.title}</h4>
                        <p className="text-sm text-gray-600">{audit.url}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(audit.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge 
                          variant={audit.overallScore >= 80 ? "default" : audit.overallScore >= 60 ? "secondary" : "destructive"}
                        >
                          {audit.overallScore}%
                        </Badge>
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/audit/${audit.id}`}>View</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="text-center py-12">
            <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-6" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Data Available</h3>
            <p className="text-gray-600 mb-6">
              Create some audits to see comprehensive reports and analytics.
            </p>
            <Button asChild>
              <Link to="/">Create First Audit</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
