import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const results: any = { 
      relationships_created: [], 
      assessments_created: [],
      results_created: [],
      errors: [] 
    };

    // Get existing parent
    const { data: parents, error: parentError } = await supabaseClient
      .from('profiles')
      .select('user_id, full_name, email')
      .eq('role', 'parent');

    if (parentError || !parents?.length) {
      throw new Error('No parent accounts found. Please create a parent first.');
    }

    // Get existing learners with their class info
    const { data: learners, error: learnerError } = await supabaseClient
      .from('learners')
      .select(`
        id,
        user_id,
        class_id,
        student_number,
        profile:profiles!fk_learners_user_id(full_name, email)
      `)
      .eq('status', 'active');

    if (learnerError || !learners?.length) {
      throw new Error('No learner accounts found. Please create learners first.');
    }

    console.log(`Found ${parents.length} parents and ${learners.length} learners`);

    // Check existing relationships
    const { data: existingRels } = await supabaseClient
      .from('parent_child_relationships')
      .select('parent_user_id, child_user_id');

    const existingRelSet = new Set(
      (existingRels || []).map(r => `${r.parent_user_id}-${r.child_user_id}`)
    );

    // Link each parent to available learners (distribute if multiple parents)
    for (let i = 0; i < learners.length; i++) {
      const learner = learners[i];
      const parent = parents[i % parents.length]; // Distribute learners among parents
      
      const relKey = `${parent.user_id}-${learner.user_id}`;
      
      if (!existingRelSet.has(relKey)) {
        const { error: linkError } = await supabaseClient
          .from('parent_child_relationships')
          .insert({
            parent_user_id: parent.user_id,
            child_user_id: learner.user_id,
            relationship_type: 'parent'
          });

        if (linkError) {
          console.error('Link error:', linkError);
          results.errors.push({ type: 'relationship', error: linkError.message });
        } else {
          results.relationships_created.push({
            parent: parent.full_name || parent.email,
            child: (learner.profile as any)?.full_name || 'Unknown',
            child_user_id: learner.user_id
          });
          console.log(`Linked ${parent.full_name} to ${(learner.profile as any)?.full_name}`);
        }
      } else {
        console.log(`Relationship already exists for ${parent.full_name}`);
      }
    }

    // Get subjects
    const { data: subjects } = await supabaseClient
      .from('subjects')
      .select('id, name')
      .limit(3);

    // Get classes with teachers
    const { data: classesWithTeachers } = await supabaseClient
      .from('classes')
      .select('id, name, teacher_id')
      .not('teacher_id', 'is', null);

    if (classesWithTeachers?.length && subjects?.length) {
      // Create test assessments for each learner's class
      for (const learner of learners) {
        const learnerClass = classesWithTeachers.find(c => c.id === learner.class_id);
        
        if (learnerClass) {
          // Check existing assessments for this class
          const { data: existingAssessments } = await supabaseClient
            .from('assessments')
            .select('id, title')
            .eq('class_id', learner.class_id);

          if (!existingAssessments?.length) {
            // Create sample assessments - use valid types from database constraint
            const assessmentTypes = ['assignment', 'quiz', 'test'];
            
            for (let i = 0; i < Math.min(3, subjects.length); i++) {
              const subject = subjects[i];
              const type = assessmentTypes[i];
              
              const { data: assessment, error: assessError } = await supabaseClient
                .from('assessments')
                .insert({
                  title: `${subject.name} ${type}`,
                  description: `Sample ${type.toLowerCase()} for ${subject.name}`,
                  type: type,
                  total_marks: type === 'Test' ? 100 : 50,
                  teacher_id: learnerClass.teacher_id,
                  subject_id: subject.id,
                  class_id: learner.class_id,
                  is_published: true,
                  due_date: new Date(Date.now() + (7 + i * 3) * 24 * 60 * 60 * 1000).toISOString()
                })
                .select()
                .single();

              if (assessError) {
                console.error('Assessment error:', assessError);
                results.errors.push({ type: 'assessment', error: assessError.message });
              } else if (assessment) {
                results.assessments_created.push({
                  title: assessment.title,
                  class: learnerClass.name
                });

                // Create graded result for this assessment
                const marksObtained = Math.floor(Math.random() * 30) + (type === 'Test' ? 60 : 30);
                
                const { error: resultError } = await supabaseClient
                  .from('results')
                  .insert({
                    assessment_id: assessment.id,
                    learner_id: learner.id,
                    marks_obtained: marksObtained,
                    status: 'graded',
                    feedback: `Good work on this ${type.toLowerCase()}!`,
                    graded_at: new Date().toISOString(),
                    submitted_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
                  });

                if (resultError) {
                  console.error('Result error:', resultError);
                  results.errors.push({ type: 'result', error: resultError.message });
                } else {
                  results.results_created.push({
                    assessment: assessment.title,
                    marks: marksObtained,
                    learner: (learner.profile as any)?.full_name
                  });
                }
              }
            }
          } else {
            console.log(`Assessments already exist for class ${learnerClass.name}`);
          }
        }
      }
    }

    // Create schedule entries if none exist
    const { data: existingSchedule } = await supabaseClient
      .from('class_schedule')
      .select('id')
      .limit(1);

    if (!existingSchedule?.length && classesWithTeachers?.length && subjects?.length) {
      const scheduleEntries = [];
      
      for (const cls of classesWithTeachers.slice(0, 1)) {
        for (let day = 1; day <= 5; day++) {
          const subject = subjects[day % subjects.length];
          scheduleEntries.push({
            class_id: cls.id,
            subject_id: subject.id,
            teacher_id: cls.teacher_id,
            day_of_week: day,
            start_time: `0${8 + day}:00:00`,
            end_time: `0${9 + day}:00:00`,
            room: `Room ${100 + day}`
          });
        }
      }

      if (scheduleEntries.length) {
        const { error: scheduleError } = await supabaseClient
          .from('class_schedule')
          .insert(scheduleEntries);

        if (scheduleError) {
          console.error('Schedule error:', scheduleError);
          results.errors.push({ type: 'schedule', error: scheduleError.message });
        } else {
          console.log('Created schedule entries');
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Parent-child relationships and test data seeded successfully',
        data: results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
