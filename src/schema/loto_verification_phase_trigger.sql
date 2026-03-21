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

    -- Mengkonversi jam ke zona waktu target (Makassar/WITA, GMT+8) lalu cast ke format time murni
    v_local_time := (p_refueling_start AT TIME ZONE 'Asia/Makassar')::time;

    -- Fase 2: antara 11:45 s/d 13:15
    IF v_local_time >= '11:45:00'::time AND v_local_time <= '13:15:00'::time THEN
        v_phase := 2;
    -- Fase 1: sebelum 11:45
    ELSIF v_local_time < '11:45:00'::time THEN
        v_phase := 1;
    -- Fase 3: setelah 13:15
    ELSE
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
