import TemplateCardFront from '../../../../../images/user/template-competency-card.png';

interface CompetencyCardFrontProps {
  nrp: string;
  nama: string;
  position: string;
  portrait_photo_url: string | null;
  qrCodeUrl: string;
  isExporting?: boolean;
}

const CompetencyCardFront = ({
  nrp,
  nama,
  position,
  portrait_photo_url,
  qrCodeUrl,
  isExporting,
}: CompetencyCardFrontProps) => {
  return (
    <div className="relative w-full h-full bg-white rounded-2xl overflow-hidden">
      
      {/* TEMPLATE BASE */}
      <div
  className="absolute inset-0"
  style={{
    backgroundImage: `url(${TemplateCardFront})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  }}
/>


      {/* PORTRAIT */}
      {portrait_photo_url && (
        <div
          className="absolute overflow-hidden"
          style={{
            top: '17.5%',
            left: '29%',
            width: '64%',
            height: '62%',
          }}
        >
          <img
            src={portrait_photo_url}
            alt={nama}
            className="w-full h-full object-cover"
            style={{
              transform: 'translateZ(0)', // fix seam render
              backfaceVisibility: 'hidden',
            }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}

      {/* 🔥 GRADIENT OVERLAY — FIX SEAM */}
      <div
        className="absolute left-0 right-0 bottom-0 pointer-events-none"
        style={{
          top: isExporting ? '50.5%' : '55%',   // OVERLAP ke atas
          background:
            'linear-gradient(to top, rgba(13,86,105,1) 0%, rgba(29,105,122,0.92) 45%, rgba(29,105,122,0.0) 100%)',
          
          transform: 'translateZ(0)',          // force GPU
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
        }}
      />

      {/* BOTTOM CONTENT */}
      <div className="absolute bottom-6 left-0 right-0 px-5 flex items-start gap-4 z-20">
        {qrCodeUrl && (
          <div className="bg-white p-1 rounded-sm shadow-lg shrink-0">
            <img src={qrCodeUrl} alt="QR" className="w-16 h-16" />
          </div>
        )}

        <div className="flex flex-col justify-between py-0.5 min-h-[64px]">
          <div className="space-y-0.5">
            <h3 className="text-lg font-bold text-white drop-shadow-lg uppercase leading-tight">
              {nama}
            </h3>
            <p className="text-xs font-semibold text-white/95 leading-tight">
              {position}
            </p>
          </div>
          <p className="text-[10px] font-mono text-white/85 mt-auto">
            NRP: {nrp}
          </p>
        </div>
      </div>
    </div>
  );
};


export default CompetencyCardFront;
