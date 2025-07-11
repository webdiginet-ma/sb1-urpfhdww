/*
  # Fix Mission Buildings RLS Policies to Include Draft Status

  This migration fixes the Row Level Security policies for the mission_buildings table
  to allow constatateurs to add buildings to missions even when they are in 'draft' status.

  ## Changes Made

  1. **Updated INSERT Policy**: Allow constatateurs to add buildings to missions with status:
     - 'draft' (newly added)
     - 'assigned' 
     - 'in_progress'

  2. **Updated DELETE Policy**: Consistent with INSERT policy for proper access control

  3. **Fixed Debug Function**: Properly drop and recreate to avoid return type conflicts

  ## Security

  - Maintains proper role-based access control
  - Allows constatateurs to work on draft missions
  - Preserves data integrity through proper foreign key relationships
*/

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Allow adding buildings to missions based on role and access" ON public.mission_buildings;

-- Create updated INSERT policy that includes 'draft' status
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
  -- Constatateurs can add buildings to their assigned missions (including draft status)
  (
    -- First check: user is an active constateur
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'constateur'
      AND profiles.is_active = true
    )
    AND
    -- Second check: mission is assigned to this user and has correct status (now includes 'draft')
    EXISTS (
      SELECT 1 FROM public.missions
      WHERE missions.id = mission_buildings.mission_id
      AND missions.assigned_to = auth.uid()
      AND missions.status IN ('draft', 'assigned', 'in_progress')
    )
  )
);

-- Also update the DELETE policy to be consistent
DROP POLICY IF EXISTS "Allow deleting mission buildings based on role and access" ON public.mission_buildings;

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
  -- Assigned constatateurs can delete buildings from their assigned missions (including draft)
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
      AND missions.status IN ('draft', 'assigned', 'in_progress')
    )
  )
);

-- Drop the existing debug function completely to avoid return type conflicts
DROP FUNCTION IF EXISTS debug_mission_buildings_access(uuid, uuid);
DROP FUNCTION IF EXISTS debug_mission_buildings_access(uuid);

-- Create the debug function with proper signature
CREATE OR REPLACE FUNCTION debug_mission_buildings_access(
  p_mission_id uuid,
  p_building_id uuid DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  user_role text,
  user_active boolean,
  mission_exists boolean,
  mission_assigned_to uuid,
  mission_status text,
  mission_created_by uuid,
  can_insert boolean,
  policy_explanation text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_role text;
  v_user_active boolean;
  v_mission_assigned_to uuid;
  v_mission_status text;
  v_mission_created_by uuid;
  v_can_insert boolean := false;
  v_explanation text := '';
BEGIN
  -- Get user info
  SELECT p.role, p.is_active 
  INTO v_user_role, v_user_active
  FROM public.profiles p 
  WHERE p.id = v_user_id;

  -- Get mission info
  SELECT m.assigned_to, m.status, m.created_by
  INTO v_mission_assigned_to, v_mission_status, v_mission_created_by
  FROM public.missions m 
  WHERE m.id = p_mission_id;

  -- Check permissions and build explanation
  IF v_user_role IN ('super_admin', 'admin') AND v_user_active = true THEN
    v_can_insert := true;
    v_explanation := 'User is super_admin or admin with active status';
  ELSIF v_user_role = 'expert' AND v_user_active = true THEN
    v_can_insert := true;
    v_explanation := 'User is expert with active status';
  ELSIF v_mission_created_by = v_user_id THEN
    v_can_insert := true;
    v_explanation := 'User is the creator of this mission';
  ELSIF v_user_role = 'constateur' AND v_user_active = true AND v_mission_assigned_to = v_user_id AND v_mission_status IN ('draft', 'assigned', 'in_progress') THEN
    v_can_insert := true;
    v_explanation := 'User is constateur assigned to mission with valid status (draft, assigned, or in_progress)';
  ELSE
    v_explanation := 'User does not meet any policy conditions. Role: ' || COALESCE(v_user_role, 'NULL') || 
                    ', Active: ' || COALESCE(v_user_active::text, 'NULL') || 
                    ', Assigned: ' || COALESCE((v_mission_assigned_to = v_user_id)::text, 'false') || 
                    ', Status: ' || COALESCE(v_mission_status, 'NULL');
  END IF;

  RETURN QUERY
  SELECT 
    v_user_id,
    v_user_role,
    v_user_active,
    (v_mission_assigned_to IS NOT NULL) as mission_exists,
    v_mission_assigned_to,
    v_mission_status,
    v_mission_created_by,
    v_can_insert,
    v_explanation;
END;
$$;

-- Log the migration completion
DO $$
BEGIN
  RAISE NOTICE '✅ Mission Buildings RLS policies updated to include DRAFT status';
  RAISE NOTICE '🔧 Constatateurs can now add buildings to missions with status: draft, assigned, in_progress';
  RAISE NOTICE '📝 Updated debug function available: debug_mission_buildings_access(mission_id)';
  RAISE NOTICE '🧪 Test with: SELECT * FROM debug_mission_buildings_access(''7ca6573c-7639-4169-9ff7-5753193745ac'');';
END $$;