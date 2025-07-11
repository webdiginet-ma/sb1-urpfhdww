/*
  # Fix mission_buildings RLS policies

  1. Security Updates
    - Drop existing problematic INSERT policies
    - Create new comprehensive INSERT policy for experts and admins
    - Ensure proper role checking with profiles table
    - Add policy for constatateurs to add buildings to their assigned missions

  2. Changes
    - Fix INSERT policy to properly check user roles from profiles table
    - Ensure experts, admins, and super_admins can add buildings to any mission
    - Allow constatateurs to add buildings only to their assigned missions
*/

-- Drop existing INSERT policies that might be causing issues
DROP POLICY IF EXISTS "Experts and above can add buildings to any mission" ON mission_buildings;
DROP POLICY IF EXISTS "Constatateurs can add buildings to their assigned missions" ON mission_buildings;

-- Create comprehensive INSERT policy for experts and above
CREATE POLICY "Experts and above can add buildings to any mission"
  ON mission_buildings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM profiles p
      WHERE p.id = auth.uid() 
        AND p.role IN ('super_admin', 'admin', 'expert')
        AND p.is_active = true
    )
  );

-- Create INSERT policy for constatateurs on their assigned missions
CREATE POLICY "Constatateurs can add buildings to their assigned missions"
  ON mission_buildings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM missions m
      JOIN profiles p ON p.id = auth.uid()
      WHERE m.id = mission_buildings.mission_id
        AND m.assigned_to = auth.uid()
        AND p.role = 'constateur'
        AND p.is_active = true
        AND m.status IN ('assigned', 'in_progress')
    )
  );

-- Ensure the existing SELECT policy is correct
DROP POLICY IF EXISTS "Users can read mission buildings based on mission access" ON mission_buildings;

CREATE POLICY "Users can read mission buildings based on mission access"
  ON mission_buildings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM missions m
      WHERE m.id = mission_buildings.mission_id
        AND (
          m.assigned_to = auth.uid() 
          OR EXISTS (
            SELECT 1 
            FROM profiles p
            WHERE p.id = auth.uid() 
              AND p.role IN ('super_admin', 'admin', 'expert')
              AND p.is_active = true
          )
        )
    )
  );

-- Ensure the existing UPDATE policy is correct
DROP POLICY IF EXISTS "Users can update mission buildings based on mission access" ON mission_buildings;

CREATE POLICY "Users can update mission buildings based on mission access"
  ON mission_buildings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM missions m
      WHERE m.id = mission_buildings.mission_id
        AND (
          m.assigned_to = auth.uid() 
          OR EXISTS (
            SELECT 1 
            FROM profiles p
            WHERE p.id = auth.uid() 
              AND p.role IN ('super_admin', 'admin', 'expert')
              AND p.is_active = true
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM missions m
      WHERE m.id = mission_buildings.mission_id
        AND (
          m.assigned_to = auth.uid() 
          OR EXISTS (
            SELECT 1 
            FROM profiles p
            WHERE p.id = auth.uid() 
              AND p.role IN ('super_admin', 'admin', 'expert')
              AND p.is_active = true
          )
        )
    )
  );

-- Ensure the existing DELETE policies are correct
DROP POLICY IF EXISTS "Constatateurs can delete buildings from their assigned missions" ON mission_buildings;
DROP POLICY IF EXISTS "Admins and above can delete any mission buildings" ON mission_buildings;

CREATE POLICY "Constatateurs can delete buildings from their assigned missions"
  ON mission_buildings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM missions m
      JOIN profiles p ON p.id = auth.uid()
      WHERE m.id = mission_buildings.mission_id
        AND m.assigned_to = auth.uid()
        AND p.role = 'constateur'
        AND p.is_active = true
        AND m.status IN ('assigned', 'in_progress')
    )
  );

CREATE POLICY "Admins and above can delete any mission buildings"
  ON mission_buildings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM profiles p
      WHERE p.id = auth.uid() 
        AND p.role IN ('super_admin', 'admin')
        AND p.is_active = true
    )
  );