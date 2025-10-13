import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Clock, MapPin, Users, BookOpen, Bell } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';

interface ScheduleItem {
  id: string;
  subject_name: string;
  class_name: string;
  teacher_name?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room?: string;
}

export default function Schedule() {
  const { profile, user, loading: authLoading } = useAuth();
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date()));

  const daysOfWeek = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ];

  useEffect(() => {
    if (profile && user) {
      fetchSchedule();
    }
  }, [profile, user]);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      
      if (profile?.role === 'teacher') {
        // Teachers see their teaching schedule
        const { data, error } = await supabase
          .from('class_schedule')
          .select(`
            id,
            day_of_week,
            start_time,
            end_time,
            room,
            subjects (name),
            classes (name)
          `)
          .eq('teacher_id', profile.user_id)
          .order('day_of_week')
          .order('start_time');

        if (error) throw error;
        
        const formattedData = data?.map(item => ({
          id: item.id,
          subject_name: item.subjects?.name || 'Unknown Subject',
          class_name: item.classes?.name || 'Unknown Class',
          day_of_week: item.day_of_week,
          start_time: item.start_time,
          end_time: item.end_time,
          room: item.room
        })) || [];
        
        setSchedule(formattedData);
      } else if (profile?.role === 'learner') {
        // Learners see their class schedule
        const { data: learnerData, error: learnerError } = await supabase
          .from('learners')
          .select('class_id')
          .eq('user_id', profile.user_id)
          .single();

        if (learnerError) throw learnerError;
        
        if (learnerData?.class_id) {
          const { data, error } = await supabase
            .from('class_schedule')
            .select(`
              id,
              day_of_week,
              start_time,
              end_time,
              room,
              subjects (name),
              classes (name)
            `)
            .eq('class_id', learnerData.class_id)
            .order('day_of_week')
            .order('start_time');

          if (error) throw error;
          
          const formattedData = data?.map(item => ({
            id: item.id,
            subject_name: item.subjects?.name || 'Unknown Subject',
            class_name: item.classes?.name || 'Unknown Class',
            teacher_name: 'Teacher', // Simplified
            day_of_week: item.day_of_week,
            start_time: item.start_time,
            end_time: item.end_time,
            room: item.room
          })) || [];
          
          setSchedule(formattedData);
        }
      }
    } catch (error: any) {
      console.error('Error fetching schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return 'N/A';
    
    // Handle both "HH:MM" and "HH:MM:SS" formats from database
    const parts = timeString.split(':');
    if (parts.length < 2) return timeString;
    
    const hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    
    if (isNaN(hours)) return timeString;
    
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHour}:${minutes} ${period}`;
  };

  const getScheduleForDay = (dayIndex: number) => {
    return schedule.filter(item => item.day_of_week === dayIndex);
  };

  const getTodaySchedule = () => {
    const today = new Date().getDay();
    return getScheduleForDay(today);
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  const todaySchedule = getTodaySchedule();
  const currentTime = new Date();
  const nextClass = todaySchedule.find(item => {
    if (!item.start_time) return false;
    
    const parts = item.start_time.split(':');
    if (parts.length < 2) return false;
    
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    
    if (isNaN(hours) || isNaN(minutes)) return false;
    
    const classTime = new Date();
    classTime.setHours(hours, minutes, 0, 0);
    return classTime > currentTime;
  });

  return (
    <div className="animate-fade-in p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Calendar className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Schedule</h1>
          <p className="text-muted-foreground">
            {profile?.role === 'teacher' 
              ? 'Your teaching schedule'
              : 'Your class schedule'
            }
          </p>
        </div>
      </div>

      {schedule.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Schedule Found</h3>
            <p className="text-muted-foreground">
              {profile?.role === 'teacher' 
                ? "You don't have any scheduled classes yet."
                : "No class schedule has been set up yet."
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Today's Schedule & Next Class */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card className="hover-lift">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  <CardTitle>Today's Schedule</CardTitle>
                </div>
                <CardDescription>
                  {format(new Date(), 'EEEE, MMMM d, yyyy')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {todaySchedule.length === 0 ? (
                  <p className="text-muted-foreground">No classes scheduled for today</p>
                ) : (
                  <div className="space-y-2">
                    {todaySchedule.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{item.subject_name}</p>
                          <p className="text-xs text-muted-foreground">{item.class_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {formatTime(item.start_time)} - {formatTime(item.end_time)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {todaySchedule.length > 3 && (
                      <p className="text-xs text-muted-foreground text-center pt-2">
                        +{todaySchedule.length - 3} more classes
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="hover-lift">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <CardTitle>Next Class</CardTitle>
                </div>
                <CardDescription>Coming up next</CardDescription>
              </CardHeader>
              <CardContent>
                {nextClass ? (
                  <div className="space-y-2">
                    <h3 className="font-semibold">{nextClass.subject_name}</h3>
                    <p className="text-sm text-muted-foreground">{nextClass.class_name}</p>
                    {nextClass.teacher_name && (
                      <p className="text-sm text-muted-foreground">
                        Teacher: {nextClass.teacher_name}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4" />
                      <span>{formatTime(nextClass.start_time)} - {formatTime(nextClass.end_time)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No more classes today</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="week" className="space-y-6">
            <TabsList>
              <TabsTrigger value="week">Weekly View</TabsTrigger>
              <TabsTrigger value="today">Today</TabsTrigger>
            </TabsList>
            
            <TabsContent value="week" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {daysOfWeek.slice(1, 6).map((day, index) => {
                  const dayIndex = index + 1; // Monday = 1, Friday = 5
                  const daySchedule = getScheduleForDay(dayIndex);
                  const isToday = isSameDay(addDays(currentWeek, dayIndex), new Date());
                  
                  return (
                    <Card key={day} className={`hover-lift ${isToday ? 'ring-2 ring-primary/20' : ''}`}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>{day}</span>
                          {isToday && <Badge variant="secondary">Today</Badge>}
                        </CardTitle>
                        <CardDescription>
                          {daySchedule.length} {daySchedule.length === 1 ? 'class' : 'classes'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {daySchedule.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No classes</p>
                        ) : (
                          daySchedule.map((item) => (
                            <div key={item.id} className="p-3 bg-muted/30 rounded-lg space-y-1">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium text-sm">{item.subject_name}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {formatTime(item.start_time)}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">{item.class_name}</p>
                              {item.teacher_name && (
                                <p className="text-xs text-muted-foreground">{item.teacher_name}</p>
                              )}
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>{formatTime(item.start_time)} - {formatTime(item.end_time)}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
            
            <TabsContent value="today" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {todaySchedule.map((item) => (
                  <Card key={item.id} className="hover-lift">
                    <CardHeader>
                      <CardTitle className="text-lg">{item.subject_name}</CardTitle>
                      <CardDescription>{item.class_name}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {item.teacher_name && (
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{item.teacher_name}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {formatTime(item.start_time)} - {formatTime(item.end_time)}
                        </span>
                      </div>

                      {item.room && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{item.room}</span>
                        </div>
                      )}
                      
                      <Button variant="outline" size="sm" className="w-full">
                        View Details
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}