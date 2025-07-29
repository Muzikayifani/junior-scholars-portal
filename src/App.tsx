import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ErrorBoundary from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import TeacherPortal from "./components/teacher/TeacherPortal";
import Layout from "./components/Layout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
              <Route path="/teacher-portal" element={<Layout><TeacherPortal /></Layout>} />
              <Route path="/my-classes" element={<Layout><div className="animate-fade-in">My Classes - Coming Soon</div></Layout>} />
              <Route path="/assignments" element={<Layout><div className="animate-fade-in">Assignments - Coming Soon</div></Layout>} />
              <Route path="/results" element={<Layout><div className="animate-fade-in">Results - Coming Soon</div></Layout>} />
              <Route path="/schedule" element={<Layout><div className="animate-fade-in">Schedule - Coming Soon</div></Layout>} />
              <Route path="/children" element={<Layout><div className="animate-fade-in">My Children - Coming Soon</div></Layout>} />
              <Route path="/reports" element={<Layout><div className="animate-fade-in">Reports - Coming Soon</div></Layout>} />
              <Route path="/communication" element={<Layout><div className="animate-fade-in">Communication - Coming Soon</div></Layout>} />
              <Route path="/classes" element={<Layout><div className="animate-fade-in">My Classes - Coming Soon</div></Layout>} />
              <Route path="/create-assessment" element={<Layout><div className="animate-fade-in">Create Assessment - Coming Soon</div></Layout>} />
              <Route path="/grade-assessments" element={<Layout><div className="animate-fade-in">Grade Assessments - Coming Soon</div></Layout>} />
              <Route path="/subjects" element={<Layout><div className="animate-fade-in">Subjects - Coming Soon</div></Layout>} />
              <Route path="/settings" element={<Layout><div className="animate-fade-in">Settings - Coming Soon</div></Layout>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
