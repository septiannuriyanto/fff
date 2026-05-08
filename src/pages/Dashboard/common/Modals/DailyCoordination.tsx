import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FaUsers, FaPlus, FaSave, FaHistory, FaCheckCircle, FaTrash, FaSync, FaGripVertical, FaExpand, FaCompress, FaTimes, FaListUl, FaChevronDown, FaRegCommentDots, FaTasks, FaRegPlusSquare, FaEdit, FaLink, FaPlay } from 'react-icons/fa';
import { supabase } from '../../../../db/SupabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import { Reorder, useDragControls, AnimatePresence, motion } from 'framer-motion';

import { formatDateToIndonesianShortByDate } from '../../../../Utils/DateUtility';

interface ParameterItem {
    key: string;
    value: any; // string or ParameterItem[]
    remark?: string;
    steps?: { text: string; status: 'OPEN' | 'CLOSED' }[];
    binding?: string;
}

interface DailyCoordinationData {
    id: string;
    date: string;
    parameters: ParameterItem[];
}

const formatNumericString = (val: any) => {
    if (val === null || val === undefined || val === '') return '';

    // If it's a number (from RPC), format it immediately
    if (typeof val === 'number') {
        return new Intl.NumberFormat('id-ID').format(val);
    }

    // If it's a string, check if it's a raw numeric string
    const str = String(val).replace(/\./g, '').replace(',', '.');
    const num = parseFloat(str);

    if (!isNaN(num) && /^-?\d*(\.\d*)?$/.test(str)) {
        return new Intl.NumberFormat('id-ID').format(num);
    }

    return val;
};


const DailyCoordination = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [data, setData] = useState<DailyCoordinationData | null>(null);
    const [parameters, setParameters] = useState<ParameterItem[]>([]);
    const [newKey, setNewKey] = useState('');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showFunctionPicker, setShowFunctionPicker] = useState<{ path: string[], key: string } | null>(null);
    const [availableFunctions, setAvailableFunctions] = useState<string[]>([]);
    const [fetchingFunctions, setFetchingFunctions] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchFunctions = async () => {
        setFetchingFunctions(true);
        try {
            const { data: fns, error } = await supabase.rpc('get_available_coordination_functions');
            if (error) throw error;
            if (fns) {
                setAvailableFunctions(fns.map((f: any) => f.fn_name));
            }
        } catch (error) {
            console.error('Error fetching functions:', error);
            setAvailableFunctions([]);
        } finally {
            setFetchingFunctions(false);
        }
    };

    useEffect(() => {
        if (showFunctionPicker) {
            fetchFunctions();
            setSearchQuery('');
        }
    }, [showFunctionPicker]);

    const handleBindFunction = (fn: string) => {
        if (showFunctionPicker) {
            const updated = updateParameter([...showFunctionPicker.path, showFunctionPicker.key], fn, 'binding');
            saveChanges(updated);
            if (fn) {
                toast.success(`Successfully bound to ${fn}`);
            } else {
                toast.success('Function unbound');
            }
            setShowFunctionPicker(null);
        }
    };

    const handleRunFunction = async (path: string[], binding: string) => {
        const toastId = toast.loading(`Running ${binding}...`);
        try {
            const { data: result, error } = await supabase.rpc(binding);
            if (error) throw error;

            const updated = updateParameter(path, result);
            saveChanges(updated);
            toast.success(`Fetched: ${result}`, { id: toastId });
        } catch (error: any) {
            console.error('Error running function:', error);
            toast.error(`Failed to run ${binding}: ${error.message}`, { id: toastId });
        }
    };

    const todayStr = new Date().toISOString().split('T')[0];

    useEffect(() => {
        fetchTodayData();
    }, []);

    const fetchTodayData = async () => {
        setLoading(true);
        try {
            const { data: todayData, error } = await supabase
                .from('daily_coordination')
                .select('*')
                .eq('date', todayStr)
                .maybeSingle();

            if (error) throw error;

            if (todayData) {
                setData(todayData);
                const rawParams = todayData.parameters;
                if (Array.isArray(rawParams)) {
                    setParameters(rawParams);
                } else if (rawParams && typeof rawParams === 'object') {
                    setParameters(Object.entries(rawParams).map(([key, value]) => ({ key, value })));
                } else {
                    setParameters([]);
                }
            } else {
                setData(null);
                setParameters([]);
            }
        } catch (error: any) {
            console.error('Error fetching today data:', error);
            toast.error('Failed to load today\'s coordination data');
        } finally {
            setLoading(false);
        }
    };

    const initializeFromLastData = async () => {
        setLoading(true);
        try {
            const { data: lastData, error } = await supabase
                .from('daily_coordination')
                .select('parameters')
                .order('date', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;

            let initialParams: ParameterItem[] = [];
            if (lastData && lastData.parameters) {
                const processParams = (items: any[], level = 0): ParameterItem[] => {
                    return items.map(item => ({
                        key: item.key,
                        value: Array.isArray(item.value) ? processParams(item.value, level + 1) : (level > 0 ? 'OPEN' : 'READY'),
                        remark: item.remark || '',
                        steps: Array.isArray(item.steps) ? item.steps : [],
                        binding: item.binding || ''
                    }));
                };

                if (Array.isArray(lastData.parameters)) {
                    initialParams = processParams(lastData.parameters);
                } else {
                    initialParams = Object.keys(lastData.parameters).map(key => ({ key, value: 'READY', remark: '', steps: [] }));
                }
            }

            const { data: inserted, error: insertError } = await supabase
                .from('daily_coordination')
                .insert([{ date: todayStr, parameters: initialParams }])
                .select()
                .single();

            if (insertError) throw insertError;

            setData(inserted);
            setParameters(initialParams);
            toast.success('Started today\'s coordination meeting!');
        } catch (error: any) {
            console.error('Error initializing data:', error);
            toast.error('Failed to initialize meeting data');
        } finally {
            setLoading(false);
        }
    };

    const saveChanges = async (paramsToSave = parameters) => {
        if (!data) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('daily_coordination')
                .update({ parameters: paramsToSave })
                .eq('id', data.id);

            if (error) throw error;
            setSaving(false);
        } catch (error: any) {
            console.error('Error saving data:', error);
            toast.error('Failed to save changes');
            setSaving(false);
        }
    };

    const updateParameter = (keyPath: string[], newValue: any, field: 'value' | 'remark' | 'steps' | 'binding' = 'value') => {
        const updateRecursive = (items: ParameterItem[], path: string[]): ParameterItem[] => {
            const [current, ...rest] = path;
            return items.map(item => {
                if (item.key === current) {
                    if (rest.length === 0) {
                        return { ...item, [field]: newValue };
                    }
                    return { ...item, value: updateRecursive(item.value as ParameterItem[], rest) };
                }
                return item;
            });
        };

        const updated = updateRecursive(parameters, keyPath);
        setParameters(updated);
        return updated;
    };

    const removeParameter = (keyPath: string[]) => {
        const removeRecursive = (items: ParameterItem[], path: string[]): ParameterItem[] => {
            const [current, ...rest] = path;
            if (rest.length === 0) {
                return items.filter(item => item.key !== current);
            }
            return items.map(item => {
                if (item.key === current) {
                    return { ...item, value: removeRecursive(item.value as ParameterItem[], rest) };
                }
                return item;
            });
        };
        const updated = removeRecursive(parameters, keyPath);
        setParameters(updated);
        saveChanges(updated);
    };

    const addParameter = (keyPath: string[], newParamName: string) => {
        const normalized = newParamName.trim().toUpperCase();
        if (!normalized) return;

        const addRecursive = (items: ParameterItem[], path: string[]): ParameterItem[] => {
            if (path.length === 0) {
                if (items.some(p => p.key === normalized)) {
                    toast.error('Parameter already exists');
                    return items;
                }
                return [...items, { key: normalized, value: 'OPEN', remark: '', steps: [] }];
            }
            const [current, ...rest] = path;
            return items.map(item => {
                if (item.key === current) {
                    const children = Array.isArray(item.value) ? item.value : [];
                    return { ...item, value: addRecursive(children, rest) };
                }
                return item;
            });
        };

        const updated = addRecursive(parameters, keyPath);
        if (updated !== parameters) {
            setParameters(updated);
            saveChanges(updated);
        }
    };

    const addKey = () => {
        const normalizedKey = newKey.trim().toUpperCase();
        if (!normalizedKey) return;
        if (parameters.some(p => p.key === normalizedKey)) {
            toast.error('Parameter already exists');
            return;
        }
        const updatedParams = [...parameters, { key: normalizedKey, value: 'READY', remark: '', steps: [] }];
        setParameters(updatedParams);
        setNewKey('');
        saveChanges(updatedParams);
    };

    const handleReorder = (newOrder: ParameterItem[]) => {
        setParameters(newOrder);
        saveChanges(newOrder);
    };

    // ... rest of render methods ...
    // Note: I will need to rewrite parts of the rendering logic below to support recursion.

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Loading Coordination...</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-6 text-center px-6">
                <div className="w-24 h-24 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center text-orange-600 dark:text-orange-400">
                    <FaHistory size={48} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">No Meeting Started Today</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                        Start today's daily coordination by cloning the parameters from the previous meeting.
                        Values will be initialized to "READY".
                    </p>
                </div>
                <button
                    onClick={initializeFromLastData}
                    className="flex items-center gap-3 px-8 py-4 bg-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-orange-500/20 hover:shadow-orange-500/40 hover:-translate-y-1 transition-all active:scale-95"
                >
                    <FaSync className="text-sm" /> Initialize Today's Meeting
                </button>
            </div>
        );
    }

    const renderMainContent = (isZoomed: boolean) => (
        <div className={`flex flex-col h-full pb-10 px-6 md:px-10 ${isZoomed ? 'bg-white dark:bg-slate-950 p-6 md:p-16 lg:p-24' : ''}`}>
            <Toaster position="top-center" containerStyle={{ zIndex: 1000000000 }} />
            {/* Header Section */}
            <div className="flex items-center justify-between gap-4 py-4 px-2 border-b border-slate-100 dark:border-slate-800/50 mb-8">
                <div className="flex flex-col">
                    <span className="text-xs md:text-sm font-black text-slate-400 uppercase tracking-[0.3em] leading-none mb-2">Coordination Date</span>
                    <span
                        className="text-xl md:text-4xl lg:text-5xl font-black text-sky-500 uppercase tracking-tighter italic"
                        style={{ textShadow: '0 0 2px rgba(255,255,255,0.8), 0 0 15px rgba(14,165,233,0.3)' }}
                    >
                        {formatDateToIndonesianShortByDate(new Date(todayStr))}
                    </span>
                </div>

                <div className="flex items-center gap-4 md:gap-6">
                    {saving && (
                        <div className="flex items-center gap-3 px-6 py-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-100 dark:border-emerald-800/50 shadow-lg shadow-emerald-500/10 transition-all animate-in fade-in slide-in-from-right-4">
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-xs md:text-sm font-black uppercase tracking-widest">Saving Changes...</span>
                        </div>
                    )}
                    <button
                        onClick={() => setIsFullscreen(!isZoomed)}
                        className={`p-4 md:p-6 rounded-[2rem] transition-all active:scale-90 shadow-xl ${isZoomed
                            ? 'bg-rose-50 text-rose-500 hover:bg-rose-100 dark:bg-rose-900/20 shadow-rose-500/10'
                            : 'bg-sky-50 text-sky-600 hover:bg-sky-100 dark:bg-sky-900/20 shadow-sky-500/10'
                            }`}
                        title={isZoomed ? "Close Full Screen" : "Open Full Screen"}
                    >
                        {isZoomed ? <FaTimes size={28} /> : <FaExpand size={24} />}
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto pr-2 pl-2 pb-12">
                    {parameters.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 text-slate-400 gap-6 opacity-20">
                            <FaPlus size={64} />
                            <p className="text-lg font-black uppercase tracking-[0.3em] text-center leading-relaxed">No parameters defined<br />Add your first topic below</p>
                        </div>
                    ) : (
                        <Reorder.Group
                            axis="y"
                            values={parameters}
                            onReorder={handleReorder}
                            className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-12"
                        >
                            {parameters.map((item) => (
                                <ParameterCard
                                    key={item.key}
                                    item={item}
                                    path={[item.key]}
                                    isZoomed={isZoomed}
                                    updateParameter={updateParameter}
                                    removeParameter={removeParameter}
                                    addParameter={addParameter}
                                    saveChanges={saveChanges}
                                    setParameters={setParameters}
                                    setShowFunctionPicker={setShowFunctionPicker}
                                    handleRunFunction={handleRunFunction}
                                />
                            ))}
                        </Reorder.Group>
                    )}

                    {/* Add New Parameter Card at the Bottom */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-48 px-2">
                        <div className={`flex flex-col gap-4 p-6 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 hover:border-sky-500/50 transition-all mx-auto w-full max-w-[98%] ${isZoomed ? 'scale-105' : ''}`}>
                            <div className="flex items-center gap-2 px-1">
                                <span className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-[0.3em]">New Parameter</span>
                            </div>
                            <div className="flex items-center gap-3 relative">
                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        placeholder="Type parameter name..."
                                        value={newKey}
                                        onChange={(e) => setNewKey(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addKey()}
                                        className="w-full bg-white dark:bg-black/20 border-2 border-transparent rounded-2xl px-6 py-4 text-sm md:text-base font-black focus:border-sky-500 outline-none transition-all shadow-sm pr-12"
                                    />
                                    {newKey && (
                                        <button
                                            onClick={() => setNewKey('')}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-rose-500 transition-all"
                                            title="Clear text"
                                        >
                                            <FaTimes size={14} />
                                        </button>
                                    )}
                                </div>
                                <button
                                    onClick={addKey}
                                    className="p-4 bg-sky-600 text-white rounded-2xl hover:bg-sky-700 transition-all shadow-xl shadow-sky-500/30 active:scale-95"
                                >
                                    <FaPlus size={20} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Spacer to ensure no clipping */}
                    <div className="h-20 w-full flex-shrink-0" />
                </div>
            </div>
        </div>
    );

    const fullScreenContent = (
        <AnimatePresence>
            {isFullscreen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[99999] flex flex-col bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-2xl p-4 md:p-10"
                >
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 20, opacity: 0 }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] border border-white dark:border-white/10"
                    >
                        {renderMainContent(true)}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );

    return (
        <>
            {renderMainContent(false)}
            {/* Function Picker Modal - Portaled to Body to ensure it is above all other modals */}
            {createPortal(
                <AnimatePresence>
                    {showFunctionPicker && (
                        <div className="fixed inset-0 z-[9999999] flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowFunctionPicker(null)}
                                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                            />
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                                className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-white dark:border-white/10 p-8 flex flex-col gap-6"
                            >
                                <div className="flex items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100 dark:border-white/5">
                                    <h3 className="text-sm md:text-base font-black text-slate-800 dark:text-white uppercase tracking-tight">
                                        <span className="text-slate-400">Bind to : </span>
                                        <span className="text-sky-500">{showFunctionPicker.key}</span>
                                    </h3>
                                    <button onClick={() => setShowFunctionPicker(null)} className="p-2 bg-slate-50 dark:bg-white/5 rounded-xl text-slate-400 hover:text-rose-500 transition-all">
                                        <FaTimes size={14} />
                                    </button>
                                </div>

                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Search functions (coord_...)"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-black/20 border-2 border-transparent focus:border-sky-500 rounded-2xl px-5 py-3 text-xs font-bold outline-none transition-all"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                                        <FaHistory size={12} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {fetchingFunctions ? (
                                        <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-400">
                                            <div className="w-8 h-8 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Scanning Database...</span>
                                        </div>
                                    ) : (
                                        <>
                                            {availableFunctions
                                                .filter(fn => fn.toLowerCase().includes(searchQuery.toLowerCase()))
                                                .map(fn => (
                                                    <button
                                                        key={fn}
                                                        onClick={() => handleBindFunction(fn)}
                                                        className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border-2 border-transparent hover:border-sky-500 hover:bg-white dark:hover:bg-sky-500/10 transition-all group/fn text-left"
                                                    >
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-black text-slate-700 dark:text-slate-200 group-hover/fn:text-sky-500 transition-colors">{fn}</span>
                                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Ready to sync</span>
                                                        </div>
                                                        <FaLink size={14} className="text-slate-200 group-hover/fn:text-sky-400 transition-all transform translate-x-2 opacity-0 group-hover/fn:translate-x-0 group-hover/fn:opacity-100" />
                                                    </button>
                                                ))}
                                            {availableFunctions.length === 0 && !fetchingFunctions && (
                                                <div className="py-10 text-center text-slate-400 italic text-[10px] font-bold">
                                                    No functions found with 'coord_' prefix.
                                                </div>
                                            )}
                                        </>
                                    )}
                                    <button
                                        onClick={() => handleBindFunction('')}
                                        className="w-full p-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 hover:border-rose-200 hover:text-rose-500 transition-all mt-2"
                                    >
                                        Unbind / Clear Function
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {createPortal(fullScreenContent, document.body)}
        </>
    );
};

const ParameterCard = ({
    item,
    path,
    isZoomed,
    updateParameter,
    removeParameter,
    addParameter,
    saveChanges,
    setParameters,
    setShowFunctionPicker,
    handleRunFunction
}: {
    item: ParameterItem,
    path: string[],
    isZoomed?: boolean,
    updateParameter: (path: string[], v: any, field?: 'value' | 'remark' | 'steps' | 'binding') => void,
    removeParameter: (path: string[]) => void,
    addParameter: (path: string[], name: string) => void,
    saveChanges: (p?: any) => void,
    setParameters: React.Dispatch<React.SetStateAction<ParameterItem[]>>,
    setShowFunctionPicker: React.Dispatch<React.SetStateAction<{ path: string[], key: string } | null>>,
    handleRunFunction: (path: string[], binding: string) => void
}) => {
    const controls = useDragControls();
    const isNested = Array.isArray(item.value);
    const [subParamName, setSubParamName] = useState('');
    const [activeRemarks, setActiveRemarks] = useState<Record<string, boolean>>({});

    const [activeSteps, setActiveSteps] = useState<Record<string, boolean>>({});
    const [editingStep, setEditingStep] = useState<{ subKey: string, index: number, value: string } | null>(null);
    const [lastValue, setLastValue] = useState<any>(null);
    const [lastStepValue, setLastStepValue] = useState<string>('');
    const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    const handleAddSub = () => {
        if (!subParamName.trim()) return;
        addParameter(path, subParamName);
        setSubParamName('');
    };

    const handleAddStep = (subKey: string, stepText: string) => {
        setParameters(prev => {
            const updateRecursive = (items: ParameterItem[], currentPath: string[]): ParameterItem[] => {
                const [current, ...rest] = currentPath;
                return items.map(item => {
                    if (item.key === current) {
                        if (rest.length === 0) {
                            const currentSteps = item.steps || [];
                            return { ...item, steps: [...currentSteps, { text: stepText, status: 'OPEN' }], value: item.value === 'OPEN' ? 'PROGRESS' : item.value };
                        }
                        return { ...item, value: updateRecursive(item.value as ParameterItem[], rest) };
                    }
                    return item;
                });
            };
            const updated = updateRecursive(prev, [...path, subKey]);
            saveChanges(updated);
            return updated;
        });
        setActiveSteps(prev => ({ ...prev, [subKey]: false }));
        toast.success('Step added');
    };

    const handleUpdateStep = (subKey: string, stepIndex: number, newValue: string) => {
        setParameters(prev => {
            const updateRecursive = (items: ParameterItem[], currentPath: string[]): ParameterItem[] => {
                const [current, ...rest] = currentPath;
                return items.map(item => {
                    if (item.key === current) {
                        if (rest.length === 0) {
                            const currentSteps = [...(item.steps || [])];
                            const currentStep = currentSteps[stepIndex];
                            if (typeof currentStep === 'string') {
                                (currentSteps as any)[stepIndex] = { text: newValue, status: 'OPEN' };
                            } else {
                                currentSteps[stepIndex] = { ...currentStep, text: newValue };
                            }
                            return { ...item, steps: currentSteps };
                        }
                        return { ...item, value: updateRecursive(item.value as ParameterItem[], rest) };
                    }
                    return item;
                });
            };
            const updated = updateRecursive(prev, [...path, subKey]);
            saveChanges(updated);
            return updated;
        });
        setEditingStep(null);
    };

    const toggleRemark = (key: string) => {
        setActiveRemarks(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleSteps = (key: string) => {
        setActiveSteps(prev => {
            const newState = { ...prev, [key]: !prev[key] };
            if (newState[key]) {
                setTimeout(() => {
                    inputRefs.current[key]?.focus();
                }, 50);
            }
            return newState;
        });
    };

    const handleToggleStepStatus = (subKey: string, stepIndex: number) => {
        setParameters(prev => {
            const updateRecursive = (items: ParameterItem[], currentPath: string[]): ParameterItem[] => {
                const [current, ...rest] = currentPath;
                return items.map(item => {
                    if (item.key === current) {
                        if (rest.length === 0) {
                            const currentSteps = [...(item.steps || [])];
                            const currentStep = currentSteps[stepIndex];
                            if (typeof currentStep === 'string') {
                                (currentSteps as any)[stepIndex] = { text: currentStep, status: 'CLOSED' };
                            } else {
                                currentSteps[stepIndex] = { ...currentStep, status: currentStep.status === 'OPEN' ? 'CLOSED' : 'OPEN' };
                            }
                            return { ...item, steps: currentSteps };
                        }
                        return { ...item, value: updateRecursive(item.value as ParameterItem[], rest) };
                    }
                    return item;
                });
            };
            const updated = updateRecursive(prev, [...path, subKey]);
            saveChanges(updated);
            return updated;
        });
    };
    const handleRemoveStep = (subKey: string, stepIndex: number) => {
        setParameters(prev => {
            const updateRecursive = (items: ParameterItem[], currentPath: string[]): ParameterItem[] => {
                const [current, ...rest] = currentPath;
                return items.map(item => {
                    if (item.key === current) {
                        if (rest.length === 0) {
                            const currentSteps = item.steps || [];
                            const newSteps = currentSteps.filter((_, i) => i !== stepIndex);
                            const shouldRevert = newSteps.length === 0 && (!item.remark || item.remark.trim().length === 0);
                            return { ...item, steps: newSteps, value: shouldRevert ? 'OPEN' : item.value };
                        }
                        return { ...item, value: updateRecursive(item.value as ParameterItem[], rest) };
                    }
                    return item;
                });
            };
            const updated = updateRecursive(prev, [...path, subKey]);
            saveChanges(updated);
            return updated;
        });
    };

    const handleClearRemark = (subKey: string) => {
        setParameters(prev => {
            const updateRecursive = (items: ParameterItem[], currentPath: string[]): ParameterItem[] => {
                const [current, ...rest] = currentPath;
                return items.map(item => {
                    if (item.key === current) {
                        if (rest.length === 0) {
                            const noSteps = (item.steps?.length || 0) === 0;
                            return { ...item, remark: '', value: noSteps ? 'OPEN' : item.value };
                        }
                        return { ...item, value: updateRecursive(item.value as ParameterItem[], rest) };
                    }
                    return item;
                });
            };
            const updated = updateRecursive(prev, [...path, subKey]);
            saveChanges(updated);
            return updated;
        });
        setActiveRemarks(prev => ({ ...prev, [subKey]: false }));
    };

    return (
        <Reorder.Item
            value={item}
            dragListener={false}
            dragControls={controls}
            className={`flex flex-col gap-4 group p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 bg-white dark:bg-white/5 shadow-sm hover:shadow-xl hover:border-sky-500/30 transition-all ${isZoomed ? 'scale-105 hover:scale-110' : ''}`}
        >
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-4 overflow-hidden">
                    <div
                        className="cursor-grab active:cursor-grabbing p-2 text-slate-300 hover:text-sky-500 transition-colors bg-slate-50 dark:bg-white/5 rounded-xl"
                        onPointerDown={(e) => controls.start(e)}
                    >
                        <FaGripVertical size={16} />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-xs md:text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] whitespace-normal break-words" title={item.key}>
                            {item.key}
                        </span>
                        {item.binding && (
                            <div className="flex items-center gap-1.5 text-[10px] font-black text-sky-500/60 uppercase tracking-tighter mt-0.5">
                                <FaLink size={10} />
                                {item.binding}
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {!isNested && (
                        <button
                            onClick={() => {
                                if (item.binding) {
                                    if (window.confirm("Anda yakin ingin unbind function ini? anda harus bind kembali untuk mengaktifkan fungsi tsb")) {
                                        const updated = updateParameter(path, '', 'binding');
                                        saveChanges(updated);
                                        toast.success('Function unbound');
                                    }
                                } else {
                                    setShowFunctionPicker({ path: path.slice(0, -1), key: item.key });
                                }
                            }}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all active:scale-95 ${item.binding ? 'text-sky-600 bg-sky-50 dark:bg-sky-900/20' : 'text-slate-400 hover:text-sky-500 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                            title="Bind Function"
                        >
                            <FaLink size={12} />
                        </button>
                    )}
                    {(!isNested || (isNested && item.value.length === 0)) && (
                        <button
                            onClick={() => updateParameter(path, isNested ? 'READY' : [])}
                            className={`p-2 rounded-xl transition-all active:scale-90 ${isNested ? 'text-orange-500 bg-orange-50' : 'text-slate-300 hover:text-sky-500 bg-slate-50 dark:bg-white/5'}`}
                            title={isNested ? "Convert to Single Value" : "Convert to Array"}
                        >
                            {isNested ? <FaSync size={12} /> : <FaListUl size={12} />}
                        </button>
                    )}
                    <button
                        onClick={() => removeParameter(path)}
                        className="p-2 text-slate-300 hover:text-rose-500 transition-all active:scale-90 bg-slate-50 dark:bg-white/5 rounded-xl"
                        title="Delete Parameter"
                    >
                        <FaTrash size={12} />
                    </button>
                </div>
            </div>

            {isNested ? (
                <div className="flex flex-col gap-3 pl-2 border-l-2 border-slate-100 dark:border-white/5 ml-4">
                    {item.value.map((sub: ParameterItem, idx: number) => (
                        <div key={sub.key} className="flex flex-col gap-2 py-4 border-b border-slate-50 dark:border-white/5 last:border-0">
                            <div className="flex items-start justify-between gap-4 group/sub">
                                <div className="flex-1 flex items-start gap-3 pt-1">
                                    <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 min-w-[14px] mt-0.5">{idx + 1}.</span>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[10px] md:text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest whitespace-normal break-words leading-relaxed" title={sub.key}>
                                            {sub.key}
                                        </span>
                                        {sub.binding && (
                                            <div className="flex items-center gap-1.5 text-[8px] font-black text-sky-500/60 uppercase tracking-tighter">
                                                <FaLink size={8} />
                                                {sub.binding}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
                                    <div className="relative">
                                        <select
                                            value={sub.value}
                                            onChange={(e) => {
                                                updateParameter([...path, sub.key], e.target.value);
                                                saveChanges();
                                            }}
                                            className={`w-24 appearance-none pl-2 pr-6 py-1.5 text-left text-[9px] font-black rounded-xl border-2 transition-all cursor-pointer outline-none ${sub.value === 'OPEN'
                                                ? 'bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-900/20 dark:border-rose-800/30'
                                                : sub.value === 'PROGRESS'
                                                    ? 'bg-amber-50 border-amber-100 text-amber-600 dark:bg-amber-900/20 dark:border-amber-800/30'
                                                    : 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:border-emerald-800/30'
                                                }`}
                                        >
                                            <option value="OPEN">OPEN</option>
                                            <option value="PROGRESS">PROGRESS</option>
                                            <option value="CLOSE">CLOSE</option>
                                        </select>
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                                            <FaChevronDown size={8} />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-0.5">
                                        {!isNested && (
                                            <button
                                                onClick={() => {
                                                    if (sub.binding) {
                                                        if (window.confirm("Anda yakin ingin unbind function ini? anda harus bind kembali untuk mengaktifkan fungsi tsb")) {
                                                            const updated = updateParameter([...path, sub.key], '', 'binding');
                                                            saveChanges(updated);
                                                            toast.success('Function unbound');
                                                        }
                                                    } else {
                                                        setShowFunctionPicker({ path, key: sub.key });
                                                    }
                                                }}
                                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all active:scale-95 ${sub.binding ? 'text-sky-600 bg-sky-50 dark:bg-sky-900/20' : 'text-slate-400 hover:text-sky-500 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                                                title="Bind Function"
                                            >
                                                <FaLink size={10} />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => toggleSteps(sub.key)}
                                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all active:scale-95 ${(sub.steps?.length || 0) > 0 || activeSteps[sub.key] ? 'text-orange-600 bg-orange-50 dark:bg-orange-900/20' : 'text-slate-400 hover:text-orange-500 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                                            title="Steps"
                                        >
                                            <FaRegPlusSquare size={10} />
                                            <span className="text-[9px] font-black tracking-tighter">STEPS</span>
                                        </button>
                                        <button
                                            onClick={() => removeParameter([...path, sub.key])}
                                            className="p-2 text-slate-300 hover:text-rose-500 transition-all active:scale-90 bg-slate-50 dark:bg-white/5 rounded-xl ml-1"
                                            title="Remove Sub-parameter"
                                        >
                                            <FaTimes size={12} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {(sub.steps?.length || 0 > 0 || activeSteps[sub.key]) && (
                                <div className="ml-7 mr-1 py-3 px-4 flex flex-col gap-3 bg-slate-50/50 dark:bg-white/5 rounded-[1.5rem] mt-1 border border-slate-100 dark:border-white/5">
                                    <div className="flex items-center justify-between px-1">
                                        <div className="text-[9px] font-black text-orange-600 uppercase tracking-[0.2em]">Action Steps</div>
                                        {sub.steps && sub.steps.length > 0 && (
                                            <div className="text-[8px] font-bold text-slate-300 dark:text-slate-600 uppercase">
                                                {sub.steps.filter(s => s.status === 'CLOSED').length}/{sub.steps.length} Done
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {sub.steps?.map((step, sIdx) => {
                                            const stepObj = typeof step === 'string' ? { text: step, status: 'OPEN' } : step;
                                            const isClosed = stepObj.status === 'CLOSED';

                                            return (
                                                <div key={sIdx} className={`flex items-start justify-between gap-3 group/step pl-2 pr-1 py-2 rounded-xl transition-all ${isClosed ? 'bg-emerald-50/30 dark:bg-emerald-900/10' : 'bg-white dark:bg-black/20 shadow-sm'}`}>
                                                    {editingStep?.subKey === sub.key && editingStep?.index === sIdx ? (
                                                        <div className="flex-1 relative">
                                                            <input
                                                                autoFocus
                                                                type="text"
                                                                value={formatNumericString(editingStep.value)}
                                                                onChange={(e) => setEditingStep({ ...editingStep, value: e.target.value.replace(/\./g, '') })}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') handleUpdateStep(sub.key, sIdx, editingStep.value);
                                                                    if (e.key === 'Escape') setEditingStep(null);
                                                                }}
                                                                onBlur={() => {
                                                                    if (!editingStep.value.trim()) {
                                                                        handleUpdateStep(sub.key, sIdx, lastStepValue);
                                                                    }
                                                                    setEditingStep(null);
                                                                }}
                                                                className="w-full bg-transparent border-b-2 border-sky-500 px-1 py-0.5 pr-6 text-[10px] font-medium outline-none"
                                                            />
                                                            {editingStep.value && (
                                                                <button
                                                                    onMouseDown={(e) => {
                                                                        e.preventDefault(); // Prevent blur
                                                                        setEditingStep({ ...editingStep, value: '' });
                                                                    }}
                                                                    className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-slate-300 hover:text-rose-500 transition-all"
                                                                >
                                                                    <FaTimes size={10} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className={`flex-1 text-[10px] font-bold leading-relaxed pt-1 ${isClosed ? 'text-emerald-600/60 dark:text-emerald-400/50' : 'text-slate-600 dark:text-slate-300'}`}>
                                                            <span className="mr-2 opacity-30 font-black">{sIdx + 1}.</span> {formatNumericString(stepObj.text)}
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-0.5 flex-shrink-0">
                                                        <button
                                                            onClick={() => handleToggleStepStatus(sub.key, sIdx)}
                                                            className={`p-1.5 transition-all active:scale-90 ${isClosed ? 'text-emerald-500' : 'text-slate-200 hover:text-emerald-400'}`}
                                                            title={isClosed ? "Reopen Step" : "Complete Step"}
                                                        >
                                                            <FaCheckCircle size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setEditingStep({ subKey: sub.key, index: sIdx, value: stepObj.text });
                                                                setLastStepValue(stepObj.text);
                                                            }}
                                                            className="p-1.5 text-slate-200 hover:text-sky-400 transition-all active:scale-90"
                                                            title="Edit Step"
                                                        >
                                                            <FaEdit size={12} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleRemoveStep(sub.key, sIdx)}
                                                            className="p-1.5 text-slate-200 hover:text-rose-400 transition-all active:scale-90"
                                                            title="Remove Step"
                                                        >
                                                            <FaTrash size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {activeSteps[sub.key] && (
                                            <div className="flex items-center gap-2 mt-2 px-1 relative group/newstep">
                                                <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                                                <input
                                                    ref={el => inputRefs.current[sub.key] = el}
                                                    type="text"
                                                    placeholder="Add next action item..."
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            const val = (e.target as HTMLInputElement).value;
                                                            if (val.trim()) {
                                                                handleAddStep(sub.key, val.trim());
                                                                (e.target as HTMLInputElement).value = '';
                                                            }
                                                        }
                                                    }}
                                                    className="flex-1 bg-transparent border-b border-orange-200 dark:border-orange-900/30 px-1 py-1 pr-8 text-[10px] font-bold focus:border-orange-400 outline-none transition-all placeholder:text-slate-300 italic"
                                                />
                                                <button
                                                    onClick={(e) => {
                                                        const input = inputRefs.current[sub.key];
                                                        if (input) input.value = '';
                                                    }}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-200 hover:text-rose-500 transition-all opacity-0 group-hover/newstep:opacity-100"
                                                >
                                                    <FaTimes size={10} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    <div className="mt-2 pt-2 border-t border-slate-50 dark:border-white/5">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                placeholder="Add sub-parameter..."
                                value={subParamName}
                                onChange={(e) => setSubParamName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddSub()}
                                className="flex-1 bg-transparent border-b border-slate-200 dark:border-white/10 px-1 py-1.5 text-[11px] font-bold focus:border-sky-500 outline-none transition-all"
                            />
                            <button
                                onClick={handleAddSub}
                                className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg transition-all"
                            >
                                <FaPlus size={10} />
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={formatNumericString(item.value)}
                            onFocus={() => setLastValue(item.value)}
                            onChange={(e) => {
                                // Strip dots (thousand separators) and replace comma with dot (decimal)
                                const rawValue = e.target.value.replace(/\./g, '').replace(',', '.');
                                updateParameter(path, rawValue);
                            }}
                            onBlur={() => {
                                if (!String(item.value).trim()) {
                                    updateParameter(path, lastValue);
                                }
                                saveChanges();
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && saveChanges()}
                            className="w-full bg-slate-50 dark:bg-black/20 border-2 border-transparent rounded-2xl px-6 py-4 text-sm md:text-base font-black focus:border-sky-500 outline-none transition-all shadow-inner pr-24"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            {item.binding && (
                                <button
                                    onClick={() => handleRunFunction(path, item.binding!)}
                                    className="p-2 text-sky-500 hover:text-sky-600 bg-sky-50 dark:bg-sky-900/20 rounded-xl transition-all active:scale-90"
                                    title="Run Function"
                                >
                                    <FaPlay size={14} />
                                </button>
                            )}
                            {item.value && (
                                <button
                                    onMouseDown={(e) => {
                                        e.preventDefault(); // Prevent blur
                                        updateParameter(path, '');
                                        const input = e.currentTarget.parentElement?.parentElement?.querySelector('input');
                                        input?.focus();
                                    }}
                                    className="p-2 text-slate-300 hover:text-rose-500 transition-all active:scale-90"
                                    title="Clear value"
                                >
                                    <FaTimes size={16} />
                                </button>
                            )}
                        </div>
                        {item.value === 'READY' && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500">
                                <FaCheckCircle size={24} />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </Reorder.Item>
    );
}

export default DailyCoordination;
