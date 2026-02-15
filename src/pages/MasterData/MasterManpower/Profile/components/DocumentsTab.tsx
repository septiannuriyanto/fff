import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileDownload, faIdCard, faTag } from '@fortawesome/free-solid-svg-icons';

const DocumentsTab = () => {
    const docs = [
        { id: 'danger_tag', title: 'Danger Tag', icon: faTag, desc: 'Generate printable Danger Tag for this manpower.' },
        { id: 'competency_card', title: 'Competency Card', icon: faIdCard, desc: 'Digital Competency Card with QR Code.' },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {docs.map(doc => (
                <div key={doc.id} className="group relative rounded-lg border border-stroke bg-white p-5 shadow-default hover:border-primary hover:shadow-lg transition-all dark:border-strokedark dark:bg-boxdark">
                    <div className="flex items-center gap-4 mb-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                            <FontAwesomeIcon icon={doc.icon} className="text-xl" />
                        </div>
                        <div>
                            <h4 className="font-bold text-black dark:text-white group-hover:text-primary transition-colors">{doc.title}</h4>
                            <span className="text-xs text-slate-400 font-medium">Click to generate</span>
                        </div>
                    </div>
                    <p className="text-sm text-slate-500 mb-4 h-10 overflow-hidden text-ellipsis">{doc.desc}</p>
                    <button className="w-full rounded-md bg-primary py-2 px-4 text-sm font-medium text-white hover:bg-opacity-90 flex items-center justify-center gap-2">
                        <FontAwesomeIcon icon={faFileDownload} /> Generate PDF
                    </button>
                    
                    {/* Coming Soon Overlay */}
                    <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-[1px] rounded-lg flex items-center justify-center cursor-not-allowed">
                        <span className="bg-black/80 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-md">Coming Soon</span>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default DocumentsTab;
