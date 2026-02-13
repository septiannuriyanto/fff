CREATE OR REPLACE FUNCTION rpc_get_ritation_dashboard_analytics(p_prefix text, p_period int)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    result JSONB;
    v_last_date date;
    v_plan_qty numeric;
    v_ba_url text;
    v_po_number text;
    v_po_url text;
    v_po_qty numeric;
    v_po_rem numeric;
BEGIN
    -- 1. Get Last Ritation Date
    SELECT MAX(ritation_date) INTO v_last_date
    FROM ritasi_fuel
    WHERE no_surat_jalan LIKE p_prefix;

    -- 2. Get Plan and BA URL from plan_order
    SELECT (COALESCE(plan_fuel_ob, 0) + COALESCE(plan_fuel_coal, 0) + COALESCE(plan_fuel_others, 0)), doc_url
    INTO v_plan_qty, v_ba_url
    FROM plan_order
    WHERE period::text = p_period::text;

    -- 3. Get PO Status and PO URL from po_doc/po_fuel
    -- Using po_fuel for doc_url as per previous fetcher logic
    SELECT po_number, doc_url, COALESCE(po_qty, 0), COALESCE(remaining_qty, 0)
    INTO v_po_number, v_po_url, v_po_qty, v_po_rem
    FROM po_fuel
    WHERE period::text = p_period::text
    LIMIT 1;

    -- 4. Build Final JSON structure
    SELECT jsonb_build_object(
        'last_ritation_date', v_last_date,
        'plan_qty', COALESCE(v_plan_qty, 0),
        'ba_request_url', v_ba_url,
        'po_number', v_po_number,
        'po_doc_url', v_po_url,
        'po_qty', COALESCE(v_po_qty, 0),
        'po_remaining_qty', COALESCE(v_po_rem, 0),
        'total_actual_qty', (SELECT COALESCE(SUM(qty_sj), 0) FROM ritasi_fuel WHERE no_surat_jalan LIKE p_prefix),
        'total_actual_count', (SELECT COUNT(*) FROM ritasi_fuel WHERE no_surat_jalan LIKE p_prefix),
        'daily_actuals', (
            SELECT jsonb_agg(d) FROM (
                SELECT ritation_date as date, SUM(qty_sj) as qty, COUNT(*) as count
                FROM ritasi_fuel
                WHERE no_surat_jalan LIKE p_prefix
                GROUP BY 1 ORDER BY 1
            ) d
        ),
        'daily_reconciles', (
            SELECT jsonb_agg(r) FROM (
                SELECT ritation_date as date, SUM(qty_sonding) as qty
                FROM ritasi_fuel
                WHERE no_surat_jalan LIKE p_prefix
                GROUP BY 1 ORDER BY 1
            ) r
        )
    ) INTO result;

    RETURN result;
END;
$$;
