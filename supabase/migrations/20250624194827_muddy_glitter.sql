/*
  # Complete Database Schema Migration
  
  This migration creates the complete database schema for the mission management system.
  It handles existing objects gracefully to avoid conflicts.
  
  1. Custom Types (enums)
  2. Tables (profiles, buildings, materials, missions, mission_buildings)
  3. Views (users compatibility view)
  4. Functions and Triggers
  5. Indexes for performance
  6. RLS Policies for security
  7. Constraints and validations
  8. Documentation comments
*/

-- Create custom types (only if they don't exist)
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'expert', 'constateur');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE material_status AS ENUM ('operational', 'maintenance', 'out_of_order', 'retired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE material_condition AS ENUM ('bon', 'acceptable', 'vetuste');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE mission_type AS ENUM ('inspection', 'maintenance', 'audit', 'emergency');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE mission_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE mission_status AS ENUM ('draft', 'assigned', 'in_progress', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  nom text,
  prenom text,
  numero_tel text,
  role text DEFAULT 'constateur',
  full_name text,
  phone text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid
);

-- Add foreign key constraint for created_by if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_created_by_fkey' 
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create buildings table
CREATE TABLE IF NOT EXISTS buildings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  designation text NOT NULL,
  basement_area_sqm numeric(10,2) DEFAULT 0,
  ground_floor_area_sqm numeric(10,2) DEFAULT 0,
  first_floor_area_sqm numeric(10,2) DEFAULT 0,
  technical_elements jsonb DEFAULT '{}'::jsonb,
  miscellaneous_elements jsonb DEFAULT '[]'::jsonb,
  new_value_mad numeric(15,2) DEFAULT 0,
  obsolescence_percentage numeric(5,2) DEFAULT 0,
  depreciated_value_mad numeric(15,2) DEFAULT 0,
  contiguity text DEFAULT 'neant',
  communication text DEFAULT 'neant',
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add total_area computed column if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'buildings' AND column_name = 'total_area'
  ) THEN
    ALTER TABLE buildings ADD COLUMN total_area numeric(10,2) GENERATED ALWAYS AS (
      COALESCE(basement_area_sqm, 0) + 
      COALESCE(ground_floor_area_sqm, 0) + 
      COALESCE(first_floor_area_sqm, 0)
    ) STORED;
  END IF;
END $$;

-- Add foreign key constraint for buildings.created_by if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'buildings_created_by_fkey' 
    AND table_name = 'buildings'
  ) THEN
    ALTER TABLE buildings ADD CONSTRAINT buildings_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create materials table
CREATE TABLE IF NOT EXISTS materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  brand text,
  model text,
  serial_number text,
  installation_date date,
  warranty_end_date date,
  location_details text,
  specifications jsonb,
  maintenance_notes text,
  status material_status DEFAULT 'operational',
  quantity integer DEFAULT 1,
  manufacturing_year integer,
  condition material_condition DEFAULT 'bon',
  new_value_mad numeric(15,2),
  obsolescence_percentage numeric(5,2) DEFAULT 0,
  depreciated_value_mad numeric(15,2),
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key constraints for materials if they don't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'materials_building_id_fkey' 
    AND table_name = 'materials'
  ) THEN
    ALTER TABLE materials ADD CONSTRAINT materials_building_id_fkey 
    FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'materials_created_by_fkey' 
    AND table_name = 'materials'
  ) THEN
    ALTER TABLE materials ADD CONSTRAINT materials_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create missions table
CREATE TABLE IF NOT EXISTS missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  mission_type mission_type NOT NULL,
  priority mission_priority DEFAULT 'medium',
  status mission_status DEFAULT 'draft',
  scheduled_start_date date,
  scheduled_end_date date,
  actual_start_date date,
  actual_end_date date,
  assigned_to uuid,
  created_by uuid NOT NULL,
  approved_by uuid,
  instructions text,
  report text,
  attachments jsonb,
  plan_de_masse_url text,
  plan_de_masse_path text,
  plan_de_masse_filename text,
  plan_de_masse_size bigint,
  plan_de_masse_uploaded_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key constraints for missions if they don't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'missions_created_by_fkey' 
    AND table_name = 'missions'
  ) THEN
    ALTER TABLE missions ADD CONSTRAINT missions_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'missions_assigned_to_fkey' 
    AND table_name = 'missions'
  ) THEN
    ALTER TABLE missions ADD CONSTRAINT missions_assigned_to_fkey 
    FOREIGN KEY (assigned_to) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'missions_approved_by_fkey' 
    AND table_name = 'missions'
  ) THEN
    ALTER TABLE missions ADD CONSTRAINT missions_approved_by_fkey 
    FOREIGN KEY (approved_by) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create mission_buildings junction table
CREATE TABLE IF NOT EXISTS mission_buildings (
  mission_id uuid NOT NULL,
  building_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (mission_id, building_id)
);

-- Add foreign key constraints for mission_buildings if they don't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'mission_buildings_mission_id_fkey' 
    AND table_name = 'mission_buildings'
  ) THEN
    ALTER TABLE mission_buildings ADD CONSTRAINT mission_buildings_mission_id_fkey 
    FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'mission_buildings_building_id_fkey' 
    AND table_name = 'mission_buildings'
  ) THEN
    ALTER TABLE mission_buildings ADD CONSTRAINT mission_buildings_building_id_fkey 
    FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create users view for compatibility (drop and recreate to ensure it's correct)
DROP VIEW IF EXISTS users CASCADE;
CREATE VIEW users AS
SELECT 
  id,
  COALESCE(email, '') as email,
  COALESCE(full_name, nom, '') as full_name,
  COALESCE(phone, numero_tel) as phone,
  COALESCE(role, 'constateur') as role,
  COALESCE(is_active, true) as is_active,
  COALESCE(created_at, now()) as created_at,
  COALESCE(updated_at, now()) as updated_at,
  created_by
FROM profiles;

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_buildings ENABLE ROW LEVEL SECURITY;

-- Create or replace functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_profile_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.full_name IS DISTINCT FROM OLD.full_name THEN
    NEW.nom = NEW.full_name;
  END IF;
  IF NEW.phone IS DISTINCT FROM OLD.phone THEN
    NEW.numero_tel = NEW.phone;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_total_area()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.new_value_mad IS NOT NULL AND NEW.obsolescence_percentage IS NOT NULL THEN
    NEW.depreciated_value_mad = NEW.new_value_mad * (NEW.obsolescence_percentage / 100);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_material_depreciated_value()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.new_value_mad IS NOT NULL AND NEW.obsolescence_percentage IS NOT NULL THEN
    NEW.depreciated_value_mad = NEW.new_value_mad * (NEW.obsolescence_percentage / 100);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers before creating new ones
DROP TRIGGER IF EXISTS sync_profile_columns_trigger ON profiles;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS calculate_building_totals_trigger ON buildings;
DROP TRIGGER IF EXISTS update_buildings_updated_at ON buildings;
DROP TRIGGER IF EXISTS calculate_material_depreciated_value_trigger ON materials;
DROP TRIGGER IF EXISTS update_materials_updated_at ON materials;
DROP TRIGGER IF EXISTS update_missions_updated_at ON missions;

-- Create triggers
CREATE TRIGGER sync_profile_columns_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_columns();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER calculate_building_totals_trigger
  BEFORE INSERT OR UPDATE ON buildings
  FOR EACH ROW
  EXECUTE FUNCTION calculate_total_area();

CREATE TRIGGER update_buildings_updated_at
  BEFORE UPDATE ON buildings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER calculate_material_depreciated_value_trigger
  BEFORE INSERT OR UPDATE ON materials
  FOR EACH ROW
  EXECUTE FUNCTION calculate_material_depreciated_value();

CREATE TRIGGER update_materials_updated_at
  BEFORE UPDATE ON materials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_missions_updated_at
  BEFORE UPDATE ON missions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_created_by ON profiles(created_by);

CREATE INDEX IF NOT EXISTS idx_buildings_is_active ON buildings(is_active);
CREATE INDEX IF NOT EXISTS idx_buildings_technical_elements ON buildings USING gin(technical_elements);
CREATE INDEX IF NOT EXISTS idx_buildings_miscellaneous_elements ON buildings USING gin(miscellaneous_elements);
CREATE INDEX IF NOT EXISTS idx_buildings_new_value_mad ON buildings(new_value_mad);
CREATE INDEX IF NOT EXISTS idx_buildings_obsolescence_percentage ON buildings(obsolescence_percentage);

CREATE INDEX IF NOT EXISTS idx_materials_building_id ON materials(building_id);
CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category);
CREATE INDEX IF NOT EXISTS idx_materials_status ON materials(status);
CREATE INDEX IF NOT EXISTS idx_materials_is_active ON materials(is_active);
CREATE INDEX IF NOT EXISTS idx_materials_serial_number ON materials(serial_number) WHERE serial_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_materials_quantity ON materials(quantity);
CREATE INDEX IF NOT EXISTS idx_materials_manufacturing_year ON materials(manufacturing_year);
CREATE INDEX IF NOT EXISTS idx_materials_condition ON materials(condition);
CREATE INDEX IF NOT EXISTS idx_materials_new_value_mad ON materials(new_value_mad);
CREATE INDEX IF NOT EXISTS idx_materials_obsolescence_percentage ON materials(obsolescence_percentage);

CREATE INDEX IF NOT EXISTS idx_missions_assigned_to ON missions(assigned_to);
CREATE INDEX IF NOT EXISTS idx_missions_created_by ON missions(created_by);
CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status);
CREATE INDEX IF NOT EXISTS idx_missions_priority ON missions(priority);
CREATE INDEX IF NOT EXISTS idx_missions_mission_type ON missions(mission_type);
CREATE INDEX IF NOT EXISTS idx_missions_scheduled_start_date ON missions(scheduled_start_date);
CREATE INDEX IF NOT EXISTS idx_missions_plan_de_masse_path ON missions(plan_de_masse_path) WHERE plan_de_masse_path IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_missions_plan_de_masse_uploaded_at ON missions(plan_de_masse_uploaded_at) WHERE plan_de_masse_uploaded_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mission_buildings_mission_id ON mission_buildings(mission_id);
CREATE INDEX IF NOT EXISTS idx_mission_buildings_building_id ON mission_buildings(building_id);

-- Add constraints (only if they don't exist)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'buildings_obsolescence_percentage_check'
  ) THEN
    ALTER TABLE buildings ADD CONSTRAINT buildings_obsolescence_percentage_check 
    CHECK (obsolescence_percentage >= 0 AND obsolescence_percentage <= 100);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'buildings_areas_positive_check'
  ) THEN
    ALTER TABLE buildings ADD CONSTRAINT buildings_areas_positive_check 
    CHECK (basement_area_sqm >= 0 AND ground_floor_area_sqm >= 0 AND first_floor_area_sqm >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'buildings_financial_values_positive_check'
  ) THEN
    ALTER TABLE buildings ADD CONSTRAINT buildings_financial_values_positive_check 
    CHECK (new_value_mad >= 0 AND depreciated_value_mad >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'materials_obsolescence_percentage_check'
  ) THEN
    ALTER TABLE materials ADD CONSTRAINT materials_obsolescence_percentage_check 
    CHECK (obsolescence_percentage >= 0 AND obsolescence_percentage <= 100);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'materials_positive_values_check'
  ) THEN
    ALTER TABLE materials ADD CONSTRAINT materials_positive_values_check 
    CHECK (
      quantity > 0 AND 
      (new_value_mad IS NULL OR new_value_mad >= 0) AND 
      (depreciated_value_mad IS NULL OR depreciated_value_mad >= 0) AND
      (manufacturing_year IS NULL OR manufacturing_year >= 1900)
    );
  END IF;
END $$;

-- Drop all existing RLS policies before creating new ones
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop policies for profiles
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON profiles';
    END LOOP;
    
    -- Drop policies for buildings
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'buildings' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON buildings';
    END LOOP;
    
    -- Drop policies for materials
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'materials' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON materials';
    END LOOP;
    
    -- Drop policies for missions
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'missions' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON missions';
    END LOOP;
    
    -- Drop policies for mission_buildings
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'mission_buildings' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON mission_buildings';
    END LOOP;
END $$;

-- RLS Policies for profiles
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Service role can manage all profiles"
  ON profiles FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Users can read active profiles"
  ON profiles FOR SELECT TO authenticated
  USING (is_active = true);

-- RLS Policies for buildings
CREATE POLICY "Authenticated users can create buildings"
  ON buildings FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin', 'expert', 'constateur')
      AND is_active = true
    )
  );

CREATE POLICY "All authenticated users can read active buildings"
  ON buildings FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Experts and above can read all buildings"
  ON buildings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin', 'expert')
      AND is_active = true
    )
  );

CREATE POLICY "Authenticated users can update buildings"
  ON buildings FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin', 'expert', 'constateur')
      AND is_active = true
    )
  );

CREATE POLICY "Super admins can delete buildings"
  ON buildings FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
      AND is_active = true
    )
  );

-- RLS Policies for materials
CREATE POLICY "Experts and above can create materials"
  ON materials FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin', 'expert')
      AND profiles.is_active = true
    )
  );

CREATE POLICY "All authenticated users can read active materials"
  ON materials FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins and above can read all materials"
  ON materials FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin', 'expert')
      AND profiles.is_active = true
    )
  );

CREATE POLICY "Experts and above can update materials"
  ON materials FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin', 'expert')
      AND profiles.is_active = true
    )
  );

CREATE POLICY "Admins and above can delete materials"
  ON materials FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin')
      AND profiles.is_active = true
    )
  );

-- RLS Policies for missions
CREATE POLICY "Experts and above can create missions"
  ON missions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin', 'expert')
      AND profiles.is_active = true
    )
  );

CREATE POLICY "Experts and above can read all missions"
  ON missions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin', 'expert')
      AND profiles.is_active = true
    )
  );

CREATE POLICY "Constatateurs can read their assigned missions"
  ON missions FOR SELECT TO authenticated
  USING (
    assigned_to = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin', 'expert')
      AND profiles.is_active = true
    )
  );

CREATE POLICY "Experts and above can update missions"
  ON missions FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin', 'expert')
      AND profiles.is_active = true
    )
  );

CREATE POLICY "Constatateurs can update their assigned missions"
  ON missions FOR UPDATE TO authenticated
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

CREATE POLICY "Admins and experts can delete missions"
  ON missions FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_active = true
      AND (
        profiles.role IN ('super_admin', 'admin')
        OR (profiles.role = 'expert' AND missions.created_by = auth.uid())
      )
    )
  );

-- RLS Policies for mission_buildings
CREATE POLICY "Constatateurs can add buildings to their assigned missions"
  ON mission_buildings FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM missions m
      WHERE m.id = mission_buildings.mission_id
      AND m.assigned_to = auth.uid()
      AND m.status IN ('assigned', 'in_progress')
    )
  );

CREATE POLICY "Experts and above can add buildings to any mission"
  ON mission_buildings FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('super_admin', 'admin', 'expert')
      AND p.is_active = true
    )
  );

CREATE POLICY "Users can read mission buildings based on mission access"
  ON mission_buildings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM missions m
      WHERE m.id = mission_buildings.mission_id
      AND (
        m.assigned_to = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
          AND p.role IN ('super_admin', 'admin', 'expert')
          AND p.is_active = true
        )
      )
    )
  );

CREATE POLICY "Users can update mission buildings based on mission access"
  ON mission_buildings FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM missions m
      WHERE m.id = mission_buildings.mission_id
      AND (
        m.assigned_to = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
          AND p.role IN ('super_admin', 'admin', 'expert')
          AND p.is_active = true
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM missions m
      WHERE m.id = mission_buildings.mission_id
      AND (
        m.assigned_to = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
          AND p.role IN ('super_admin', 'admin', 'expert')
          AND p.is_active = true
        )
      )
    )
  );

CREATE POLICY "Constatateurs can delete buildings from their assigned missions"
  ON mission_buildings FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM missions m
      WHERE m.id = mission_buildings.mission_id
      AND m.assigned_to = auth.uid()
      AND m.status IN ('assigned', 'in_progress')
    )
  );

CREATE POLICY "Admins and above can delete any mission buildings"
  ON mission_buildings FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin')
      AND is_active = true
    )
  );

-- Add comments for documentation
COMMENT ON COLUMN buildings.basement_area_sqm IS 'Surface du sous-sol en mètres carrés';
COMMENT ON COLUMN buildings.ground_floor_area_sqm IS 'Surface du rez-de-chaussée en mètres carrés';
COMMENT ON COLUMN buildings.first_floor_area_sqm IS 'Surface du premier étage en mètres carrés';
COMMENT ON COLUMN buildings.technical_elements IS 'Éléments techniques du bâtiment (semelles, élévations, ossature, etc.) stockés en JSON';
COMMENT ON COLUMN buildings.miscellaneous_elements IS 'Éléments divers du bâtiment (peinture, sanitaires, etc.) stockés en tableau JSON';
COMMENT ON COLUMN buildings.new_value_mad IS 'Valeur à neuf du bâtiment en dirhams marocains (MAD)';
COMMENT ON COLUMN buildings.obsolescence_percentage IS 'Pourcentage de vétusté du bâtiment (0-100%)';
COMMENT ON COLUMN buildings.depreciated_value_mad IS 'Valeur vétustée déduite en dirhams marocains (MAD)';
COMMENT ON COLUMN buildings.contiguity IS 'Contiguïté du bâtiment (neant/oui)';
COMMENT ON COLUMN buildings.communication IS 'Communication du bâtiment (neant/oui)';

COMMENT ON COLUMN materials.quantity IS 'Quantité du matériel';
COMMENT ON COLUMN materials.manufacturing_year IS 'Année de fabrication du matériel';
COMMENT ON COLUMN materials.condition IS 'État du matériel (bon, acceptable, vétuste)';
COMMENT ON COLUMN materials.new_value_mad IS 'Valeur à neuf du matériel en MAD';
COMMENT ON COLUMN materials.obsolescence_percentage IS 'Pourcentage de vétusté du matériel (0-100%)';
COMMENT ON COLUMN materials.depreciated_value_mad IS 'Valeur vétustée déduite du matériel en MAD';

COMMENT ON COLUMN missions.plan_de_masse_url IS 'URL publique du fichier plan de masse stocké dans Supabase Storage';
COMMENT ON COLUMN missions.plan_de_masse_path IS 'Chemin interne du fichier plan de masse dans le bucket Supabase Storage';
COMMENT ON COLUMN missions.plan_de_masse_filename IS 'Nom original du fichier plan de masse uploadé par l''expert';
COMMENT ON COLUMN missions.plan_de_masse_size IS 'Taille du fichier plan de masse en bytes';
COMMENT ON COLUMN missions.plan_de_masse_uploaded_at IS 'Date et heure d''upload du fichier plan de masse';