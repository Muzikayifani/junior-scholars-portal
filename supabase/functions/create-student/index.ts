import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify the requesting user is a teacher
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Check if user is a teacher
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profileError || profile?.role !== 'teacher') {
      throw new Error('Only teachers can create students')
    }

    // Parse request body
    const { firstName, lastName, email, classId, studentNumber } = await req.json()

    if (!firstName || !lastName || !email || !classId) {
      throw new Error('Missing required fields')
    }

    // Generate a temporary password (students can reset it later)
    const tempPassword = `Student${Math.random().toString(36).slice(-8)}!`

    // Create auth user
    const { data: authUser, error: createUserError } = await supabaseClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role: 'learner'
      }
    })

    if (createUserError || !authUser.user) {
      console.error('Error creating auth user:', createUserError)
      throw new Error(`Failed to create auth user: ${createUserError?.message}`)
    }

    const newUserId = authUser.user.id

    // Profile should be created automatically by trigger, but let's verify
    // Wait a moment for the trigger to execute
    await new Promise(resolve => setTimeout(resolve, 500))

    // Check if profile was created by trigger
    const { data: existingProfile } = await supabaseClient
      .from('profiles')
      .select('user_id')
      .eq('user_id', newUserId)
      .maybeSingle()

    // If profile doesn't exist, create it manually
    if (!existingProfile) {
      const fullName = `${firstName} ${lastName}`
      const { error: profileInsertError } = await supabaseClient
        .from('profiles')
        .insert({
          user_id: newUserId,
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
          email: email,
          role: 'learner'
        })

      if (profileInsertError) {
        console.error('Profile insert error:', profileInsertError)
        throw new Error(`Failed to create profile: ${profileInsertError.message}`)
      }
    }

    // Create learner record
    const { data: newLearner, error: learnerError } = await supabaseClient
      .from('learners')
      .insert({
        user_id: newUserId,
        class_id: classId,
        student_number: studentNumber || null,
        enrollment_date: new Date().toISOString().split('T')[0],
        status: 'active'
      })
      .select('id')
      .single()

    if (learnerError) {
      console.error('Learner insert error:', learnerError)
      throw new Error(`Failed to create learner record: ${learnerError.message}`)
    }

    // Get all assessments for this class
    const { data: assessments, error: assessmentsError } = await supabaseClient
      .from('assessments')
      .select('id')
      .eq('class_id', classId)

    if (assessmentsError) {
      console.error('Error fetching assessments:', assessmentsError)
    }

    // Create result entries for all existing assessments
    if (assessments && assessments.length > 0) {
      const resultEntries = assessments.map(assessment => ({
        assessment_id: assessment.id,
        learner_id: newLearner.id,
        marks_obtained: 0,
        status: 'pending'
      }))

      const { error: resultsError } = await supabaseClient
        .from('results')
        .insert(resultEntries)

      if (resultsError) {
        console.error('Error creating result entries:', resultsError)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Student created successfully',
        data: {
          userId: newUserId,
          learnerId: newLearner.id,
          tempPassword // Return this so teacher can give it to student
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in create-student function:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
