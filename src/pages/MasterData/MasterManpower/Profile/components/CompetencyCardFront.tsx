import TemplateCardFront from '../../../../../images/user/template-competency-card.png';

interface CompetencyCardFrontProps {
  nrp: string;
  nama: string;
  position: string;
  portrait_photo_url: string | null;
}

const CompetencyCardFront = ({ nrp, nama, position, portrait_photo_url }: CompetencyCardFrontProps) => {
  return (
    <div className="relative w-full h-full bg-white rounded-2xl overflow-hidden">
      {/* Layer 1: Base Template */}
      <img
        src={TemplateCardFront}
        alt="Competency Card Template"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Layer 2: Portrait Photo - Only in Orange Box Area */}
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
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}

      {/* Layer 3: Gradient Vignette Overlay - Bottom 1/3 for Identity */}
      <div 
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: '45%',
          background: 'linear-gradient(to top, rgba(13, 86, 105, 0.95) 0%, rgba(29, 105, 122, 0.85) 40%, rgba(139, 192, 211, 0.4) 70%, transparent 100%)'
        }}
      />

      {/* Text Overlay - Name and Position */}
      <div className="absolute bottom-7 left-22 right-0 p-6 pb-5 text-white z-20">
        <div className="space-y-0.5">
          <h3 className="text-lg font-bold drop-shadow-lg tracking-tight leading-tight">
            {nama}
          </h3>
          <p className="text-xs font-semibold opacity-95 drop-shadow-md leading-tight">
            {position}
          </p>
          <p className="text-[10px] font-mono opacity-85 drop-shadow-md mt-0.5">
            NRP: {nrp}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CompetencyCardFront;
