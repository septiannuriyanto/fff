-- 1. Membersihkan tabel (jika perlu untuk testing)
DELETE FROM public.loto_records;

-- 2. Insert Data Dummy untuk setiap kategori

-- LOADER (EX...)
INSERT INTO public.loto_records (code_number, photo_path, latitude, longitude) VALUES 
('EX01', 'path/to/ex01.jpg', -3.5, 115.5),
('EX02', 'path/to/ex02.jpg', -3.5, 115.5),
('EX05', 'path/to/ex05.jpg', -3.5, 115.5);

-- HAULER (DT...)
INSERT INTO public.loto_records (code_number, photo_path, latitude, longitude) VALUES 
('DT01', 'path/to/dt01.jpg', -3.5, 115.5),
('DT02', 'path/to/dt02.jpg', -3.5, 115.5),
('DT10', 'path/to/dt10.jpg', -3.5, 115.5),
('DT15', 'path/to/dt15.jpg', -3.5, 115.5),
('DT20', 'path/to/dt20.jpg', -3.5, 115.5);

-- SUPPORT (BGBMEX, BGMIEX, BGBMDZ, BGMIDZ, BGBMCP, BGMICP, GR, DZ)
INSERT INTO public.loto_records (code_number, photo_path, latitude, longitude) VALUES 
('BGBMEX01', 'path/to/sup1.jpg', -3.5, 115.5),
('BGMIEX02', 'path/to/sup2.jpg', -3.5, 115.5),
('BGBMDZ03', 'path/to/sup3.jpg', -3.5, 115.5),
('BGMIDZ04', 'path/to/sup4.jpg', -3.5, 115.5),
('GR01',     'path/to/sup5.jpg', -3.5, 115.5),
('DZ01',     'path/to/sup6.jpg', -3.5, 115.5);

-- UNCATEGORIZED (Untuk melihat apakah ada yang tidak masuk kategori)
INSERT INTO public.loto_records (code_number, photo_path, latitude, longitude) VALUES 
('LV01', 'path/to/lv01.jpg', -3.5, 115.5);

-- 3. Query untuk Verifikasi Kategori (Sama dengan logic di Frontend)
SELECT 
    COUNT(DISTINCT code_number) as total_units,
    COUNT(DISTINCT CASE WHEN code_number LIKE 'EX%' THEN code_number END) as loader_count,
    COUNT(DISTINCT CASE WHEN code_number LIKE 'DT%' THEN code_number END) as hauler_count,
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
    END) as support_count,
    -- Cek sisa yang tidak masuk kategori
    COUNT(DISTINCT CASE 
        WHEN NOT (
             code_number LIKE 'EX%' OR 
             code_number LIKE 'DT%' OR 
             code_number LIKE 'BGBMEX%' OR 
             code_number LIKE 'BGMIEX%' OR 
             code_number LIKE 'BGBMDZ%' OR 
             code_number LIKE 'BGMIDZ%' OR 
             code_number LIKE 'BGBMCP%' OR 
             code_number LIKE 'BGMICP%' OR 
             code_number LIKE 'GR%' OR 
             code_number LIKE 'DZ%'
        ) 
        THEN code_number 
    END) as uncategorized_count
FROM public.loto_records;

-- HASIL YANG DIHARAPKAN:
-- Total Units: 15 (3 Loader + 5 Hauler + 6 Support + 1 Uncategorized)
-- Loader: 3
-- Hauler: 5
-- Support: 6
