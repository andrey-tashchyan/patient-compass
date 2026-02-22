-- Allow authenticated users to read from patient-evolution bucket
CREATE POLICY "Authenticated users can read evolution results"
ON storage.objects
FOR SELECT
USING (bucket_id = 'patient-evolution' AND auth.role() = 'authenticated');

-- Allow authenticated users to read from patient-evolution-data bucket  
CREATE POLICY "Authenticated users can read evolution data"
ON storage.objects
FOR SELECT
USING (bucket_id = 'patient-evolution-data' AND auth.role() = 'authenticated');