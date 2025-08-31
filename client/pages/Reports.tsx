import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";

export default function Reports() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <TrendingUp className="h-8 w-8 text-brand-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Analytics & Reports
          </h1>
          
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            This page will provide comprehensive analytics, trends, and detailed reporting 
            across all your brand audits.
          </p>
          
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Coming Soon</CardTitle>
              <CardDescription>
                Advanced analytics and reporting features are being developed. Track your 
                brand performance and improvements over time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <a href="/">Return to Dashboard</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
