import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileDownload, faIdCard, faTag, faEye, faTimes } from '@fortawesome/free-solid-svg-icons';
import { useParams } from 'react-router-dom';
import CompetencyCard from './CompetencyCard';

const DocumentsTab = () => {
    const { id } = useParams<{ id: string }>();
    const [viewingCard, setViewingCard] = useState(false);

    const docs = [
        { id: 'danger_tag', title: 'Danger Tag', icon: faTag, desc: 'Generate printable Danger Tag for this manpower.', active: false },
        { id: 'competency_card', title: 'Competency Card', icon: faIdCard, desc: 'Digital Competency Card with QR Code.', active: true },
    ];

    const handleAction = (docId: string) => {
        if (docId === 'competency_card') {
            setViewingCard(true);
        }
    };

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {docs.map(doc => (
                    <div key={doc.id} className="group relative rounded-3xl border border-white/40 bg-white/40 p-6 shadow-xl backdrop-blur-xl hover:scale-[1.02] transition-all duration-300 dark:border-white/10 dark:bg-black/40">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20 text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-inner backdrop-blur-sm">
                                <FontAwesomeIcon icon={doc.icon} className="text-2xl" />
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-black dark:text-white group-hover:text-primary transition-colors">{doc.title}</h4>
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">Generate Printables</span>
                            </div>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">{doc.desc}</p>
                        
                        <button 
                            disabled={!doc.active}
                            onClick={() => handleAction(doc.id)} 
                            className={`w-full rounded-xl py-3 px-4 text-sm font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all ${doc.active ? 'bg-primary/80 hover:bg-primary hover:shadow-primary/30 cursor-pointer' : 'bg-slate-400/50 cursor-not-allowed'}`}
                        >
                            <FontAwesomeIcon icon={doc.id === 'competency_card' ? faEye : faFileDownload} /> 
                            {doc.id === 'competency_card' ? 'View Card' : 'Download'}
                        </button>
                        
                        {/* Coming Soon Overlay */}
                        {!doc.active && (
                            <div className="absolute inset-0 bg-white/20 dark:bg-black/20 backdrop-blur-[2px] rounded-3xl flex items-center justify-center cursor-not-allowed z-10">
                                <span className="bg-black/80 text-white text-xs font-bold px-4 py-2 rounded-full uppercase tracking-wider backdrop-blur-md shadow-2xl border border-white/10">Coming Soon</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Competency Card Viewer Modal */}
            {viewingCard && id && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
                   <div className="bg-white/30 dark:bg-black/30 backdrop-blur-xl w-full max-w-md rounded-3xl shadow-2xl flex flex-col relative animate-in zoom-in-95 border border-white/20 p-6">
                      <button 
                        onClick={() => setViewingCard(false)} 
                        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors z-50"
                      >
                          <FontAwesomeIcon icon={faTimes}/>
                      </button>
                      <div className="flex justify-center">
                          <CompetencyCard nrp={id} />
                      </div>
                   </div>
                </div>
            )}
        </>
    );
};

export default DocumentsTab;
