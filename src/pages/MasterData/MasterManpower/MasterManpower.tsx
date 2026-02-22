import { useState } from 'react';
import MasterManpowerList from './components/MasterManpowerList';
import ThemedPanelContainer from '../../../common/ThemedComponents/ThemedPanelContainer';
import ManpowerCompetencyTab from './components/ManpowerCompetencyTab';
import { useTheme } from '../../../contexts/ThemeContext';

const MasterManpower = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'competency' | 'achievement'>('general');
  const [competencyFilter, setCompetencyFilter] = useState('');
  const { activeTheme } = useTheme();
  const isDark = activeTheme.baseTheme === 'dark';
  const tabBg = isDark ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.025)';
  const tabBorder = activeTheme.container.borderColor;
  const tabText = activeTheme.container.textColor;

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
    <ThemedPanelContainer 
      title="Master Manpower"
      className="mb-6"
      contentClassName="p-0"
    >
      {/* Tab Switcher */}
      <div
        className="flex px-5 pt-3"
        style={{ borderBottom: `1px solid ${tabBorder}`, backgroundColor: tabBg }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.id === 'competency') setCompetencyFilter('');
              setActiveTab(tab.id);
            }}
            className="relative py-3 px-6 text-sm font-bold uppercase tracking-wider transition-all duration-300"
            style={{ color: activeTab === tab.id ? undefined : tabText, opacity: activeTab === tab.id ? 1 : 0.55 }}
          >
            <span className={activeTab === tab.id ? 'text-primary' : ''}>
              {tab.label}
            </span>
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
          <div className="flex flex-col items-center justify-center py-20" style={{ color: tabText, opacity: 0.5 }}>
             <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
               <svg className="w-8 h-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
               </svg>
             </div>
             <h3 className="text-xl font-bold mb-2">Manpower Achievement</h3>
             <p className="text-sm">This feature is currently under development.</p>
          </div>
        </div>
      </div>
    </ThemedPanelContainer>
  );
};

export default MasterManpower;
