
CREATE TABLE public.patients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  patient_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own patients"
  ON public.patients FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own patients"
  ON public.patients FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own patients"
  ON public.patients FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own patients"
  ON public.patients FOR DELETE
  USING (auth.uid() = user_id);
