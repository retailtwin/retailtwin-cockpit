import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DatasetProvider } from "@/contexts/DatasetContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ScrollToTop } from "./components/ScrollToTop";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Report from "./pages/Report";
import About from "./pages/About";
import Login from "./pages/Login";
import DataImport from "./pages/DataImport";
import Settings from "./pages/Settings";
import BlogList from "./pages/BlogList";
import BlogPost from "./pages/BlogPost";
import Impressum from "./pages/Impressum";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import DBMExplainer from "./pages/DBMExplainer";
import CaseStudyDK from "./pages/CaseStudyDK";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <DatasetProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login />} />
          <Route path="/blogs" element={<BlogList />} />
          <Route path="/blogs/:slug" element={<BlogPost />} />
          <Route path="/impressum" element={<Impressum />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/report" element={<ProtectedRoute><Report /></ProtectedRoute>} />
          <Route path="/import" element={<ProtectedRoute><DataImport /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/dbm-explainer" element={<ProtectedRoute><DBMExplainer /></ProtectedRoute>} />
          <Route path="/case-study/dk-company" element={<CaseStudyDK />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </DatasetProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
