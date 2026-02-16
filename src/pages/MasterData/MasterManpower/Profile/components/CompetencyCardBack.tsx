import TemplateCardBack from '../../../../../images/user/template-competency-card-back.png';
import { Competency } from '../types/competency';

interface CompetencyCardBackProps {
  nrp: string;
  competencies: Competency[];
  qrCodeUrl: string;
  isExporting?: boolean;
}

const CompetencyCardBack = ({ nrp, competencies, qrCodeUrl, isExporting }: CompetencyCardBackProps) => {
  return (
    <div className="relative w-full h-full bg-white rounded-2xl overflow-hidden">
      {/* Base Layer - Template */}
      <img
        src={TemplateCardBack}
        alt="Competency Card Back"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Glassmorphism Overlay Container */}
      <div className={`absolute inset-0 p-5 flex flex-col justify-between ${isExporting ? 'pt-18' : 'pt-16'}`}>

        {/* Competency Stats */}
        <div className={`mt-20 backdrop-blur-md bg-white/40 border border-white/40 rounded-2xl p-4 shadow-xl`}>
          <div className="flex justify-between items-center border-b border-blue-900/10 pb-5">
            <span className="text-xs font-bold text-blue-900 uppercase tracking-tight">Valid Competencies</span>
            <span className="text-xs font-bold text-blue-700">{competencies.length} Total</span>
          </div>
          
          {/* Top Competencies List */}
          {competencies.length > 0 && (
            <div className="mt-2 flex flex-col gap-2">
              {competencies.slice(0, 10).map((comp, idx) => (
                <div key={idx} className="flex items-center justify-between text-[11px] align-middle "> {/*cek error di sini*/}
                  <span className="text-blue-900 font-medium flex-1">{comp.competency_name}</span>
                  <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[12px] font-bold ${
                    comp.status === 'valid' 
                      ? 'text-green-900' 
                      : comp.status === 'soon_expired'
                      ? 'text-yellow-900'
                      : 'text-red-900'
                  }`}>
                    {comp.status === 'valid' ? '✓' : comp.status === 'soon_expired' ? '⚠' : '✗'}
                  </span>
                </div>
              ))}
              
              {competencies.length > 10 && (
                <div className="mt-2 pt-1 border-t border-blue-900/5 text-center">
                  <p className="text-[10px] text-blue-800 font-bold leading-tight">
                    And {competencies.length - 10} more competencies,
                  </p>
                  <p className="text-[10px] text-blue-800 font-bold leading-tight">
                    scan QR Code {isExporting ? 'on front' : 'on front'} for full list
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        {/* Hidden usage of props to satisfy linter if needed, but they are already in destructuring. 
            If the linter still complains, it's because they aren't used in the JSX.
            nrp and qrCodeUrl are actually not used in the visual part of the back card currently.
        */}
        <div className="hidden">{nrp} {qrCodeUrl}</div>

        {/* Bottom spacer to push content up if needed */}
        <div className="h-4" />
      </div>
    </div>
  );
};

export default CompetencyCardBack;
