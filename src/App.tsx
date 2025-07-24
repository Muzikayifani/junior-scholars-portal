import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import TeacherPortal from "./components/teacher/TeacherPortal";
import Layout from "./components/Layout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
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
            <Route path="/my-classes" element={<Layout><div>My Classes - Coming Soon</div></Layout>} />
            <Route path="/assignments" element={<Layout><div>Assignments - Coming Soon</div></Layout>} />
            <Route path="/results" element={<Layout><div>Results - Coming Soon</div></Layout>} />
            <Route path="/schedule" element={<Layout><div>Schedule - Coming Soon</div></Layout>} />
            <Route path="/children" element={<Layout><div>My Children - Coming Soon</div></Layout>} />
            <Route path="/reports" element={<Layout><div>Reports - Coming Soon</div></Layout>} />
            <Route path="/communication" element={<Layout><div>Communication - Coming Soon</div></Layout>} />
            <Route path="/classes" element={<Layout><div>My Classes - Coming Soon</div></Layout>} />
            <Route path="/create-assessment" element={<Layout><div>Create Assessment - Coming Soon</div></Layout>} />
            <Route path="/grade-assessments" element={<Layout><div>Grade Assessments - Coming Soon</div></Layout>} />
            <Route path="/subjects" element={<Layout><div>Subjects - Coming Soon</div></Layout>} />
            <Route path="/settings" element={<Layout><div>Settings - Coming Soon</div></Layout>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
