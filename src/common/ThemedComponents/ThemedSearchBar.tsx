import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import routes, { AppRoute } from '../../routes';

interface SearchResult {
  route: AppRoute;
  score: number;
}

export const ThemedSearchBar: React.FC = () => {
  const { activeTheme } = useTheme();
  const theme = activeTheme;
  const isDark = theme.baseTheme === 'dark';
  
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const openSearch = () => {
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const closeSearch = () => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
  };

  // Command+K listener + custom event from mobile loupe button
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openSearch();
      }
      if (e.key === 'Escape') closeSearch();
    };
    const handleCustomOpen = () => openSearch();

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fff:open-search', handleCustomOpen);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fff:open-search', handleCustomOpen);
    };
  }, []);

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Search logic
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const lq = debouncedQuery.toLowerCase();
    const timer = setTimeout(() => {
      const matched = routes.map(route => {
        let score = 0;
        if (route.title?.toLowerCase().includes(lq)) score += 3;
        if (route.path.toLowerCase().includes(lq)) score += 1;
        score += (route.keywords?.filter(kw => kw.toLowerCase().includes(lq)).length ?? 0) * 2;
        return { route, score };
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
      setResults(matched);
      setIsSearching(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [debouncedQuery]);

  const handleSelectRoute = (path: string) => {
    navigate(path);
    closeSearch();
  };

  // Colors
  const overlayBg = 'rgba(0,0,0,0.65)';
  const modalBg = isDark ? 'rgba(12,12,20,0.98)' : 'rgba(255,255,255,0.98)';
  const borderColor = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';
  const rowHoverBg = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)';
  const pillBg = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.06)';
  const kbdBg = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
  const textColor = theme.header.textColor;

  return (
    <>
      {/* Desktop trigger — 2× wider, slate background, offset right */}
      <div className="relative hidden sm:block ml-4">
        <div
          onClick={openSearch}
          className="flex items-center justify-between w-full lg:w-[40rem] px-4 py-2 text-sm border rounded-lg cursor-text transition-all duration-200 hover:border-opacity-60 group"
          style={{
            backgroundColor: isDark ? 'rgba(100,116,139,0.18)' : 'rgba(100,116,139,0.10)',
            borderColor: isDark ? 'rgba(148,163,184,0.25)' : 'rgba(100,116,139,0.22)',
            color: textColor,
          }}
        >
          <div className="flex items-center gap-2 opacity-55 group-hover:opacity-90 transition-opacity">
            <MagnifyingGlassIcon className="w-4 h-4" />
            <span>Search pages, features or keywords...</span>
          </div>
          <div
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] border font-medium opacity-45"
            style={{ borderColor: isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.3)' }}
          >
            <span className="text-[11px]">⌘</span>K
          </div>
        </div>
      </div>

      {/* Portal — renders directly on document.body, escaping the header's
          opacity-induced stacking context so z-[99999] actually wins */}
      {isOpen && ReactDOM.createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-start justify-center pt-[10vh] px-4"
          style={{ backgroundColor: overlayBg, backdropFilter: 'blur(10px)' }}
          onClick={closeSearch}
        >
          <div
            className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col"
            style={{
              backgroundColor: modalBg,
              boxShadow: isDark
                ? '0 30px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.08)'
                : '0 30px 80px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.07)',
              color: textColor,
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* ── Input Row ── */}
            <div
              className="flex items-center px-5 py-4 gap-3"
              style={{ borderBottom: `1px solid ${borderColor}` }}
            >
              <MagnifyingGlassIcon className="w-5 h-5 flex-shrink-0 opacity-50" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search menus, features, or keywords..."
                className="flex-1 bg-transparent border-none outline-none text-base"
                style={{ color: textColor }}
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              <button
                onClick={closeSearch}
                className="p-1.5 rounded-lg opacity-40 hover:opacity-80 transition-opacity flex-shrink-0"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* ── Empty state ── */}
            {!query && (
              <div className="flex flex-col items-center gap-3 py-14 opacity-40">
                <MagnifyingGlassIcon className="w-10 h-10 opacity-25" />
                <p className="text-sm">Type anything to search the FFF application</p>
                <div className="flex items-center gap-1.5 text-xs mt-1">
                  <span>Use</span>
                  <kbd className="px-1.5 py-0.5 rounded border text-[11px]" style={{ borderColor }}>⌘K</kbd>
                  <span>anywhere to open search</span>
                </div>
              </div>
            )}

            {/* ── Results ── */}
            {query && (
              <div className="max-h-[58vh] overflow-y-auto">
                {isSearching ? (
                  <div className="flex items-center justify-center gap-3 py-12 opacity-50">
                    <div className="w-5 h-5 border-2 border-t-transparent border-current rounded-full animate-spin" />
                    <span className="text-sm">Searching modules…</span>
                  </div>
                ) : results.length > 0 ? (
                  <div className="p-3 flex flex-col gap-0.5">
                    <p
                      className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-widest opacity-40"
                    >
                      Results ({results.length})
                    </p>
                    {results.map(({ route }, i) => {
                      const title = route.title
                        ? route.title.replace('FFF | ', '')
                        : route.path.split('/').filter(Boolean).join(' › ').toUpperCase() || 'Home';
                      return (
                        <button
                          key={i}
                          onClick={() => handleSelectRoute(route.path)}
                          className="flex flex-col items-start w-full px-3 py-3 rounded-xl text-left transition-colors"
                          style={{ borderBottom: `1px solid ${borderColor}` }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = rowHoverBg)}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <span className="font-semibold text-sm leading-snug" style={{ color: textColor }}>
                            {title}
                          </span>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span
                              className="text-[10px] font-mono px-1.5 py-0.5 rounded opacity-75"
                              style={{ backgroundColor: pillBg, color: textColor }}
                            >
                              {route.path}
                            </span>
                            {route.keywords?.slice(0, 3).map(kw => (
                              <span
                                key={kw}
                                className="text-[9px] uppercase tracking-widest opacity-35"
                              >
                                {kw}
                              </span>
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-14 opacity-45">
                    <p className="font-semibold text-sm">No Results Found</p>
                    <p className="text-xs opacity-70">Nothing matched "{debouncedQuery}"</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Footer ── */}
            <div
              className="flex justify-between items-center px-5 py-2 text-[10px] opacity-40"
              style={{ borderTop: `1px solid ${borderColor}` }}
            >
              <div className="flex gap-3">
                {[['↑','↓','navigate'], ['↵','','select'], ['esc','','close']].map(([k1, k2, label]) => (
                  <span key={label} className="flex items-center gap-1">
                    <kbd className="px-1 rounded" style={{ backgroundColor: kbdBg }}>{k1}</kbd>
                    {k2 && <kbd className="px-1 rounded" style={{ backgroundColor: kbdBg }}>{k2}</kbd>}
                    {label}
                  </span>
                ))}
              </div>
              <span>FFF App Search</span>
            </div>
          </div>
        </div>
      , document.body)}
    </>
  );
};
