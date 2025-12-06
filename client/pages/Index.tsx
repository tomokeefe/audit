import { useState, useEffect, useRef } from "react";
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
import ErrorState, { useErrorHandler } from "@/components/ErrorState";
import {
  debugEventSource,
  isEventSourceSupported,
} from "@/utils/eventSourceTest";
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

interface ProgressStep {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  current: boolean;
  duration?: number;
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
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([]);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const navigate = useNavigate();

  // Enhanced error handling
  const {
    error: globalError,
    isRetrying,
    handleError,
    clearError,
    retry,
  } = useErrorHandler();

  // Debug function for testing
  const debugFormSubmission = () => {
    console.log("🐛 DEBUG: Testing form submission");
    console.log("URL state:", url);
    console.log("isLoading state:", isLoading);
    console.log("Current EventSource ref:", currentEventSourceRef.current);

    // Test EventSource support
    console.log("EventSource supported:", typeof EventSource !== "undefined");

    // Test URL normalization
    let testUrl = url.trim();
    if (!testUrl.match(/^https?:\/\//)) {
      testUrl = `https://${testUrl}`;
    }
    console.log("Normalized URL would be:", testUrl);

    // Test if we can manually trigger handleSubmit
    console.log("🧪 Testing manual form submission...");
    const fakeEvent = new Event("submit");
    Object.defineProperty(fakeEvent, "preventDefault", {
      value: () => console.log("preventDefault called"),
      writable: false,
    });
    handleSubmit(fakeEvent as any);
  };

  // Cleanup EventSource on component unmount
  useEffect(() => {
    return () => {
      if (
        currentEventSourceRef.current &&
        currentEventSourceRef.current.readyState !== EventSource.CLOSED
      ) {
        console.log("Cleaning up EventSource on component unmount");
        currentEventSourceRef.current.close();
        currentEventSourceRef.current = null;
      }
    };
  }, []);

  const loadRecentAudits = async () => {
    try {
      setLoadingAudits(true);

      // Use same timeout mechanism as testAPIConnection
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // Longer timeout for data loading

      try {
        const response = await fetch("/api/audits", {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorMsg = `API returned ${response.status}: ${response.statusText}`;
          console.warn(errorMsg);
          setApiStatus((prev) => ({ ...prev, audits: false, error: errorMsg }));
          // Handle non-200 responses gracefully
          setRecentAudits([]);
          setAllAudits([]);
          return;
        }

        let data;
        try {
          data = await response.json();
        } catch (jsonError) {
          console.error("Failed to parse audits response as JSON:", jsonError);
          setApiStatus((prev) => ({
            ...prev,
            audits: false,
            error: "Invalid response format",
          }));
          setRecentAudits([]);
          setAllAudits([]);
          return;
        }

        const audits = data.audits || [];

        // Update API status to reflect success
        setApiStatus((prev) => ({ ...prev, audits: true, error: undefined }));

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

        console.log(
          `Loaded ${audits.length} audits, showing ${recent.length} recent`,
        );
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError; // Re-throw to be handled by outer catch
      }
    } catch (error) {
      console.error("Failed to load recent audits:", error);

      // Provide more detailed error information
      let errorMsg = "Unknown error";
      if (error instanceof Error) {
        // Use enhanced error handling for critical API failures
        handleError(error);

        if (error.name === "AbortError") {
          errorMsg = "Request timed out while loading audits";
        } else if (
          error.message.includes("fetch") ||
          error.message.includes("network")
        ) {
          errorMsg = "Network error: Unable to connect to the API server";
        } else {
          errorMsg = error.message;
        }
      } else {
        handleError(errorMsg);
      }

      setApiStatus((prev) => ({ ...prev, audits: false, error: errorMsg }));
      // Fallback to empty array on error
      setRecentAudits([]);
      setAllAudits([]);
    } finally {
      setLoadingAudits(false);
    }
  };

  // Safe wrapper that checks environment before running API tests
  const safeTestAPIConnection = async () => {
    return await testAPIConnection();
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
      const timeoutId = setTimeout(() => {
        console.log(`Request timeout after ${timeout}ms for ${url}`);
        controller.abort();
      }, timeout);

      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        });
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        // Improve error handling for AbortError
        if (error instanceof Error && error.name === "AbortError") {
          console.log(`Request aborted for ${url}`);
          throw new Error(`Request timeout after ${timeout}ms`);
        }
        throw error;
      }
    };

    try {
      // Test ping endpoint with timeout
      console.log("Testing /api/ping...");
      console.log("Current location:", window.location.href);
      console.log(
        "Ping URL will be:",
        new URL("/api/ping", window.location.origin).href,
      );

      try {
        const pingResponse = await fetchWithTimeout("/api/ping", 5000);
        if (!pingResponse) {
          throw new Error("No response from ping endpoint");
        }
        console.log("Ping response status:", pingResponse.status);
        console.log("Ping response ok:", pingResponse.ok);
        try {
          console.log(
            "Ping response headers:",
            Object.fromEntries(pingResponse.headers.entries()),
          );
        } catch (headerError) {
          console.warn("Could not read response headers:", headerError);
        }

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
          if (pingError.name === "AbortError") {
            errorMsg = "Ping request timed out";
          } else if (
            pingError.message.includes("fetch") ||
            pingError.message.includes("Failed to fetch")
          ) {
            errorMsg = "Development environment - API endpoints not available";
          } else {
            errorMsg = `Ping error: ${pingError.message}`;
          }
        }
      }

      // Test audits endpoint only if ping succeeded or with retry
      console.log("Testing /api/audits...");
      console.log(
        "Audits URL will be:",
        new URL("/api/audits", window.location.origin).href,
      );

      try {
        const auditsResponse = await fetchWithTimeout("/api/audits", 5000);
        if (!auditsResponse) {
          throw new Error("No response from audits endpoint");
        }
        console.log("Audits response status:", auditsResponse.status);
        console.log("Audits response ok:", auditsResponse.ok);
        console.log("Audits response url:", auditsResponse.url);
        try {
          console.log(
            "Audits response headers:",
            Object.fromEntries(auditsResponse.headers.entries()),
          );
        } catch (headerError) {
          console.warn("Could not read audits response headers:", headerError);
        }

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
          const errorText = await auditsResponse
            .text()
            .catch(() => "Unable to read error response");
          console.log("Audits error response:", errorText);
          if (!errorMsg) {
            // Only set if ping didn't already fail
            errorMsg = `Audits API error: ${auditsResponse.status} ${auditsResponse.statusText}`;
          }
        }
      } catch (auditsError) {
        console.error("Audits request failed:", auditsError);
        if (!errorMsg) {
          // Only set if ping didn't already fail
          if (auditsError instanceof Error) {
            if (auditsError.name === "AbortError") {
              errorMsg = "Audits request timed out";
            } else if (auditsError.message.includes("fetch")) {
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
      errorMsg =
        generalError instanceof Error
          ? generalError.message
          : "Unexpected API test failure";
    }

    // Update API status
    setApiStatus({ ping: pingOk, audits: auditsOk, error: errorMsg });
    console.log("API test completed:", {
      ping: pingOk,
      audits: auditsOk,
      error: errorMsg,
    });
  };

  useEffect(() => {
    // Add debug logging
    console.log("Component mounted, initializing API connection...");

    // Test API connection with retry logic for server startup
    const initializeAPI = async () => {
      let retries = 0;
      const maxRetries = 3;

      const attemptConnection = async (): Promise<boolean> => {
        console.log(`API connection attempt ${retries + 1}/${maxRetries}`);

        try {
          // Test a simple fetch to see if server is responding
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            console.log("API ping timeout after 3s");
            controller.abort();
          }, 3000);

          const testResponse = await fetch("/api/ping", {
            method: "GET",
            headers: { Accept: "application/json" },
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (testResponse.ok) {
            console.log(
              "API server is responding, running full connection test...",
            );
            await safeTestAPIConnection();
            setTimeout(() => loadRecentAudits(), 300);
            return true;
          }

          throw new Error(`Server responded with ${testResponse.status}`);
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            console.log(`Connection attempt ${retries + 1} timed out after 3s`);
          } else {
            console.log(
              `Connection attempt ${retries + 1} failed:`,
              error instanceof Error ? error.message : error,
            );
          }

          if (retries < maxRetries - 1) {
            retries++;
            const delay = 1000 + retries * 1000; // Increasing delay: 2s, 3s, 4s
            console.log(`Retrying in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            return attemptConnection();
          } else {
            console.log(
              "All connection attempts failed, running fallback tests...",
            );
            // Run the full test anyway in case it's a false negative
            await safeTestAPIConnection();
            setTimeout(() => loadRecentAudits(), 300);
            return false;
          }
        }
      };

      // Add initial delay to allow server to fully start after hot reload
      console.log("Waiting for server startup...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await attemptConnection();
    };

    initializeAPI().catch((error) => {
      console.error("Failed to initialize API:", error);
      // Fallback: try to run tests anyway
      safeTestAPIConnection();
      setTimeout(() => loadRecentAudits(), 1000);
    });
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

  const initializeProgressSteps = () => {
    const steps: ProgressStep[] = [
      {
        id: "validation",
        label: "Validating URL",
        description: "Checking website accessibility and structure",
        completed: false,
        current: true,
        duration: 2000,
      },
      {
        id: "crawling",
        label: "Crawling Website",
        description: "Analyzing multiple pages and extracting content",
        completed: false,
        current: false,
        duration: 8000,
      },
      {
        id: "analysis",
        label: "AI Analysis",
        description: "Generating insights with industry benchmarks",
        completed: false,
        current: false,
        duration: 15000,
      },
      {
        id: "scoring",
        label: "Calculating Scores",
        description: "Applying evidence-weighted scoring system",
        completed: false,
        current: false,
        duration: 5000,
      },
      {
        id: "recommendations",
        label: "Creating Recommendations",
        description: "Building strategic implementation plan",
        completed: false,
        current: false,
        duration: 5000,
      },
      {
        id: "finalizing",
        label: "Finalizing Report",
        description: "Preparing comprehensive audit results",
        completed: false,
        current: false,
        duration: 3000,
      },
    ];
    setProgressSteps(steps);
    return steps;
  };

  const updateProgress = (stepId: string, completed: boolean = false) => {
    setProgressSteps((prev) => {
      const updated = prev.map((step, index) => {
        if (step.id === stepId) {
          return { ...step, completed, current: !completed };
        }
        // Set next step as current if this one is completed
        if (completed && prev.findIndex((s) => s.id === stepId) === index - 1) {
          return { ...step, current: true };
        }
        // Remove current from other steps
        if (step.id !== stepId && completed) {
          return { ...step, current: false };
        }
        return step;
      });

      // Calculate progress percentage
      const completedCount = updated.filter((s) => s.completed).length;
      setCurrentProgress((completedCount / updated.length) * 100);

      return updated;
    });
  };

  const simulateProgressSteps = async (steps: ProgressStep[]) => {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      // Simulate step duration with some randomness
      const duration = (step.duration || 3000) + Math.random() * 2000;

      await new Promise((resolve) => setTimeout(resolve, duration));
      updateProgress(step.id, true);
    }
  };

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

  // Track current EventSource to prevent duplicates
  const currentEventSourceRef = useRef<EventSource | null>(null);

  // New real-time progress audit function using Server-Sent Events
  const handleAuditWithProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("🟢 handleAuditWithProgress called with URL:", url.trim());

    if (!url.trim()) {
      console.log("❌ Empty URL in handleAuditWithProgress");
      return;
    }

    // Prevent multiple simultaneous submissions
    if (isLoading) {
      console.log("❌ Already loading in handleAuditWithProgress, aborting");
      return;
    }

    // Clean up any existing EventSource connection
    if (
      currentEventSourceRef.current &&
      currentEventSourceRef.current.readyState !== EventSource.CLOSED
    ) {
      console.log("🔄 Closing existing EventSource connection");
      currentEventSourceRef.current.close();
      currentEventSourceRef.current = null;
    }

    // Normalize URL to support flexible formats
    let normalizedUrl = url.trim();
    if (!normalizedUrl.match(/^https?:\/\//)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    console.log("📝 Normalized URL:", normalizedUrl);
    console.log("⚡ Setting loading state to true...");

    setIsLoading(true);
    setError("");
    setShowProgress(true);

    // Initialize progress tracking with real-time updates
    const steps = initializeProgressSteps();
    setCurrentProgress(0);

    try {
      // Check EventSource support first
      if (!isEventSourceSupported()) {
        console.log(
          "EventSource not supported, falling back to standard audit",
        );
        throw new Error("EventSource not supported");
      }

      // Test API connectivity first
      const isConnected = await testApiConnectivity();
      if (!isConnected) {
        throw new Error("Unable to connect to server. Please try again.");
      }

      // Create unique session ID for this audit
      const sessionId = Date.now().toString();

      // Encode URL for query parameter
      const encodedUrl = encodeURIComponent(normalizedUrl);

      // Create EventSource URL
      const eventSourceUrl = `/api/audit/progress?url=${encodedUrl}&session=${sessionId}`;
      console.log("Creating EventSource connection to:", eventSourceUrl);

      // Debug EventSource setup
      if (process.env.NODE_ENV === "development") {
        debugEventSource(eventSourceUrl);
      }

      // Create EventSource with audit parameters
      const eventSource = new EventSource(eventSourceUrl);
      currentEventSourceRef.current = eventSource;

      return new Promise((resolve, reject) => {
        eventSource.onopen = () => {
          console.log("✅ EventSource connection opened successfully");
        };

        eventSource.onmessage = (event) => {
          try {
            const progressData = JSON.parse(event.data);
            console.log("EventSource message received:", progressData);

            // Update progress based on server events
            if (typeof progressData.progress === "number") {
              setCurrentProgress(progressData.progress);
            }

            // Update step status
            if (progressData.step && progressData.step !== "error") {
              updateProgress(
                progressData.step,
                progressData.completed || false,
              );
            }

            // Handle completion
            if (progressData.completed && progressData.data) {
              console.log(
                "🎉 AUDIT COMPLETED! Processing completion...",
                progressData.data,
              );
              const auditResult = progressData.data;
              console.log("📊 Audit result ID:", auditResult.id);

              // Store audit result in localStorage
              console.log("💾 Storing audit in localStorage...");
              localStorage.setItem(
                `audit_${auditResult.id}`,
                JSON.stringify(auditResult),
              );
              console.log("✅ Audit stored in localStorage");

              // Reload recent audits
              console.log("🔄 Reloading recent audits...");
              loadRecentAudits();

              // Navigate to results immediately
              console.log(
                "🔄 Navigating to audit results:",
                `/audit/${auditResult.id}`,
              );
              navigate(`/audit/${auditResult.id}`);

              console.log("🔌 Closing EventSource connection...");
              eventSource.close();
              resolve(auditResult);
              return; // Exit early to prevent further processing
            }

            // Handle errors
            if (progressData.error) {
              console.error("❌ Audit error received:", progressData.error);
              setError(progressData.error);
              eventSource.close();
              reject(new Error(progressData.error));
            }
          } catch (parseError) {
            console.error(
              "Error parsing progress data:",
              parseError,
              "Raw data:",
              event.data,
            );
            setError("Error processing server response. Please try again.");
          }
        };

        eventSource.onerror = (error) => {
          // EventSource errors are expected on serverless platforms like Netlify
          // Just fall back silently to standard audit mode
          console.log(
            "EventSource connection failed, falling back to standard audit mode (expected on serverless)",
          );

          // Close the EventSource connection and fall back
          eventSource.close();
          reject(
            new Error("EventSource failed - using standard audit fallback"),
          );
        };

        // Cleanup function
        const cleanup = () => {
          if (eventSource.readyState !== EventSource.CLOSED) {
            eventSource.close();
          }
          currentEventSourceRef.current = null;
        };

        // Timeout fallback
        const timeoutId = setTimeout(() => {
          cleanup();
          reject(new Error("Request timed out"));
        }, 120000); // 2 minute timeout

        // Clear timeout if request completes normally
        const originalResolve = resolve;
        const originalReject = reject;

        resolve = (value: any) => {
          clearTimeout(timeoutId);
          cleanup();
          originalResolve(value);
        };

        reject = (error: any) => {
          clearTimeout(timeoutId);
          cleanup();
          originalReject(error);
        };
      });
    } catch (error) {
      console.error("Real-time audit error:", error);

      // Use enhanced error handling
      if (error instanceof Error) {
        handleError(error);
        setError(error.message);
      } else {
        const errorMsg = "An unexpected error occurred. Please try again.";
        handleError(errorMsg);
        setError(errorMsg);
      }
    } finally {
      setIsLoading(false);
      setShowProgress(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    try {
      e.preventDefault();
      console.log("🔵 Form submitted with URL:", url.trim());

      if (!url.trim()) {
        console.log("��� Empty URL, aborting submission");
        return;
      }

      // Prevent multiple simultaneous submissions
      if (isLoading) {
        console.log(
          "❌ Audit already in progress, ignoring duplicate submission",
        );
        return;
      }

      console.log("✅ Starting new audit process...");

      // Skip progress tracking, use standard method directly for reliability
      await handleSubmitStandard(e);
    } catch (topLevelError) {
      console.error("💥 CRITICAL ERROR in handleSubmit:", topLevelError);
      setError(
        "A critical error occurred. Please refresh the page and try again.",
      );
      setIsLoading(false);
      setShowProgress(false);
    }
  };

  // Standard audit submission (fallback)
  const handleSubmitStandard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    // Prevent multiple simultaneous submissions
    if (isLoading) {
      console.log(
        "Standard audit already in progress, ignoring duplicate submission",
      );
      return;
    }

    // Normalize URL to support flexible formats (example.com, www.example.com, https://example.com)
    let normalizedUrl = url.trim();
    if (!normalizedUrl.match(/^https?:\/\//)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    setIsLoading(true);
    setError("");
    setShowProgress(true);

    // Initialize progress tracking
    const steps = initializeProgressSteps();

    // Start progress simulation
    const progressPromise = simulateProgressSteps(steps);

    try {
      // Test API connectivity first
      const isConnected = await testApiConnectivity();
      if (!isConnected) {
        throw new Error("Unable to connect to server. Please try again.");
      }

      const auditRequest: AuditRequest = { url: normalizedUrl };

      console.log("Starting standard audit request for:", url);

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

      console.log(
        `✓ Audit ${auditResult.id} saved to browser storage for sharing`,
      );

      // Save audit to database for shareable links
      try {
        const saveResponse = await fetch("/api/save-audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: auditResult.id,
            url: auditRequest.url,
            title: auditResult.title || "Audit Report",
            description: auditResult.description || null,
            overallScore: auditResult.overallScore || 0,
            status: "completed",
            date: new Date().toISOString(),
            audit_data: auditResult,
          }),
        });

        if (saveResponse.ok) {
          console.log(`✓ Audit ${auditResult.id} saved to database`);
        } else {
          console.warn(
            "Failed to save audit to database:",
            await saveResponse.text(),
          );
        }
      } catch (saveError) {
        console.error("Error saving to database:", saveError);
      }

      // Reload recent audits to show the new one
      loadRecentAudits();

      // Complete final progress step
      updateProgress("finalizing", true);

      // Wait for progress animation to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Navigate to audit results page
      navigate(`/audit/${auditResult.id}`);
    } catch (error) {
      console.error("Standard audit error:", error);

      let errorMessage = "";

      if (error instanceof Error) {
        // Use enhanced error handling
        handleError(error);

        if (
          error.name === "AbortError" ||
          error.message.toLowerCase().includes("aborted")
        ) {
          errorMessage =
            "Request timed out while analyzing the site. Please try again or use a different URL.";
        } else if (
          error.message.includes("fetch") ||
          error.message.includes("network") ||
          error.message.includes("Failed to fetch")
        ) {
          errorMessage =
            "Network error. Unable to connect to the server. Please check your connection and try again.";
        } else if (error.message.includes("timeout")) {
          errorMessage =
            "Request timed out. Please try with a different website or try again later.";
        } else {
          errorMessage = error.message;
        }
      } else {
        errorMessage =
          "An unexpected error occurred. Please check the URL and try again.";
        handleError(errorMessage);
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setShowProgress(false);
    }

    try {
      // Test API connectivity first
      const isConnected = await testApiConnectivity();
      if (!isConnected) {
        throw new Error("Unable to connect to server. Please try again.");
      }

      const auditRequest: AuditRequest = { url: normalizedUrl };

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

      console.log(
        `✓ Audit ${auditResult.id} saved to browser storage for sharing`,
      );

      // Save audit to database for shareable links
      try {
        const saveResponse = await fetch("/api/save-audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: auditResult.id,
            url: auditRequest.url,
            title: auditResult.title || "Audit Report",
            description: auditResult.description || null,
            overallScore: auditResult.overallScore || 0,
            status: "completed",
            date: new Date().toISOString(),
            audit_data: auditResult,
          }),
        });

        if (saveResponse.ok) {
          console.log(`✓ Audit ${auditResult.id} saved to database`);
        } else {
          console.warn(
            "Failed to save audit to database:",
            await saveResponse.text(),
          );
        }
      } catch (saveError) {
        console.error("Error saving to database:", saveError);
      }

      // Reload recent audits to show the new one
      loadRecentAudits();

      // Complete final progress step
      updateProgress("finalizing", true);

      // Wait for progress animation to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));

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
      {process.env.NODE_ENV === "development" && (
        <div
          className={`border-b p-3 ${apiStatus.error ? "bg-red-50 border-red-200" : "bg-yellow-50 border-yellow-200"}`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center">
              <div>
                <h3
                  className={`text-sm font-medium mb-2 ${apiStatus.error ? "text-red-800" : "text-yellow-800"}`}
                >
                  Debug: API Status{" "}
                  {!apiStatus.ping && !apiStatus.audits
                    ? "(Connection Issues)"
                    : ""}
                </h3>
                <div className="flex gap-4 text-xs">
                  <span
                    className={`flex items-center gap-1 ${apiStatus.ping ? "text-green-700" : "text-red-700"}`}
                  >
                    {apiStatus.ping ? "✓" : "✗"} Ping API{" "}
                    {apiStatus.ping ? "(Connected)" : "(Failed)"}
                  </span>
                  <span
                    className={`flex items-center gap-1 ${apiStatus.audits ? "text-green-700" : "text-red-700"}`}
                  >
                    {apiStatus.audits ? "✓" : "✗"} Audits API{" "}
                    {apiStatus.audits ? "(Connected)" : "(Failed)"}
                  </span>
                  {apiStatus.error && (
                    <span className="text-red-700 font-medium">
                      Error: {apiStatus.error}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {apiStatus.error && (
                  <button
                    onClick={() => {
                      console.log("Retrying API connection...");
                      setApiStatus({
                        ping: false,
                        audits: false,
                        error: undefined,
                      });
                      safeTestAPIConnection();
                      setTimeout(() => loadRecentAudits(), 500);
                    }}
                    className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs rounded border border-blue-300 transition-colors"
                  >
                    Retry Connection
                  </button>
                )}
                <button
                  onClick={() => {
                    console.log("Manual API test triggered...");
                    safeTestAPIConnection();
                  }}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs rounded border border-gray-300 transition-colors"
                >
                  Test API
                </button>
                <button
                  onClick={() => {
                    console.log("Manual audit loading triggered...");
                    loadRecentAudits();
                  }}
                  className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-800 text-xs rounded border border-green-300 transition-colors"
                >
                  Load Audits
                </button>
                <button
                  onClick={debugFormSubmission}
                  className="px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 text-xs rounded border border-purple-300 transition-colors"
                >
                  Debug Form
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
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
            <form
              onSubmit={(e) => {
                console.log("🟡 FORM onSubmit triggered!");
                handleSubmit(e);
              }}
              className="space-y-4"
              style={{ pointerEvents: isLoading ? "none" : "auto" }}
            >
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    type="text"
                    placeholder="Enter website URL to audit (e.g., example.com)"
                    value={url}
                    onChange={(e) => {
                      console.log("📝 URL input changed:", e.target.value);
                      setUrl(e.target.value);
                    }}
                    className="pl-10 h-12 text-lg"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  onClick={() => console.log("🖱️ Start Audit button clicked!")}
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
                  <div className="flex justify-between items-start">
                    <p className="text-sm flex-1">{error}</p>
                    <div className="flex gap-2 ml-3">
                      <button
                        onClick={() => {
                          clearError();
                          setError("");
                        }}
                        className="text-xs text-red-600 hover:text-red-800 underline"
                      >
                        Dismiss
                      </button>
                      {isRetrying ? (
                        <span className="text-xs text-red-600">
                          Retrying...
                        </span>
                      ) : (
                        <button
                          onClick={() => retry()}
                          className="text-xs text-red-600 hover:text-red-800 underline"
                        >
                          Retry
                        </button>
                      )}
                    </div>
                  </div>
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
