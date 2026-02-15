import { useEffect, useState } from 'react';
import TemplateCardBack from '../../../../../images/user/template-competency-card-back.png';
import QRCode from 'qrcode';

interface Competency {
  competency_name: string;
  status: 'valid' | 'expired' | 'soon_expired';
  expired_date: string | null;
}

interface CompetencyCardBackProps {
  nrp: string;
  competencies: Competency[];
}

const CompetencyCardBack = ({ nrp, competencies }: CompetencyCardBackProps) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  useEffect(() => {
    generateQRCode();
  }, [nrp]);

  const generateQRCode = async () => {
    try {
      const url = `https://fff-project.vercel.app/profile/${nrp}?tab=competency`;
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 200,
        margin: 1,
        color: {
          dark: '#1e3a8a', // Dark blue
          light: '#ffffff', // White
        },
      });
      setQrCodeUrl(qrDataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  // Get valid competencies count
  const validCount = competencies.filter(c => c.status === 'valid').length;
  const totalCount = competencies.length;

  return (
    <div className="relative w-full h-full bg-white rounded-2xl overflow-hidden">
      {/* Base Layer - Template */}
      <img
        src={TemplateCardBack}
        alt="Competency Card Back"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Glassmorphism Overlay Container */}
      <div className="inset-0 p-6 flex flex-col justify-between">

        {/* Competency Stats */}
        <div className="mt-30 backdrop-blur-md bg-white/30 border border-white/40 rounded-2xl p-4 shadow-xl space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-blue-900">Valid Competencies</span>
          </div>
          
          

          {/* Top Competencies List */}
          {competencies.length > 0 && (
            <div className="mt-3 space-y-1 max-h-24 overflow-y-auto scrollbar-thin">
              {competencies.slice(0, 5).map((comp, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="text-blue-900 font-medium truncate flex-1">{comp.competency_name}</span>
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    comp.status === 'valid' 
                      ? 'bg-green-100 text-green-700' 
                      : comp.status === 'soon_expired'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {comp.status === 'valid' ? '✓' : comp.status === 'soon_expired' ? '⚠' : '✗'}
                  </span>
                </div>
              ))}
              {competencies.length > 5 && (
                <p className="text-[10px] text-blue-700 text-center mt-1 font-semibold">
                  +{competencies.length - 5} more
                </p>
              )}
            </div>
          )}
        </div>

          {/* QR Code Section */}
        <div className='qr__code-section'>
          <div className="flex-1 flex items-center justify-center mt-4 py-4">
          <div className="backdrop-blur-xl bg-white/40 border-2 border-white/50 rounded-3xl p-4 shadow-2xl">
            {qrCodeUrl ? (
              <div className="relative">
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code" 
                  className="w-40 h-40 rounded-xl"
                />
                {/* QR Code Border Accent */}
                <div className="absolute -inset-1 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl -z-10 blur-sm"></div>
              </div>
            ) : (
              <div className="w-40 h-40 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center animate-pulse">
                <span className="text-xs text-slate-400 font-bold">Loading...</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer - Scan Instruction */}
        <div className="text-center mt-2">
          <p className="text-xs text-blue-900 font-bold drop-shadow-sm">
            Scan QR code to verify competencies
          </p>
        </div>
        </div>
      </div>
    </div>
  );
};

export default CompetencyCardBack;
