import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Users, Award } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import schoolLogo from '@/assets/school_logo.png';

const Index = () => {
  const { user } = useAuth();

  // Redirect to dashboard if already authenticated
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-4 py-8 sm:py-12 md:py-16">
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <div className="flex justify-center mb-4 sm:mb-6">
            <img src={schoolLogo} alt="E-School Logo" className="h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28 object-contain" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 px-2">E-School Portal</h1>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-6 sm:mb-8 px-4">
            A comprehensive learning management system designed for primary school learners, 
            parents, and teachers to track academic progress and manage educational activities.
          </p>
          <Button size="lg" asChild className="w-full sm:w-auto max-w-xs">
            <a href="/auth">Get Started</a>
          </Button>
        </div>

        <div className="grid gap-4 sm:gap-6 md:gap-8 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 max-w-4xl mx-auto mb-8 sm:mb-12 md:mb-16 px-2">
          <Card className="group cursor-pointer transition-all duration-300 hover:shadow-[0_0_20px_hsl(var(--orange-glow)/0.4)] hover:border-[hsl(var(--orange-glow))] hover:scale-105 relative overflow-hidden">
            {/* Animated sticks behind content */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute w-1 h-16 bg-[hsl(var(--orange-glow)/.3)] rounded-full animate-[float-stick-1_4s_ease-in-out_infinite] top-2 left-4 rotate-12" />
              <div className="absolute w-1.5 h-20 bg-[hsl(var(--orange-glow)/.25)] rounded-full animate-[float-stick-2_5s_ease-in-out_infinite] top-8 right-6 -rotate-15" />
              <div className="absolute w-1 h-14 bg-[hsl(var(--orange-glow)/.3)] rounded-full animate-[float-stick-3_3.5s_ease-in-out_infinite] bottom-4 left-1/3 rotate-45" />
              <div className="absolute w-1 h-12 bg-[hsl(var(--orange-glow)/.2)] rounded-full animate-[float-stick-1_4.5s_ease-in-out_infinite_0.5s] top-1/2 right-1/4 -rotate-30" />
              <div className="absolute w-1.5 h-18 bg-[hsl(var(--orange-glow)/.25)] rounded-full animate-[float-stick-2_3.8s_ease-in-out_infinite_1s] bottom-8 right-10 rotate-20" />
              <div className="absolute w-1 h-10 bg-[hsl(var(--orange-glow)/.3)] rounded-full animate-[float-stick-3_4.2s_ease-in-out_infinite_0.7s] top-4 left-1/2 -rotate-45" />
            </div>
            <CardHeader className="text-center relative z-10">
              <BookOpen className="h-12 w-12 text-primary mx-auto mb-4 group-hover:text-[hsl(var(--orange-glow))] transition-colors duration-300" />
              <CardTitle className="group-hover:text-[hsl(var(--orange-glow))] transition-colors duration-300">For Learners</CardTitle>
              <CardDescription>
                Access assignments, track progress, and view results
              </CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• View class assignments</li>
                <li>• Track homework and tests</li>
                <li>• Check grades and feedback</li>
                <li>• Manage class schedule</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="group cursor-pointer transition-all duration-300 hover:shadow-[0_0_20px_hsl(var(--orange-glow)/0.4)] hover:border-[hsl(var(--orange-glow))] hover:scale-105">
            <CardHeader className="text-center">
              <Users className="h-12 w-12 text-primary mx-auto mb-4 group-hover:text-[hsl(var(--orange-glow))] transition-colors duration-300" />
              <CardTitle className="group-hover:text-[hsl(var(--orange-glow))] transition-colors duration-300">For Parents</CardTitle>
              <CardDescription>
                Monitor your children's academic journey
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Track children's progress</li>
                <li>• View assessment results</li>
                <li>• Communicate with teachers</li>
                <li>• Access progress reports</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="group cursor-pointer transition-all duration-300 hover:shadow-[0_0_20px_hsl(var(--orange-glow)/0.4)] hover:border-[hsl(var(--orange-glow))] hover:scale-105">
            <CardHeader className="text-center">
              <Award className="h-12 w-12 text-primary mx-auto mb-4 group-hover:text-[hsl(var(--orange-glow))] transition-colors duration-300" />
              <CardTitle className="group-hover:text-[hsl(var(--orange-glow))] transition-colors duration-300">For Teachers</CardTitle>
              <CardDescription>
                Manage classes and assess student performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Create and manage assessments</li>
                <li>• Grade assignments and tests</li>
                <li>• Track class performance</li>
                <li>• Generate progress reports</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="text-center px-4">
          <p className="text-muted-foreground mb-4 text-sm sm:text-base">
            Ready to join the E-School community?
          </p>
          <Button variant="outline" size="lg" asChild className="w-full sm:w-auto max-w-xs">
            <a href="/auth">Sign In / Create Account</a>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
