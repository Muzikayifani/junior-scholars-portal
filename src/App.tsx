import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ErrorBoundary from "@/components/ErrorBoundary";
import { lazy, Suspense } from "react";
import Layout from "./components/Layout";
import LoadingSpinner from "./components/LoadingSpinner";

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Settings = lazy(() => import("./pages/Settings"));
const MyClasses = lazy(() => import("./pages/MyClasses"));
const Assignments = lazy(() => import("./pages/Assignments"));
const Assessments = lazy(() => import("./pages/Assessments"));
const Results = lazy(() => import("./pages/Results"));
const Schedule = lazy(() => import("./pages/Schedule"));
const TeacherPortal = lazy(() => import("./components/teacher/TeacherPortal"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Communication = lazy(() => import("./pages/Communication"));
const Children = lazy(() => import("./pages/Children"));
const ProgressReports = lazy(() => import("./pages/ProgressReports"));

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
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
                <Route path="/teacher-portal" element={<Layout><TeacherPortal /></Layout>} />
                <Route path="/my-classes" element={<Layout><MyClasses /></Layout>} />
                <Route path="/assignments" element={<Layout><Assignments /></Layout>} />
                <Route path="/assessments" element={<Layout><Assessments /></Layout>} />
                <Route path="/results" element={<Layout><Results /></Layout>} />
                <Route path="/schedule" element={<Layout><Schedule /></Layout>} />
                <Route path="/children" element={<Layout><Children /></Layout>} />
                <Route path="/reports" element={<Layout><ProgressReports /></Layout>} />
                <Route path="/communication" element={<Layout><Communication /></Layout>} />
                <Route path="/classes" element={<Layout><MyClasses /></Layout>} />
                <Route path="/settings" element={<Layout><Settings /></Layout>} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
