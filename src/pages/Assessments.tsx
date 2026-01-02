import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import AssessmentManagement from '@/components/teacher/AssessmentManagement';
import CreateAssessment from '@/components/teacher/CreateAssessment';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function Assessments() {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  // Redirect non-teachers to assignments page
  if (profile?.role !== 'teacher') {
    return <Navigate to="/assignments" replace />;
  }

  return (
    <div className="animate-fade-in p-3 sm:p-4 md:p-6">
      <Tabs defaultValue="manage" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="manage">Manage</TabsTrigger>
          <TabsTrigger value="create">Create New</TabsTrigger>
        </TabsList>

        <TabsContent value="manage">
          <AssessmentManagement />
        </TabsContent>

        <TabsContent value="create">
          <CreateAssessment />
        </TabsContent>
      </Tabs>
    </div>
  );
}
