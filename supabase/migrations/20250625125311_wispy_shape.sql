/*
  # Fix Mission Buildings RLS Policies

  This migration fixes the Row Level Security policies for the mission_buildings table
  to properly allow users to add buildings to missions based on their roles and permissions.

  ## Changes Made

  1. **Updated INSERT Policy**: Allow users to add buildings to missions if they:
     - Are super_admin, admin, or expert (can add to any mission)
     - Are the creator of the mission
     - Are assigned to the mission (for constatateurs)

  2. **Updated SELECT Policy**: Ensure users can read mission buildings based on mission access

  3. **Updated DELETE Policy**: Allow proper deletion based on user roles and mission ownership

  ## Security

  - Maintains proper role-based access control
  - Ensures users can only modify missions they have access to
  - Preserves data integrity through proper foreign key relationships
*/

-- Drop existing policies to recreate them with proper logic
DROP POLICY IF EXISTS "Constatateurs can add buildings to their assigned missions" ON public.mission_buildings;
DROP POLICY IF EXISTS "Experts and above can add buildings to any mission" ON public.mission_buildings;
DROP POLICY IF EXISTS "Users can read mission buildings based on mission access" ON public.mission_buildings;
DROP POLICY IF EXISTS "Users can update mission buildings based on mission access" ON public.mission_buildings;
DROP POLICY IF EXISTS "Constatateurs can delete buildings from their assigned missions" ON public.mission_buildings;
DROP POLICY IF EXISTS "Admins and above can delete any mission buildings" ON public.mission_buildings;

-- Create comprehensive INSERT policy
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
  -- Assigned users (constatateurs) can add buildings to their assigned missions
  (EXISTS (
    SELECT 1 FROM public.missions m
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE m.id = mission_buildings.mission_id 
    AND m.assigned_to = auth.uid()
    AND p.role = 'constateur'
    AND p.is_active = true
    AND m.status IN ('assigned', 'in_progress')
  ))
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
    SELECT 1 FROM public.missions m
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE m.id = mission_buildings.mission_id 
    AND m.created_by = auth.uid()
    AND p.role = 'expert'
    AND p.is_active = true
  ))
  OR
  -- Assigned constatateurs can delete buildings from their assigned missions (if mission is in progress)
  (EXISTS (
    SELECT 1 FROM public.missions m
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE m.id = mission_buildings.mission_id 
    AND m.assigned_to = auth.uid()
    AND p.role = 'constateur'
    AND p.is_active = true
    AND m.status IN ('assigned', 'in_progress')
  ))
);