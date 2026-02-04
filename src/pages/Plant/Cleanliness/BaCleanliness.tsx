import { useState, useEffect } from 'react';
import PanelContainer from '../../PanelContainer';
import { supabase } from '../../../db/SupabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface Storage {
  unit_id: string;
  warehouse_id: string;
  status: string;
}

interface PeriodData {
  [unitId: string]: {
    before: { url: string; source: 'P1' | 'P2' }[];
    after: { url: string; source: 'P1' | 'P2' }[];
  };
}

interface ImageMap {
  [periodKey: string]: PeriodData;
}

const BaCleanliness = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [selectedWeek, setSelectedWeek] = useState('W1');
  const [warehouses, setWarehouses] = useState<Storage[]>([]);
  const [mappedImages, setMappedImages] = useState<ImageMap>({});
  const [isLoading, setIsLoading] = useState(true);

  // Period key for indexing mappedImages
  const currentPeriodKey = `${selectedYear}-${selectedMonth}-${selectedWeek}`;

  useEffect(() => {
    const fetchWarehouses = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('storage')
        .select('unit_id, warehouse_id, status')
        .neq('status', 'OUT')
        .order('unit_id');

      if (error) {
        toast.error('Error fetching warehouses');
        console.error(error);
      } else {
        setWarehouses(data || []);
      }
      setIsLoading(false);
    };

    fetchWarehouses();
  }, []);

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());
  const months = [
    { value: '01', label: 'Januari' },
    { value: '02', label: 'Februari' },
    { value: '03', label: 'Maret' },
    { value: '04', label: 'April' },
    { value: '05', label: 'Mei' },
    { value: '06', label: 'Juni' },
    { value: '07', label: 'Juli' },
    { value: '08', label: 'Agustus' },
    { value: '09', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' },
  ];

  const handleFiles = (files: FileList, source: 'P1' | 'P2') => {
    const newMappedImages = { ...mappedImages };
    
    // Initialize current period if it doesn't exist
    if (!newMappedImages[currentPeriodKey]) {
      newMappedImages[currentPeriodKey] = {};
    }
    
    const currentPeriodData = { ...newMappedImages[currentPeriodKey] };

    Array.from(files).forEach((file) => {
      const fileName = file.name.toUpperCase();
      const parts = fileName.split(' ');
      if (parts.length < 2) return;

      const unitId = parts[0];
      const type = parts[1].includes('BEFORE') ? 'before' : parts[1].includes('AFTER') ? 'after' : null;

      if (type && unitId) {
        const url = URL.createObjectURL(file);
        if (!currentPeriodData[unitId]) {
          currentPeriodData[unitId] = { before: [], after: [] };
        }
        
        currentPeriodData[unitId][type] = [...currentPeriodData[unitId][type], { url, source }];
      }
    });

    newMappedImages[currentPeriodKey] = currentPeriodData;
    setMappedImages(newMappedImages);
    toast.success(`Images from ${source} mapped to ${currentPeriodKey}`);
  };

  const imageToBuffer = async (url: string) => {
    const response = await fetch(url);
    const blob = await response.blob();
    return await blob.arrayBuffer();
  };

  const getImageDimensions = (url: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        resolve({ width: 100, height: 100 });
      };
      img.src = url;
    });
  };

  const handleExport = async (allWeeks = false) => {
    const toastId = toast.loading('Generating Excel file with images...');
    const workbook = new ExcelJS.Workbook();
    const weeksToExport = allWeeks ? ['W1', 'W2', 'W3', 'W4'] : [selectedWeek];

    try {
      for (const week of weeksToExport) {
        const sheet = workbook.addWorksheet(week);
        const periodKey = `${selectedYear}-${selectedMonth}-${week}`;
        const periodData = mappedImages[periodKey] || {};

        // 1. Set column widths and keys first (without headers to avoid overwriting Row 1)
        sheet.columns = [
          { key: 'unit_id', width: 15 },
          { key: 'warehouse_id', width: 20 },
          { key: 'p1_before', width: 20 },
          { key: 'p1_after', width: 20 },
          { key: 'p2_before', width: 20 },
          { key: 'p2_after', width: 20 },
        ];

        // Get month name
        const monthLabel = months.find(m => m.value === selectedMonth)?.label || '';
        
        // 2. Add Title Row (Row 1)
        const titleRow = sheet.getRow(1);
        titleRow.getCell(1).value = `Week ${week.substring(1)} ${monthLabel} ${selectedYear}`;
        titleRow.font = { bold: true, size: 14 };
        titleRow.alignment = { vertical: 'middle', horizontal: 'center' };
        titleRow.height = 30;
        sheet.mergeCells(1, 1, 1, 6); // Merge across all 6 columns

        // 3. Spacer Row (Row 2) - Empty and small height
        sheet.getRow(2).height = 10;

        // 4. Header Row (Row 3)
        const headerRow = sheet.getRow(3);
        headerRow.values = ['Unit ID', 'Warehouse ID', 'P1 BEFORE', 'P1 AFTER', 'P2 BEFORE', 'P2 AFTER'];
        headerRow.font = { bold: true };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        headerRow.height = 25;
        headerRow.fill = { type: 'pattern', pattern: 'none' };
        
        // Clear Row 1 headers that were automatically added by sheet.columns
        // Actually, sheet.columns adds headers to row 1 by default. Let's just overwrite them.
        
        // Add data
        for (let i = 0; i < warehouses.length; i++) {
          const wh = warehouses[i];
          const rowIndex = i + 4; // Data starts at Row 4
          const unitImages = periodData[wh.unit_id] || { before: [], after: [] };
          
          sheet.getRow(rowIndex).values = [wh.unit_id, wh.warehouse_id];
          // Set row height to 150 pixels (Excel row height is in points, 1 pixel is ~0.75 points)
          // 150 * 0.75 = 112.5 points
          sheet.getRow(rowIndex).height = 112.5; 

          const imageSpots = [
            { type: 'before', source: 'P1', col: 3 },
            { type: 'after', source: 'P1', col: 4 },
            { type: 'before', source: 'P2', col: 5 },
            { type: 'after', source: 'P2', col: 6 },
          ];

          for (const spot of imageSpots) {
            const images = spot.type === 'before' 
              ? unitImages.before.filter(img => img.source === spot.source)
              : unitImages.after.filter(img => img.source === spot.source);
            
            if (images.length > 0) {
              try {
                // Just take the first image if there are multiple for simplicity in Excel
                const imgUrl = images[0].url;
                const { width: naturalWidth, height: naturalHeight } = await getImageDimensions(imgUrl);
                const imgBuffer = await imageToBuffer(imgUrl);
                
                const imageId = workbook.addImage({
                  buffer: imgBuffer,
                  extension: 'jpeg',
                });

                // Fixed dimensions approach - using larger size to compensate for Excel scaling
                // All images: height = 200px (ExcelJS seems to scale down)
                // Width calculated from aspect ratio
                const imgAspectRatio = naturalWidth / naturalHeight;
                
                const imgHeightPx = 200; // Larger to ensure it fills 150px cell
                const imgWidthPx = imgHeightPx * imgAspectRatio;
                
                // Alternative approach: Use fractional column index for centering
                // For a ~100px wide image in a 160px column, shift by ~0.2 columns
                const cellWidthPx = 160;
                const centerOffsetFraction = (cellWidthPx - imgWidthPx) / (2 * cellWidthPx);
                const fractionalCol = (spot.col - 1) + centerOffsetFraction;

                sheet.addImage(imageId, {
                  tl: { 
                    col: fractionalCol, // Use fractional column for centering
                    row: rowIndex - 1, 
                    colOff: 0,
                    rowOff: 0
                  } as any,
                  ext: { width: imgWidthPx, height: imgHeightPx },
                  editAs: 'oneCell'
                });
              } catch (err) {
                console.error('Error adding image to excel:', err);
                sheet.getCell(rowIndex, spot.col).value = 'Error loading image';
              }
            } else {
              sheet.getCell(rowIndex, spot.col).value = 'N/A';
            }
          }
        }

        // Alignment and borders for all cells in the table range (Header starts at Row 3)
        const lastDataRow = warehouses.length + 3; 
        for (let r = 3; r <= lastDataRow; r++) {
          const row = sheet.getRow(r);
          for (let c = 1; c <= 6; c++) {
            const cell = row.getCell(c);
            
            // Alignment
            if (r === 3) {
              cell.alignment = { vertical: 'middle', horizontal: 'center' };
            } else if (c <= 2) {
              cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
            } else {
              cell.alignment = { vertical: 'middle', horizontal: 'center' };
            }

            // Border
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };
          }
        }

        // Set Print Area and Page Setup
        sheet.pageSetup = {
          printArea: `A1:F${lastDataRow}`,
          orientation: 'portrait',
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0, // Auto
          margins: {
            left: 0.7, right: 0.7,
            top: 0.75, bottom: 0.75,
            header: 0.3, footer: 0.3
          }
        };
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const fileName = allWeeks 
        ? `BA_Cleanliness_${selectedYear}_${selectedMonth}_All_Weeks.xlsx`
        : `BA_Cleanliness_${selectedYear}_${selectedMonth}_${selectedWeek}.xlsx`;
      
      saveAs(new Blob([buffer]), fileName);
      toast.success('Excel file exported successfully', { id: toastId });
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export Excel file', { id: toastId });
    }
  };

  const DropZone = ({ source }: { source: 'P1' | 'P2' }) => {
    const [isDragOver, setIsDragOver] = useState(false);

    return (
      <div className="mb-4">
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            if (e.dataTransfer.files) handleFiles(e.dataTransfer.files, source);
          }}
          className={`flex h-24 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition ${
            isDragOver 
              ? 'border-primary bg-primary/10' 
              : 'border-stroke bg-gray-50 hover:bg-gray-100 dark:border-strokedark dark:bg-meta-4'
          }`}
          onClick={() => document.getElementById(`file-input-${source}`)?.click()}
        >
          <div className="flex flex-col items-center justify-center">
            <svg className="mb-1 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 20 16" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
            </svg>
            <p className="text-[10px] text-gray-500 font-medium">Click or drag images for {source === 'P1' ? 'Periode 1' : 'Periode 2'}</p>
          </div>
          <input
            id={`file-input-${source}`}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files, source)}
          />
        </div>
      </div>
    );
  };

  const currentPeriodData = mappedImages[currentPeriodKey] || {};

  const PeriodCluster = ({ title, source }: { title: string; source: 'P1' | 'P2' }) => (
    <div className="flex flex-col gap-4 rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark">
      <div className="border-b border-stroke pb-2 dark:border-strokedark">
        <h3 className="text-lg font-bold text-primary dark:text-white uppercase tracking-widest">
          {title}
        </h3>
      </div>
      
      <DropZone source={source} />

      <div className="max-w-full overflow-x-auto">
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-gray-2 text-left dark:bg-meta-4">
              <th className="px-2 py-3 font-semibold text-black dark:text-white text-xs">Unit ID</th>
              <th className="px-2 py-3 font-semibold text-black dark:text-white text-xs text-center font-bold">BEFORE</th>
              <th className="px-2 py-3 font-semibold text-black dark:text-white text-xs text-center font-bold">AFTER</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={3} className="py-10 text-center text-xs">Loading warehouses...</td></tr>
            ) : warehouses.length === 0 ? (
              <tr><td colSpan={3} className="py-10 text-center text-xs text-gray-400">N/A</td></tr>
            ) : (
              warehouses.map((wh) => {
                const unitImages = currentPeriodData[wh.unit_id] || { before: [], after: [] };
                const beforeImages = unitImages.before.filter(img => img.source === source);
                const afterImages = unitImages.after.filter(img => img.source === source);
                
                return (
                  <tr key={`${wh.unit_id}-${source}`} className="border-b border-[#eee] dark:border-strokedark hover:bg-gray-50 dark:hover:bg-meta-4/30 transition">
                    <td className="px-2 py-2">
                      <p className="font-bold text-black dark:text-white text-[11px]">{wh.unit_id}</p>
                      <p className="text-[9px] text-gray-500">{wh.warehouse_id}</p>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap justify-center gap-1 min-h-[40px] items-center">
                        {beforeImages.length > 0 ? beforeImages.map((img, i) => (
                          <img key={i} src={img.url} alt="Before" className="h-16 w-auto object-contain rounded border border-stroke shadow-sm" />
                        )) : (
                          <span className="text-[10px] text-gray-300 font-bold">N/A</span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap justify-center gap-1 min-h-[40px] items-center">
                        {afterImages.length > 0 ? afterImages.map((img, i) => (
                          <img key={i} src={img.url} alt="After" className="h-16 w-auto object-contain rounded border border-stroke shadow-sm" />
                        )) : (
                          <span className="text-[10px] text-gray-300 font-bold">N/A</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <PanelContainer title="Berita Acara Cleanliness">
      <Toaster />
      <div className="flex flex-col gap-6">
        {/* Top Single Column: Global Filter Header */}
        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
              <div>
                <label className="mb-2 block text-xs font-bold text-black dark:text-white uppercase tracking-wider">Tahun</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full rounded border border-stroke bg-transparent px-4 py-2.5 text-sm font-medium outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input"
                >
                  {years.map(year => <option key={year} value={year}>{year}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold text-black dark:text-white uppercase tracking-wider">Bulan</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full rounded border border-stroke bg-transparent px-4 py-2.5 text-sm font-medium outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input"
                >
                  {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold text-black dark:text-white uppercase tracking-wider">Minggu (Week)</label>
                <div className="flex items-center gap-5 py-2">
                  {['W1', 'W2', 'W3', 'W4'].map(week => (
                    <label key={week} className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        name="week"
                        value={week}
                        checked={selectedWeek === week}
                        onChange={(e) => setSelectedWeek(e.target.value)}
                        className="h-4 w-4 text-primary focus:ring-primary border-stroke"
                      />
                      <span className="text-sm font-medium group-hover:text-primary transition">{week}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex flex-wrap gap-4 border-t border-stroke pt-5 dark:border-strokedark">
              <button
                onClick={() => handleExport(false)}
                className="inline-flex items-center justify-center gap-2.5 rounded bg-primary px-6 py-2.5 text-center font-medium text-white hover:bg-opacity-90 lg:px-8"
              >
                <span>
                  <svg className="fill-current" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15.75 11.25V14.25C15.75 14.6478 15.592 15.0294 15.3107 15.3107C15.0294 15.592 14.6478 15.75 14.25 15.75H3.75C3.35218 15.75 2.97064 15.592 2.68934 15.3107C2.40804 15.0294 2.25 14.6478 2.25 14.25V11.25" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M5.25 7.5L9 11.25L12.75 7.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 11.25V2.25" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                Export This Week
              </button>
              
              <button
                onClick={() => handleExport(true)}
                className="inline-flex items-center justify-center gap-2.5 rounded bg-meta-3 px-6 py-2.5 text-center font-medium text-white hover:bg-opacity-90 lg:px-8"
              >
                <span>
                  <svg className="fill-current" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15.75 11.25V14.25C15.75 14.6478 15.592 15.0294 15.3107 15.3107C15.0294 15.592 14.6478 15.75 14.25 15.75H3.75C3.35218 15.75 2.97064 15.592 2.68934 15.3107C2.40804 15.0294 2.25 14.6478 2.25 14.25V11.25" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 2.25H14.25C14.6478 2.25 15.0294 2.40804 15.3107 2.68934C15.592 2.97064 15.75 3.35218 15.75 3.75V6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2.25 6V3.75C2.25 3.35218 2.40804 2.97064 2.68934 2.68934C2.97064 2.40804 3.35218 2.25 3.75 2.25H6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M5.25 10.5L9 14.25L12.75 10.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 14.25V5.25" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                Export All Weeks
              </button>
            </div>
          </div>
          <div className="px-5 pb-3">
             <p className="text-[10px] text-gray-400 italic font-medium leading-none">
              Active Context: <span className="text-primary font-bold">{currentPeriodKey}</span>
            </p>
          </div>
        </div>

        {/* Bottom Two Columns: Clustered Period Panels */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
          <PeriodCluster title="PERIODE 1" source="P1" />
          <PeriodCluster title="PERIODE 2" source="P2" />
        </div>
      </div>
    </PanelContainer>
  );
};

export default BaCleanliness;