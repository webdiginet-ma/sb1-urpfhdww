/*
  # Fix Materials RLS Policies for Constateur Users

  This migration updates the Row Level Security policies for the materials table
  to allow constateur users to create, read, update, and delete materials
  for missions that are assigned to them.

  ## Changes Made

  1. **Updated INSERT Policy**: Allow constateurs to create materials for buildings
     that belong to missions assigned to them (draft, assigned, in_progress status)

  2. **Updated UPDATE Policy**: Allow constateurs to update materials they created
     or materials in buildings of their assigned missions

  3. **Updated DELETE Policy**: Allow constateurs to delete materials they created
     for buildings in their assigned missions

  4. **Maintained existing permissions**: Super admins, admins, and experts retain
     their existing permissions

  ## Security

  - Constateurs can only manage materials for missions assigned to them
  - Materials must be associated with buildings that belong to their missions
  - Mission status must be draft, assigned, or in_progress
  - Maintains data integrity and proper access control
*/

-- Drop existing materials RLS policies
DROP POLICY IF EXISTS "Experts and above can create materials" ON public.materials;
DROP POLICY IF EXISTS "All authenticated users can read active materials" ON public.materials;
DROP POLICY IF EXISTS "Admins and above can read all materials" ON public.materials;
DROP POLICY IF EXISTS "Experts and above can update materials" ON public.materials;
DROP POLICY IF EXISTS "Admins and above can delete materials" ON public.materials;

-- Create comprehensive INSERT policy for materials
CREATE POLICY "Allow creating materials based on role and mission access"
ON public.materials
FOR INSERT
TO authenticated
WITH CHECK (
  -- Super admins, admins, and experts can create materials for any building
  (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('super_admin', 'admin', 'expert')
    AND profiles.is_active = true
  ))
  OR
  -- Constateurs can create materials for buildings in their assigned missions
  (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'constateur'
      AND profiles.is_active = true
    )
    AND
    EXISTS (
      SELECT 1 
      FROM public.mission_buildings mb
      JOIN public.missions m ON m.id = mb.mission_id
      WHERE mb.building_id = materials.building_id
      AND m.assigned_to = auth.uid()
      AND m.status IN ('draft', 'assigned', 'in_progress')
    )
  )
);

-- Create comprehensive SELECT policy for materials
CREATE POLICY "Allow reading materials based on role and access"
ON public.materials
FOR SELECT
TO authenticated
USING (
  -- All authenticated users can read active materials (basic visibility)
  (materials.is_active = true)
  OR
  -- Super admins, admins, and experts can read all materials
  (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('super_admin', 'admin', 'expert')
    AND profiles.is_active = true
  ))
  OR
  -- Constateurs can read materials in buildings of their assigned missions
  (EXISTS (
    SELECT 1 
    FROM public.mission_buildings mb
    JOIN public.missions m ON m.id = mb.mission_id
    WHERE mb.building_id = materials.building_id
    AND m.assigned_to = auth.uid()
  ))
);

-- Create comprehensive UPDATE policy for materials
CREATE POLICY "Allow updating materials based on role and access"
ON public.materials
FOR UPDATE
TO authenticated
USING (
  -- Super admins, admins, and experts can update all materials
  (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('super_admin', 'admin', 'expert')
    AND profiles.is_active = true
  ))
  OR
  -- Constateurs can update materials they created in their assigned missions
  (
    materials.created_by = auth.uid()
    AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'constateur'
      AND profiles.is_active = true
    )
    AND
    EXISTS (
      SELECT 1 
      FROM public.mission_buildings mb
      JOIN public.missions m ON m.id = mb.mission_id
      WHERE mb.building_id = materials.building_id
      AND m.assigned_to = auth.uid()
      AND m.status IN ('draft', 'assigned', 'in_progress')
    )
  )
)
WITH CHECK (
  -- Same conditions for the updated row
  (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('super_admin', 'admin', 'expert')
    AND profiles.is_active = true
  ))
  OR
  (
    materials.created_by = auth.uid()
    AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'constateur'
      AND profiles.is_active = true
    )
    AND
    EXISTS (
      SELECT 1 
      FROM public.mission_buildings mb
      JOIN public.missions m ON m.id = mb.mission_id
      WHERE mb.building_id = materials.building_id
      AND m.assigned_to = auth.uid()
      AND m.status IN ('draft', 'assigned', 'in_progress')
    )
  )
);

-- Create comprehensive DELETE policy for materials
CREATE POLICY "Allow deleting materials based on role and access"
ON public.materials
FOR DELETE
TO authenticated
USING (
  -- Super admins and admins can delete any materials
  (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('super_admin', 'admin')
    AND profiles.is_active = true
  ))
  OR
  -- Experts can delete materials they created
  (
    materials.created_by = auth.uid()
    AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'expert'
      AND profiles.is_active = true
    )
  )
  OR
  -- Constateurs can delete materials they created in their assigned missions
  (
    materials.created_by = auth.uid()
    AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'constateur'
      AND profiles.is_active = true
    )
    AND
    EXISTS (
      SELECT 1 
      FROM public.mission_buildings mb
      JOIN public.missions m ON m.id = mb.mission_id
      WHERE mb.building_id = materials.building_id
      AND m.assigned_to = auth.uid()
      AND m.status IN ('draft', 'assigned', 'in_progress')
    )
  )
);

-- Create debug function for materials access (for testing purposes)
CREATE OR REPLACE FUNCTION debug_materials_access(
  p_building_id uuid,
  p_material_id uuid DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  user_role text,
  user_active boolean,
  building_exists boolean,
  assigned_missions_count integer,
  can_insert boolean,
  can_update boolean,
  can_delete boolean,
  policy_explanation text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_role text;
  v_user_active boolean;
  v_building_exists boolean := false;
  v_assigned_missions_count integer := 0;
  v_can_insert boolean := false;
  v_can_update boolean := false;
  v_can_delete boolean := false;
  v_explanation text := '';
  v_material_created_by uuid;
BEGIN
  -- Get user info
  SELECT p.role, p.is_active 
  INTO v_user_role, v_user_active
  FROM public.profiles p 
  WHERE p.id = v_user_id;

  -- Check if building exists
  SELECT EXISTS(SELECT 1 FROM public.buildings WHERE id = p_building_id)
  INTO v_building_exists;

  -- Count assigned missions for this building
  SELECT COUNT(*)
  INTO v_assigned_missions_count
  FROM public.mission_buildings mb
  JOIN public.missions m ON m.id = mb.mission_id
  WHERE mb.building_id = p_building_id
  AND m.assigned_to = v_user_id
  AND m.status IN ('draft', 'assigned', 'in_progress');

  -- Get material creator if material_id is provided
  IF p_material_id IS NOT NULL THEN
    SELECT created_by INTO v_material_created_by
    FROM public.materials WHERE id = p_material_id;
  END IF;

  -- Check permissions
  IF v_user_role IN ('super_admin', 'admin', 'expert') AND v_user_active = true THEN
    v_can_insert := true;
    v_can_update := true;
    v_can_delete := true;
    v_explanation := 'User has elevated role (' || v_user_role || ') with active status';
  ELSIF v_user_role = 'constateur' AND v_user_active = true AND v_assigned_missions_count > 0 THEN
    v_can_insert := true;
    v_can_update := (p_material_id IS NULL OR v_material_created_by = v_user_id);
    v_can_delete := (p_material_id IS NULL OR v_material_created_by = v_user_id);
    v_explanation := 'Constateur with ' || v_assigned_missions_count || ' assigned mission(s) for this building';
  ELSE
    v_explanation := 'User does not meet policy conditions. Role: ' || COALESCE(v_user_role, 'NULL') || 
                    ', Active: ' || COALESCE(v_user_active::text, 'NULL') || 
                    ', Assigned missions: ' || v_assigned_missions_count;
  END IF;

  RETURN QUERY
  SELECT 
    v_user_id,
    v_user_role,
    v_user_active,
    v_building_exists,
    v_assigned_missions_count,
    v_can_insert,
    v_can_update,
    v_can_delete,
    v_explanation;
END;
$$;

-- Log the migration completion
DO $$
BEGIN
  RAISE NOTICE '✅ Materials RLS policies updated successfully';
  RAISE NOTICE '🔧 Constateurs can now manage materials for their assigned missions';
  RAISE NOTICE '📝 Materials access allowed for missions with status: draft, assigned, in_progress';
  RAISE NOTICE '🧪 Debug function available: debug_materials_access(building_id, material_id)';
  RAISE NOTICE '🧹 Remember to drop debug function after testing: DROP FUNCTION debug_materials_access;';
  RAISE NOTICE '🎯 Test with: SELECT * FROM debug_materials_access(''your-building-id'');';
END $$;