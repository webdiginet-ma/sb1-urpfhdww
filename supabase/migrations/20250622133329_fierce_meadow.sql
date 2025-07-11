/*
  # Ajout des détails spécifiques aux bâtiments pour les missions

  1. Nouvelles colonnes ajoutées à la table buildings
    - Surfaces détaillées (sous-sol, RDC, 1er étage)
    - Éléments techniques (stockés en JSONB)
    - Éléments divers (stockés en JSONB)
    - Valeurs financières (valeur à neuf, vétusté, valeur vétustée)

  2. Contraintes et validations
    - Contraintes de validation pour les pourcentages
    - Index pour les performances sur les nouvelles colonnes

  3. Sécurité
    - Les politiques RLS existantes s'appliquent automatiquement
    - Pas de nouvelles politiques nécessaires
*/

-- Ajouter les nouvelles colonnes à la table buildings
DO $$ 
BEGIN
  -- Surfaces détaillées
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'buildings' AND column_name = 'basement_area_sqm'
  ) THEN
    ALTER TABLE buildings ADD COLUMN basement_area_sqm numeric(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'buildings' AND column_name = 'ground_floor_area_sqm'
  ) THEN
    ALTER TABLE buildings ADD COLUMN ground_floor_area_sqm numeric(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'buildings' AND column_name = 'first_floor_area_sqm'
  ) THEN
    ALTER TABLE buildings ADD COLUMN first_floor_area_sqm numeric(10,2) DEFAULT 0;
  END IF;

  -- Éléments techniques (stockés en JSONB)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'buildings' AND column_name = 'technical_elements'
  ) THEN
    ALTER TABLE buildings ADD COLUMN technical_elements jsonb DEFAULT '{}'::jsonb;
  END IF;

  -- Éléments divers (stockés en JSONB array)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'buildings' AND column_name = 'miscellaneous_elements'
  ) THEN
    ALTER TABLE buildings ADD COLUMN miscellaneous_elements jsonb DEFAULT '[]'::jsonb;
  END IF;

  -- Valeurs financières
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'buildings' AND column_name = 'new_value_mad'
  ) THEN
    ALTER TABLE buildings ADD COLUMN new_value_mad numeric(15,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'buildings' AND column_name = 'obsolescence_percentage'
  ) THEN
    ALTER TABLE buildings ADD COLUMN obsolescence_percentage numeric(5,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'buildings' AND column_name = 'depreciated_value_mad'
  ) THEN
    ALTER TABLE buildings ADD COLUMN depreciated_value_mad numeric(15,2) DEFAULT 0;
  END IF;

  -- Champs de contiguïté et communication
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'buildings' AND column_name = 'contiguity'
  ) THEN
    ALTER TABLE buildings ADD COLUMN contiguity text DEFAULT 'neant';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'buildings' AND column_name = 'communication'
  ) THEN
    ALTER TABLE buildings ADD COLUMN communication text DEFAULT 'neant';
  END IF;
END $$;

-- Ajouter des contraintes de validation
DO $$
BEGIN
  -- Contrainte pour le pourcentage de vétusté (0-100%)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'buildings_obsolescence_percentage_check'
  ) THEN
    ALTER TABLE buildings 
    ADD CONSTRAINT buildings_obsolescence_percentage_check 
    CHECK (obsolescence_percentage >= 0 AND obsolescence_percentage <= 100);
  END IF;

  -- Contrainte pour les surfaces (valeurs positives)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'buildings_areas_positive_check'
  ) THEN
    ALTER TABLE buildings 
    ADD CONSTRAINT buildings_areas_positive_check 
    CHECK (
      basement_area_sqm >= 0 AND 
      ground_floor_area_sqm >= 0 AND 
      first_floor_area_sqm >= 0
    );
  END IF;

  -- Contrainte pour les valeurs financières (valeurs positives)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'buildings_financial_values_positive_check'
  ) THEN
    ALTER TABLE buildings 
    ADD CONSTRAINT buildings_financial_values_positive_check 
    CHECK (
      new_value_mad >= 0 AND 
      depreciated_value_mad >= 0
    );
  END IF;
END $$;

-- Créer des index pour les performances
CREATE INDEX IF NOT EXISTS idx_buildings_technical_elements ON buildings USING gin(technical_elements);
CREATE INDEX IF NOT EXISTS idx_buildings_miscellaneous_elements ON buildings USING gin(miscellaneous_elements);
CREATE INDEX IF NOT EXISTS idx_buildings_new_value_mad ON buildings(new_value_mad);
CREATE INDEX IF NOT EXISTS idx_buildings_obsolescence_percentage ON buildings(obsolescence_percentage);

-- Fonction pour calculer automatiquement la surface totale
CREATE OR REPLACE FUNCTION calculate_total_area()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculer la surface totale comme la somme des trois surfaces
  NEW.total_area = COALESCE(NEW.basement_area_sqm, 0) + 
                   COALESCE(NEW.ground_floor_area_sqm, 0) + 
                   COALESCE(NEW.first_floor_area_sqm, 0);
  
  -- Calculer la valeur vétustée déduite
  IF NEW.new_value_mad IS NOT NULL AND NEW.obsolescence_percentage IS NOT NULL THEN
    NEW.depreciated_value_mad = NEW.new_value_mad * (NEW.obsolescence_percentage / 100);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger pour le calcul automatique
DROP TRIGGER IF EXISTS calculate_building_totals_trigger ON buildings;
CREATE TRIGGER calculate_building_totals_trigger
  BEFORE INSERT OR UPDATE ON buildings
  FOR EACH ROW
  EXECUTE FUNCTION calculate_total_area();

-- Mettre à jour les enregistrements existants pour calculer les totaux
UPDATE buildings 
SET 
  basement_area_sqm = COALESCE(basement_area_sqm, 0),
  ground_floor_area_sqm = COALESCE(ground_floor_area_sqm, 0),
  first_floor_area_sqm = COALESCE(first_floor_area_sqm, 0),
  technical_elements = COALESCE(technical_elements, '{}'::jsonb),
  miscellaneous_elements = COALESCE(miscellaneous_elements, '[]'::jsonb),
  new_value_mad = COALESCE(new_value_mad, 0),
  obsolescence_percentage = COALESCE(obsolescence_percentage, 0),
  depreciated_value_mad = COALESCE(depreciated_value_mad, 0),
  contiguity = COALESCE(contiguity, 'neant'),
  communication = COALESCE(communication, 'neant')
WHERE 
  basement_area_sqm IS NULL OR 
  ground_floor_area_sqm IS NULL OR 
  first_floor_area_sqm IS NULL OR
  technical_elements IS NULL OR
  miscellaneous_elements IS NULL OR
  new_value_mad IS NULL OR
  obsolescence_percentage IS NULL OR
  depreciated_value_mad IS NULL OR
  contiguity IS NULL OR
  communication IS NULL;

-- Commentaires sur les nouvelles colonnes pour la documentation
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

-- Log de la migration
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: Added building details columns to buildings table';
  RAISE NOTICE 'New columns: basement_area_sqm, ground_floor_area_sqm, first_floor_area_sqm';
  RAISE NOTICE 'New columns: technical_elements, miscellaneous_elements';
  RAISE NOTICE 'New columns: new_value_mad, obsolescence_percentage, depreciated_value_mad';
  RAISE NOTICE 'New columns: contiguity, communication';
  RAISE NOTICE 'Added automatic calculation triggers for total_area and depreciated_value_mad';
END $$;