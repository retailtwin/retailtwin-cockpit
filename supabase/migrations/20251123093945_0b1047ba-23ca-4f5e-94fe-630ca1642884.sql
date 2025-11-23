-- Phase 2: Create Storage buckets and policies for dataset files

-- Create storage bucket for dataset CSV files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dataset-files',
  'dataset-files',
  false,
  52428800, -- 50MB limit
  ARRAY['text/csv', 'application/vnd.ms-excel', 'application/csv']
);

-- RLS Policies for dataset-files bucket

-- Users can upload files to their own user folder
CREATE POLICY "Users can upload their own dataset files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'dataset-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can view their own files
CREATE POLICY "Users can view their own dataset files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'dataset-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can update their own files
CREATE POLICY "Users can update their own dataset files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'dataset-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own files
CREATE POLICY "Users can delete their own dataset files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'dataset-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Admins can manage all files
CREATE POLICY "Admins can manage all dataset files"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'dataset-files' 
  AND has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  bucket_id = 'dataset-files' 
  AND has_role(auth.uid(), 'admin'::app_role)
);