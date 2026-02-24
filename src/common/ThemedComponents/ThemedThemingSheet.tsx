import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../db/SupabaseClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTimes, 
  faMagicWandSparkles, 
  faPalette, 
  faUserCircle, 
  faSave, 
  faCheck,
  faUndo,
  faEye,
  faEyeSlash,
  faChevronDown,
  faChevronRight,
  faKeyboard,
  faLayerGroup,
  faWindowRestore,
  faTh,
  faSlidersH,
  faFillDrip,
  faGripLines,
  faKeyboard as faInputIcon,
  faTextHeight,
  faSun,
  faMoon,
  faPlus,
  faTrash,
  faExchangeAlt,
  faFileImport
} from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

interface ThemedThemingSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserTheme {
  id: string;
  theme_blueprint: any;
  created_at: string;
}

const ThemedThemingSheet: React.FC<ThemedThemingSheetProps> = ({ isOpen, onClose }) => {
  const { 
    currentThemeId, 
    selectedThemeId, 
    activeTheme,
    setSelectedTheme,
    applyThemeWithUndo,
    updateTrialTheme,
    trialTheme,
    resetTrial,
    themes,
    getBackgroundCss
  } = useTheme();

  const [activeSegment, setActiveSegment] = useState<'predefined' | 'mine' | 'builder'>('predefined');
  const [userThemes, setUserThemes] = useState<UserTheme[]>([]);
  const [loadingThemes, setLoadingThemes] = useState(false);
  const [previewMode, setPreviewMode] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    'background': true,
    'ui': true
  });
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importCss, setImportCss] = useState('');

  const sheetRef = useRef<HTMLDivElement>(null);
  const nrp = localStorage.getItem('nrp');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      fetchUserThemes();
      setIsClosing(false);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      resetTrial();
      onClose();
    }, 300);
  };

  const fetchUserThemes = async () => {
    if (!nrp) return;
    setLoadingThemes(true);
    try {
      const { data: manpower } = await supabase
        .from('manpower')
        .select('user_id')
        .eq('nrp', nrp)
        .single();

      if (!manpower?.user_id) return;

      const { data, error } = await supabase
        .from('user_theme_settings')
        .select('*')
        .eq('creator_id', manpower.user_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserThemes(data || []);
    } catch (error: any) {
      console.error('Error fetching user themes:', error);
    } finally {
      setLoadingThemes(false);
    }
  };

  const handleSaveTheme = async () => {
    if (!nrp || !trialTheme) {
        toast.error('No changes to save or user not found');
        return;
    }

    const { value: themeName } = await Swal.fire({
      title: 'Save Theme Preset',
      input: 'text',
      inputLabel: 'Give your theme a name',
      inputPlaceholder: 'e.g. My Dark Glass',
      showCancelButton: true,
      confirmButtonText: 'Save',
      background: activeTheme.container.color,
      color: activeTheme.container.textColor,
      inputAttributes: {
        style: `background: ${activeTheme.input.color}; color: ${activeTheme.input.textColor}; border-color: ${activeTheme.container.borderColor}`
      }
    });

    if (!themeName) return;

    const loadingToast = toast.loading('Saving theme...');
    try {
        const { data: manpower } = await supabase
            .from('manpower')
            .select('user_id')
            .eq('nrp', nrp)
            .single();

        if (!manpower?.user_id) throw new Error('User not found');

        const themeBlueprint = {
            ...trialTheme,
            name: themeName,
            id: `user-${Date.now()}`
        };

        const { error } = await supabase
            .from('user_theme_settings')
            .insert([{
                creator_id: manpower.user_id,
                theme_blueprint: themeBlueprint
            }]);

        if (error) throw error;
        toast.success('Theme saved successfully', { id: loadingToast });
        fetchUserThemes();
        setActiveSegment('mine');
    } catch (error: any) {
        toast.error('Failed to save theme: ' + error.message, { id: loadingToast });
    }
  };

  const handleDeleteUserTheme = async (id: string) => {
    const result = await Swal.fire({
      title: 'Delete Theme?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      background: activeTheme.container.color,
      color: activeTheme.container.textColor,
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase
          .from('user_theme_settings')
          .delete()
          .eq('id', id);

        if (error) throw error;
        toast.success('Theme deleted');
        fetchUserThemes();
      } catch (error: any) {
        toast.error('Failed to delete: ' + error.message);
      }
    }
  };

  if (!isOpen && !isClosing) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[100000] flex justify-end">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
        onClick={handleClose}
      />
      
      {/* Sheet */}
      <div 
        ref={sheetRef}
        className={`relative w-full max-w-lg h-full shadow-2xl flex flex-col transition-transform duration-300 transform ${isClosing ? 'translate-x-full' : 'translate-x-0'}`}
        style={{ 
          backgroundColor: activeTheme.container.color,
          borderLeft: `1px solid ${activeTheme.container.borderColor}`,
          backdropFilter: 'blur(16px)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: activeTheme.container.borderColor }}>
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight" style={{ color: activeTheme.container.textColor }}>
              Appearance
            </h3>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-50" style={{ color: activeTheme.container.textColor }}>
              Personalize your workspace
            </p>
          </div>
          <button 
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            style={{ color: activeTheme.container.textColor }}
          >
            <FontAwesomeIcon icon={faTimes} className="text-xl" />
          </button>
        </div>

        {/* Segments Nav */}
        <div className="flex p-2 m-4 rounded-2xl bg-black/5 dark:bg-white/5 border" style={{ borderColor: activeTheme.container.borderColor }}>
          {[
            { id: 'predefined', label: 'Library', icon: faPalette },
            { id: 'mine', label: 'My Themes', icon: faUserCircle },
            { id: 'builder', label: 'Builder', icon: faMagicWandSparkles }
          ].map((seg) => (
            <button
              key={seg.id}
              onClick={() => setActiveSegment(seg.id as any)}
              className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex flex-col items-center gap-1 transition-all ${
                activeSegment === seg.id 
                  ? 'bg-primary text-white shadow-lg' 
                  : 'text-slate-400 hover:text-primary transition-colors'
              }`}
            >
              <FontAwesomeIcon icon={seg.icon} className="text-sm" />
              {seg.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
          {activeSegment === 'predefined' && (
            <div className="grid grid-cols-2 gap-4">
              {themes.map((theme) => {
                // Support both core and legacy root-level structures
                const themeId = theme.core?.id || theme.id || 'unknown';
                const themeName = theme.core?.name || theme.name || 'Unknown Theme';
                return (
                <div 
                  key={themeId}
                  onClick={() => setSelectedTheme(themeId)}
                  className={`group relative cursor-pointer rounded-2xl border-2 p-2 transition-all hover:scale-[1.02] ${
                    selectedThemeId === themeId 
                      ? 'border-primary bg-primary/5' 
                      : 'border-transparent bg-black/5 dark:bg-white/5'
                  }`}
                >
                  <div 
                    className="h-20 w-full rounded-xl mb-2 overflow-hidden relative border"
                    style={{ 
                      background: getBackgroundCss(theme.background),
                      borderColor: activeTheme.container.borderColor
                    }}
                  >
                    <div className="absolute bottom-2 left-2 right-2 h-4 rounded-md bg-white/10 backdrop-blur-md border border-white/10" />
                  </div>
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-black uppercase truncate pr-2" style={{ color: activeTheme.container.textColor }}>
                      {themeName}
                    </span>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.ui.primaryColor }} />
                  </div>
                  {currentThemeId === themeId && (
                    <div className="absolute top-4 right-4 bg-success text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-lg">
                      Active
                    </div>
                  )}
                </div>
                )})}
            </div>
          )}

          {activeSegment === 'mine' && (
            <div className="space-y-4">
              {loadingThemes ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">Syncing presets...</p>
                </div>
              ) : userThemes.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed rounded-3xl" style={{ borderColor: activeTheme.container.borderColor }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">No saved presets yet</p>
                  <button 
                    onClick={() => setActiveSegment('builder')}
                    className="mt-4 text-[10px] font-black text-primary uppercase hover:underline"
                  >
                    Start Creating
                  </button>
                </div>
              ) : (
                userThemes.map((ut) => (
                  <div 
                    key={ut.id}
                    className="group relative rounded-2xl border p-4 transition-all bg-black/5 dark:bg-white/5 flex items-center justify-between hover:border-primary/50"
                    style={{ borderColor: activeTheme.container.borderColor }}
                  >
                    <div 
                      className="cursor-pointer flex-1"
                      onClick={() => {
                        updateTrialTheme(ut.theme_blueprint);
                        // Handle both legacy and new core structure for user themes
                        const userThemeId = ut.theme_blueprint.core?.id || ut.theme_blueprint.id;
                        setSelectedTheme(userThemeId);
                      }}
                    >
                      <h4 className="text-xs font-black uppercase" style={{ color: activeTheme.container.textColor }}>
                        {ut.theme_blueprint.core?.name || ut.theme_blueprint.name}
                      </h4>
                      <p className="text-[9px] font-medium opacity-50" style={{ color: activeTheme.container.textColor }}>
                        Saved on {new Date(ut.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                       <button 
                         onClick={() => handleDeleteUserTheme(ut.id)}
                         className="p-2 text-slate-400 hover:text-danger transition-colors"
                       >
                         <FontAwesomeIcon icon={faTrash} />
                       </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeSegment === 'builder' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60" style={{ color: activeTheme.container.textColor }}>
                  Live Customization
                </span>
                <button 
                  onClick={() => setPreviewMode(!previewMode)}
                  className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
                    previewMode ? 'bg-primary text-white' : 'bg-black/10 text-slate-400'
                  }`}
                >
                  <FontAwesomeIcon icon={previewMode ? faEye : faEyeSlash} />
                  {previewMode ? 'Preview ON' : 'Preview OFF'}
                </button>
              </div>

                {(() => {
                  const toggleSection = (id: string) => {
                    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
                  };

                  const Section = ({ id, label, icon, children }: any) => (
                    <div className="space-y-4 border-b pb-6 last:border-0" style={{ borderColor: activeTheme.container.borderColor }}>
                      <button 
                        onClick={() => toggleSection(id)}
                        className="w-full flex items-center justify-between group py-2"
                      >
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                             <FontAwesomeIcon icon={icon} className="text-sm" />
                           </div>
                           <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: activeTheme.container.textColor }}>{label}</span>
                         </div>
                         <FontAwesomeIcon 
                           icon={openSections[id] ? faChevronDown : faChevronRight} 
                           className="text-[10px] opacity-30" 
                           style={{ color: activeTheme.container.textColor }}
                         />
                      </button>
                      
                      {openSections[id] && (
                        <div className="space-y-6 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                          {children}
                        </div>
                      )}
                    </div>
                  );

                  const ModernColorPicker = ({ label, path, secondaryLabel }: any) => {
                    // Resolve value from path (e.g. "header.color")
                    const getValue = (obj: any, path: string) => {
                      return path.split('.').reduce((acc, part) => acc && acc[part], obj);
                    };

                    const rawValue = getValue(trialTheme || activeTheme, path);
                    const systemValue = getValue(activeTheme, path);
                    const value = rawValue || systemValue || '#000000';

                    return (
                      <div className="space-y-2">
                         <div className="flex justify-between items-center px-1">
                            <label className="text-[9px] font-black uppercase tracking-[0.15em] opacity-60" style={{ color: activeTheme.container.textColor }}>{label}</label>
                            {secondaryLabel && <span className="text-[8px] font-bold opacity-30 uppercase tracking-widest" style={{ color: activeTheme.container.textColor }}>{secondaryLabel}</span>}
                         </div>
                         <div className="relative group flex items-center gap-3 p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-dashed hover:border-primary/50 transition-all" style={{ borderColor: activeTheme.container.borderColor }}>
                            <div className="relative w-10 h-10 rounded-lg border-2 border-white dark:border-slate-800 shadow-md overflow-hidden shrink-0">
                              <input 
                                type="color"
                                value={value.startsWith('#') ? value : '#000000'}
                                onChange={(e) => {
                                  const parts = path.split('.');
                                  const update: any = {};
                                  let current = update;
                                  for (let i = 0; i < parts.length - 1; i++) {
                                    current[parts[i]] = {};
                                    current = current[parts[i]];
                                  }
                                  current[parts[parts.length - 1]] = e.target.value;
                                  updateTrialTheme(update);
                                }}
                                className="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer"
                              />
                               <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: value }} />
                            </div>
                            <div className="flex-1 flex flex-col justify-center gap-0.5">
                              <input 
                                type="text"
                                value={value?.toUpperCase() || ''}
                                onChange={(e) => {
                                  const val = e.target.value.startsWith('#') ? e.target.value : '#' + e.target.value;
                                  if (/^#[0-9A-F]{6}$/i.test(val) || /^#[0-9A-F]{3}$/i.test(val)) {
                                    const parts = path.split('.');
                                    const update: any = {};
                                    let current = update;
                                    for (let i = 0; i < parts.length - 1; i++) {
                                      current[parts[i]] = {};
                                      current = current[parts[i]];
                                    }
                                    current[parts[parts.length - 1]] = val;
                                    updateTrialTheme(update);
                                  }
                                }}
                                className="bg-transparent border-none p-0 text-[10px] font-mono font-black uppercase focus:ring-0 w-full"
                                style={{ color: activeTheme.container.textColor }}
                              />
                              <span className="text-[7px] font-bold opacity-30 uppercase tracking-widest" style={{ color: activeTheme.container.textColor }}>Hex Code</span>
                            </div>
                         </div>
                      </div>
                    );
                  };

                  const ThemeSlider = ({ label, path, min = 0, max = 1, step = 0.01, unit = '' }: any) => {
                    const getValue = (obj: any, path: string) => {
                      return path.split('.').reduce((acc, part) => acc && acc[part], obj);
                    };
                    const rawValue = getValue(trialTheme || activeTheme, path);
                    const systemValue = getValue(activeTheme, path);
                    const value = rawValue !== undefined ? rawValue : systemValue;

                    // Parse numerical value if it's a string like "1.25rem"
                    const numValue = typeof value === 'string' ? parseFloat(value) : value;

                    return (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-[9px] font-black uppercase">
                          <span style={{ color: activeTheme.container.textColor }}>{label}</span>
                          <span className="text-primary font-mono">{typeof value === 'number' ? Math.round(value * 100) : value}{unit}</span>
                        </div>
                        <input 
                          type="range" min={min} max={max} step={step}
                          value={numValue || 0}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            const finalVal = typeof value === 'string' ? `${val}${value.replace(/[0-9.]/g, '')}` : val;
                            const parts = path.split('.');
                            const update: any = {};
                            let current = update;
                            for (let i = 0; i < parts.length - 1; i++) {
                              current[parts[i]] = {};
                              current = current[parts[i]];
                            }
                            current[parts[parts.length - 1]] = finalVal;
                            updateTrialTheme(update);
                          }}
                          className="w-full h-1 bg-black/10 dark:bg-white/10 rounded-full appearance-none accent-primary cursor-pointer transition-all"
                        />
                      </div>
                    );
                  };

                  const ThemeToggle = ({ label, path }: any) => {
                    const getValue = (obj: any, path: string) => {
                      return path.split('.').reduce((acc, part) => acc && acc[part], obj);
                    };
                    const value = getValue(trialTheme || activeTheme, path);

                    return (
                      <div className="flex items-center justify-between">
                         <span className="text-[9px] font-black uppercase tracking-widest opacity-60" style={{ color: activeTheme.container.textColor }}>{label}</span>
                         <button 
                           onClick={() => {
                            const parts = path.split('.');
                            const update: any = {};
                            let current = update;
                            for (let i = 0; i < parts.length - 1; i++) {
                              current[parts[i]] = {};
                              current = current[parts[i]];
                            }
                            current[parts[parts.length - 1]] = !value;
                            updateTrialTheme(update);
                           }}
                           className={`w-10 h-5 rounded-full relative transition-colors ${value ? 'bg-primary' : 'bg-black/20'}`}
                         >
                            <div className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`} />
                         </button>
                      </div>
                    );
                  };

                  const ThemeSelect = ({ label, path, options }: any) => {
                    const getValue = (obj: any, path: string) => {
                      return path.split('.').reduce((acc, part) => acc && acc[part], obj);
                    };
                    const value = getValue(trialTheme || activeTheme, path);

                    return (
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-[0.15em] opacity-60" style={{ color: activeTheme.container.textColor }}>{label}</label>
                        <select 
                          value={value || ''}
                          onChange={(e) => {
                            const parts = path.split('.');
                            const update: any = {};
                            let current = update;
                            for (let i = 0; i < parts.length - 1; i++) {
                              current[parts[i]] = {};
                              current = current[parts[i]];
                            }
                            current[parts[parts.length - 1]] = e.target.value;
                            updateTrialTheme(update);
                          }}
                          className="w-full bg-black/5 dark:bg-white/5 border rounded-xl py-2 px-3 text-[10px] font-bold outline-none focus:border-primary transition-colors"
                          style={{ borderColor: activeTheme.container.borderColor, color: activeTheme.container.textColor }}
                        >
                          {options.map((opt: string) => (
                            <option key={opt} value={opt} className="bg-slate-800 text-white">{opt}</option>
                          ))}
                        </select>
                      </div>
                    );
                  };

                  return (
                    <div className="space-y-2">
                       {/* Category: Core & Layout */}
                       <Section id="background" label="Core & Background" icon={faFillDrip}>
                          {/* Base Theme Foundation */}
                          <div className="space-y-3">
                            <label className="text-[9px] font-black uppercase tracking-[0.15em] opacity-60" style={{ color: activeTheme.container.textColor }}>Base Foundation</label>
                            <div className="flex gap-2 p-1 rounded-xl bg-black/5 dark:bg-white/5 border border-dashed" style={{ borderColor: activeTheme.container.borderColor }}>
                              {[
                                { id: false, label: 'Light Mode', icon: faSun },
                                { id: true, label: 'Dark Mode', icon: faMoon }
                              ].map((opt) => (
                                <button
                                  key={opt.label}
                                  onClick={() => updateTrialTheme({ isDark: opt.id })}
                                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                                    (trialTheme?.isDark ?? activeTheme.isDark) === opt.id 
                                      ? 'bg-primary text-white shadow-lg' 
                                      : 'opacity-40 hover:opacity-100'
                                  }`}
                                  style={{ color: (trialTheme?.isDark ?? activeTheme.isDark) === opt.id ? '#fff' : activeTheme.container.textColor }}
                                >
                                  <FontAwesomeIcon icon={opt.icon} className="text-xs" />
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Background Mode */}
                          <div className="space-y-4 pt-4 border-t" style={{ borderColor: activeTheme.container.borderColor }}>
                             <div className="flex justify-between items-center">
                                <label className="text-[9px] font-black uppercase tracking-[0.15em] opacity-60" style={{ color: activeTheme.container.textColor }}>Background Type</label>
                                <div className="flex bg-black/5 dark:bg-white/5 rounded-full p-1 border border-dashed" style={{ borderColor: activeTheme.container.borderColor }}>
                                   {['solid', 'gradient', 'image'].map((mode) => (
                                      <button
                                        key={mode}
                                        onClick={() => updateTrialTheme({ background: { mode: mode } })}
                                        className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase transition-all ${
                                          (trialTheme?.background?.mode || activeTheme.background.mode || 'solid') === mode 
                                            ? 'bg-primary text-white' 
                                            : 'opacity-40'
                                        }`}
                                        style={{ color: (trialTheme?.background?.mode || activeTheme.background.mode || 'solid') === mode ? '#fff' : activeTheme.container.textColor }}
                                      >
                                        {mode}
                                      </button>
                                   ))}
                                </div>
                             </div>

                             {/* Solid Configuration */}
                             {(trialTheme?.background?.mode || activeTheme.background.mode || 'solid') === 'solid' && (
                                <ModernColorPicker label="Background Color" path="background.color" secondaryLabel="backgroundColor" />
                             )}

                             {/* Gradient Configuration */}
                             {(trialTheme?.background?.mode || activeTheme.background.mode || 'solid') === 'gradient' && (
                                <div className="space-y-6 animate-in slide-in-from-top-2 duration-300">
                                   <div className="space-y-3">
                                      <div className="flex justify-between items-center">
                                         <label className="text-[8px] font-black uppercase opacity-40">Color Stops</label>
                                         <button 
                                            onClick={() => {
                                              const stops = trialTheme?.background?.gradient?.stops || activeTheme.background.gradient?.stops || ['#4f46e5', '#9333ea'];
                                              updateTrialTheme({ background: { gradient: { stops: [...stops, '#ffffff'] } } });
                                            }}
                                            className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                                         >
                                            <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
                                         </button>
                                      </div>
                                       <div className="space-y-2">
                                         {(() => {
                                           const stops = trialTheme?.background?.gradient?.stops || activeTheme.background.gradient?.stops || ['#4f46e5', '#9333ea'];
                                           return Array.isArray(stops) ? stops.map((stop: string, idx: number) => (
                                              <div key={idx} className="flex items-center gap-3 p-2 rounded-xl bg-black/5 dark:bg-white/5 border border-dashed" style={{ borderColor: activeTheme.container.borderColor }}>
                                                 <div className="relative w-8 h-8 rounded-lg overflow-hidden border-2 border-white/20">
                                                    <input 
                                                      type="color" value={stop}
                                                      onChange={(e) => {
                                                        const currentStops = trialTheme?.background?.gradient?.stops || activeTheme.background.gradient?.stops || [];
                                                        const validStops = Array.isArray(currentStops) ? currentStops : [];
                                                        const nextStops = [...validStops];
                                                        nextStops[idx] = e.target.value;
                                                        updateTrialTheme({ background: { gradient: { stops: nextStops } } });
                                                      }}
                                                      className="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer"
                                                    />
                                                    <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: stop }} />
                                                 </div>
                                                 <input 
                                                    type="text" value={stop.toUpperCase()}
                                                    onChange={(e) => {
                                                      const val = e.target.value;
                                                      if (/^#[0-9A-F]{6}$/i.test(val)) {
                                                        const currentStops = trialTheme?.background?.gradient?.stops || activeTheme.background.gradient?.stops || [];
                                                        const validStops = Array.isArray(currentStops) ? currentStops : [];
                                                        const nextStops = [...validStops];
                                                        nextStops[idx] = val;
                                                        updateTrialTheme({ background: { gradient: { stops: nextStops } } });
                                                      }
                                                    }}
                                                    className="bg-transparent border-none p-0 text-[10px] font-mono font-black uppercase flex-1"
                                                    style={{ color: activeTheme.container.textColor }}
                                                 />
                                                 <button 
                                                    disabled={(Array.isArray(stops) ? stops : []).length <= 2}
                                                    onClick={() => {
                                                      const currentStops = trialTheme?.background?.gradient?.stops || activeTheme.background.gradient?.stops || [];
                                                      const validStops = Array.isArray(currentStops) ? currentStops : [];
                                                      const nextStops = validStops.filter((_: any, i: number) => i !== idx);
                                                      updateTrialTheme({ background: { gradient: { stops: nextStops } } });
                                                    }}
                                                    className="text-red-500/50 hover:text-red-500 transition-colors disabled:opacity-0"
                                                 >
                                                    <FontAwesomeIcon icon={faTrash} className="text-[10px]" />
                                                 </button>
                                              </div>
                                           )) : null;
                                         })()}
                                      </div>
                                   </div>

                                   <div className="grid grid-cols-2 gap-4">
                                      <ThemeSelect label="From" path="background.gradient.from" options={['TopLeft', 'TopCenter', 'TopRight', 'CenterLeft', 'Center', 'CenterRight', 'BottomLeft', 'BottomCenter', 'BottomRight']} />
                                      <ThemeSelect label="To" path="background.gradient.to" options={['TopLeft', 'TopCenter', 'TopRight', 'CenterLeft', 'Center', 'CenterRight', 'BottomLeft', 'BottomCenter', 'BottomRight']} />
                                   </div>

                                   <div className="flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-dashed" style={{ borderColor: activeTheme.container.borderColor }}>
                                      <div className="flex items-center gap-2">
                                         <FontAwesomeIcon icon={faExchangeAlt} className="text-[10px] opacity-40" />
                                         <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Reverse Direction</span>
                                      </div>
                                      <ThemeToggle path="background.gradient.reverse" />
                                   </div>

                                   {/* CSS Importer Buttons */}
                                   <div className="grid grid-cols-2 gap-2 pt-2">
                                      {[
                                        { name: 'CSSGradient', url: 'cssgradient.io' },
                                        { name: 'WebGradients', url: 'webgradients.com' }
                                      ].map((lib) => (
                                        <button
                                          key={lib.name}
                                          onClick={() => setShowImportDialog(true)}
                                          className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-primary/30 hover:bg-primary/5 transition-all group"
                                        >
                                          <FontAwesomeIcon icon={faFileImport} className="text-[10px] text-primary group-hover:scale-110 transition-transform" />
                                          <span className="text-[8px] font-black uppercase tracking-tight" style={{ color: activeTheme.container.textColor }}>{lib.name}</span>
                                        </button>
                                      ))}
                                   </div>
                                </div>
                             )}

                             {/* Image mode (Placeholder) */}
                             {(trialTheme?.background?.mode || activeTheme.background.mode || 'solid') === 'image' && (
                                <div className="space-y-4 p-4 rounded-xl bg-black/5 dark:bg-white/5 border border-dashed text-center" style={{ borderColor: activeTheme.container.borderColor }}>
                                  <FontAwesomeIcon icon={faFileImport} className="text-xl opacity-20" />
                                  <p className="text-[10px] font-bold opacity-40">Background image URL property and upload coming soon.</p>
                                </div>
                             )}
                          </div>
                       </Section>

                       {/* Category: Header */}
                       <Section id="header" label="Top Navigation" icon={faKeyboard}>
                          <div className="grid grid-cols-2 gap-4">
                             <ModernColorPicker label="Background" path="header.color" />
                             <ModernColorPicker label="Text Color" path="header.textColor" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                             <ModernColorPicker label="Icon Color" path="header.iconColor" />
                             <ThemeSlider label="Icon Size" path="header.iconSize" min={0.5} max={2.5} step={0.1} unit="rem" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                             <ThemeSlider label="Opacity" path="header.opacity" />
                             <ThemeSelect label="Blur" path="header.backdropBlur" options={['none', 'sm', 'md', 'lg', 'xl']} />
                          </div>
                       </Section>

                       {/* Category: Sidebar */}
                       <Section id="sidebar" label="Sidebar Menu" icon={faTh}>
                          <div className="grid grid-cols-2 gap-4">
                             <ModernColorPicker label="Sidebar BG" path="sidebar.color" />
                             <ModernColorPicker label="Text Color" path="sidebar.textColor" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                             <ModernColorPicker label="Icon Color" path="sidebar.iconColor" />
                             <ThemeSlider label="Icon Size" path="sidebar.iconSize" min={0.5} max={2.5} step={0.1} unit="rem" />
                          </div>
                          <div className="grid grid-cols-2 gap-4 border-t pt-4" style={{ borderColor: activeTheme.container.borderColor }}>
                            <ThemeSlider label="Text Size" path="sidebar.textSize" min={0.5} max={1.5} step={0.05} unit="rem" />
                            <ThemeSelect label="Sidebar Blur" path="sidebar.backdropBlur" options={['none', 'sm', 'md', 'lg', 'xl']} />
                          </div>
                          <div className="space-y-4 pt-4">
                             <ThemeToggle label="Detached Style" path="sidebar.detached" />
                             <ThemeSlider label="Sidebar Opacity" path="sidebar.opacity" />
                          </div>
                       </Section>

                       {/* Category: Surfaces */}
                       <Section id="surfaces" label="Surface Details" icon={faLayerGroup}>
                          <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                               <ModernColorPicker label="Container BG" path="container.color" />
                               <ModernColorPicker label="Borders" path="container.borderColor" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                               <ModernColorPicker label="Main Text" path="container.textColor" />
                               <ModernColorPicker label="Surface Icons" path="container.iconColor" />
                            </div>
                            <div className="space-y-4 border-t pt-4" style={{ borderColor: activeTheme.container.borderColor }}>
                               <div className="grid grid-cols-2 gap-4">
                                  <ThemeSlider label="Container Opacity" path="container.opacity" />
                                  <ThemeSlider label="Card Opacity" path="card.opacity" />
                               </div>
                               <div className="grid grid-cols-2 gap-4">
                                  <ThemeSlider label="Card Radius" path="card.borderRadius" min={0} max={3} step={0.1} unit="rem" />
                                  <ThemeSelect label="Card Blur" path="card.backdropBlur" options={['none', 'sm', 'md', 'lg', 'xl']} />
                               </div>
                               <ModernColorPicker label="Card Border" path="card.borderColor" />
                               <div className="grid grid-cols-2 gap-4">
                                  <ModernColorPicker label="Card Icons" path="card.iconColor" />
                                  <ThemeSlider label="Card Text Size" path="card.textSize" min={0.5} max={1.5} step={0.05} unit="rem" />
                               </div>
                            </div>
                          </div>
                       </Section>

                       {/* Category: Popups */}
                       <Section id="popups" label="Popups & Tooltips" icon={faWindowRestore}>
                          <div className="grid grid-cols-2 gap-4">
                             <ModernColorPicker label="Popup BG" path="popup.backgroundColor" />
                             <ModernColorPicker label="Border" path="popup.borderColor" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                             <ModernColorPicker label="Text Active" path="popup.textActiveColor" />
                             <ModernColorPicker label="Text Hover" path="popup.textHoverColor" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                             <ThemeSlider label="Popup Opacity" path="popup.opacity" />
                             <ThemeSelect label="Popup Blur" path="popup.backdropBlur" options={['none', 'sm', 'md', 'lg', 'xl']} />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                             <ThemeSlider label="Radius" path="popup.borderRadius" min={0} max={2} step={0.1} unit="rem" />
                             <ThemeSlider label="Blur Depth" path="popup.blurDepth" min={0} max={100} step={1} />
                          </div>
                       </Section>

                       {/* Category: Buttons */}
                       <Section id="buttons" label="Buttons & UI" icon={faSlidersH}>
                          <div className="space-y-6">
                             {/* Primary Button */}
                             <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                                <span className="text-[8px] font-black uppercase tracking-tighter text-primary">Primary Button</span>
                                <div className="grid grid-cols-2 gap-4 mt-3">
                                   <ModernColorPicker label="BG Color" path="button.primary.color" />
                                   <ModernColorPicker label="Text Color" path="button.primary.textColor" />
                                </div>
                                <div className="grid grid-cols-2 gap-4 mt-3">
                                   <ThemeSlider label="Radius" path="button.primary.borderRadius" min={0} max={2} step={0.1} unit="rem" />
                                   <ThemeSlider label="Text Size" path="button.primary.textSize" min={0.5} max={1.5} step={0.05} unit="rem" />
                                </div>
                             </div>
                             
                             {/* Secondary Button */}
                             <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border" style={{ borderColor: activeTheme.container.borderColor }}>
                                <span className="text-[8px] font-black uppercase tracking-tighter opacity-50" style={{ color: activeTheme.container.textColor }}>Secondary Button</span>
                                <div className="grid grid-cols-2 gap-4 mt-3">
                                   <ModernColorPicker label="BG Color" path="button.secondary.color" />
                                   <ModernColorPicker label="Border Color" path="button.secondary.borderColor" />
                                </div>
                                <div className="grid grid-cols-2 gap-4 mt-3">
                                   <ModernColorPicker label="Text Color" path="button.secondary.textColor" />
                                   <ThemeSlider label="Radius" path="button.secondary.borderRadius" min={0} max={2} step={0.1} unit="rem" />
                                </div>
                             </div>

                             {/* Tertiary Button */}
                             <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-dashed" style={{ borderColor: activeTheme.container.borderColor }}>
                                <span className="text-[8px] font-black uppercase tracking-tighter opacity-30" style={{ color: activeTheme.container.textColor }}>Tertiary / Ghost</span>
                                <div className="grid grid-cols-2 gap-4 mt-3">
                                   <ModernColorPicker label="Text Color" path="button.tertiary.textColor" />
                                   <ThemeSlider label="Opacity" path="button.tertiary.opacity" />
                                </div>
                             </div>
                          </div>
                       </Section>

                       {/* Category: Inputs */}
                       <Section id="inputs" label="Forms & Inputs" icon={faInputIcon}>
                          <div className="space-y-4">
                             <div className="grid grid-cols-2 gap-4">
                                <ModernColorPicker label="Input BG" path="input.color" />
                                <ModernColorPicker label="Border" path="input.borderColor" />
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                                <ModernColorPicker label="Text Color" path="input.textColor" />
                                <ModernColorPicker label="Icon Color" path="input.iconColor" />
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                                <ThemeSlider label="Radius" path="input.borderRadius" min={0} max={2} step={0.1} unit="rem" />
                                <ThemeSlider label="Opacity" path="input.opacity" />
                             </div>
                          </div>
                       </Section>

                       {/* Category: AG Grid */}
                       <Section id="grid" label="Data Tables" icon={faGripLines}>
                          <div className="space-y-4">
                             <div className="grid grid-cols-2 gap-4">
                                <ModernColorPicker label="Table BG" path="grid.backgroundColor" />
                                <ModernColorPicker label="Header BG" path="grid.headerColor" />
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                                <ModernColorPicker label="Text Primary" path="grid.primaryTextColor" />
                                <ModernColorPicker label="Text Header" path="grid.headerTextColor" />
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                                <ModernColorPicker label="Row Border" path="grid.rowBorderColor" />
                                <ThemeSlider label="Row Width" path="grid.rowBorderWidth" min={0} max={5} step={1} unit="px" />
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                                <ModernColorPicker label="Col Border" path="grid.columnBorderColor" />
                                <ThemeSlider label="Col Width" path="grid.columnBorderWidth" min={0} max={5} step={1} unit="px" />
                             </div>
                             <div className="grid grid-cols-1 gap-4">
                                <ModernColorPicker label="Header Hover" path="grid.headerHoverColor" />
                             </div>
                             <div className="grid grid-cols-2 gap-4 border-t pt-4" style={{ borderColor: activeTheme.container.borderColor }}>
                                <ThemeToggle label="Wrapper Border" path="grid.showWrapperBorder" />
                                <ThemeToggle label="Row Borders" path="grid.showHeaderRowBorder" />
                             </div>
                             <ThemeSlider label="Header Height" path="grid.headerHeight" min={20} max={60} step={2} unit="px" />
                             <div className="grid grid-cols-2 gap-4">
                                <ModernColorPicker label="Secondary Text" path="grid.secondaryTextColor" />
                                <ModernColorPicker label="Moving Header" path="grid.headerMovingColor" />
                             </div>
                          </div>
                       </Section>

                       {/* Category: Advanced UI */}
                       <Section id="advanced" label="Typography & FX" icon={faTextHeight}>
                          <div className="space-y-6">
                             <div className="grid grid-cols-2 gap-4">
                                <ThemeSlider label="Global Scale" path="card.textSize" min={0.5} max={1.5} step={0.05} unit="rem" />
                                <ThemeSlider label="Backdrop Gray" path="popup.backdropGrayscale" min={0} max={100} step={1} unit="%" />
                             </div>
                             <div className="grid grid-cols-1 gap-4">
                                <ThemeSlider label="Shade Gradient" path="popup.shadeGradient" min={0} max={1} step={0.1} />
                             </div>
                             <ThemeToggle label="Show Header Row Border" path="grid.showHeaderRowBorder" />
                          </div>
                       </Section>
                    </div>
                  );
                })()}

                <div className="pt-4">
                  <button 
                    onClick={handleSaveTheme}
                    className="w-full py-4 rounded-2xl bg-primary text-white text-[11px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:-translate-y-1 transition-all active:scale-95 active:translate-y-0 flex items-center justify-center gap-3"
                  >
                    <FontAwesomeIcon icon={faSave} />
                    Save as My Preset
                  </button>
                </div>
              </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t bg-black/5 dark:bg-white/5 flex gap-4" style={{ borderColor: activeTheme.container.borderColor }}>
          <button 
            onClick={() => {
              resetTrial();
              setActiveSegment('predefined');
            }}
            className="flex-1 py-3 rounded-xl border font-black text-[10px] uppercase tracking-widest transition-all hover:bg-black/5 flex items-center justify-center gap-2"
            style={{ borderColor: activeTheme.container.borderColor, color: activeTheme.container.textColor }}
          >
            <FontAwesomeIcon icon={faUndo} />
            Reset
          </button>
          
          <button 
            disabled={selectedThemeId === currentThemeId && !trialTheme}
            onClick={() => {
              applyThemeWithUndo(selectedThemeId);
              handleClose();
            }}
            className={`flex-[2] py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl ${
              selectedThemeId === currentThemeId && !trialTheme
                ? 'bg-slate-300 dark:bg-white/5 text-slate-400 cursor-not-allowed'
                : 'bg-primary text-white shadow-primary/20 hover:-translate-y-1'
            }`}
          >
            <FontAwesomeIcon icon={faCheck} />
            Apply Changes
          </button>
        </div>

        {/* CSS Import Dialog */}
        {showImportDialog && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
              onClick={() => setShowImportDialog(false)}
            />
            <div 
              className="relative w-full max-w-lg rounded-3xl p-8 border border-white/20 shadow-2xl animate-in fade-in zoom-in duration-300"
              style={{ backgroundColor: activeTheme.popup.backgroundColor, borderColor: activeTheme.popup.borderColor }}
            >
               <h3 className="text-xl font-black uppercase tracking-wider mb-2" style={{ color: activeTheme.container.textColor }}>CSS Gradient Importer</h3>
               <p className="text-xs opacity-60 mb-6" style={{ color: activeTheme.container.textColor }}>Paste the CSS code from WebGradients or CSSGradient.io</p>
               
               <textarea 
                  value={importCss}
                  onChange={(e) => setImportCss(e.target.value)}
                  placeholder="background: linear-gradient(90deg, #...);"
                  className="w-full h-32 bg-black/20 dark:bg-white/5 rounded-2xl p-4 text-xs font-mono outline-none border focus:border-primary transition-all resize-none"
                  style={{ borderColor: activeTheme.container.borderColor, color: activeTheme.container.textColor }}
               />

               <div className="flex gap-4 mt-8">
                  <button 
                    onClick={() => setShowImportDialog(false)}
                    className="flex-1 py-3 rounded-xl font-black uppercase text-[10px] opacity-40 hover:opacity-100 transition-all"
                    style={{ color: activeTheme.container.textColor }}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      // Basic parser for linear-gradient
                      const css = importCss.toLowerCase();
                      const hexMatch = css.match(/#[a-f0-9]{3,6}/gi);
                      if (hexMatch && hexMatch.length >= 2) {
                        updateTrialTheme({ 
                          background: { 
                            mode: 'gradient',
                            gradient: {
                              stops: hexMatch.map(h => h.startsWith('#') ? h : '#' + h)
                            }
                          } 
                        });
                        toast.success('Gradient imported successfully!');
                        setShowImportDialog(false);
                      } else {
                        toast.error('Could not find valid hex colors in CSS');
                      }
                    }}
                    className="flex-2 py-3 px-8 rounded-xl bg-primary text-white font-black uppercase text-[11px] shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                  >
                    Import Gradient
                  </button>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ThemedThemingSheet;
