import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface SearchResult {
  id: string;
  type: 'assignment' | 'result' | 'class' | 'student' | 'message';
  title: string;
  subtitle?: string;
  url: string;
}

export const useGlobalSearch = () => {
  const { profile, user } = useAuth();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const search = useCallback(async (query: string) => {
    if (!query.trim() || !user?.id) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    const searchResults: SearchResult[] = [];
    const searchTerm = `%${query.toLowerCase()}%`;

    try {
      if (profile?.role === 'learner') {
        // Search assignments
        const { data: learnerData } = await supabase
          .from('learners')
          .select('class_id')
          .eq('user_id', user.id)
          .eq('status', 'active');

        const classIds = learnerData?.map(l => l.class_id) || [];

        if (classIds.length > 0) {
          const { data: assessments } = await supabase
            .from('assessments')
            .select('id, title, type, due_date')
            .in('class_id', classIds)
            .eq('is_published', true)
            .ilike('title', searchTerm)
            .limit(5);

          assessments?.forEach(a => {
            searchResults.push({
              id: a.id,
              type: 'assignment',
              title: a.title,
              subtitle: `${a.type}${a.due_date ? ` • Due ${new Date(a.due_date).toLocaleDateString()}` : ''}`,
              url: '/assignments',
            });
          });
        }

        // Search results/grades
        const { data: learnerIds } = await supabase
          .from('learners')
          .select('id')
          .eq('user_id', user.id);

        if (learnerIds && learnerIds.length > 0) {
          const { data: resultsData } = await supabase
            .from('results')
            .select('id, marks_obtained, assessment:assessments(id, title, total_marks)')
            .in('learner_id', learnerIds.map(l => l.id))
            .eq('status', 'graded')
            .limit(5);

          resultsData?.forEach(r => {
            const assessment = r.assessment as any;
            if (assessment?.title?.toLowerCase().includes(query.toLowerCase())) {
              searchResults.push({
                id: r.id,
                type: 'result',
                title: assessment.title,
                subtitle: `Score: ${Math.round((r.marks_obtained / assessment.total_marks) * 100)}%`,
                url: '/results',
              });
            }
          });
        }
      }

      if (profile?.role === 'teacher') {
        // Search assessments
        const { data: assessments } = await supabase
          .from('assessments')
          .select('id, title, type')
          .eq('teacher_id', user.id)
          .ilike('title', searchTerm)
          .limit(5);

        assessments?.forEach(a => {
          searchResults.push({
            id: a.id,
            type: 'assignment',
            title: a.title,
            subtitle: a.type,
            url: '/assessments',
          });
        });

        // Search classes
        const { data: classes } = await supabase
          .from('classes')
          .select('id, name, grade_level')
          .eq('teacher_id', user.id)
          .ilike('name', searchTerm)
          .limit(5);

        classes?.forEach(c => {
          searchResults.push({
            id: c.id,
            type: 'class',
            title: c.name,
            subtitle: `Grade ${c.grade_level}`,
            url: '/classes',
          });
        });

        // Search students
        const { data: teacherClasses } = await supabase
          .from('classes')
          .select('id')
          .eq('teacher_id', user.id);

        if (teacherClasses && teacherClasses.length > 0) {
          const { data: students } = await supabase
            .from('learners')
            .select('id, user_id, profile:profiles!fk_learners_user_id(full_name)')
            .in('class_id', teacherClasses.map(c => c.id))
            .limit(10);

          students?.forEach(s => {
            const profile = s.profile as any;
            if (profile?.full_name?.toLowerCase().includes(query.toLowerCase())) {
              searchResults.push({
                id: s.id,
                type: 'student',
                title: profile.full_name,
                subtitle: 'Student',
                url: '/teacher-portal',
              });
            }
          });
        }
      }

      if (profile?.role === 'parent') {
        // Search children's data
        const { data: relationships } = await supabase
          .from('parent_child_relationships')
          .select('child_user_id')
          .eq('parent_user_id', user.id);

        const childIds = relationships?.map(r => r.child_user_id) || [];

        if (childIds.length > 0) {
          // Search children's profiles
          const { data: children } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', childIds)
            .ilike('full_name', searchTerm)
            .limit(5);

          children?.forEach(c => {
            searchResults.push({
              id: c.user_id,
              type: 'student',
              title: c.full_name || 'Child',
              subtitle: 'Your child',
              url: `/children`,
            });
          });
        }
      }

      // Search messages for all roles
      const { data: threads } = await supabase
        .from('thread_participants')
        .select('thread_id')
        .eq('user_id', user.id);

      if (threads && threads.length > 0) {
        const { data: messages } = await supabase
          .from('messages')
          .select('id, content, thread_id')
          .in('thread_id', threads.map(t => t.thread_id))
          .ilike('content', searchTerm)
          .limit(3);

        messages?.forEach(m => {
          searchResults.push({
            id: m.id,
            type: 'message',
            title: 'Message',
            subtitle: m.content.substring(0, 50) + (m.content.length > 50 ? '...' : ''),
            url: '/communication',
          });
        });
      }

      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, [user?.id, profile?.role]);

  const clearResults = useCallback(() => {
    setResults([]);
  }, []);

  return {
    results,
    isSearching,
    search,
    clearResults,
  };
};
