/*
  # Fix Buildings RLS Policies for Expert Isolation

  This migration updates the Row Level Security policies for the buildings table
  to ensure that experts can only see and manage buildings they have created,
  similar to the mission isolation we implemented.

  ## Changes Made

  1. **Updated SELECT Policy**: Restrict experts to only see buildings they created
     - Super admins and admins can see all buildings
     - Experts can only see buildings where created_by = auth.uid()
     - Constatateurs can see buildings associated with their assigned missions

  2. **Updated INSERT Policy**: Ensure proper created_by assignment
     - All authenticated users can create buildings
     - The created_by field must be set to auth.uid()

  3. **Updated UPDATE Policy**: Restrict modification based on ownership
     - Super admins and admins can update all buildings
     - Experts can only update buildings they created
     - Constatateurs can update buildings they created for their assigned missions

  4. **Updated DELETE Policy**: Restrict deletion based on ownership and role
     - Super admins and admins can delete all buildings
     - Experts can delete buildings they created
     - Constatateurs can delete buildings they created for their assigned missions

  ## Security

  - Maintains proper role-based access control
  - Ensures experts only see their own buildings
  - Preserves data integrity through proper ownership checks
  - Allows constatateurs to work with buildings in their assigned missions
*/

-- Drop all existing buildings RLS policies
DROP POLICY IF EXISTS "Authenticated users can create buildings" ON public.buildings;
DROP POLICY IF EXISTS "All authenticated users can read active buildings" ON public.buildings;
DROP POLICY IF EXISTS "Experts and above can read all buildings" ON public.buildings;
DROP POLICY IF EXISTS "Authenticated users can update buildings" ON public.buildings;
DROP POLICY IF EXISTS "Super admins can delete buildings" ON public.buildings;

-- Create comprehensive SELECT policy for buildings
CREATE POLICY "Users can read buildings based on role and ownership"
ON public.buildings
FOR SELECT
TO authenticated
USING (
  -- Super admins and admins can read all buildings
  (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('super_admin', 'admin')
    AND profiles.is_active = true
  ))
  OR
  -- Experts can only read buildings they created
  (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'expert'
    AND profiles.is_active = true
  ) AND buildings.created_by = auth.uid())
  OR
  -- Constatateurs can read buildings associated with their assigned missions
  (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'constateur'
    AND profiles.is_active = true
  ) AND EXISTS (
    SELECT 1 
    FROM public.mission_buildings mb
    JOIN public.missions m ON m.id = mb.mission_id
    WHERE mb.building_id = buildings.id
    AND m.assigned_to = auth.uid()
  ))
);

-- Create comprehensive INSERT policy for buildings
CREATE POLICY "Allow creating buildings based on role with proper ownership"
ON public.buildings
FOR INSERT
TO authenticated
WITH CHECK (
  -- All authenticated active users can create buildings
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('super_admin', 'admin', 'expert', 'constateur')
    AND profiles.is_active = true
  )
  -- Ensure created_by is set to the current user
  AND buildings.created_by = auth.uid()
);

-- Create comprehensive UPDATE policy for buildings
CREATE POLICY "Allow updating buildings based on role and ownership"
ON public.buildings
FOR UPDATE
TO authenticated
USING (
  -- Super admins and admins can update all buildings
  (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('super_admin', 'admin')
    AND profiles.is_active = true
  ))
  OR
  -- Experts can only update buildings they created
  (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'expert'
    AND profiles.is_active = true
  ) AND buildings.created_by = auth.uid())
  OR
  -- Constatateurs can update buildings they created for their assigned missions
  (
    buildings.created_by = auth.uid()
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
      WHERE mb.building_id = buildings.id
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
    AND profiles.role IN ('super_admin', 'admin')
    AND profiles.is_active = true
  ))
  OR
  (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'expert'
    AND profiles.is_active = true
  ) AND buildings.created_by = auth.uid())
  OR
  (
    buildings.created_by = auth.uid()
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
      WHERE mb.building_id = buildings.id
      AND m.assigned_to = auth.uid()
      AND m.status IN ('draft', 'assigned', 'in_progress')
    )
  )
);

-- Create comprehensive DELETE policy for buildings
CREATE POLICY "Allow deleting buildings based on role and ownership"
ON public.buildings
FOR DELETE
TO authenticated
USING (
  -- Super admins and admins can delete all buildings
  (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('super_admin', 'admin')
    AND profiles.is_active = true
  ))
  OR
  -- Experts can delete buildings they created
  (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'expert'
    AND profiles.is_active = true
  ) AND buildings.created_by = auth.uid())
  OR
  -- Constatateurs can delete buildings they created for their assigned missions
  (
    buildings.created_by = auth.uid()
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
      WHERE mb.building_id = buildings.id
      AND m.assigned_to = auth.uid()
      AND m.status IN ('draft', 'assigned', 'in_progress')
    )
  )
);

-- Create debug function for buildings access (for testing purposes)
CREATE OR REPLACE FUNCTION debug_buildings_access(
  p_building_id uuid DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  user_role text,
  user_active boolean,
  total_buildings_visible integer,
  buildings_created_by_user integer,
  buildings_in_assigned_missions integer,
  specific_building_access boolean,
  specific_building_created_by uuid,
  policy_explanation text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_role text;
  v_user_active boolean;
  v_total_visible integer := 0;
  v_created_by_user integer := 0;
  v_in_assigned_missions integer := 0;
  v_specific_access boolean := false;
  v_specific_created_by uuid;
  v_explanation text := '';
BEGIN
  -- Get user info
  SELECT p.role, p.is_active 
  INTO v_user_role, v_user_active
  FROM public.profiles p 
  WHERE p.id = v_user_id;

  -- Count total visible buildings based on RLS policy
  SELECT COUNT(*)
  INTO v_total_visible
  FROM public.buildings b
  WHERE (
    -- Super admins and admins can see all
    (EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = v_user_id
      AND profiles.role IN ('super_admin', 'admin')
      AND profiles.is_active = true
    ))
    OR
    -- Experts can see only their created buildings
    (EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = v_user_id
      AND profiles.role = 'expert'
      AND profiles.is_active = true
    ) AND b.created_by = v_user_id)
    OR
    -- Constatateurs can see buildings in their assigned missions
    (EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = v_user_id
      AND profiles.role = 'constateur'
      AND profiles.is_active = true
    ) AND EXISTS (
      SELECT 1 
      FROM public.mission_buildings mb
      JOIN public.missions m ON m.id = mb.mission_id
      WHERE mb.building_id = b.id
      AND m.assigned_to = v_user_id
    ))
  );

  -- Count buildings created by user
  SELECT COUNT(*)
  INTO v_created_by_user
  FROM public.buildings
  WHERE created_by = v_user_id;

  -- Count buildings in assigned missions (for constatateurs)
  SELECT COUNT(DISTINCT b.id)
  INTO v_in_assigned_missions
  FROM public.buildings b
  JOIN public.mission_buildings mb ON mb.building_id = b.id
  JOIN public.missions m ON m.id = mb.mission_id
  WHERE m.assigned_to = v_user_id;

  -- Check specific building access if building_id provided
  IF p_building_id IS NOT NULL THEN
    -- Get building creator
    SELECT created_by INTO v_specific_created_by
    FROM public.buildings WHERE id = p_building_id;

    SELECT EXISTS(
      SELECT 1 FROM public.buildings b
      WHERE b.id = p_building_id
      AND (
        (EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = v_user_id
          AND profiles.role IN ('super_admin', 'admin')
          AND profiles.is_active = true
        ))
        OR
        (EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = v_user_id
          AND profiles.role = 'expert'
          AND profiles.is_active = true
        ) AND b.created_by = v_user_id)
        OR
        (EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = v_user_id
          AND profiles.role = 'constateur'
          AND profiles.is_active = true
        ) AND EXISTS (
          SELECT 1 
          FROM public.mission_buildings mb
          JOIN public.missions m ON m.id = mb.mission_id
          WHERE mb.building_id = b.id
          AND m.assigned_to = v_user_id
        ))
      )
    ) INTO v_specific_access;
  END IF;

  -- Build explanation
  IF v_user_role IN ('super_admin', 'admin') AND v_user_active = true THEN
    v_explanation := 'User has elevated role (' || v_user_role || ') - can see all buildings';
  ELSIF v_user_role = 'expert' AND v_user_active = true THEN
    v_explanation := 'Expert can only see buildings they created (' || v_created_by_user || ' buildings)';
  ELSIF v_user_role = 'constateur' AND v_user_active = true THEN
    v_explanation := 'Constateur can see buildings in assigned missions (' || v_in_assigned_missions || ' buildings)';
  ELSE
    v_explanation := 'User does not meet policy conditions. Role: ' || COALESCE(v_user_role, 'NULL') || 
                    ', Active: ' || COALESCE(v_user_active::text, 'NULL');
  END IF;

  RETURN QUERY
  SELECT 
    v_user_id,
    v_user_role,
    v_user_active,
    v_total_visible,
    v_created_by_user,
    v_in_assigned_missions,
    v_specific_access,
    v_specific_created_by,
    v_explanation;
END;
$$;

-- Update existing buildings to set created_by if it's NULL
-- This ensures all existing buildings have a proper owner
UPDATE public.buildings 
SET created_by = (
  SELECT id FROM public.profiles 
  WHERE role IN ('super_admin', 'admin') 
  AND is_active = true 
  ORDER BY created_at ASC 
  LIMIT 1
)
WHERE created_by IS NULL;

-- Log the migration completion
DO $$
BEGIN
  RAISE NOTICE '✅ Buildings RLS policies updated successfully';
  RAISE NOTICE '🔒 Experts can now only see buildings they created';
  RAISE NOTICE '👥 Super admins and admins can see all buildings';
  RAISE NOTICE '🏗️ Constatateurs can see buildings in their assigned missions';
  RAISE NOTICE '🔧 Existing buildings without created_by have been assigned to first admin';
  RAISE NOTICE '🧪 Debug function available: debug_buildings_access(building_id)';
  RAISE NOTICE '🧹 Remember to drop debug function after testing: DROP FUNCTION debug_buildings_access;';
  RAISE NOTICE '🎯 Test with: SELECT * FROM debug_buildings_access();';
END $$;