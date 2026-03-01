import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../../../../db/SupabaseClient';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Toaster, toast } from 'react-hot-toast';
import { Upload, X, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { Loader } from 'rsuite';

interface ImportWarehouseTransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const ImportWarehouseTransferModal: React.FC<ImportWarehouseTransferModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
}) => {
    const { appliedTheme, trialTheme } = useTheme();
    const theme = trialTheme || appliedTheme;
    const isDark = theme.baseTheme === 'dark';
    const cardOpacity = theme.card.opacity;

    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    };

    const parseTransferDate = (logsheetCode: string): string | null => {
        // Expected format: BRCG/WT/2026/02/01/OM01/0001
        try {
            const parts = logsheetCode.split('/');
            if (parts.length >= 6 && parts[0] === 'BRCG') {
                const year = parts[2];
                const month = parts[3];
                const day = parts[4];
                // Validate basic numeric structure
                if (/^\d{4}$/.test(year) && /^\d{2}$/.test(month) && /^\d{2}$/.test(day)) {
                    return `${year}-${month}-${day}`;
                }
            }
            return null;
        } catch (e) {
            return null;
        }
    };

    const handleFile = async (file: File) => {
        const extension = file.name.split('.').pop()?.toLowerCase();
        if (extension !== 'xlsx' && extension !== 'xls') {
            toast.error('Please upload an Excel file (.xlsx or .xls)');
            return;
        }

        setIsProcessing(true);
        setUploadProgress(null);

        try {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const rawData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

            if (rawData.length < 2) {
                throw new Error('File excel kosong atau tidak memiliki data.');
            }

            // Filter BRCG only and parse data
            // Header is at row 0: ["LOGSHEET_CODE","TANGGAL","WHOUSE_FROM","WHOUSE_TO","STOCKCODE","QTY*METER","SELISIH_FLOW_QTY_A_B","NOTE","STATUS"]
            const transfers: any[] = [];
            const header = rawData[0];

            // Map columns by name to be safer
            const colMap = {
                logsheet: header.findIndex((h: string) => h === 'LOGSHEET_CODE'),
                whFrom: header.findIndex((h: string) => h === 'WHOUSE_FROM'),
                whTo: header.findIndex((h: string) => h === 'WHOUSE_TO'),
                stockCode: header.findIndex((h: string) => h === 'STOCKCODE'),
                qty: header.findIndex((h: string) => h === 'QTY*METER'),
                note: header.findIndex((h: string) => h === 'NOTE'),
                status: header.findIndex((h: string) => h === 'STATUS'),
            };

            for (let i = 1; i < rawData.length; i++) {
                const row = rawData[i];
                const logsheetCode = String(row[colMap.logsheet] || '');

                if (logsheetCode.startsWith('BRCG')) {

                    //filter kalau MS01
                    const whFrom = String(row[colMap.whFrom] || '');
                    const whTo = String(row[colMap.whTo] || '');

                    // Skip if wh_from or wh_to is MS01
                    if (whFrom === 'MS01' || whTo === 'MS01') {
                        continue;
                    }

                    const transferDate = parseTransferDate(logsheetCode);
                    if (transferDate) {
                        transfers.push({
                            transfer_id: logsheetCode,
                            transfer_date: transferDate,
                            material_code: String(row[colMap.stockCode] || ''),
                            wh_from: whFrom,
                            wh_to: whTo,
                            qty: Number(row[colMap.qty] || 0),
                            note: String(row[colMap.note] || ''),
                            status: String(row[colMap.status] || ''),
                        });
                    }
                }
            }

            if (transfers.length === 0) {
                throw new Error('Tidak ada data yang diawali dengan "BRCG" atau format tanggal tidak valid.');
            }

            setUploadProgress({ current: 0, total: transfers.length });

            // Upsert into Supabase in chunks
            const chunkSize = 50;
            for (let i = 0; i < transfers.length; i += chunkSize) {
                const chunk = transfers.slice(i, i + chunkSize);
                const { error: upsertError } = await supabase
                    .from('oil_transfers')
                    .upsert(chunk, { onConflict: 'transfer_id' });

                if (upsertError) throw upsertError;
                setUploadProgress({ current: Math.min(i + chunkSize, transfers.length), total: transfers.length });
            }

            toast.success(`Berhasil mengimpor ${transfers.length} data transfer.`);
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Import error:', err);
            toast.error(err.message || 'Gagal memproses file excel.');
        } finally {
            setIsProcessing(false);
            setUploadProgress(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 backdrop-blur-sm bg-black/40">
            <div
                className="w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl relative border transition-all duration-500"
                style={{
                    backgroundColor: isDark ? `rgba(20, 20, 20, 0.95)` : `rgba(255, 255, 255, 0.95)`,
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                }}
            >
                <div className="p-6 flex items-center justify-between border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-500">
                            <Upload className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-gray-800 dark:text-gray-100 uppercase tracking-tight">Import Warehouse Transfer</h2>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Process Excel Report for BRCG Site</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors text-gray-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-8">
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => !isProcessing && fileInputRef.current?.click()}
                        className={`
              relative group cursor-pointer border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center gap-4 transition-all duration-300
              ${isDragging ? 'border-blue-500 bg-blue-500/5' : 'border-gray-200 dark:border-white/10 hover:border-blue-500/50 hover:bg-gray-50 dark:hover:bg-white/5'}
              ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
            `}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleFileSelect}
                            className="hidden"
                            disabled={isProcessing}
                        />

                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${isDragging ? 'bg-blue-500 text-white scale-110' : 'bg-gray-100 dark:bg-white/10 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500'}`}>
                            <FileText className="w-8 h-8" />
                        </div>

                        <div className="text-center">
                            <p className="text-sm font-black text-gray-700 dark:text-gray-200 tracking-tight uppercase">Drag & drop excel file here</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">or click to browse from computer</p>
                        </div>

                        <div className="mt-2 flex flex-wrap justify-center gap-3">
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[11px] font-black uppercase">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Auto-Filter Site BRCG
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-[11px] font-black uppercase">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Smart Date Parsing
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                        <div>
                            <p className="text-[11px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-wider">Important Note</p>
                            <p className="text-[10px] font-medium text-amber-700/80 dark:text-amber-400/80 mt-1 leading-relaxed">
                                The importer will only process rows where the LOGSHEET_CODE starts with 'BRCG'.
                                The transfer date will be extracted from the code (e.g. BRCG/WT/2026/02/01/...).
                            </p>
                        </div>
                    </div>
                </div>

                {isProcessing && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-white/90 dark:bg-black/90 backdrop-blur-md transition-all duration-300">
                        <Loader size="lg" vertical content="Processing..." className="font-black uppercase tracking-widest text-[10px]" />
                        {uploadProgress && (
                            <div className="w-48 h-1 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden mt-4">
                                <div
                                    className="h-full bg-blue-500 transition-all duration-300"
                                    style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                                />
                            </div>
                        )}
                        {uploadProgress && (
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                Processing {uploadProgress.current} / {uploadProgress.total} records
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImportWarehouseTransferModal;
