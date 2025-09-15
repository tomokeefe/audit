import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
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
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  AlertTriangle,
  CheckCircle,
  Globe,
  ArrowRight,
  RotateCcw,
  Share2,
} from "lucide-react";
import { AuditResponse } from "@shared/api";

interface AuditSummary {
  id: string;
  title: string;
  url: string;
  date: string;
  overallScore: number;
}

export default function AuditComparison() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [availableAudits, setAvailableAudits] = useState<AuditSummary[]>([]);
  const [selectedAudits, setSelectedAudits] = useState<AuditResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize selected audits from URL params
  useEffect(() => {
    const auditIds = searchParams.get("audits")?.split(",") || [];
    loadAvailableAudits();

    if (auditIds.length > 0) {
      loadSelectedAudits(auditIds);
    }
  }, [searchParams]);

  const loadAvailableAudits = async () => {
    try {
      const response = await fetch("/api/audits");
      if (response.ok) {
        const data = await response.json();
        setAvailableAudits(data.audits || []);
      }
    } catch (error) {
      console.error("Error loading audits:", error);
      setError("Failed to load available audits");
    } finally {
      setLoading(false);
    }
  };

  const loadSelectedAudits = async (auditIds: string[]) => {
    const loadedAudits: AuditResponse[] = [];

    for (const id of auditIds) {
      try {
        // Try to load from server first
        const response = await fetch(`/api/audits/${id}`);
        if (response.ok) {
          const audit = await response.json();
          loadedAudits.push(audit);
          continue;
        }

        // Fallback to localStorage
        const storedData = localStorage.getItem(`audit_${id}`);
        if (storedData) {
          const audit = JSON.parse(storedData);
          loadedAudits.push(audit);
        }
      } catch (error) {
        console.error(`Error loading audit ${id}:`, error);
      }
    }

    setSelectedAudits(loadedAudits);
  };

  const handleSelectAudit = (auditId: string) => {
    if (selectedAudits.find((a) => a.id === auditId)) {
      // Remove audit if already selected
      const updated = selectedAudits.filter((a) => a.id !== auditId);
      setSelectedAudits(updated);
      updateUrlParams(updated.map((a) => a.id));
    } else if (selectedAudits.length < 3) {
      // Add audit if less than 3 selected
      const audit = availableAudits.find((a) => a.id === auditId);
      if (audit) {
        loadSelectedAudits([...selectedAudits.map((a) => a.id), auditId]);
        updateUrlParams([...selectedAudits.map((a) => a.id), auditId]);
      }
    }
  };

  const updateUrlParams = (auditIds: string[]) => {
    if (auditIds.length > 0) {
      setSearchParams({ audits: auditIds.join(",") });
    } else {
      setSearchParams({});
    }
  };

  const removeAudit = (auditId: string) => {
    const updated = selectedAudits.filter((a) => a.id !== auditId);
    setSelectedAudits(updated);
    updateUrlParams(updated.map((a) => a.id));
  };

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

  const getScoreTrend = (score1: number, score2: number) => {
    const diff = score1 - score2;
    if (Math.abs(diff) < 2)
      return { icon: Minus, color: "text-gray-500", text: "No change" };
    if (diff > 0)
      return {
        icon: TrendingUp,
        color: "text-green-600",
        text: `+${diff.toFixed(1)}%`,
      };
    return {
      icon: TrendingDown,
      color: "text-red-600",
      text: `${diff.toFixed(1)}%`,
    };
  };

  const generateComparisonReport = () => {
    const data = {
      audits: selectedAudits.map((audit) => ({
        title: audit.title,
        url: audit.url,
        date: audit.date,
        overallScore: audit.overallScore,
        sections: audit.sections.map((section) => ({
          name: section.name,
          score: section.score,
          issues: section.issues,
          recommendations: section.recommendations,
        })),
      })),
      generatedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit_comparison_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const shareComparison = () => {
    const currentUrl = window.location.href;
    navigator.clipboard
      .writeText(currentUrl)
      .then(() => {
        alert("Comparison link copied to clipboard!");
      })
      .catch(() => {
        prompt("Copy this URL to share the comparison:", currentUrl);
      });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 text-brand-600 mx-auto mb-4 animate-pulse" />
            <p className="text-gray-600">Loading audits for comparison...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Audit Comparison
          </h1>
          <p className="text-gray-600">
            Compare multiple brand audits side-by-side to track progress and
            identify trends
          </p>
        </div>

        {/* Audit Selection */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Select Audits to Compare
            </CardTitle>
            <CardDescription>
              Choose up to 3 audits to compare. Select audits from the same
              website to track progress over time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableAudits.map((audit) => {
                const isSelected = selectedAudits.find(
                  (a) => a.id === audit.id,
                );
                const canSelect = selectedAudits.length < 3 || isSelected;

                return (
                  <div
                    key={audit.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      isSelected
                        ? "border-blue-500 bg-blue-50"
                        : canSelect
                          ? "border-gray-200 hover:border-gray-300 bg-white"
                          : "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                    }`}
                    onClick={() => canSelect && handleSelectAudit(audit.id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900 text-sm truncate">
                        {audit.title}
                      </h3>
                      <div
                        className={`text-sm font-bold ${getScoreColor(audit.overallScore)}`}
                      >
                        {audit.overallScore}%
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 truncate mb-2">
                      {audit.url}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">
                        {audit.date}
                      </span>
                      {isSelected && (
                        <Badge variant="default" className="text-xs">
                          Selected
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedAudits.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                <Button
                  onClick={generateComparisonReport}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  Export Comparison
                </Button>
                <Button
                  onClick={shareComparison}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  Share Comparison
                </Button>
                <Button
                  onClick={() => {
                    setSelectedAudits([]);
                    setSearchParams({});
                  }}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Clear All
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comparison Results */}
        {selectedAudits.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                No Audits Selected
              </h3>
              <p className="text-gray-600 mb-6">
                Select at least one audit from above to start comparing
              </p>
              <Button asChild>
                <Link to="/audits">Browse All Audits</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Overall Scores Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Overall Scores</CardTitle>
                <CardDescription>
                  Compare overall brand audit scores across selected audits
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {selectedAudits.map((audit, index) => (
                    <div key={audit.id} className="text-center">
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-left">
                          <h3 className="font-medium text-gray-900 text-sm truncate">
                            {audit.title}
                          </h3>
                          <p className="text-xs text-gray-600 truncate">
                            {audit.url}
                          </p>
                          <p className="text-xs text-gray-500">{audit.date}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAudit(audit.id)}
                          className="text-gray-400 hover:text-red-500 p-1"
                        >
                          ×
                        </Button>
                      </div>

                      <div
                        className={`text-4xl font-bold mb-2 ${getScoreColor(audit.overallScore)}`}
                      >
                        {typeof audit.overallScore === "number"
                          ? audit.overallScore.toFixed(1)
                          : audit.overallScore}
                        %
                      </div>

                      <Progress
                        value={audit.overallScore}
                        className="h-2 mb-2"
                      />

                      {index > 0 && selectedAudits[index - 1] && (
                        <div className="flex items-center justify-center gap-1 text-sm">
                          {(() => {
                            const trend = getScoreTrend(
                              audit.overallScore,
                              selectedAudits[index - 1].overallScore,
                            );
                            const Icon = trend.icon;
                            return (
                              <>
                                <Icon className={`h-4 w-4 ${trend.color}`} />
                                <span className={trend.color}>
                                  {trend.text}
                                </span>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Section-by-Section Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Section Comparison</CardTitle>
                <CardDescription>
                  Detailed breakdown of performance across all audit sections
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {selectedAudits[0]?.sections.map((_, sectionIndex) => {
                    const sectionName =
                      selectedAudits[0].sections[sectionIndex].name;

                    return (
                      <div
                        key={sectionIndex}
                        className="border-b border-gray-200 pb-6 last:border-b-0"
                      >
                        <h4 className="font-semibold text-gray-900 mb-4">
                          {sectionName}
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {selectedAudits.map((audit, auditIndex) => {
                            const section = audit.sections[sectionIndex];
                            if (!section) return null;

                            return (
                              <div
                                key={audit.id}
                                className="bg-gray-50 rounded-lg p-4"
                              >
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-sm font-medium text-gray-700 truncate">
                                    {audit.title}
                                  </span>
                                  <div
                                    className={`text-lg font-bold ${getScoreColor(section.score)}`}
                                  >
                                    {typeof section.score === "number"
                                      ? section.score.toFixed(1)
                                      : section.score}
                                    %
                                  </div>
                                </div>

                                <Progress
                                  value={section.score}
                                  className="h-2 mb-3"
                                />

                                <div className="flex justify-between text-xs text-gray-600">
                                  <div className="flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3 text-red-500" />
                                    {section.issues} issues
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3 text-green-500" />
                                    {section.recommendations} recs
                                  </div>
                                </div>

                                {auditIndex > 0 &&
                                  selectedAudits[auditIndex - 1]?.sections[
                                    sectionIndex
                                  ] && (
                                    <div className="flex items-center justify-center gap-1 text-xs mt-2">
                                      {(() => {
                                        const prevSection =
                                          selectedAudits[auditIndex - 1]
                                            .sections[sectionIndex];
                                        const trend = getScoreTrend(
                                          section.score,
                                          prevSection.score,
                                        );
                                        const Icon = trend.icon;
                                        return (
                                          <>
                                            <Icon
                                              className={`h-3 w-3 ${trend.color}`}
                                            />
                                            <span className={trend.color}>
                                              {trend.text}
                                            </span>
                                          </>
                                        );
                                      })()}
                                    </div>
                                  )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Key Insights */}
            <Card>
              <CardHeader>
                <CardTitle>Key Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">
                      Improvement Areas
                    </h4>
                    <div className="space-y-2">
                      {selectedAudits[0]?.sections
                        .filter((section) => section.score < 70)
                        .slice(0, 3)
                        .map((section, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 text-sm"
                          >
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                            <span className="text-gray-700">
                              {section.name}
                            </span>
                            <span
                              className={`font-medium ${getScoreColor(section.score)}`}
                            >
                              {section.score}%
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">
                      Strengths
                    </h4>
                    <div className="space-y-2">
                      {selectedAudits[0]?.sections
                        .filter((section) => section.score >= 80)
                        .slice(0, 3)
                        .map((section, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 text-sm"
                          >
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-gray-700">
                              {section.name}
                            </span>
                            <span
                              className={`font-medium ${getScoreColor(section.score)}`}
                            >
                              {section.score}%
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
