import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../db/SupabaseClient';
import { TbLoader, TbDownload, TbPrinter } from 'react-icons/tb';
import toast from 'react-hot-toast';
import { usePDF } from 'react-to-pdf';

interface ReportHeader {
  id: string;
  doc_no: string;
  plan_loading_date: string;
  created_by_nrp: string;
  created_by_name: string;
  approval_status: string;
  approved_by_name: string;
  approved_at: string;
  remarks: string;
}

interface ReportItem {
  line_no: number;
  bass_reference_number: string;
  classification_n: number;
  ampere: number;
  photo_url: string;
  notes: string | null;
}

const FooterContent: React.FC<{ docNo: string; printedAt: string }> = ({ docNo, printedAt }) => (
  <table
    style={{
      width: '100%',
      tableLayout: 'fixed',
      borderCollapse: 'collapse',
      fontSize: '8px',
      color: 'rgba(100, 98, 90, 0.5)',
      fontFamily: 'sans-serif',
      lineHeight: '1.3',
    }}
  >
    <tbody>
      <tr>
        <td style={{ width: '25%', textAlign: 'left', fontWeight: 600, verticalAlign: 'bottom', padding: 0 }}>
          {docNo}
        </td>
        <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'bottom', padding: 0 }}>
          <div>FFF Web App — Fuel, Oil and Waste Management System</div>
          <div>PT. Pamapersada Nusantara Site BRCG.</div>
          <div style={{ fontStyle: 'italic', marginTop: '1px' }}>
            Kebenaran data sesuai dengan record yang telah disetujui secara digital.
          </div>
        </td>
        <td style={{ width: '25%', textAlign: 'right', verticalAlign: 'bottom', padding: 0 }}>
          {printedAt}
        </td>
      </tr>
    </tbody>
  </table>
);

const BatteryDocumentationPrint: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<ReportHeader | null>(null);
  const [items, setItems] = useState<ReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { toPDF, targetRef } = usePDF({
    filename: report ? `Berita_Acara_${report.doc_no}.pdf` : 'Berita_Acara.pdf',
    page: { margin: 15 },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const { data: header, error: headerError } = await supabase
          .from('battery_documentation_reports')
          .select('*, manpower_created:created_by_nrp(nama), manpower_approved:approved_by_nrp(nama)')
          .eq('id', id)
          .single();

        if (headerError) throw headerError;

        if (header.approval_status !== 'approved') {
          toast.error('Hanya dokumen yang sudah APPROVED yang dapat dicetak.');
          setTimeout(() => {
            if (!window.opener) navigate('/waste/battery-documentation');
            else window.close();
          }, 2000);
          return;
        }

        const mappedHeader: ReportHeader = {
          id: header.id,
          doc_no: header.doc_no,
          plan_loading_date: header.plan_loading_date,
          created_by_nrp: header.created_by_nrp,
          created_by_name: header.manpower_created?.nama || header.created_by_nrp,
          approval_status: header.approval_status,
          approved_by_name: header.manpower_approved?.nama || 'Unknown',
          approved_at: header.approved_at,
          remarks: header.remarks,
        };

        const { data: itemData, error: itemError } = await supabase
          .from('battery_documentation_items')
          .select('*')
          .eq('report_id', id)
          .order('line_no', { ascending: true });

        if (itemError) throw itemError;

        setReport(mappedHeader);
        setItems(itemData);
      } catch (error: any) {
        console.error('Print error:', error);
        toast.error('Gagal memuat data cetak');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) fetchData();
  }, [id, navigate]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <TbLoader className="h-10 w-10 animate-spin text-primary" />
          <p className="text-gray-500 font-medium">Menyiapkan Dokumen...</p>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const totalPcs = items.length;
  const totalAmpere = items.reduce((sum, item) => sum + (item.ampere || 0), 0);
  const printedAt = new Date().toLocaleString('id-ID');

  return (
    <>
      {/* Floating Action Buttons */}
      <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-3 no-print">
        <button
          onClick={() => toPDF()}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-2xl transition-all hover:scale-110 active:scale-95 shadow-blue-500/50"
          title="Download PDF"
        >
          <TbDownload size={24} />
        </button>
        <button
          onClick={() => window.print()}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-2xl transition-all hover:scale-110 active:scale-95 shadow-indigo-500/50"
          title="Print Document"
        >
          <TbPrinter size={24} />
        </button>
      </div>

      {/* ── MAIN CONTENT (targetRef — captured by react-to-pdf) ── */}
      <div
        ref={targetRef}
        style={{
          minHeight: '297mm',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'white',
          padding: '10mm',
          boxSizing: 'border-box',
        }}
        className="mx-auto max-w-[210mm] text-black font-sans bg-white"
      >
        <div style={{ flex: 1 }}>
          {/* Print Header */}
          <div className="mb-8 border-b-2 border-black pb-4 text-center">
            <h1 className="text-2xl font-bold uppercase">Berita Acara Pengambilan Baterai Bekas</h1>
            <p className="text-sm">Dokumentasi Lampiran Pendukung</p>
          </div>

          {/* Meta Information */}
          <div className="report-meta">
            <div className="meta-row">
              <div className="meta-item">
                <span className="label">Nomor Dokumen</span>
                <span>: {report.doc_no}</span>
              </div>
              <div className="meta-item">
                <span className="label">Status</span>
                <span className="status-approved">: {report.approval_status}</span>
              </div>
            </div>
            <div className="meta-row">
              <div className="meta-item">
                <span className="label">Tanggal Rencana</span>
                <span>
                  :{' '}
                  {new Date(report.plan_loading_date).toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="meta-item">
                <span className="label">Dicetak Pada</span>
                <span>: {printedAt}</span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <table className="items-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>No</th>
                <th style={{ width: '120px' }}>BASS Ref #</th>
                <th style={{ width: '80px' }}>Klasifikasi</th>
                <th style={{ width: '80px' }}>Ampere</th>
                <th>Foto Dokumentasi</th>
                <th style={{ width: '150px' }}>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td className="text-center">{item.line_no}</td>
                  <td className="font-bold">{item.bass_reference_number}</td>
                  <td className="text-center">N{item.classification_n}</td>
                  <td className="text-center font-bold">{item.ampere} AH</td>
                  <td className="text-center">
                    <img
                      src={item.photo_url}
                      alt="Documentation"
                      className="doc-photo"
                      crossOrigin="anonymous"
                    />
                  </td>
                  <td className="italic">{item.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Summary */}
          <div className="mt-8 mb-8 break-inside-avoid">
            <table
              style={{
                width: 'auto',
                minWidth: '300px',
                border: '2px solid black',
                borderCollapse: 'collapse',
                backgroundColor: '#f3f4f6',
              }}
            >
              <thead>
                <tr>
                  <th
                    colSpan={2}
                    style={{
                      padding: '8px',
                      borderBottom: '2px solid black',
                      textAlign: 'left',
                      fontSize: '11px',
                      textTransform: 'uppercase',
                    }}
                  >
                    Ringkasan Dokumentasi
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '8px', fontSize: '12px' }}>Total Baterai</td>
                  <td style={{ padding: '8px', fontSize: '12px', fontWeight: 'bold', textAlign: 'right' }}>
                    {totalPcs} Unit
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '8px', fontSize: '12px', borderTop: '1px solid black' }}>
                    Total Kapasitas
                  </td>
                  <td
                    style={{
                      padding: '8px',
                      fontSize: '15px',
                      fontWeight: 'bold',
                      textAlign: 'right',
                      borderTop: '1px solid black',
                    }}
                  >
                    {totalAmpere} AH
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Approval Details */}
          <div className="mt-8 grid grid-cols-2 gap-8">
            <div className="rounded border border-black p-4 bg-gray-50">
              <p className="text-xs font-bold uppercase mb-2">Riwayat Persetujuan:</p>
              <div className="text-xs">
                <div className="mb-1">
                  <span className="font-bold">Dibuat Oleh:</span> {report.created_by_name}
                </div>
                <div className="mb-1">
                  <span className="font-bold">Disetujui Oleh:</span> {report.approved_by_name}
                </div>
                <div className="mb-1">
                  <span className="font-bold">Waktu Approval:</span>{' '}
                  {report.approved_at ? new Date(report.approved_at).toLocaleString('id-ID') : '-'}
                </div>
                <hr className="mt-4 mb-2 border-black/10" />
                <div className="italic text-[10px]" style={{ color: '#4b5563' }}>
                  {report.remarks}
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between text-center pt-8">
              <div>
                <p className="text-sm font-bold">Authorized Signature</p>
                <div className="mt-12 text-[10px] italic text-gray-400 font-mono">[ SIGNED ]</div>
                <div className="mt-2 border-b border-black w-48 mx-auto"></div>
                <p className="text-[10px] mt-1">(Verified by System Approval)</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── FOOTER INLINE — untuk react-to-pdf (PDF download) ── */}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: '8px',
            borderTop: '1px solid rgba(100, 98, 90, 0.18)',
          }}
          className="pdf-footer-inline"
        >
          <FooterContent docNo={report.doc_no} printedAt={printedAt} />
        </div>
      </div>

      {/* ── FOOTER FIXED — untuk window.print() (muncul di setiap halaman) ── */}
      <div className="print-footer-fixed">
        <FooterContent docNo={report.doc_no} printedAt={printedAt} />
      </div>

      <style>{`
        @page {
          size: A4 portrait;
          margin: 10mm;
        }

        /* Sembunyikan footer fixed di layar */
        .print-footer-fixed { display: none; }

        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }

          /* Footer inline (untuk PDF) disembunyikan saat print — pakai yang fixed */
          .pdf-footer-inline { display: none !important; }

          /* Footer fixed muncul di tiap halaman saat window.print() */
          .print-footer-fixed {
            display: block;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 5px 10mm 4px;
            border-top: 1px solid rgba(100, 98, 90, 0.18);
            background: white;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }

        /* ── Layout helpers ── */
        .report-meta { display: table; width: 100%; margin-bottom: 20px; }
        .meta-row { display: table-row; }
        .meta-item { display: table-cell; padding: 4px 0; }
        .meta-item:nth-child(1) { width: 60%; }
        .meta-item:nth-child(2) { width: 40%; padding-left: 20px; }
        .meta-item .label { display: inline-block; font-weight: bold; white-space: nowrap; }
        .meta-item:nth-child(1) .label { width: 140px; }
        .meta-item:nth-child(2) .label { width: 110px; }

        .status-approved { color: #15803d !important; font-weight: bold; text-transform: uppercase; }

        .items-table { width: 100%; border-collapse: collapse; border: 1px solid black; font-size: 10px; }
        .items-table th, .items-table td { border: 1px solid black; padding: 8px; text-align: left; vertical-align: middle; }
        .items-table th { background-color: #f1f5f9 !important; -webkit-print-color-adjust: exact; }

        .text-center { text-align: center !important; }

        .doc-photo { max-height: 180px; max-width: 100%; display: block; margin: 0 auto; }

        .break-inside-avoid { page-break-inside: avoid; }
      `}</style>
    </>
  );
};

export default BatteryDocumentationPrint;