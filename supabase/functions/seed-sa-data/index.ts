import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// South African CAPS subjects by phase
const SA_SUBJECTS: Record<string, string[]> = {
  // Foundation Phase (Grade 1-3)
  foundation: [
    "Home Language",
    "First Additional Language",
    "Mathematics",
    "Life Skills",
  ],
  // Intermediate Phase (Grade 4-6)
  intermediate: [
    "Home Language",
    "First Additional Language",
    "Mathematics",
    "Natural Sciences and Technology",
    "Social Sciences",
    "Life Skills",
    "Creative Arts",
  ],
  // Senior Phase (Grade 7-9)
  senior: [
    "Home Language",
    "First Additional Language",
    "Mathematics",
    "Natural Sciences",
    "Social Sciences",
    "Technology",
    "Economic and Management Sciences",
    "Life Orientation",
    "Creative Arts",
  ],
  // FET Phase (Grade 10-12)
  fet: [
    "Home Language",
    "First Additional Language",
    "Mathematics",
    "Mathematical Literacy",
    "Life Orientation",
    "Physical Sciences",
    "Life Sciences",
    "Accounting",
    "Geography",
    "History",
    "Business Studies",
    "Computer Applications Technology",
  ],
};

function getPhase(grade: number): string {
  if (grade <= 3) return "foundation";
  if (grade <= 6) return "intermediate";
  if (grade <= 9) return "senior";
  return "fet";
}

function makeCode(name: string, index: number): string {
  const base = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 4);
  return `${base}${index}`;
}

// Schedule: spread subjects across Mon-Fri, 08:00-14:00 in 45-min slots
function buildSchedule(subjectIds: string[], classId: string, teacherId: string) {
  const rows: any[] = [];
  const rooms = ["A1", "A2", "B1", "B2", "C1", "Lab1", "Lab2", "Hall"];
  let slotIndex = 0;

  for (const subjectId of subjectIds) {
    const dayOfWeek = (slotIndex % 5) + 1; // 1=Mon … 5=Fri
    const periodInDay = Math.floor(slotIndex / 5) % 7;
    const startHour = 8 + Math.floor(periodInDay * 50 / 60);
    const startMin = (periodInDay * 50) % 60;
    const endMin = startMin + 45;
    const endHour = startHour + Math.floor(endMin / 60);

    rows.push({
      class_id: classId,
      subject_id: subjectId,
      teacher_id: teacherId,
      day_of_week: dayOfWeek,
      start_time: `${String(startHour).padStart(2, "0")}:${String(startMin % 60).padStart(2, "0")}`,
      end_time: `${String(endHour).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`,
      room: rooms[slotIndex % rooms.length],
    });
    slotIndex++;
  }
  return rows;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const log: string[] = [];
    const push = (msg: string) => { console.log(msg); log.push(msg); };

    // ── 1. CLEAR EXISTING DATA (order matters for FK) ──
    push("Clearing existing data...");
    await supabase.from("results").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("class_schedule").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("class_subjects").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("assessments").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("parent_child_relationships").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("messages").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("thread_participants").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("message_threads").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("learners").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("classes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("subjects").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("notification_preferences").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("profiles").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // Delete all existing auth users
    const { data: existingUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (existingUsers?.users) {
      for (const u of existingUsers.users) {
        await supabase.auth.admin.deleteUser(u.id);
      }
    }
    push("All existing data cleared.");

    // ── 2. CREATE AUTH USERS ──
    const password = "TestPass123!";

    const { data: teacherAuth, error: tErr } = await supabase.auth.admin.createUser({
      email: "teacher@test.com",
      password,
      email_confirm: true,
      user_metadata: { first_name: "Test", last_name: "Teacher", role: "teacher" },
    });
    if (tErr) throw new Error(`Teacher creation failed: ${tErr.message}`);
    push(`Teacher created: ${teacherAuth.user.id}`);

    const { data: learnerAuth, error: lErr } = await supabase.auth.admin.createUser({
      email: "learner@test.com",
      password,
      email_confirm: true,
      user_metadata: { first_name: "Test", last_name: "Learner", role: "learner" },
    });
    if (lErr) throw new Error(`Learner creation failed: ${lErr.message}`);
    push(`Learner created: ${learnerAuth.user.id}`);

    const { data: parentAuth, error: pErr } = await supabase.auth.admin.createUser({
      email: "parent@test.com",
      password,
      email_confirm: true,
      user_metadata: { first_name: "Test", last_name: "Parent", role: "parent" },
    });
    if (pErr) throw new Error(`Parent creation failed: ${pErr.message}`);
    push(`Parent created: ${parentAuth.user.id}`);

    const teacherId = teacherAuth.user.id;
    const learnerId = learnerAuth.user.id;
    const parentId = parentAuth.user.id;

    // ── 3. CREATE SUBJECTS (deduplicated across phases) ──
    push("Creating SA CAPS subjects...");
    const allSubjectNames = new Set<string>();
    Object.values(SA_SUBJECTS).forEach((list) => list.forEach((s) => allSubjectNames.add(s)));

    const subjectRows = [...allSubjectNames].map((name, i) => ({
      name,
      code: makeCode(name, i),
    }));

    const { data: subjectsData, error: subErr } = await supabase
      .from("subjects")
      .insert(subjectRows)
      .select();
    if (subErr) throw new Error(`Subject creation failed: ${subErr.message}`);

    const subjectMap: Record<string, string> = {};
    subjectsData.forEach((s: any) => { subjectMap[s.name] = s.id; });
    push(`${subjectsData.length} subjects created.`);

    // ── 4. CREATE CLASSES GRADE 1-12 ──
    push("Creating Grade 1-12 classes...");
    const classRows = [];
    for (let g = 1; g <= 12; g++) {
      classRows.push({
        name: `Grade ${g}`,
        grade_level: g,
        school_year: "2025-2026",
        teacher_id: g === 10 || g === 12 ? teacherId : null,
      });
    }

    const { data: classesData, error: clsErr } = await supabase
      .from("classes")
      .insert(classRows)
      .select();
    if (clsErr) throw new Error(`Class creation failed: ${clsErr.message}`);

    const classMap: Record<number, string> = {};
    classesData.forEach((c: any) => { classMap[c.grade_level] = c.id; });
    push("12 classes created.");

    // ── 5. LINK SUBJECTS TO CLASSES + CREATE SCHEDULES ──
    push("Linking subjects and creating schedules...");
    const allClassSubjects: any[] = [];
    const allSchedules: any[] = [];

    for (let g = 1; g <= 12; g++) {
      const phase = getPhase(g);
      const phaseSubjects = SA_SUBJECTS[phase];
      const classId = classMap[g];
      // For schedule, use teacher if assigned, otherwise use teacher as placeholder
      const schedTeacherId = (g === 10 || g === 12) ? teacherId : teacherId;

      const subjectIdsForClass: string[] = [];
      for (const subName of phaseSubjects) {
        const sid = subjectMap[subName];
        if (sid) {
          allClassSubjects.push({ class_id: classId, subject_id: sid });
          subjectIdsForClass.push(sid);
        }
      }

      allSchedules.push(...buildSchedule(subjectIdsForClass, classId, schedTeacherId));
    }

    // Insert class_subjects in batches
    for (let i = 0; i < allClassSubjects.length; i += 50) {
      const batch = allClassSubjects.slice(i, i + 50);
      const { error } = await supabase.from("class_subjects").insert(batch);
      if (error) push(`class_subjects batch error: ${error.message}`);
    }
    push(`${allClassSubjects.length} class-subject links created.`);

    // Insert schedules in batches
    for (let i = 0; i < allSchedules.length; i += 50) {
      const batch = allSchedules.slice(i, i + 50);
      const { error } = await supabase.from("class_schedule").insert(batch);
      if (error) push(`schedule batch error: ${error.message}`);
    }
    push(`${allSchedules.length} schedule entries created.`);

    // ── 6. ENROLL LEARNER IN GRADE 10 ──
    push("Enrolling learner in Grade 10...");
    const { error: enrollErr } = await supabase.from("learners").insert({
      user_id: learnerId,
      class_id: classMap[10],
      student_number: "SA2025001",
    });
    if (enrollErr) push(`Enrollment error: ${enrollErr.message}`);
    else push("Learner enrolled in Grade 10.");

    // ── 7. LINK PARENT TO LEARNER ──
    push("Linking parent to learner...");
    const { error: linkErr } = await supabase.from("parent_child_relationships").insert({
      parent_user_id: parentId,
      child_user_id: learnerId,
      relationship_type: "parent",
    });
    if (linkErr) push(`Parent link error: ${linkErr.message}`);
    else push("Parent linked to learner.");

    push("✅ Seed complete!");

    return new Response(
      JSON.stringify({
        success: true,
        message: "SA test data seeded successfully",
        credentials: { email_teacher: "teacher@test.com", email_learner: "learner@test.com", email_parent: "parent@test.com", password },
        log,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Seed error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
