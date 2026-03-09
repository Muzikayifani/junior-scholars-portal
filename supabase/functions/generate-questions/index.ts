import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { assessment_id, subject_name, assessment_type, total_marks, num_questions } = await req.json();

    if (!assessment_id || !subject_name || !assessment_type) {
      throw new Error("Missing required fields: assessment_id, subject_name, assessment_type");
    }

    const questionCount = num_questions || 10;

    const prompt = `You are a South African CAPS curriculum education specialist. Generate exactly ${questionCount} questions for a ${assessment_type} in the subject "${subject_name}".

Requirements:
- Questions must be appropriate for the South African CAPS curriculum
- Create a mix: approximately 70% multiple choice (4 options each) and 30% true/false questions
- Questions should vary in difficulty (easy, medium, hard)
- Each question must be clear and unambiguous
- For multiple choice, provide exactly 4 options labeled A, B, C, D
- For true/false, options are just ["True", "False"]

You MUST respond using the generate_questions tool.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an expert education question generator for the South African CAPS curriculum." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_questions",
              description: "Generate assessment questions",
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question_text: { type: "string", description: "The question text" },
                        question_type: { type: "string", enum: ["multiple_choice", "true_false"] },
                        options: {
                          type: "array",
                          items: { type: "string" },
                          description: "Answer options. For multiple choice: 4 options. For true/false: ['True', 'False']"
                        },
                        correct_answer: { type: "string", description: "The correct answer text" },
                      },
                      required: ["question_text", "question_type", "options", "correct_answer"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["questions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_questions" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please add funds to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return structured questions");
    }

    const { questions } = JSON.parse(toolCall.function.arguments);

    // Insert questions into the database
    const questionsToInsert = questions.map((q: any, index: number) => ({
      assessment_id,
      question_text: q.question_text,
      question_type: q.question_type,
      options: q.options,
      correct_answer: q.correct_answer,
      order_index: index,
    }));

    const { data: insertedQuestions, error: insertError } = await supabase
      .from("assessment_questions")
      .insert(questionsToInsert)
      .select();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error(`Failed to save questions: ${insertError.message}`);
    }

    return new Response(JSON.stringify({ questions: insertedQuestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-questions error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
