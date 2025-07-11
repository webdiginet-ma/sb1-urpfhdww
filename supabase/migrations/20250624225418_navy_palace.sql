/*
  # Storage RLS Policies for Mission Documents

  1. Storage Policies
    - Allow authenticated users with appropriate roles to upload files to mission-documents bucket
    - Allow authenticated users with appropriate roles to update files in mission-documents bucket
    - Allow authenticated users with appropriate roles to delete files from mission-documents bucket
    - Allow authenticated users to read files from mission-documents bucket based on mission access

  2. Security
    - Enable RLS on storage.objects table (should already be enabled)
    - Create policies for INSERT, UPDATE, DELETE, and SELECT operations
    - Restrict access based on user roles and mission ownership
*/

-- Policy for uploading files (INSERT)
CREATE POLICY "Allow experts and above to upload mission documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'mission-documents' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'expert') 
    AND is_active = true
  )
);

-- Policy for updating files (UPDATE)
CREATE POLICY "Allow experts and above to update mission documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'mission-documents' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'expert') 
    AND is_active = true
  )
)
WITH CHECK (
  bucket_id = 'mission-documents' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'expert') 
    AND is_active = true
  )
);

-- Policy for deleting files (DELETE)
CREATE POLICY "Allow experts and above to delete mission documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'mission-documents' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'expert') 
    AND is_active = true
  )
);

-- Policy for reading files (SELECT)
CREATE POLICY "Allow users to read mission documents based on access"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'mission-documents' AND
  (
    -- Super admins, admins, and experts can read all files
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'expert') 
      AND is_active = true
    )
    OR
    -- Constatateurs can read files for missions they are assigned to
    EXISTS (
      SELECT 1 FROM public.missions m
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE m.assigned_to = auth.uid()
      AND p.role = 'constateur'
      AND p.is_active = true
      AND storage.objects.name LIKE 'missions/' || m.id::text || '/%'
    )
  )
);

-- Create the mission-documents bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('mission-documents', 'mission-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Ensure the bucket has proper configuration
UPDATE storage.buckets 
SET 
  public = false,
  file_size_limit = 10485760, -- 10MB limit
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
WHERE id = 'mission-documents';