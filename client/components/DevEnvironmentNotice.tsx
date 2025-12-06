import { AlertTriangle, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function DevEnvironmentNotice() {
  const isDevelopment = window.location.hostname.includes(
    "projects.builder.codes",
  );

  if (!isDevelopment) return null;

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-900 mb-1">
              Development Environment Notice
            </h3>
            <p className="text-sm text-blue-700 mb-3">
              You're viewing the development preview. API endpoints are not
              available in this environment.
            </p>
            <a
              href="https://audit-dl0hvw.fly.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 text-sm text-blue-800 hover:text-blue-900 font-medium"
            >
              <span>View Live Application</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
