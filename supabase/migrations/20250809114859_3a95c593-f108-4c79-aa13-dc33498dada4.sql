-- Create helper function to check teacher role without RLS recursion
create or replace function public.is_teacher(_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where user_id = _user and role = 'teacher'::user_role
  );
$$;

-- Learners: allow teachers to manage learners in their own classes
create policy if not exists "Teachers can insert learners into their classes"
  on public.learners
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.classes c
      join public.profiles p on p.id = c.teacher_id
      where c.id = class_id and p.user_id = auth.uid()
    )
  );

create policy if not exists "Teachers can update learners in their classes"
  on public.learners
  for update
  to authenticated
  using (
    exists (
      select 1 from public.classes c
      join public.profiles p on p.id = c.teacher_id
      where c.id = learners.class_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.classes c
      join public.profiles p on p.id = c.teacher_id
      where c.id = class_id and p.user_id = auth.uid()
    )
  );

create policy if not exists "Teachers can delete learners in their classes"
  on public.learners
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.classes c
      join public.profiles p on p.id = c.teacher_id
      where c.id = learners.class_id and p.user_id = auth.uid()
    )
  );

-- Profiles: allow teachers to create/update learner profiles
create policy if not exists "Teachers can create learner profiles"
  on public.profiles
  for insert
  to authenticated
  with check (
    public.is_teacher(auth.uid()) and role = 'learner'::user_role
  );

create policy if not exists "Teachers can update learner profiles"
  on public.profiles
  for update
  to authenticated
  using (
    public.is_teacher(auth.uid()) and role = 'learner'::user_role
  )
  with check (
    public.is_teacher(auth.uid()) and role = 'learner'::user_role
  );