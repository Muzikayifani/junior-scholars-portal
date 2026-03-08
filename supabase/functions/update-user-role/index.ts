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
      throw new Error("Only admins can change user roles");
    }

    const { user_id, new_role } = await req.json();

    if (!user_id || !new_role) {
      throw new Error("Missing required fields: user_id, new_role");
    }

    const validRoles = ["teacher", "learner", "parent", "admin"];
    if (!validRoles.includes(new_role)) {
      throw new Error("Invalid role. Must be one of: " + validRoles.join(", "));
    }

    // Prevent admin from removing their own admin role
    if (user_id === caller.id && new_role !== "admin") {
      throw new Error("You cannot remove your own admin role");
    }

    // Update profile role using service role (bypasses RLS and triggers)
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ role: new_role })
      .eq("user_id", user_id);

    if (updateError) throw updateError;

    // Also update auth user metadata
    const { error: metaError } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
      user_metadata: { role: new_role },
    });

    if (metaError) {
      console.error("Failed to update user metadata:", metaError);
    }

    return new Response(
      JSON.stringify({ success: true, message: `Role updated to ${new_role}` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
