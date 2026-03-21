-- 1. Tambahkan kolom secara aman jika sebelumnya belum ada
ALTER TABLE public.loto_verification 
ADD COLUMN IF NOT EXISTS refueling_phase smallint NULL;

-- 2. Fungsi RPC untuk Mengekstraksi Fase berdasarkan Jam (GMT+8)
CREATE OR REPLACE FUNCTION public.get_refueling_phase(p_refueling_start timestamp with time zone)
RETURNS smallint
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_local_time time;
    v_phase smallint;
BEGIN
    IF p_refueling_start IS NULL THEN
        RETURN NULL;
    END IF;

    -- Data sudah dalam Asia/Makassar, langsung cast ke time
    v_local_time := p_refueling_start::time;

    -- Shift 1
    IF v_local_time >= '06:00:00'::time AND v_local_time <= '11:44:59'::time THEN
        v_phase := 1;
    ELSIF v_local_time >= '11:45:00'::time AND v_local_time <= '13:15:59'::time THEN
        v_phase := 2;
    ELSIF v_local_time >= '13:16:00'::time AND v_local_time <= '17:59:59'::time THEN
        v_phase := 3;
    
    -- Shift 2
    ELSIF v_local_time >= '18:00:00'::time AND v_local_time <= '23:34:59'::time THEN
        v_phase := 1;
    ELSIF (v_local_time >= '23:35:00'::time AND v_local_time <= '23:59:59'::time) OR 
          (v_local_time >= '00:00:00'::time AND v_local_time <= '01:15:59'::time) THEN
        v_phase := 2;
    ELSIF v_local_time >= '01:16:00'::time AND v_local_time <= '05:59:59'::time THEN
        v_phase := 3;
    END IF;

    RETURN v_phase;
END;
$$;


-- 3. Fungsi Trigger untuk Automatisasi saat Insert/Update
CREATE OR REPLACE FUNCTION public.trg_loto_verification_phase()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.refueling_start IS NOT NULL THEN
        NEW.refueling_phase := public.get_refueling_phase(NEW.refueling_start);
    END IF;
    RETURN NEW;
END;
$$;

-- 4. Bind / Pasangkan fungsi triggernya ke table (hapus yang lama kalau sudah ada)
DROP TRIGGER IF EXISTS trg_loto_verification_set_phase ON public.loto_verification;

CREATE TRIGGER trg_loto_verification_set_phase
BEFORE INSERT OR UPDATE OF refueling_start
ON public.loto_verification
FOR EACH ROW
EXECUTE FUNCTION public.trg_loto_verification_phase();


-----------------------------------------------------------------------------------
-- 5. SCRIPT UNTUK BACKFILL DATA LAMA (RUN SEKALI SAJA DI SQL EDITOR)
-----------------------------------------------------------------------------------
-- UPDATE public.loto_verification
-- SET refueling_phase = public.get_refueling_phase(refueling_start)
-- WHERE refueling_start IS NOT NULL AND refueling_phase IS NULL;
