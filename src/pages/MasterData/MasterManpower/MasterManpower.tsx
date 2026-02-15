import { useState } from 'react';
import MasterManpowerList from './components/MasterManpowerList';
import PanelContainer from '../../PanelContainer';
import ManpowerCompetencyTab from './components/ManpowerCompetencyTab';

const MasterManpower = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'competency' | 'achievement'>('general');
  const [competencyFilter, setCompetencyFilter] = useState('');

  const handleViewCompetency = (nrp: string) => {
    setCompetencyFilter(nrp);
    setActiveTab('competency');
  };

  const tabs = [
    { id: 'general' as const, label: 'General' },
    { id: 'competency' as const, label: 'Competency' },
    { id: 'achievement' as const, label: 'Achievement' },
  ];

  return (
    <PanelContainer 
      title="Master Manpower"
      className="mb-6"
      contentClassName="p-0" // Remove default padding as we'll handle it per content
    >
      {/* Tab Switcher */}
      <div className="flex border-b border-stroke dark:border-strokedark bg-gray-50/50 dark:bg-meta-4/20 px-5 pt-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.id === 'competency') setCompetencyFilter('');
              setActiveTab(tab.id);
            }}
            className={`
              relative py-3 px-6 text-sm font-bold uppercase tracking-wider transition-all duration-300
              ${activeTab === tab.id 
                ? 'text-primary' 
                : 'text-bodydark2 hover:text-black dark:hover:text-white'
              }
            `}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 h-1 w-full bg-primary rounded-t-full shadow-[0_-2px_8px_rgba(59,90,246,0.3)]"></div>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-5">
        <div className={activeTab === 'general' ? 'block animate-in fade-in slide-in-from-top-2 duration-300' : 'hidden'}>
          <MasterManpowerList onViewCompetency={handleViewCompetency} />
        </div>

        <div className={activeTab === 'competency' ? 'block animate-in fade-in slide-in-from-top-2 duration-300' : 'hidden'}>
          <ManpowerCompetencyTab initialSearchTerm={competencyFilter} />
        </div>

        <div className={activeTab === 'achievement' ? 'block animate-in fade-in slide-in-from-top-2 duration-300' : 'hidden'}>
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
             <div className="w-16 h-16 bg-slate-100 dark:bg-meta-4 rounded-full flex items-center justify-center mb-4">
               <svg className="w-8 h-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
               </svg>
             </div>
             <h3 className="text-xl font-bold text-black dark:text-white mb-2">Manpower Achievement</h3>
             <p className="text-sm">This feature is currently under development.</p>
          </div>
        </div>
      </div>
    </PanelContainer>
  );
};

export default MasterManpower;
