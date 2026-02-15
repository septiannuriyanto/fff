-- =====================================================
-- FIX DELETION LOGIC
-- =====================================================
-- Deskripsi: Menambahkan trigger saat data history dihapus agar status kompetensi
-- kembali ke history sebelumnya atau dihapus jika tidak ada history tersisa.

-- 1. Create Function to handle deletion
CREATE OR REPLACE FUNCTION fn_after_training_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_previous_history RECORD;
  v_days smallint;
  v_expired date;
BEGIN
  -- Cek apakah record yang dihapus adalah yang saat ini aktif di mapping
  -- Kita cek apakah ada mapping yang referencing ke deleted ID (jika constraint set null belum jalan)
  -- Atau kita cari mapping by nrp & competency_id
  
  -- Cari history terbaru 'setelah' penghapusan (karena ini AFTER DELETE, record sudah hilang)
  SELECT *
  INTO v_previous_history
  FROM competency_history
  WHERE nrp = OLD.nrp 
    AND competency_id = OLD.competency_id
  ORDER BY training_date DESC, id DESC
  LIMIT 1;

  IF FOUND THEN
    -- Jika ada history sebelumnya, restore status ke history tersebut
    
    -- Ambil durasi days_active
    SELECT days_active INTO v_days FROM competency WHERE id = v_previous_history.competency_id;
    
    -- Hitung expired
    IF v_previous_history.expired_date IS NULL AND v_days IS NOT NULL THEN
      v_expired := v_previous_history.training_date + v_days;
    ELSE
      v_expired := v_previous_history.expired_date;
    END IF;

    -- Update Mapping
    UPDATE competency_mapping
    SET
      obtained_date = v_previous_history.training_date,
      expired_date = v_expired,
      active = true, -- Asumsi aktif dulu, nanti job nightly bisa set false kalau expired
      document_url = v_previous_history.document_url,
      latest_history_id = v_previous_history.id
    WHERE nrp = OLD.nrp AND competency_id = OLD.competency_id;
    
  ELSE
    -- Jika tidak ada history tersisa, hapus dari mapping
    DELETE FROM competency_mapping
    WHERE nrp = OLD.nrp AND competency_id = OLD.competency_id;
  END IF;

  RETURN OLD;
END;
$$;

-- 2. Create Trigger
DROP TRIGGER IF EXISTS trg_training_delete ON competency_history;

CREATE TRIGGER trg_training_delete
AFTER DELETE ON competency_history
FOR EACH ROW
EXECUTE FUNCTION fn_after_training_delete();
