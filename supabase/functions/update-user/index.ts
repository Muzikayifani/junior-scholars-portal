import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !caller) throw new Error("Unauthorized");

    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("user_id", caller.id)
      .single();

    if (!callerProfile || callerProfile.role !== "admin") {
      throw new Error("Only admins can update user details");
    }

    const { user_id, first_name, last_name, email, phone, password } = await req.json();

    if (!user_id) {
      throw new Error("Missing required field: user_id");
    }

    // Update profile fields
    const profileUpdates: Record<string, any> = {};
    if (first_name !== undefined) {
      profileUpdates.first_name = first_name;
      profileUpdates.full_name = `${first_name} ${last_name || ''}`.trim();
    }
    if (last_name !== undefined) {
      profileUpdates.last_name = last_name;
      profileUpdates.full_name = `${first_name || ''} ${last_name}`.trim();
    }
    if (email !== undefined) profileUpdates.email = email;
    if (phone !== undefined) profileUpdates.phone = phone;

    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update(profileUpdates)
        .eq("user_id", user_id);
      if (profileError) throw profileError;
    }

    // Update auth user (email + password)
    const authUpdates: Record<string, any> = {};
    if (email !== undefined) authUpdates.email = email;
    if (password && password.length > 0) {
      if (password.length < 8) throw new Error("Password must be at least 8 characters");
      authUpdates.password = password;
    }

    if (Object.keys(authUpdates).length > 0) {
      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(user_id, authUpdates);
      if (authUpdateError) throw authUpdateError;
    }

    // Update user metadata
    if (first_name !== undefined || last_name !== undefined) {
      await supabaseAdmin.auth.admin.updateUserById(user_id, {
        user_metadata: {
          first_name: first_name,
          last_name: last_name,
        },
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: "User updated successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
