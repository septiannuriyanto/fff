-- =====================================================
-- MASS ASSIGNMENT SCRIPT
-- =====================================================
-- Task: Assign Competency ID 4 to all Manpower with Position ID 1 to 5
-- Date: Current Date
-- =====================================================

DO $$
DECLARE
  v_count integer;
BEGIN
  -- Insert into history for all matching manpower
  -- We rely on the trigger 'trg_training_insert' to automatically update 'competency_mapping'
  
  WITH target_manpower AS (
    SELECT nrp 
    FROM manpower 
    WHERE position::int BETWEEN 1 AND 5 -- Cast to int to ensure numeric comparison ranges 1-5
  ),
  inserted_rows AS (
    INSERT INTO competency_history (
      nrp, 
      competency_id, 
      training_date, 
      training_type, 
      note
    )
    SELECT 
      nrp, 
      4,              -- Competency ID
      CURRENT_DATE,   -- Today's date
      'mass_assignment',
      'Mass assignment for position 1-5'
    FROM target_manpower
    -- Optional: Prevent duplicate inserts for the same day to avoid spamming history if run multiple times
    WHERE NOT EXISTS (
      SELECT 1 FROM competency_history ch 
      WHERE ch.nrp = target_manpower.nrp 
      AND ch.competency_id = 4 
      AND ch.training_date = CURRENT_DATE
    )
    RETURNING nrp
  )
  
  SELECT count(*) INTO v_count FROM inserted_rows;
  
  RAISE NOTICE 'Successfully assigned Competency ID 4 to % manpower records.', v_count;
  
END $$;
