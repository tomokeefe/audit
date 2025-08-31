import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import AuditResults from "./pages/AuditResults";
import SharedAudit from "./pages/SharedAudit";
import Audits from "./pages/Audits";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/audit/:id" element={<AuditResults />} />
          <Route path="/share/audit/:id" element={<SharedAudit />} />
          <Route path="/audits" element={<Audits />} />
          <Route path="/reports" element={<Reports />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

// Prevent double root creation during HMR
const container = document.getElementById("root")!;
if (!container._reactRootContainer) {
  const root = createRoot(container);
  container._reactRootContainer = root;
  root.render(<App />);
} else {
  // In development with HMR, re-render on the existing root
  container._reactRootContainer.render(<App />);
}
