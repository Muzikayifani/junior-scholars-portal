import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CreateAssessment from './CreateAssessment';
import ClassSchedule from './ClassSchedule';
import ManageStudents from './ManageStudents';
import ManageClasses from './ManageClasses';
import { BookOpen, Calendar, ClipboardList, Users, Award, Settings } from 'lucide-react';

const TeacherPortal = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAssessmentCreated = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Teacher Portal</h1>
        <p className="text-muted-foreground">Manage your classes, assessments, and schedule</p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Classes</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4</div>
            <p className="text-xs text-muted-foreground">Active classes</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">128</div>
            <p className="text-xs text-muted-foreground">Across all classes</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Grading</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-muted-foreground">Assignments to grade</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Performance</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87%</div>
            <p className="text-xs text-muted-foreground">Class average</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="assessments" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="assessments" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Assessments</span>
            <span className="sm:hidden">Tests</span>
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Schedule</span>
            <span className="sm:hidden">Time</span>
          </TabsTrigger>
          <TabsTrigger value="students" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Students</span>
            <span className="sm:hidden">Students</span>
          </TabsTrigger>
          <TabsTrigger value="classes" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Classes</span>
            <span className="sm:hidden">Classes</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="assessments" className="space-y-4">
          <CreateAssessment onAssessmentCreated={handleAssessmentCreated} />
        </TabsContent>
        
        <TabsContent value="schedule" className="space-y-4">
          <ClassSchedule />
        </TabsContent>
        
        <TabsContent value="students" className="space-y-4">
          <ManageStudents />
        </TabsContent>
        
        <TabsContent value="classes" className="space-y-4">
          <ManageClasses />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TeacherPortal;