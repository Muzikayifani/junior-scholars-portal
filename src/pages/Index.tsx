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
      {/* Header with logo */}
      <header className="w-full py-4 sm:py-6 border-b bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 flex items-center justify-center gap-4">
          <img src={schoolLogo} alt="E-School Logo" className="h-16 w-auto sm:h-20 md:h-24 object-contain" />
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-primary">E-School</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 sm:py-12 md:py-16">
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-6 sm:mb-8 px-4">
            A comprehensive learning management system designed for Learners, 
            Parents, and Teachers to track academic progress and manage educational activities.
          </p>
          <Button size="lg" asChild className="w-full sm:w-auto max-w-xs">
            <a href="/auth">Get Started</a>
          </Button>
        </div>

        <div className="grid gap-4 sm:gap-6 md:gap-8 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 max-w-4xl mx-auto mb-8 sm:mb-12 md:mb-16 px-2">
          <Card className="group cursor-pointer transition-all duration-300 hover:shadow-[0_0_20px_hsl(var(--orange-glow)/0.4)] hover:border-[hsl(var(--orange-glow))] hover:scale-105 relative overflow-hidden">
            {/* Animated sticks behind content */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute w-2 h-16 bg-[hsl(var(--orange-glow)/.5)] rounded-full animate-[float-stick-1_4s_ease-in-out_infinite] top-2 left-4 rotate-12" />
              <div className="absolute w-2.5 h-20 bg-[hsl(var(--orange-glow)/.4)] rounded-full animate-[float-stick-2_5s_ease-in-out_infinite] top-8 right-6 -rotate-15" />
              <div className="absolute w-2 h-14 bg-[hsl(var(--orange-glow)/.5)] rounded-full animate-[float-stick-3_3.5s_ease-in-out_infinite] bottom-4 left-1/3 rotate-45" />
              <div className="absolute w-2 h-12 bg-[hsl(var(--orange-glow)/.35)] rounded-full animate-[float-stick-1_4.5s_ease-in-out_infinite_0.5s] top-1/2 right-1/4 -rotate-30" />
              <div className="absolute w-2.5 h-18 bg-[hsl(var(--orange-glow)/.4)] rounded-full animate-[float-stick-2_3.8s_ease-in-out_infinite_1s] bottom-8 right-10 rotate-20" />
              <div className="absolute w-2 h-10 bg-[hsl(var(--orange-glow)/.5)] rounded-full animate-[float-stick-3_4.2s_ease-in-out_infinite_0.7s] top-4 left-1/2 -rotate-45" />
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
                <li>• View and submit assignments</li>
                <li>• Track, submit homeworks</li>
                <li>• Check grades and feedback</li>
                <li>• View class schedule</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="group cursor-pointer transition-all duration-300 hover:shadow-[0_0_20px_hsl(var(--orange-glow)/0.4)] hover:border-[hsl(var(--orange-glow))] hover:scale-105 relative overflow-hidden">
            {/* Animated dots for Parents */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute w-3 h-3 bg-[hsl(var(--orange-glow)/.4)] rounded-full animate-[float-dot-1_3.5s_ease-in-out_infinite] top-4 left-6" />
              <div className="absolute w-2 h-2 bg-[hsl(var(--orange-glow)/.5)] rounded-full animate-[float-dot-2_4.2s_ease-in-out_infinite] top-12 right-8" />
              <div className="absolute w-3.5 h-3.5 bg-[hsl(var(--orange-glow)/.35)] rounded-full animate-[float-dot-1_5s_ease-in-out_infinite_0.8s] bottom-6 left-1/4" />
              <div className="absolute w-2.5 h-2.5 bg-[hsl(var(--orange-glow)/.45)] rounded-full animate-[float-dot-2_3.8s_ease-in-out_infinite_0.3s] top-1/3 right-1/3" />
              <div className="absolute w-2 h-2 bg-[hsl(var(--orange-glow)/.5)] rounded-full animate-[float-dot-1_4.5s_ease-in-out_infinite_1.2s] bottom-10 right-6" />
              <div className="absolute w-3 h-3 bg-[hsl(var(--orange-glow)/.3)] rounded-full animate-[float-dot-2_4s_ease-in-out_infinite_0.5s] top-6 left-1/2" />
            </div>
            <CardHeader className="text-center relative z-10">
              <Users className="h-12 w-12 text-primary mx-auto mb-4 group-hover:text-[hsl(var(--orange-glow))] transition-colors duration-300" />
              <CardTitle className="group-hover:text-[hsl(var(--orange-glow))] transition-colors duration-300">For Parents</CardTitle>
              <CardDescription>
                Monitor your children's academic journey
              </CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Track children's progress</li>
                <li>• View assessment results</li>
                <li>• Communicate with teachers</li>
                <li>• Access progress reports</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="group cursor-pointer transition-all duration-300 hover:shadow-[0_0_20px_hsl(var(--orange-glow)/0.4)] hover:border-[hsl(var(--orange-glow))] hover:scale-105 relative overflow-hidden">
            {/* Animated stars for Teachers */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute w-4 h-0.5 bg-[hsl(var(--orange-glow)/.45)] rounded-full animate-[float-star-1_4s_ease-in-out_infinite] top-6 left-5 rotate-45" />
              <div className="absolute w-0.5 h-4 bg-[hsl(var(--orange-glow)/.45)] rounded-full animate-[float-star-1_4s_ease-in-out_infinite] top-[calc(1.5rem-7px)] left-[calc(1.25rem+7px)] rotate-45" />
              <div className="absolute w-5 h-0.5 bg-[hsl(var(--orange-glow)/.4)] rounded-full animate-[float-star-2_5s_ease-in-out_infinite] top-14 right-8 -rotate-12" />
              <div className="absolute w-0.5 h-5 bg-[hsl(var(--orange-glow)/.4)] rounded-full animate-[float-star-2_5s_ease-in-out_infinite] top-[calc(3.5rem-10px)] right-[calc(2rem+10px)] -rotate-12" />
              <div className="absolute w-3 h-0.5 bg-[hsl(var(--orange-glow)/.5)] rounded-full animate-[float-star-1_3.5s_ease-in-out_infinite_0.6s] bottom-8 left-1/3 rotate-30" />
              <div className="absolute w-0.5 h-3 bg-[hsl(var(--orange-glow)/.5)] rounded-full animate-[float-star-1_3.5s_ease-in-out_infinite_0.6s] bottom-[calc(2rem-5px)] left-[calc(33%+5px)] rotate-30" />
              <div className="absolute w-4 h-0.5 bg-[hsl(var(--orange-glow)/.35)] rounded-full animate-[float-star-2_4.5s_ease-in-out_infinite_1s] top-1/2 right-1/4" />
              <div className="absolute w-0.5 h-4 bg-[hsl(var(--orange-glow)/.35)] rounded-full animate-[float-star-2_4.5s_ease-in-out_infinite_1s] top-[calc(50%-7px)] right-[calc(25%+7px)]" />
            </div>
            <CardHeader className="text-center relative z-10">
              <Award className="h-12 w-12 text-primary mx-auto mb-4 group-hover:text-[hsl(var(--orange-glow))] transition-colors duration-300" />
              <CardTitle className="group-hover:text-[hsl(var(--orange-glow))] transition-colors duration-300">For Teachers</CardTitle>
              <CardDescription>
                Manage classes and assess student performance
              </CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
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
