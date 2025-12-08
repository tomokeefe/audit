import { useState } from "react";
import { Shield, Lock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ProtectedLanding() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Simple password check - in production, this should be more secure
    const correctPassword =
      import.meta.env.VITE_REPORTS_PASSWORD || "brandwhisperer2024";

    if (password === correctPassword) {
      // Redirect to main product
      window.location.href = "https://audit-dl0hvw-production.up.railway.app";
    } else {
      setError("Incorrect password. Access denied.");
      setPassword("");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
            <Shield className="h-8 w-8 text-orange-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Protected Area</CardTitle>
          <CardDescription>
            This area is password protected. If you have a shareable audit link,
            please use the complete URL.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Access Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  placeholder="Enter password"
                  className="pl-10"
                  autoFocus
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              Access Dashboard
            </Button>
          </form>

          <div className="pt-4 border-t">
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                <strong>Looking for a shared audit report?</strong>
              </p>
              <p className="text-xs text-gray-500">
                Shareable audit links look like:
                <br />
                <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                  reports.brandwhisperer.io/audit/[unique-id]
                </code>
              </p>
              <p className="text-xs text-gray-500 mt-2">
                If you received a link, please use the complete URL provided to
                you.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t text-center">
            <p className="text-xs text-gray-400">
              Need help? Contact{" "}
              <a
                href="mailto:hello@brandwhisperer.com"
                className="text-orange-600 hover:text-orange-700 underline"
              >
                hello@brandwhisperer.com
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
