import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { NewThemeOptions } from '../../types/Theme';
import { useTheme } from '../../contexts/ThemeContext';

interface ThemeDialogProps {
  onClose: () => void;
}

const ThemeDialog: React.FC<ThemeDialogProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'preset' | 'mine' | 'create'>('preset');
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const { 
    currentThemeId, 
    selectedThemeId, 
    appliedTheme,
    setSelectedTheme,
    applyThemeWithUndo,
    updateTrialTheme,
    trialTheme,
    resetTrial,
    themes
  } = useTheme();

  const [createOptions, setCreateOptions] = useState<NewThemeOptions>({
    background: {
      type: 'color',
      value: '#1a222c'
    },
    fontScale: 1,
    primaryColor: '#3C50E0',
    panelTransparency: 0.1,
    cardTransparency: 0.1
  });

  // Use a ref to ensure resetTrial only runs once on initial mount
  const hasReset = React.useRef(false);

  useEffect(() => {
    if (!hasReset.current) {
      resetTrial();
      hasReset.current = true;
    }

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        resetTrial();
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [onClose, resetTrial]);

  const handleClose = () => {
    resetTrial();
    onClose();
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-hidden bg-white dark:bg-boxdark rounded-[2.5rem] shadow-2xl flex flex-col border border-white/20 scale-95 opacity-0 animate-[modal-in_0.3s_ease-out_forwards]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-8 border-b border-stroke dark:border-white/10">
          <div>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Appearance Settings</h3>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1 opacity-60">Personalize your workspace experience</p>
          </div>
          <button 
            onClick={handleClose}
            className="group p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8 text-slate-400 group-hover:text-red-500 transition-colors">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-4 px-8 pt-6 pb-6">
          {(['preset', 'mine', 'create'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border-2 ${
                activeTab === tab 
                  ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' 
                  : 'bg-slate-50 dark:bg-white/5 border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-white'
              }`}
            >
              {tab === 'preset' ? 'Theme Preset' : tab === 'mine' ? 'My Preset' : 'Create Preset'}
            </button>
          ))}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
          
          {(activeTab === 'preset' || activeTab === 'mine') && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {(activeTab === 'preset' ? themes : []).map((p) => (
                  <div 
                    key={p.id}
                    onClick={() => setSelectedTheme(p.id)}
                    className={`group relative cursor-pointer rounded-[2rem] border-2 p-2 transition-all hover:-translate-y-1 hover:shadow-xl ${
                      selectedThemeId === p.id 
                        ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-lg shadow-primary/10' 
                        : 'border-stroke dark:border-white/10 bg-slate-50/50 dark:bg-white/5'
                    }`}
                  >
                    {/* Status Badges */}
                    <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
                      {currentThemeId === p.id && (
                        <span className="px-3 py-1 bg-green-500 text-white text-[8px] font-black uppercase tracking-widest rounded-full shadow-lg">
                          Current
                        </span>
                      )}
                      {selectedThemeId === p.id && currentThemeId !== p.id && (
                        <span className="px-3 py-1 bg-primary text-white text-[8px] font-black uppercase tracking-widest rounded-full shadow-lg">
                          Selected
                        </span>
                      )}
                    </div>

                    {/* Checkmark for selected */}
                    {selectedThemeId === p.id && (
                      <div className="absolute top-4 right-4 z-20 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white shadow-lg">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}

                    <div 
                      className={`h-32 w-full rounded-[1.5rem] mb-4 overflow-hidden relative border border-stroke dark:border-white/10 ${!p.isSystem ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
                      style={p.isSystem ? {} : { 
                        background: p.background.type === 'gradient' ? p.background.gradient : p.background.color 
                      }}
                    >
                      {!p.isSystem && <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />}
                      
                      {p.isSystem ? (
                        <div className="absolute inset-0 flex">
                          <div className="absolute inset-0 bg-gradient-to-br from-white to-slate-200" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
                          <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />
                        </div>
                      ) : (
                        <div 
                          className="absolute bottom-3 left-3 right-3 h-8 rounded-xl border border-white/20 bg-white/10 backdrop-blur-md"
                        />
                      )}
                    </div>
                    <div className="px-3 pb-2 flex justify-between items-center">
                      <span className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">{p.name}</span>
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: p.ui.primaryColor }} />
                    </div>
                  </div>
                ))}
              </div>

              {activeTab === 'mine' && themes.filter(t => t.id !== 'system' && !themes.includes(t)).length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 bg-slate-50/50 dark:bg-white/5 rounded-[2.5rem] border border-dashed border-stroke dark:border-white/10">
                   <p className="text-xs font-bold text-slate-400">No saved presets found.</p>
                </div>
              )}

              {/* Tweak Transparency for any selected theme */}
              <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-[2rem] border border-stroke dark:border-white/10 space-y-6">
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Panel Transparency</span>
                    <div className="group relative">
                      <svg className="w-3 h-3 text-slate-400 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-slate-800 text-white text-[9px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity w-32 pointer-events-none z-50 shadow-xl border border-white/10">
                        Adjust common panel backgrounds
                      </div>
                    </div>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.01"
                    value={trialTheme?.container.opacity ?? themes.find(t => t.id === selectedThemeId)?.container.opacity ?? 0.05}
                    onChange={(e) => {
                      updateTrialTheme({ container: { opacity: parseFloat(e.target.value) } });
                    }}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-[9px] font-bold text-slate-400">Clear</span>
                    <span className="text-[9px] font-bold text-slate-400">Solid</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Card Transparency</span>
                    <div className="group relative">
                      <svg className="w-3 h-3 text-slate-400 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-slate-800 text-white text-[9px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity w-32 pointer-events-none z-50 shadow-xl border border-white/10">
                        Adjust metric cards and stats
                      </div>
                    </div>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.01"
                    value={trialTheme?.card.opacity ?? themes.find(t => t.id === selectedThemeId)?.card.opacity ?? 0.05}
                    onChange={(e) => {
                      updateTrialTheme({ card: { opacity: parseFloat(e.target.value) } });
                    }}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-[9px] font-bold text-slate-400">Clear</span>
                    <span className="text-[9px] font-bold text-slate-400">Solid</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'create' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-8">
                <div>
                   <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 block">Background Style</label>
                   <div className="flex gap-4">
                      {['color', 'gradient'].map((type) => (
                        <button
                          key={type}
                          onClick={() => setCreateOptions({
                             ...createOptions, 
                             background: { ...createOptions.background, type: type as any }
                          })}
                          className={`flex-1 py-4 rounded-2xl border-2 font-black text-xs uppercase transition-all ${
                            createOptions.background.type === type 
                              ? 'border-primary bg-primary/5 text-primary' 
                              : 'border-stroke dark:border-white/10 text-slate-400'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                   </div>
                </div>

                <div>
                   <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 block">Color Reference (Accent Card)</label>
                    <div className="relative group p-4 rounded-[2rem] bg-slate-50 dark:bg-white/5 border border-stroke dark:border-white/10 transition-all hover:border-primary/30 flex gap-4">
                      {/* Info Icon in top-left */}
                      <div className="absolute top-4 left-4 z-10">
                        <button 
                           onClick={(e) => {
                             e.stopPropagation();
                             setShowTooltip(showTooltip === 'accent' ? null : 'accent');
                           }}
                           className="text-slate-400 hover:text-primary transition-colors flex items-center justify-center p-1"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                        </button>
                        {showTooltip === 'accent' && (
                          <>
                            <div 
                              className="fixed inset-0 z-40" 
                              onClick={() => setShowTooltip(null)} 
                            />
                            <div className="absolute left-8 top-0 w-48 p-3 bg-slate-800 text-white text-[10px] font-bold rounded-xl shadow-xl z-50 text-left leading-relaxed animate-fade-in pointer-events-none">
                              This color will be used for buttons, active links, and prominent UI indicators across the dashboard.
                              <div className="absolute -left-1 top-3 w-2 h-2 bg-slate-800 rotate-45" />
                            </div>
                          </>
                        )}
                      </div>
                      <input 
                        type="color" 
                        value={createOptions.primaryColor}
                        onChange={(e) => setCreateOptions({...createOptions, primaryColor: e.target.value})}
                        className="w-20 h-20 rounded-2xl border-4 border-white dark:border-slate-800 cursor-pointer p-0 overflow-hidden" 
                      />
                      <div className="flex-1 flex flex-col justify-center gap-1">
                         <span className="text-xs font-black text-slate-700 dark:text-white uppercase">Primary Accent</span>
                         <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-widest">{createOptions.primaryColor}</span>
                      </div>
                    </div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Card Transparency</label>
                      <span className="text-xs font-black text-primary">{Math.round(createOptions.cardTransparency * 100)}%</span>
                    </div>
                    <input 
                      type="range" min="0.1" max="1" step="0.05"
                      value={createOptions.cardTransparency}
                      onChange={(e) => setCreateOptions({...createOptions, cardTransparency: parseFloat(e.target.value)})}
                      className="w-full accent-primary h-2 bg-slate-100 dark:bg-white/10 rounded-full appearance-none cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Panel Transparency</label>
                      <span className="text-xs font-black text-primary">{Math.round(createOptions.panelTransparency * 100)}%</span>
                    </div>
                    <input 
                      type="range" min="0.1" max="1" step="0.05"
                      value={createOptions.panelTransparency}
                      onChange={(e) => setCreateOptions({...createOptions, panelTransparency: parseFloat(e.target.value)})}
                      className="w-full accent-primary h-2 bg-slate-100 dark:bg-white/10 rounded-full appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Font Scaling</label>
                    <span className="text-xs font-black text-primary">{Math.round(createOptions.fontScale * 100)}%</span>
                  </div>
                  <input 
                    type="range" min="0.8" max="1.2" step="0.05"
                    value={createOptions.fontScale}
                    onChange={(e) => setCreateOptions({...createOptions, fontScale: parseFloat(e.target.value)})}
                    className="w-full accent-primary h-2 bg-slate-100 dark:bg-white/10 rounded-full appearance-none cursor-pointer"
                  />
                </div>

                <div className="pt-6">
                  <button 
                    onClick={() => {
                      const customTheme: any = {
                        id: 'custom-' + Date.now(),
                        name: 'Custom Theme',
                        baseTheme: appliedTheme.baseTheme,
                        background: {
                          type: createOptions.background.type,
                          color: createOptions.background.type === 'color' ? createOptions.background.value : undefined,
                          gradient: createOptions.background.type === 'gradient' ? createOptions.background.value : undefined,
                          useSystem: false
                        },
                        header: {
                          backdropBlur: "none",
                          opacity: 1
                        },
                        sidebar: {
                          backdropBlur: "none",
                          opacity: 1
                        },
                        container: {
                          color: '#ffffff',
                          opacity: createOptions.panelTransparency
                        },
                        card: {
                          opacity: createOptions.cardTransparency
                        },
                        popup: {
                          backdropBlur: "xl",
                          opacity: 0.4
                        },
                        grid: {
                          backgroundColor: 'rgba(0,0,0,0.1)'
                        },
                        ui: {
                          primaryColor: createOptions.primaryColor
                        }
                      };
                      updateTrialTheme(customTheme);
                    }}
                    className="w-full py-5 rounded-[2rem] bg-gradient-to-r from-primary to-blue-600 text-white font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1 transition-all active:scale-95 active:translate-y-0"
                  >
                    Apply Custom Configuration
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-stroke dark:border-white/10 bg-slate-50/50 dark:bg-white/5 flex justify-between items-center">
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic leading-relaxed">
                * Theming logic is currently in preview. <br/> Your settings will be saved to the database soon.
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                  Active: {themes.find(p => p.id === currentThemeId)?.name || 'Custom'}
                </span>
              </div>
            </div>
            
            <button 
              disabled={(() => {
                const currentTheme = themes.find(t => t.id === currentThemeId);
                const isModified = trialTheme && (
                  trialTheme.container.opacity !== currentTheme?.container.opacity ||
                  trialTheme.card.opacity !== currentTheme?.card.opacity
                );
                return selectedThemeId === currentThemeId && !isModified;
              })()}
              onClick={() => {
                applyThemeWithUndo(selectedThemeId);
                onClose();
              }}
              style={
                (() => {
                   const isActive = !((() => {
                      const currentTheme = themes.find(t => t.id === currentThemeId);
                      const isModified = trialTheme && (
                        trialTheme.container.opacity !== currentTheme?.container.opacity ||
                        trialTheme.card.opacity !== currentTheme?.card.opacity
                      );
                      return selectedThemeId === currentThemeId && !isModified;
                   })());
                   
                   if (isActive) {
                     return {
                       backgroundColor: appliedTheme.button.primary.color,
                       color: appliedTheme.button.primary.textColor,
                       boxShadow: appliedTheme.button.primary.shadow,
                       borderWidth: appliedTheme.button.primary.borderWidth,
                       borderColor: appliedTheme.button.primary.borderColor,
                       borderRadius: appliedTheme.button.primary.borderRadius
                     }
                   }
                   return {};
                })()
              }
              className={`px-8 py-3 text-xs font-black uppercase tracking-widest transition-all ${
                (() => {
                  const currentTheme = themes.find(t => t.id === currentThemeId);
                  const isModified = trialTheme && (
                    trialTheme.container.opacity !== currentTheme?.container.opacity ||
                    trialTheme.card.opacity !== currentTheme?.card.opacity
                  );
                  return selectedThemeId === currentThemeId && !isModified;
                })()
                  ? 'bg-slate-200 dark:bg-white/5 text-slate-400 cursor-not-allowed opacity-50'
                  : 'hover:-translate-y-1 active:scale-95'
              }`}
            >
              Apply Theme
            </button>
        </div>
      </div>
      
      <style>{`
        @keyframes modal-in {
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ThemeDialog;
