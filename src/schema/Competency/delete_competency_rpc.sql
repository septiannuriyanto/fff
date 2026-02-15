-- =====================================================
-- ROBUST DELETE FUNCTION
-- =====================================================
-- Function to strictly delete competency status and history
-- ensuring the UI updates correctly.

DROP FUNCTION IF EXISTS delete_competency_data(text, bigint);

CREATE OR REPLACE FUNCTION delete_competency_data(
  p_nrp text,
  p_competency_id bigint
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Delete from mapping (This is what the View shows)
  DELETE FROM competency_mapping
  WHERE nrp = p_nrp AND competency_id = p_competency_id;

  -- 2. Delete from history (Optional: Delete all history for this competency/user? 
  --    Or just the latest? For a hard delete, let's delete all related history 
  --    to ensure it's completely 'gone' as if never assigned, or keep logs?
  --    Usually 'Delete' in this context implies removing the record.)
  DELETE FROM competency_history
  WHERE nrp = p_nrp AND competency_id = p_competency_id;
  
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION delete_competency_data(text, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_competency_data(text, bigint) TO service_role;
