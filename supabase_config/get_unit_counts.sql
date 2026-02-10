-- Create new RPC function to get unit counts (Total and by category)
CREATE OR REPLACE FUNCTION get_unit_counts()
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    total_count INTEGER;
    loader_count INTEGER;
    hauler_count INTEGER;
    support_count INTEGER;
BEGIN
    SELECT 
        COUNT(DISTINCT code_number),
        COUNT(DISTINCT CASE WHEN code_number LIKE 'EX%' THEN code_number END),
        COUNT(DISTINCT CASE WHEN code_number LIKE 'DT%' THEN code_number END),
        COUNT(DISTINCT CASE 
            WHEN code_number LIKE 'BGBMEX%' OR 
                 code_number LIKE 'BGMIEX%' OR 
                 code_number LIKE 'BGBMDZ%' OR 
                 code_number LIKE 'BGMIDZ%' OR 
                 code_number LIKE 'BGBMCP%' OR 
                 code_number LIKE 'BGMICP%' OR 
                 code_number LIKE 'GR%' OR 
                 code_number LIKE 'DZ%' 
            THEN code_number 
        END)
    INTO 
        total_count,
        loader_count,
        hauler_count,
        support_count
    FROM public.loto_records;

    RETURN json_build_object(
        'total', total_count,
        'loader', loader_count,
        'hauler', hauler_count,
        'support', support_count
    );
END;
$$;
