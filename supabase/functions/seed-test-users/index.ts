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

    const testPassword = 'TestPass123!';
    const results: any = { users: [], errors: [] };

    // Create Teacher
    console.log('Creating teacher user...');
    const { data: teacherAuth, error: teacherError } = await supabaseClient.auth.admin.createUser({
      email: 'teacher@test.com',
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        first_name: 'Test',
        last_name: 'Teacher',
        role: 'teacher'
      }
    });

    if (teacherError) {
      console.error('Teacher creation error:', teacherError);
      results.errors.push({ type: 'teacher', error: teacherError.message });
    } else {
      results.users.push({ role: 'teacher', email: 'teacher@test.com', password: testPassword });
      console.log('Teacher created:', teacherAuth.user.id);
    }

    // Create Learner
    console.log('Creating learner user...');
    const { data: learnerAuth, error: learnerError } = await supabaseClient.auth.admin.createUser({
      email: 'learner@test.com',
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        first_name: 'Test',
        last_name: 'Learner',
        role: 'learner'
      }
    });

    if (learnerError) {
      console.error('Learner creation error:', learnerError);
      results.errors.push({ type: 'learner', error: learnerError.message });
    } else {
      results.users.push({ role: 'learner', email: 'learner@test.com', password: testPassword });
      console.log('Learner created:', learnerAuth.user.id);
    }

    // Create Parent
    console.log('Creating parent user...');
    const { data: parentAuth, error: parentError } = await supabaseClient.auth.admin.createUser({
      email: 'parent@test.com',
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        first_name: 'Test',
        last_name: 'Parent',
        role: 'parent'
      }
    });

    if (parentError) {
      console.error('Parent creation error:', parentError);
      results.errors.push({ type: 'parent', error: parentError.message });
    } else {
      results.users.push({ role: 'parent', email: 'parent@test.com', password: testPassword });
      console.log('Parent created:', parentAuth.user.id);
    }

    // If all users created successfully, set up relationships
    if (teacherAuth?.user && learnerAuth?.user && parentAuth?.user) {
      // Create a class for the teacher
      console.log('Creating test class...');
      const { data: classData, error: classError } = await supabaseClient
        .from('classes')
        .insert({
          name: 'Test Class',
          grade_level: 5,
          school_year: '2024-2025',
          teacher_id: teacherAuth.user.id
        })
        .select()
        .single();

      if (classError) {
        console.error('Class creation error:', classError);
        results.errors.push({ type: 'class', error: classError.message });
      } else {
        console.log('Class created:', classData.id);

        // Enroll learner in the class
        const { error: enrollError } = await supabaseClient
          .from('learners')
          .insert({
            user_id: learnerAuth.user.id,
            class_id: classData.id,
            student_number: 'STU001'
          });

        if (enrollError) {
          console.error('Enrollment error:', enrollError);
          results.errors.push({ type: 'enrollment', error: enrollError.message });
        } else {
          console.log('Learner enrolled in class');
        }
      }

      // Link parent to learner
      console.log('Linking parent to learner...');
      const { error: linkError } = await supabaseClient
        .from('parent_child_relationships')
        .insert({
          parent_user_id: parentAuth.user.id,
          child_user_id: learnerAuth.user.id,
          relationship_type: 'parent'
        });

      if (linkError) {
        console.error('Parent-child link error:', linkError);
        results.errors.push({ type: 'parent_link', error: linkError.message });
      } else {
        console.log('Parent linked to learner');
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test users created successfully',
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
