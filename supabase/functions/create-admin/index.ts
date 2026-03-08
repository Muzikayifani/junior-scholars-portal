import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const email = "admin@test.com";
    const password = "TestPass123!";

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: "System",
        last_name: "Admin",
        role: "admin",
      },
    });

    if (authError) {
      // If user already exists, just update role
      if (authError.message?.includes("already been registered")) {
        const { data: users } = await supabaseAdmin.auth.admin.listUsers();
        const existing = users?.users?.find((u: any) => u.email === email);
        if (existing) {
          await supabaseAdmin
            .from("profiles")
            .update({ role: "admin" })
            .eq("user_id", existing.id);
          return new Response(
            JSON.stringify({ success: true, message: "Admin role updated for existing user", email, password }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
      throw authError;
    }

    return new Response(
      JSON.stringify({ success: true, message: "Admin user created", email, password }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
