import React, { useState, useEffect } from 'react';

interface UndoToastProps {
  message: string;
  subMessage?: string;
  duration?: number; // in seconds
  onUndo: () => void;
  onExpire: () => void;
  actionLabel?: string;
}

const UndoToast: React.FC<UndoToastProps> = ({ 
  message, 
  subMessage, 
  duration = 5, 
  onUndo, 
  onExpire,
  actionLabel = "Undo"
}) => {
  const [seconds, setSeconds] = useState(duration);

  useEffect(() => {
    if (seconds <= 0) {
      onExpire();
      return;
    }
    const timer = setInterval(() => {
      setSeconds(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [seconds, onExpire]);

  return (
    <div className="fixed bottom-6 right-6 bg-slate-900/90 dark:bg-slate-900/95 backdrop-blur-xl text-white px-6 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center gap-6 z-[999999] animate-in slide-in-from-bottom-10 fade-in duration-500 border border-white/10 overflow-hidden">
      <div className="flex flex-col gap-0.5">
        <span className="font-black text-sm uppercase tracking-widest">{message}</span>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
          {subMessage || `Automatically finalizing in ${seconds}s...`}
        </span>
      </div>
      
      <div className="h-10 w-px bg-white/10" />
      
      <button
        onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onUndo();
        }}
        className="px-5 py-2.5 bg-white text-slate-900 hover:bg-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg"
      >
        {actionLabel}
      </button>

      {/* Countdown Progress Bar at Bottom */}
      <div className="absolute bottom-0 left-0 h-1 bg-white/10 w-full">
        <div 
          className="h-full bg-primary transition-all duration-1000 ease-linear" 
          style={{ 
            width: `${(seconds / duration) * 100}%`,
          }}
        />
      </div>
    </div>
  );
};

export default UndoToast;
