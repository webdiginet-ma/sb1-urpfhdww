/*
  # Ajout des colonnes pour la gestion du plan de masse

  1. Nouvelles colonnes ajoutées à la table missions
    - `plan_de_masse_url` (TEXT) - URL publique du fichier plan de masse
    - `plan_de_masse_path` (TEXT) - Chemin interne dans Supabase Storage
    - `plan_de_masse_filename` (TEXT) - Nom original du fichier uploadé
    - `plan_de_masse_size` (BIGINT) - Taille du fichier en bytes
    - `plan_de_masse_uploaded_at` (TIMESTAMPTZ) - Date d'upload du fichier

  2. Index de performance
    - Index sur plan_de_masse_path pour les requêtes de fichiers
    - Index sur plan_de_masse_uploaded_at pour les tris par date

  3. Documentation
    - Commentaires sur chaque colonne pour clarifier l'usage
*/

-- Ajouter les nouvelles colonnes à la table missions
DO $$ 
BEGIN
  -- URL publique du fichier plan de masse
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'missions' AND column_name = 'plan_de_masse_url'
  ) THEN
    ALTER TABLE missions ADD COLUMN plan_de_masse_url TEXT;
    RAISE NOTICE 'Added column: plan_de_masse_url';
  END IF;

  -- Chemin interne du fichier dans Supabase Storage
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'missions' AND column_name = 'plan_de_masse_path'
  ) THEN
    ALTER TABLE missions ADD COLUMN plan_de_masse_path TEXT;
    RAISE NOTICE 'Added column: plan_de_masse_path';
  END IF;

  -- Nom original du fichier uploadé
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'missions' AND column_name = 'plan_de_masse_filename'
  ) THEN
    ALTER TABLE missions ADD COLUMN plan_de_masse_filename TEXT;
    RAISE NOTICE 'Added column: plan_de_masse_filename';
  END IF;

  -- Taille du fichier en bytes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'missions' AND column_name = 'plan_de_masse_size'
  ) THEN
    ALTER TABLE missions ADD COLUMN plan_de_masse_size BIGINT;
    RAISE NOTICE 'Added column: plan_de_masse_size';
  END IF;

  -- Date d'upload du fichier
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'missions' AND column_name = 'plan_de_masse_uploaded_at'
  ) THEN
    ALTER TABLE missions ADD COLUMN plan_de_masse_uploaded_at TIMESTAMPTZ;
    RAISE NOTICE 'Added column: plan_de_masse_uploaded_at';
  END IF;
END $$;

-- Créer des index pour les performances
CREATE INDEX IF NOT EXISTS idx_missions_plan_de_masse_path 
ON missions(plan_de_masse_path) 
WHERE plan_de_masse_path IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_missions_plan_de_masse_uploaded_at 
ON missions(plan_de_masse_uploaded_at) 
WHERE plan_de_masse_uploaded_at IS NOT NULL;

-- Ajouter des commentaires pour la documentation (avec échappement correct des apostrophes)
COMMENT ON COLUMN missions.plan_de_masse_url IS 'URL publique du fichier plan de masse stocké dans Supabase Storage';
COMMENT ON COLUMN missions.plan_de_masse_path IS 'Chemin interne du fichier plan de masse dans le bucket Supabase Storage';
COMMENT ON COLUMN missions.plan_de_masse_filename IS 'Nom original du fichier plan de masse uploadé par l''expert';
COMMENT ON COLUMN missions.plan_de_masse_size IS 'Taille du fichier plan de masse en bytes';
COMMENT ON COLUMN missions.plan_de_masse_uploaded_at IS 'Date et heure d''upload du fichier plan de masse';

-- Vérifier que toutes les colonnes ont été ajoutées correctement
DO $$
DECLARE
    column_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'missions' 
    AND column_name IN (
        'plan_de_masse_url',
        'plan_de_masse_path', 
        'plan_de_masse_filename',
        'plan_de_masse_size',
        'plan_de_masse_uploaded_at'
    );
    
    IF column_count = 5 THEN
        RAISE NOTICE '✅ SUCCESS: All 5 plan de masse columns added successfully';
    ELSE
        RAISE WARNING '⚠️ WARNING: Only % out of 5 plan de masse columns were added', column_count;
    END IF;
END $$;

-- Log de la migration
DO $$
BEGIN
  RAISE NOTICE '🎉 Migration completed: Added plan de masse columns to missions table';
  RAISE NOTICE 'New columns: plan_de_masse_url, plan_de_masse_path, plan_de_masse_filename';
  RAISE NOTICE 'New columns: plan_de_masse_size, plan_de_masse_uploaded_at';
  RAISE NOTICE 'Added performance indexes for plan de masse fields';
  RAISE NOTICE 'Ready for Supabase Storage integration';
  RAISE NOTICE 'Next steps: Configure Supabase Storage bucket and update application code';
END $$;