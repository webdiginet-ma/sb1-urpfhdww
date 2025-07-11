/*
  # Fix Missions RLS Policies for Expert Role Isolation

  This migration updates the Row Level Security policies for the missions table
  to ensure that experts can only see missions they have created, while maintaining
  proper access for other roles.

  ## Changes Made

  1. **Updated SELECT Policies**: 
     - Super admins and admins can read all missions
     - Experts can only read missions they created (created_by = auth.uid())
     - Constatateurs can only read missions assigned to them

  2. **Maintained Other Policies**: 
     - INSERT, UPDATE, DELETE policies remain unchanged
     - Proper role-based access control is preserved

  ## Security

  - Ensures data isolation between experts
  - Maintains proper hierarchical access control
  - Preserves existing functionality for other roles
*/

-- Drop existing SELECT policies for missions
DROP POLICY IF EXISTS "Experts and above can read all missions" ON public.missions;
DROP POLICY IF EXISTS "Constatateurs can read their assigned missions" ON public.missions;

-- Create new comprehensive SELECT policy that properly isolates experts
CREATE POLICY "Users can read missions based on role and ownership"
ON public.missions
FOR SELECT
TO authenticated
USING (
  -- Super admins and admins can read all missions
  (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('super_admin', 'admin')
    AND profiles.is_active = true
  ))
  OR
  -- Experts can only read missions they created
  (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'expert'
    AND profiles.is_active = true
  ) AND missions.created_by = auth.uid())
  OR
  -- Constatateurs can read missions assigned to them
  (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'constateur'
    AND profiles.is_active = true
  ) AND missions.assigned_to = auth.uid())
);

-- Create debug function to test mission access (for testing purposes)
CREATE OR REPLACE FUNCTION debug_missions_access(
  p_mission_id uuid DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  user_role text,
  user_active boolean,
  total_missions_visible integer,
  missions_created_by_user integer,
  missions_assigned_to_user integer,
  specific_mission_access boolean,
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
  v_assigned_to_user integer := 0;
  v_specific_access boolean := false;
  v_explanation text := '';
BEGIN
  -- Get user info
  SELECT p.role, p.is_active 
  INTO v_user_role, v_user_active
  FROM public.profiles p 
  WHERE p.id = v_user_id;

  -- Count total visible missions based on RLS policy
  SELECT COUNT(*)
  INTO v_total_visible
  FROM public.missions m
  WHERE (
    -- Super admins and admins can see all
    (EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = v_user_id
      AND profiles.role IN ('super_admin', 'admin')
      AND profiles.is_active = true
    ))
    OR
    -- Experts can see only their created missions
    (EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = v_user_id
      AND profiles.role = 'expert'
      AND profiles.is_active = true
    ) AND m.created_by = v_user_id)
    OR
    -- Constatateurs can see assigned missions
    (EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = v_user_id
      AND profiles.role = 'constateur'
      AND profiles.is_active = true
    ) AND m.assigned_to = v_user_id)
  );

  -- Count missions created by user
  SELECT COUNT(*)
  INTO v_created_by_user
  FROM public.missions
  WHERE created_by = v_user_id;

  -- Count missions assigned to user
  SELECT COUNT(*)
  INTO v_assigned_to_user
  FROM public.missions
  WHERE assigned_to = v_user_id;

  -- Check specific mission access if mission_id provided
  IF p_mission_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.missions m
      WHERE m.id = p_mission_id
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
        ) AND m.created_by = v_user_id)
        OR
        (EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = v_user_id
          AND profiles.role = 'constateur'
          AND profiles.is_active = true
        ) AND m.assigned_to = v_user_id)
      )
    ) INTO v_specific_access;
  END IF;

  -- Build explanation
  IF v_user_role IN ('super_admin', 'admin') AND v_user_active = true THEN
    v_explanation := 'User has elevated role (' || v_user_role || ') - can see all missions';
  ELSIF v_user_role = 'expert' AND v_user_active = true THEN
    v_explanation := 'Expert can only see missions they created (' || v_created_by_user || ' missions)';
  ELSIF v_user_role = 'constateur' AND v_user_active = true THEN
    v_explanation := 'Constateur can only see assigned missions (' || v_assigned_to_user || ' missions)';
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
    v_assigned_to_user,
    v_specific_access,
    v_explanation;
END;
$$;

-- Log the migration completion
DO $$
BEGIN
  RAISE NOTICE '✅ Missions RLS policies updated successfully';
  RAISE NOTICE '🔒 Experts can now only see missions they created';
  RAISE NOTICE '👥 Super admins and admins can see all missions';
  RAISE NOTICE '📋 Constatateurs can see only assigned missions';
  RAISE NOTICE '🧪 Debug function available: debug_missions_access(mission_id)';
  RAISE NOTICE '🧹 Remember to drop debug function after testing: DROP FUNCTION debug_missions_access;';
  RAISE NOTICE '🎯 Test with: SELECT * FROM debug_missions_access();';
END $$;