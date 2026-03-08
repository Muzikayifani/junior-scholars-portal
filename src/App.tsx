import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "next-themes";
import ErrorBoundary from "@/components/ErrorBoundary";
import { lazy, Suspense } from "react";
import Layout from "./components/Layout";
import LoadingSpinner from "./components/LoadingSpinner";

const lazyRetry = (importFn: () => Promise<any>) =>
  lazy(() =>
    importFn().catch(() => {
      // Force reload on chunk load failure (stale cache)
      window.location.reload();
      return new Promise(() => {}); // never resolves, page will reload
    })
  );

const Index = lazyRetry(() => import("./pages/Index"));
const Auth = lazyRetry(() => import("./pages/Auth"));
const Dashboard = lazyRetry(() => import("./pages/Dashboard"));
const Settings = lazyRetry(() => import("./pages/Settings"));
const MyClasses = lazyRetry(() => import("./pages/MyClasses"));
const Assignments = lazyRetry(() => import("./pages/Assignments"));
const Assessments = lazyRetry(() => import("./pages/Assessments"));
const Results = lazyRetry(() => import("./pages/Results"));
const Schedule = lazyRetry(() => import("./pages/Schedule"));
const TeacherPortal = lazyRetry(() => import("./components/teacher/TeacherPortal"));
const NotFound = lazyRetry(() => import("./pages/NotFound"));
const Communication = lazyRetry(() => import("./pages/Communication"));
const Children = lazyRetry(() => import("./pages/Children"));
const ProgressReports = lazyRetry(() => import("./pages/ProgressReports"));
const Meetings = lazyRetry(() => import("./pages/Meetings"));
const Fees = lazyRetry(() => import("./pages/Fees"));
const Activity = lazyRetry(() => import("./pages/Activity"));
const AdminDashboard = lazyRetry(() => import("./pages/AdminDashboard"));

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
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
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
                <Route path="/meetings" element={<Layout><Meetings /></Layout>} />
                <Route path="/fees" element={<Layout><Fees /></Layout>} />
                <Route path="/activity" element={<Layout><Activity /></Layout>} />
                <Route path="/admin" element={<Layout><AdminDashboard /></Layout>} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
