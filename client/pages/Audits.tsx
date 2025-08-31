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
import { Input } from "@/components/ui/input";
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
  Search,
  Filter,
  Plus,
  AlertCircle
} from "lucide-react";
import { AuditResponse } from "@shared/api";

interface AuditSummary {
  id: string;
  title: string;
  url: string;
  date: string;
  overallScore: number;
}

const getScoreColor = (score: number) => {
  if (score >= 80) return "text-green-600 bg-green-50";
  if (score >= 60) return "text-yellow-600 bg-yellow-50";
  return "text-red-600 bg-red-50";
};

const getScoreLabel = (score: number) => {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  return "Needs Improvement";
};

export default function Audits() {
  const [audits, setAudits] = useState<AuditSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [filterBy, setFilterBy] = useState("all");

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

  // Filter and sort audits
  const filteredAudits = audits
    .filter(audit => {
      // Search filter
      const matchesSearch = audit.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           audit.url.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Score filter
      if (filterBy === "excellent") return matchesSearch && audit.overallScore >= 80;
      if (filterBy === "good") return matchesSearch && audit.overallScore >= 60 && audit.overallScore < 80;
      if (filterBy === "needs-improvement") return matchesSearch && audit.overallScore < 60;
      
      return matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === "date") {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      if (sortBy === "score") {
        return b.overallScore - a.overallScore;
      }
      if (sortBy === "title") {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">All Audits</h1>
            <p className="text-gray-600">
              Manage and review all your brand audits
            </p>
          </div>
          <Button asChild className="mt-4 md:mt-0">
            <Link to="/" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Audit
            </Link>
          </Button>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg border p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search audits by title or URL..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Latest First</SelectItem>
                  <SelectItem value="score">Highest Score</SelectItem>
                  <SelectItem value="title">Alphabetical</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterBy} onValueChange={setFilterBy}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by score" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Scores</SelectItem>
                  <SelectItem value="excellent">Excellent (80+)</SelectItem>
                  <SelectItem value="good">Good (60-79)</SelectItem>
                  <SelectItem value="needs-improvement">Needs Improvement (&lt;60)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-sm text-gray-600">
            Showing {filteredAudits.length} of {audits.length} audits
          </p>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-brand-600 mx-auto mb-4 animate-pulse" />
            <p className="text-gray-600">Loading audits...</p>
          </div>
        ) : error ? (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <CardTitle className="text-red-700">Error Loading Audits</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={() => window.location.reload()} className="w-full">
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : filteredAudits.length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-6" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {audits.length === 0 ? "No Audits Yet" : "No Matching Audits"}
            </h3>
            <p className="text-gray-600 mb-6">
              {audits.length === 0 
                ? "Get started by creating your first brand audit." 
                : "Try adjusting your search or filter criteria."
              }
            </p>
            <Button asChild>
              <Link to="/">
                <Plus className="h-4 w-4 mr-2" />
                Create First Audit
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {filteredAudits.map((audit) => (
              <Card
                key={audit.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-semibold text-gray-900 mb-1 truncate">
                        {audit.title}
                      </CardTitle>
                      <CardDescription className="text-sm text-gray-600 mb-2 truncate">
                        {audit.url}
                      </CardDescription>
                      <Badge variant="secondary" className="text-xs">
                        {getScoreLabel(audit.overallScore)}
                      </Badge>
                    </div>
                    <div
                      className={`px-3 py-1 rounded-full text-sm font-semibold flex-shrink-0 ml-2 ${getScoreColor(audit.overallScore)}`}
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
        )}
      </div>
    </div>
  );
}
