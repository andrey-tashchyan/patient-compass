
-- Drop existing restrictive RLS policies
DROP POLICY IF EXISTS "Users can delete own patients" ON public.patients;
DROP POLICY IF EXISTS "Users can insert own patients" ON public.patients;
DROP POLICY IF EXISTS "Users can update own patients" ON public.patients;
DROP POLICY IF EXISTS "Users can view own patients" ON public.patients;

-- Create permissive public policies for demo
CREATE POLICY "Public read access" ON public.patients FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.patients FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.patients FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON public.patients FOR DELETE USING (true);
