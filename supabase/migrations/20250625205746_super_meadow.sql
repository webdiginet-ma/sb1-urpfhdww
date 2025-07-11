/*
  # Fix Mission Buildings RLS Policies - Final Version

  This migration addresses the persistent RLS policy violations when constatateurs
  try to add buildings to their assigned missions. The issue is likely due to
  complex JOIN conditions in the policy checks that may not be evaluating correctly.

  ## Changes Made

  1. **Simplified INSERT Policy**: Separate the role check from the mission check
     to make the policy evaluation more reliable
  2. **Clearer Logic**: Use simpler EXISTS clauses that are easier for PostgreSQL to evaluate
  3. **Better Debugging**: Add more granular conditions that can be tested individually

  ## Security

  - Maintains proper role-based access control
  - Ensures users can only modify missions they have access to
  - Preserves data integrity through proper foreign key relationships
*/

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Allow adding buildings to missions based on role and access" ON public.mission_buildings;
DROP POLICY IF EXISTS "Allow reading mission buildings based on mission access" ON public.mission_buildings;
DROP POLICY IF EXISTS "Allow updating mission buildings based on mission access" ON public.mission_buildings;
DROP POLICY IF EXISTS "Allow deleting mission buildings based on role and access" ON public.mission_buildings;

-- Create simplified and more reliable INSERT policy
CREATE POLICY "Allow adding buildings to missions based on role and access"
ON public.mission_buildings
FOR INSERT
TO authenticated
WITH CHECK (
  -- Super admins and admins can add buildings to any mission
  (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('super_admin', 'admin')
    AND profiles.is_active = true
  ))
  OR
  -- Experts can add buildings to any mission
  (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'expert'
    AND profiles.is_active = true
  ))
  OR
  -- Mission creators can add buildings to their missions
  (EXISTS (
    SELECT 1 FROM public.missions
    WHERE missions.id = mission_buildings.mission_id
    AND missions.created_by = auth.uid()
  ))
  OR
  -- Constatateurs can add buildings to their assigned missions (simplified check)
  (
    -- First check: user is an active constateur
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'constateur'
      AND profiles.is_active = true
    )
    AND
    -- Second check: mission is assigned to this user and has correct status
    EXISTS (
      SELECT 1 FROM public.missions
      WHERE missions.id = mission_buildings.mission_id
      AND missions.assigned_to = auth.uid()
      AND missions.status IN ('assigned', 'in_progress')
    )
  )
);

-- Create comprehensive SELECT policy
CREATE POLICY "Allow reading mission buildings based on mission access"
ON public.mission_buildings
FOR SELECT
TO authenticated
USING (
  -- Super admins, admins, and experts can read all mission buildings
  (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('super_admin', 'admin', 'expert')
    AND profiles.is_active = true
  ))
  OR
  -- Mission creators can read buildings in their missions
  (EXISTS (
    SELECT 1 FROM public.missions
    WHERE missions.id = mission_buildings.mission_id
    AND missions.created_by = auth.uid()
  ))
  OR
  -- Assigned users can read buildings in their assigned missions
  (EXISTS (
    SELECT 1 FROM public.missions
    WHERE missions.id = mission_buildings.mission_id
    AND missions.assigned_to = auth.uid()
  ))
);

-- Create comprehensive UPDATE policy
CREATE POLICY "Allow updating mission buildings based on mission access"
ON public.mission_buildings
FOR UPDATE
TO authenticated
USING (
  -- Super admins, admins, and experts can update all mission buildings
  (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('super_admin', 'admin', 'expert')
    AND profiles.is_active = true
  ))
  OR
  -- Mission creators can update buildings in their missions
  (EXISTS (
    SELECT 1 FROM public.missions
    WHERE missions.id = mission_buildings.mission_id
    AND missions.created_by = auth.uid()
  ))
  OR
  -- Assigned users can update buildings in their assigned missions
  (EXISTS (
    SELECT 1 FROM public.missions
    WHERE missions.id = mission_buildings.mission_id
    AND missions.assigned_to = auth.uid()
  ))
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
  (EXISTS (
    SELECT 1 FROM public.missions
    WHERE missions.id = mission_buildings.mission_id
    AND missions.created_by = auth.uid()
  ))
  OR
  (EXISTS (
    SELECT 1 FROM public.missions
    WHERE missions.id = mission_buildings.mission_id
    AND missions.assigned_to = auth.uid()
  ))
);

-- Create comprehensive DELETE policy
CREATE POLICY "Allow deleting mission buildings based on role and access"
ON public.mission_buildings
FOR DELETE
TO authenticated
USING (
  -- Super admins and admins can delete any mission buildings
  (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('super_admin', 'admin')
    AND profiles.is_active = true
  ))
  OR
  -- Experts can delete buildings from missions they created
  (EXISTS (
    SELECT 1 FROM public.missions
    WHERE missions.id = mission_buildings.mission_id
    AND missions.created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'expert'
      AND profiles.is_active = true
    )
  ))
  OR
  -- Assigned constatateurs can delete buildings from their assigned missions
  (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'constateur'
      AND profiles.is_active = true
    )
    AND
    EXISTS (
      SELECT 1 FROM public.missions
      WHERE missions.id = mission_buildings.mission_id
      AND missions.assigned_to = auth.uid()
      AND missions.status IN ('assigned', 'in_progress')
    )
  )
);

-- Add helpful debugging function (temporary, for testing)
CREATE OR REPLACE FUNCTION debug_mission_buildings_access(
  p_mission_id uuid,
  p_building_id uuid
)
RETURNS TABLE (
  user_id uuid,
  user_role text,
  user_active boolean,
  mission_exists boolean,
  mission_assigned_to uuid,
  mission_status text,
  mission_created_by uuid,
  can_insert boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    auth.uid() as user_id,
    p.role as user_role,
    p.is_active as user_active,
    (m.id IS NOT NULL) as mission_exists,
    m.assigned_to as mission_assigned_to,
    m.status::text as mission_status,
    m.created_by as mission_created_by,
    (
      -- Check if user can insert based on the policy conditions
      (p.role IN ('super_admin', 'admin', 'expert') AND p.is_active = true)
      OR
      (m.created_by = auth.uid())
      OR
      (p.role = 'constateur' AND p.is_active = true AND m.assigned_to = auth.uid() AND m.status IN ('assigned', 'in_progress'))
    ) as can_insert
  FROM public.profiles p
  LEFT JOIN public.missions m ON m.id = p_mission_id
  WHERE p.id = auth.uid();
END;
$$;

-- Log the migration completion
DO $$
BEGIN
  RAISE NOTICE '✅ Mission Buildings RLS policies have been updated successfully';
  RAISE NOTICE '🔧 Added debug function: debug_mission_buildings_access(mission_id, building_id)';
  RAISE NOTICE '📝 To test: SELECT * FROM debug_mission_buildings_access(''your-mission-id'', ''your-building-id'');';
  RAISE NOTICE '🧹 Remember to drop the debug function after testing: DROP FUNCTION debug_mission_buildings_access;';
END $$;