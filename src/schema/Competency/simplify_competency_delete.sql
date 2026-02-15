-- =====================================================
-- SIMPLIFY DELETION LOGIC (CASCADE & POLICIES)
-- =====================================================
-- Deskripsi: Mengganti logika trigger yang kompleks dengan 
-- ON DELETE CASCADE pada Foreign Key dan memastikan permission RLS benar.

-- 1. DROP OLD TRIGGERS & FUNCTIONS (Clean up)
DROP TRIGGER IF EXISTS trg_training_delete ON competency_history;
DROP FUNCTION IF EXISTS fn_after_training_delete();

-- 2. UPDATE FOREIGN KEY TO CASCADE
-- Ini memastikan jika history dihapus, status mapping-nya juga AKAN TERHAPUS otomatis.
ALTER TABLE competency_mapping 
DROP CONSTRAINT IF EXISTS fk_mapping_history;

ALTER TABLE competency_mapping
ADD CONSTRAINT fk_mapping_history
FOREIGN KEY (latest_history_id)
REFERENCES competency_history(id)
ON DELETE CASCADE;

-- 3. FIX PERMISSIONS (RLS) FOR CASCADE DELETE
-- Agar 'cascade delete' tidak diblokir oleh RLS, user (authenticated) perlu izin DELETE di table mapping
-- Kita tambahkan policy delete untuk authenticated user.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow delete mapping' AND tablename = 'competency_mapping') THEN
    CREATE POLICY "allow delete mapping" 
    ON competency_mapping 
    FOR DELETE 
    TO authenticated 
    USING (true);
  END IF;
END $$;

-- Pastikan policy INSERT/UPDATE juga ada biar aman (jika belum)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow update mapping' AND tablename = 'competency_mapping') THEN
    CREATE POLICY "allow update mapping" ON competency_mapping FOR UPDATE TO authenticated USING (true);
  END IF;
  
   IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow insert mapping' AND tablename = 'competency_mapping') THEN
    CREATE POLICY "allow insert mapping" ON competency_mapping FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;
