  import { useEffect, useState } from 'react'
  import { useParams } from 'react-router-dom'
  import PanelTemplate from '../../PanelTemplate'
  import { supabase } from '../../../db/SupabaseClient'
  import LotoVerificationDialog from '../../../common/LotoVerificationDialog'

  interface SessionData {
    session_code: string
    created_at: string
    create_shift: number | null
    warehouse_code: string | null

    fuelman: {
      nama: string | null
    } | null

    operator: {
      nama: string | null
    } | null

    storage: {
      warehouse_id: string | null
      unit_id: string | null
    } | null
  }

  interface LotoRecord {
    id: string
    photo_path: string
    thumbnail_url: string | null
    code_number: string
  }

  const formatDate = (date: Date | null) => {
    if (!date) return '-'
    return date.toLocaleDateString('id-ID', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    })
  }

  // Parse date from yyMMdd prefix
  const getSessionDateFromCode = (code: string | undefined): Date | null => {
    if (!code || code.length < 6) return null;
    try {
        const yy = parseInt(code.substring(0, 2), 10);
        const mm = parseInt(code.substring(2, 4), 10);
        const dd = parseInt(code.substring(4, 6), 10);
        return new Date(2000 + yy, mm - 1, dd);
    } catch (e) {
        console.error("Error parsing date from code", e);
        return null;
    }
  }

  // Generate optimized image URL
  const getOptimizedUrl = (
    photoPath: string, 
    thumbnailUrl: string | null, 
    width?: number,
    format?: 'webp' | 'avif'
  ) => {
    // Use thumbnail if available
    if (thumbnailUrl) {
      return thumbnailUrl
    }

    // Fallback: optimize photo_path with Supabase transform
    if (photoPath.includes('supabase')) {
      try {
        const url = new URL(photoPath)
        if (width) {
          url.searchParams.set('width', width.toString())
          url.searchParams.set('quality', '80')
        }
        if (format) {
          url.searchParams.set('format', format)
        }
        return url.toString()
      } catch (e) {
        return photoPath
      }
    }
    
    return photoPath
  }

  // Get viewing URL with format optimization
  const getViewUrl = (photoPath: string) => {
    if (!photoPath.includes('supabase')) {
      return photoPath
    }

    try {
      const url = new URL(photoPath)
      // Try webp first (better browser support than avif)
      url.searchParams.set('format', 'webp')
      url.searchParams.set('quality', '90')
      return url.toString()
    } catch (e) {
      return photoPath
    }
  }

  // Download original file
  const downloadImage = async (photoPath: string, fileName: string) => {
    try {
      const response = await fetch(photoPath)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
      alert('Download gagal. Silakan coba lagi.')
    }
  }



  // ... imports ...

  const GardaLotoSessionDetails = () => {
    const { session_id } = useParams<{ session_id: string }>()
    const [dialogOpen, setDialogOpen] = useState(false)
    
    // Derived date from URL param (source of truth for this page's context)
    const sessionDate = getSessionDateFromCode(session_id);

    const [session, setSession] = useState<SessionData | null>(null)
    const [records, setRecords] = useState<LotoRecord[]>([])
    const [activeIndex, setActiveIndex] = useState<number | null>(null)
    const [loading, setLoading] = useState(true)
    const [imageLoaded, setImageLoaded] = useState<Set<number>>(new Set())
    const [fullImageLoaded, setFullImageLoaded] = useState(false)
    const [downloading, setDownloading] = useState(false)

    /* ================= FETCH ================= */
    useEffect(() => {
      if (!session_id) return

      const fetchData = async () => {
        setLoading(true)
        const { data: recordData, error } = await supabase
          .from('loto_sessions')
          .select(`
            session_code,
            created_at,
            create_shift,
            warehouse_code,

            fuelman:manpower!loto_sessions_fuelman_fkey(nama),
            operator:manpower!loto_sessions_operator_fkey(nama),
            storage:storage!loto_sessions_warehouse_code_fkey(
              warehouse_id,
              unit_id
            )
          `)
          .eq('session_code', session_id)
          .single()

        if (error) {
          console.error(error)
        }

        if (recordData) {
          const mapped: SessionData = {
            session_code: recordData.session_code,
            created_at: recordData.created_at,
            create_shift: recordData.create_shift,
            warehouse_code: recordData.warehouse_code,

            fuelman: Array.isArray(recordData.fuelman)
              ? recordData.fuelman[0] ?? null
              : recordData.fuelman ?? null,
            operator: Array.isArray(recordData.operator)
              ? recordData.operator[0] ?? null
              : recordData.operator ?? null,

            storage: Array.isArray(recordData.storage)
              ? recordData.storage[0] ?? null
              : recordData.storage ?? null,
          }

          setSession(mapped)

          const { data: lotoRecords } = await supabase
            .from('loto_records')
            .select('id, photo_path, thumbnail_url, code_number')
            .eq('session_id', session_id)

          setRecords(lotoRecords ?? [])
        }

        setLoading(false)
      }

      fetchData()
    }, [session_id])

    /* ================= ESC HANDLER ================= */
    useEffect(() => {
      const esc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setActiveIndex(null)
        // Arrow key navigation
        if (activeIndex !== null) {
          if (e.key === 'ArrowLeft' && activeIndex > 0) {
            setActiveIndex(activeIndex - 1)
          }
          if (e.key === 'ArrowRight' && activeIndex < records.length - 1) {
            setActiveIndex(activeIndex + 1)
          }
        }
      }
      window.addEventListener('keydown', esc)
      return () => window.removeEventListener('keydown', esc)
    }, [activeIndex, records.length])

    /* ================= PRELOAD ADJACENT IMAGES ================= */
    useEffect(() => {
      if (activeIndex === null) return

      // Preload prev and next images for smooth navigation
      const preloadIndexes = [activeIndex - 1, activeIndex + 1].filter(
        i => i >= 0 && i < records.length
      )

      preloadIndexes.forEach(i => {
        const img = new Image()
        img.src = getViewUrl(records[i].photo_path)
      })
    }, [activeIndex, records])

    /* ================= RESET FULL IMAGE LOADED ON INDEX CHANGE ================= */
    useEffect(() => {
      setFullImageLoaded(false)
    }, [activeIndex])

    /* ================= DOWNLOAD HANDLER ================= */
    const handleDownload = async () => {
      if (activeIndex === null) return
      
      setDownloading(true)
      const record = records[activeIndex]
      const fileName = `LOTO_${session?.session_code}_${record.code_number || activeIndex + 1}.jpg`
      
      await downloadImage(record.photo_path, fileName)
      setDownloading(false)
    }

    return (
      <PanelTemplate title="Garda Loto Session Details">
        {loading && (
          <div className="text-center py-10 text-gray-500">
            Loading session…
          </div>
        )}

        {!loading && session && (
          <div className="space-y-4">
            {/* ================= HEADER ================= */}
            <div className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                 <div className="text-xl font-bold text-gray-800">
                    Session {session.session_code}
                 </div>
                 <button 
                    onClick={() => setDialogOpen(true)}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-sm font-medium transition-colors"
                 >
                    View Verification
                 </button>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-1 gap-4">
                {/* Tanggal */}
                <div className="space-y-1">
                  <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                    Tanggal
                  </div>
                  <div className="text-base font-semibold text-gray-800">
                    {formatDate(sessionDate)}
                  </div>
                </div>

                {/* Shift */}
                <div className="space-y-1">
                  <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                    Shift
                  </div>
                  <div className="text-base font-semibold text-gray-800">
                    {session.create_shift ?? '-'}
                  </div>
                </div>

                {/* Fuelman */}
                <div className="space-y-1">
                  <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                    Fuelman
                  </div>
                  <div className="text-base font-semibold text-gray-800">
                    {session.fuelman?.nama ?? '-'}
                  </div>
                </div>

                {/* Operator */}
                <div className="space-y-1">
                  <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                    Operator
                  </div>
                  <div className="text-base font-semibold text-gray-800">
                    {session.operator?.nama ?? '-'}
                  </div>
                </div>

                {/* Warehouse */}
                <div className="space-y-1">
                  <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                    Warehouse
                  </div>
                  <div className="text-base font-semibold text-gray-800">
                    {session.warehouse_code ?? '-'}
                  </div>
                </div>

                {/* Unit ID */}
                <div className="space-y-1">
                  <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                    Unit ID
                  </div>
                  <div className="text-base font-semibold text-gray-800">
                    {session.storage?.unit_id ?? '-'}
                  </div>
                </div>
              </div>

              {/* Evidence Count */}
              <div className="pt-3 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Evidence</span>
                  <span className="text-lg font-bold text-blue-600">{records.length}</span>
                </div>
              </div>
            </div>

            {/* ================= PHOTO GRID ================= */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {records.map((r, i) => (
                <button
                  key={r.id}
                  onClick={() => setActiveIndex(i)}
                  className="aspect-square rounded-lg overflow-hidden bg-gray-100 relative group"
                >
                  <img
                    src={getOptimizedUrl(r.photo_path, r.thumbnail_url, 200)}
                    loading="lazy"
                    decoding="async"
                    onLoad={() => {
                      setImageLoaded(prev => new Set(prev).add(i))
                    }}
                    className="h-full w-full object-cover object-left-bottom transition-all duration-300 group-hover:scale-105"
                    style={{ 
                      opacity: imageLoaded.has(i) ? 1 : 0
                    }}
                    alt={`LOTO Evidence ${i + 1}`}
                  />
                  {!imageLoaded.has(i) && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ================= FULLSCREEN VIEWER ================= */}
        {activeIndex !== null && (
          <div className="fixed inset-0 z-9999 text-left">
            {/* BACKDROP */}
            <div
              className="absolute inset-0 bg-black/95"
              onClick={() => setActiveIndex(null)}
            />

            {/* CONTENT */}
            <div className="relative z-10 flex flex-col h-full">
              {/* Close Button */}
              <button
                onClick={() => setActiveIndex(null)}
                className="absolute top-4 right-4 text-white text-3xl font-light hover:text-gray-300 transition-colors z-20 w-10 h-10 flex items-center justify-center"
                aria-label="Close"
              >
                ✕
              </button>

              {/* Navigation Arrows */}
              {activeIndex > 0 && (
                <button
                  onClick={() => setActiveIndex(activeIndex - 1)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-4xl hover:text-gray-300 transition-colors z-20 w-12 h-12 flex items-center justify-center bg-black/30 rounded-full hover:bg-black/50"
                  aria-label="Previous"
                >
                  ‹
                </button>
              )}
              {activeIndex < records.length - 1 && (
                <button
                  onClick={() => setActiveIndex(activeIndex + 1)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-4xl hover:text-gray-300 transition-colors z-20 w-12 h-12 flex items-center justify-center bg-black/30 rounded-full hover:bg-black/50"
                  aria-label="Next"
                >
                  ›
                </button>
              )}

              {/* Image Counter */}
              <div className="absolute top-4 left-4 text-white text-sm bg-black/50 px-3 py-1 rounded z-20">
                {activeIndex + 1} / {records.length}
              </div>

              {/* Main Image */}
              <div className="flex-1 flex items-center justify-center p-4">
                <div className="relative">
                  {!fullImageLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                    </div>
                  )}
                  <img
                    src={getViewUrl(records[activeIndex].photo_path)}
                    loading="eager"
                    decoding="async"
                    onLoad={() => setFullImageLoaded(true)}
                    className="max-h-[75vh] max-w-[90vw] object-contain transition-opacity duration-300"
                    style={{ opacity: fullImageLoaded ? 1 : 0 }}
                    alt={`LOTO Evidence ${activeIndex + 1}`}
                  />
                </div>
              </div>

              {/* Download Button */}
              <div className="flex justify-center pb-2">
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  {downloading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Downloading...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      <span>Download Full Image</span>
                    </>
                  )}
                </button>
              </div>

              {/* Thumbnails Navigation */}
              <div className="flex gap-2 overflow-x-auto p-3 bg-black/50">
                {records.map((r, i) => {
                  // Preload adjacent images for smoother navigation
                  const shouldPreload = Math.abs(i - activeIndex) <= 2
                  
                  return (
                    <button
                      key={r.id}
                      onClick={() => setActiveIndex(i)}
                      className={`flex-shrink-0 rounded transition-all ${
                        i === activeIndex
                          ? 'ring-2 ring-white scale-110'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={getOptimizedUrl(r.photo_path, r.thumbnail_url, 100)}
                        loading={shouldPreload ? "eager" : "lazy"}
                        decoding="async"
                        className="h-16 w-16 rounded object-cover object-left-bottom"
                        alt={`Thumbnail ${i + 1}`}
                      />
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        <LotoVerificationDialog 
            isOpen={dialogOpen}
            onClose={() => setDialogOpen(false)}
            warehouseCode={session?.warehouse_code ?? null}
            date={sessionDate}
            targetShift={session?.create_shift}
        />
      </PanelTemplate>
    )
  }

  export default GardaLotoSessionDetails