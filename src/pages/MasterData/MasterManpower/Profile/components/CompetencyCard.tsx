import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../../../db/SupabaseClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRotate, faDownload } from '@fortawesome/free-solid-svg-icons';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';
import CompetencyCardFront from './CompetencyCardFront';
import CompetencyCardBack from './CompetencyCardBack';

interface CompetencyCardProps {
  nrp: string;
}

interface ManpowerData {
  nrp: string;
  nama: string;
  position: string;
  portrait_photo_url: string | null;
}

interface Competency {
  competency_name: string;
  status: 'valid' | 'expired' | 'soon_expired';
  expired_date: string | null;
}

const CompetencyCard = ({ nrp }: CompetencyCardProps) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [manpowerData, setManpowerData] = useState<ManpowerData | null>(null);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, [nrp]);

  const fetchData = async () => {
    try {
      // Fetch manpower data with incumbent description
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
      
      // Extract incumbent_description if available
      const incumbent = manpower?.incumbent as { incumbent?: string } | null;
      const incumbentDescription = incumbent?.incumbent || manpower?.position || 'No Position';
      
      setManpowerData({
        ...manpower,
        position: incumbentDescription
      });

      // Fetch competencies
      const { data: competencyData, error: competencyError } = await supabase
        .from('v_competency_status')
        .select('competency_name, status, expired_date')
        .eq('nrp', nrp)
        .order('competency_name');

      if (competencyError) throw competencyError;
      setCompetencies(competencyData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load card data');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    
    setDownloading(true);
    const loadingToast = toast.loading('Generating ID card...');
    
    try {
      // Capture the current visible side
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: true,
      });

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `competency-card-${nrp}-${isFlipped ? 'back' : 'front'}.png`;
          link.click();
          URL.revokeObjectURL(url);
          toast.success('ID card downloaded!', { id: loadingToast });
        }
      }, 'image/png');
    } catch (error) {
      console.error('Error downloading card:', error);
      toast.error('Failed to download card', { id: loadingToast });
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
      <div className="flex justify-center gap-3 mb-4">
        <button
          onClick={() => setIsFlipped(!isFlipped)}
          className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-black dark:text-white rounded-xl shadow-lg transition-all font-bold text-sm backdrop-blur-sm border border-white/20"
        >
          <FontAwesomeIcon icon={faRotate} className={`transition-transform duration-500 ${isFlipped ? 'rotate-180' : ''}`} />
          {isFlipped ? 'Show Front' : 'Show Back'}
        </button>
        
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-2 px-4 py-2 bg-primary/80 hover:bg-primary text-white rounded-xl shadow-lg transition-all font-bold text-sm backdrop-blur-sm disabled:opacity-50"
        >
          <FontAwesomeIcon icon={faDownload} className={downloading ? 'animate-bounce' : ''} />
          Download
        </button>
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
    </div>
  );
};

export default CompetencyCard;
