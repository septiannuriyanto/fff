import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../../../db/SupabaseClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';
import { faRotate, faDownload, faChevronDown, faFilePdf, faFileImage } from '@fortawesome/free-solid-svg-icons';
import CompetencyCardFront from './CompetencyCardFront';
import CompetencyCardBack from './CompetencyCardBack';
import { Competency } from '../types/competency';

interface CompetencyCardProps {
  nrp: string;
}

interface ManpowerData {
  nrp: string;
  nama: string;
  position: string;
  portrait_photo_url: string | null;
}

const CompetencyCard = ({ nrp }: CompetencyCardProps) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [manpowerData, setManpowerData] = useState<ManpowerData | null>(null);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const cardRef = useRef<HTMLDivElement>(null);
  const frontCaptureRef = useRef<HTMLDivElement>(null);
  const backCaptureRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const generateQRCode = async () => {
    try {
      const url = `https://fff-project.vercel.app/profile/${nrp}?tab=competency`;
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 200,
        margin: 1,
        color: {
          dark: '#1e3a8a',
          light: '#ffffff',
        },
      });
      setQrCodeUrl(qrDataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  useEffect(() => {
    fetchData();
    generateQRCode();
  }, [nrp]);

  const fetchData = async () => {
    try {
      const { data: manpower, error: manpowerError } = await supabase
        .from('manpower')
        .select(`
          nrp, 
          nama, 
          position,
          portrait_photo_url,
          incumbent:position (
            incumbent
          )
        `)
        .eq('nrp', nrp)
        .single();

      if (manpowerError) throw manpowerError;
      
      const incumbent = manpower?.incumbent as { incumbent?: string } | null;
      const incumbentDescription = incumbent?.incumbent || manpower?.position || 'No Position';
      
      setManpowerData({
        ...manpower,
        position: incumbentDescription
      });

      const { data: competencyData, error: competencyError } = await supabase
        .from('v_competency_status')
        .select('competency_id, competency_name, status, expired_date')
        .eq('nrp', nrp)
        .order('competency_id');

      if (competencyError) throw competencyError;
      setCompetencies(competencyData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load card data');
    } finally {
      setLoading(false);
    }
  };

  const exportToImage = async (element: HTMLElement) => {
    // Small delay to ensure images are ready
    await new Promise(r => setTimeout(r, 100));
    const canvas = await html2canvas(element, {
      scale: 3,
      backgroundColor: '#ffffff', // Fixed white background to avoid transparent lines
      logging: false,
      useCORS: true,
      allowTaint: true,
      imageTimeout: 0,
      removeContainer: true,
      
    });
    return canvas;
  };

  const handleExport = async (type: 'front' | 'back' | 'all', format: 'jpg' | 'pdf') => {
    setShowDropdown(false);
    setDownloading(true);
    const loadingToast = toast.loading(`Generating ${format.toUpperCase()}...`);

    try {
      const pdf = format === 'pdf' ? new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      }) : null;

      const exportTasks: { ref: React.RefObject<HTMLDivElement>, name: string }[] = [];
      if (type === 'front' || type === 'all') exportTasks.push({ ref: frontCaptureRef, name: 'front' });
      if (type === 'back' || type === 'all') exportTasks.push({ ref: backCaptureRef, name: 'back' });

      for (let i = 0; i < exportTasks.length; i++) {
        const task = exportTasks[i];
        if (!task.ref.current) continue;

        const canvas = await exportToImage(task.ref.current);
        const imgData = canvas.toDataURL('image/jpeg', 1.0);

        if (format === 'pdf' && pdf) {
          if (i > 0) pdf.addPage();
          
          const imgProps = pdf.getImageProperties(imgData);
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
          
          const yPos = pdf.internal.pageSize.getHeight() > pdfHeight 
            ? (pdf.internal.pageSize.getHeight() - pdfHeight) / 2 
            : 0;

          pdf.addImage(imgData, 'JPEG', 0, yPos, pdfWidth, pdfHeight);
        } else if (format === 'jpg') {
          const link = document.createElement('a');
          link.href = imgData;
          link.download = `competency-card-${nrp}-${task.name}.jpg`;
          link.click();
        }
      }

      if (format === 'pdf' && pdf) {
        pdf.save(`competency-card-${nrp}-${type}.pdf`);
      }

      toast.success(`${type.toUpperCase()} exported as ${format.toUpperCase()}!`, { id: loadingToast });
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Export failed', { id: loadingToast });
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full aspect-[0.63] flex items-center justify-center bg-white/20 rounded-2xl backdrop-blur-sm">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!manpowerData) {
    return (
      <div className="w-full aspect-[0.63] flex items-center justify-center bg-white/20 rounded-2xl backdrop-blur-sm">
        <p className="text-sm text-slate-500">Failed to load card data</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      {/* Action Buttons */}
      <div className="flex justify-center gap-3 mb-4 relative" ref={dropdownRef}>
        <button
          onClick={() => setIsFlipped(!isFlipped)}
          className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-black dark:text-white rounded-xl shadow-lg transition-all font-bold text-sm backdrop-blur-sm border border-white/20"
        >
          <FontAwesomeIcon icon={faRotate} className={`transition-transform duration-500 ${isFlipped ? 'rotate-180' : ''}`} />
          {isFlipped ? 'Show Front' : 'Show Back'}
        </button>
        
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2 bg-primary/80 hover:bg-primary text-white rounded-xl shadow-lg transition-all font-bold text-sm backdrop-blur-sm disabled:opacity-50"
          >
            <FontAwesomeIcon icon={faDownload} className={downloading ? 'animate-bounce' : ''} />
            Download
            <FontAwesomeIcon icon={faChevronDown} className={`ml-1 text-[10px] transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-boxdark rounded-xl shadow-2xl border border-white/10 dark:border-white/5 overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-100">
              <div className="py-1">
                {[
                  { label: 'All Page (.jpg)', type: 'all', format: 'jpg', icon: faFileImage },
                  { label: 'All Page (.pdf)', type: 'all', format: 'pdf', icon: faFilePdf },
                  { label: 'Front Page (.jpg)', type: 'front', format: 'jpg', icon: faFileImage },
                  { label: 'Front Page (.pdf)', type: 'front', format: 'pdf', icon: faFilePdf },
                  { label: 'Rear Page (.jpg)', type: 'back', format: 'jpg', icon: faFileImage },
                  { label: 'Rear Page (.pdf)', type: 'back', format: 'pdf', icon: faFilePdf },
                ].map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleExport(opt.type as any, opt.format as any)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors border-b border-slate-100 last:border-0"
                  >
                    <FontAwesomeIcon icon={opt.icon} className="text-primary w-4" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Card Container with 3D Flip Effect - Portrait Orientation */}
      <div className="relative w-full aspect-[0.63] perspective-1000">
        <div
          ref={cardRef}
          className={`relative w-full h-full transition-transform duration-700 transform-style-3d ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Front Side */}
          <div
            className="absolute inset-0 backface-hidden rounded-2xl overflow-hidden shadow-2xl"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <CompetencyCardFront
              nrp={manpowerData.nrp}
              nama={manpowerData.nama}
              position={manpowerData.position}
              portrait_photo_url={manpowerData.portrait_photo_url}
              qrCodeUrl={qrCodeUrl}
            />
          </div>

          {/* Back Side */}
          <div
            className="absolute inset-0 backface-hidden rounded-2xl overflow-hidden shadow-2xl"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <CompetencyCardBack
              nrp={manpowerData.nrp}
              competencies={competencies}
              qrCodeUrl={qrCodeUrl}
            />
          </div>
        </div>
      </div>

      {/* Card Info */}
      <div className="mt-4 text-center">
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          {isFlipped ? 'Back side - Competency verification' : 'Front side - Official competency card'}
        </p>
      </div>

      {/* Hidden Capture Layer - Standardized non-3D versions for high-quality export */}
      <div className="fixed -left-[2000px] top-0 pointer-events-none opacity-0">
        <div ref={frontCaptureRef} className="w-[400px] aspect-[0.63] relative overflow-hidden rounded-2xl">
          <CompetencyCardFront
            nrp={manpowerData.nrp}
            nama={manpowerData.nama}
            position={manpowerData.position}
            portrait_photo_url={manpowerData.portrait_photo_url}
            qrCodeUrl={qrCodeUrl}
            isExporting={true}
          />
        </div>
        <div className="h-10"></div>
        <div ref={backCaptureRef} className="w-[400px] aspect-[0.63] relative overflow-hidden rounded-2xl">
          <CompetencyCardBack
            nrp={manpowerData.nrp}
            competencies={competencies}
            qrCodeUrl={qrCodeUrl}
            isExporting={true}
          />
        </div>
      </div>
    </div>
  );
};

export default CompetencyCard;
