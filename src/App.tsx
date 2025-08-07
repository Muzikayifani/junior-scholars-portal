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
import Settings from "./pages/Settings";
import MyClasses from "./pages/MyClasses";
import Assignments from "./pages/Assignments";
import Results from "./pages/Results";
import Schedule from "./pages/Schedule";
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
              <Route path="/my-classes" element={<Layout><MyClasses /></Layout>} />
              <Route path="/assignments" element={<Layout><Assignments /></Layout>} />
              <Route path="/results" element={<Layout><Results /></Layout>} />
              <Route path="/schedule" element={<Layout><Schedule /></Layout>} />
              <Route path="/children" element={<Layout><div className="animate-fade-in">My Children - Coming Soon</div></Layout>} />
              <Route path="/reports" element={<Layout><div className="animate-fade-in">Reports - Coming Soon</div></Layout>} />
              <Route path="/communication" element={<Layout><div className="animate-fade-in">Communication - Coming Soon</div></Layout>} />
              <Route path="/classes" element={<Layout><MyClasses /></Layout>} />
              <Route path="/settings" element={<Layout><Settings /></Layout>} />
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
