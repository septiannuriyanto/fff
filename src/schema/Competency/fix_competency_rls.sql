-- =====================================================
-- FIX RLS & TRIGGER PERMISSIONS
-- =====================================================

-- 1. DROP TRIGGER & FUNCTION FIRST
DROP TRIGGER IF EXISTS trg_training_insert ON competency_history;
DROP FUNCTION IF EXISTS fn_after_training_insert();

-- 2. RECREATE FUNCTION AS 'SECURITY DEFINER'
-- This ensures the function runs with the privileges of the creator (superuser/admin),
-- bypassing RLS checks on 'competency_mapping' when triggered by a normal user.
CREATE OR REPLACE FUNCTION fn_after_training_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  v_days smallint;
  v_expired date;
BEGIN

  -- Ambil durasi berlaku dari master competency
  SELECT days_active
  INTO v_days
  FROM competency
  WHERE id = NEW.competency_id;

  -- Hitung expired date jika tidak disediakan
  IF NEW.expired_date IS NULL AND v_days IS NOT NULL THEN
    v_expired := NEW.training_date + v_days;
  ELSE
    v_expired := NEW.expired_date;
  END IF;

  -- Insert atau Update ke Mapping
  INSERT INTO competency_mapping (
    nrp,
    competency_id,
    obtained_date,
    expired_date,
    active,
    document_url,
    latest_history_id
  )
  VALUES (
    NEW.nrp,
    NEW.competency_id,
    NEW.training_date,
    v_expired,
    true,
    NEW.document_url,
    NEW.id
  )
  ON CONFLICT (nrp, competency_id)
  DO UPDATE SET
    obtained_date = EXCLUDED.obtained_date,
    expired_date = EXCLUDED.expired_date,
    active = true,
    document_url = EXCLUDED.document_url,
    latest_history_id = EXCLUDED.latest_history_id;

  RETURN NEW;
END;
$$;

-- 3. RECREATE TRIGGER
CREATE TRIGGER trg_training_insert
AFTER INSERT ON competency_history
FOR EACH ROW
EXECUTE FUNCTION fn_after_training_insert();

-- 4. ADDITIONAL RLS SAFEGUARDS (Just in case)
-- Allow authenticated users to view mapping (already in v2, but forcing ensure here)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'read mapping' AND tablename = 'competency_mapping') THEN
    CREATE POLICY "read mapping" ON competency_mapping FOR SELECT TO authenticated USING (true);
  END IF;
  
   -- Allow authenticated users to insert/update mapping directly IS NOT RECOMMENDED
   -- because we want it managed by the trigger. 
   -- But we need to ensure they can DELETE their history if needed, which might need to update mapping?
   -- For now, let's rely on the SECURITY DEFINER trigger for the main flow.
END $$;
