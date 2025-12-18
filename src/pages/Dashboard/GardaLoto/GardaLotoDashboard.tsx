import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import PanelTemplate from '../../PanelTemplate'
import { supabase } from '../../../db/SupabaseClient'

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
  code_number: string
}

const formatDate = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleDateString('id-ID')
}

const GardaLotoDashboard = () => {
  const { session_id } = useParams<{ session_id: string }>()

  const [session, setSession] = useState<SessionData | null>(null)
  const [records, setRecords] = useState<LotoRecord[]>([])
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

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
    .select('id, photo_path, code_number')
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
    }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [])

  /* ================= UI ================= */
  return (
    <PanelTemplate title="Garda Loto Dashboard">
      {loading && (
        <div className="text-center py-10 text-gray-500">
          Loading session…
        </div>
      )}

      {!loading && session && (
        <div className="space-y-4">
          {/* ================= HEADER ================= */}
          <div className="rounded-xl border bg-white p-4 shadow-sm space-y-2">
            <div className="text-lg font-semibold">
              Session {session.session_code}
            </div>

            <div className="grid grid-cols-2 gap-x-4 text-sm text-gray-600">
              <div>Tanggal </div>
              <div>: {formatDate(session.created_at)}</div>

              <div>Shift </div>
              <div>: {session.create_shift ?? '-'}</div>

              <div>Fuelman</div>
              <div>: {session.fuelman?.nama ?? '-'}</div>

              <div>Operator</div>
              <div>: {session.operator?.nama ?? '-'}</div>

              <div>Warehouse</div>
              <div>: {session.warehouse_code ?? '-'}</div>

              <div>Unit ID</div>
              <div>: {session.storage?.unit_id ?? '-'}</div>
            </div>

            <div className="pt-2 text-sm font-medium">
              Total Evidence Count: {records.length}
            </div>
          </div>

          {/* ================= PHOTO GRID ================= */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {records.map((r, i) => (
              <button
                key={r.id}
                onClick={() => setActiveIndex(i)}
                className="aspect-square rounded-lg overflow-hidden bg-gray-100"
              >
                <img
                  src={r.photo_path}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ================= FULLSCREEN VIEWER ================= */}
      {activeIndex !== null && (
        <div className="fixed inset-0 z-50">
          {/* BACKDROP */}
          <div
            className="absolute inset-0 bg-black/90"
            onClick={() => setActiveIndex(null)}
          />

          {/* CONTENT */}
          <div className="relative z-10 flex flex-col h-full">
            {/* Close */}
            <button
              onClick={() => setActiveIndex(null)}
              className="absolute top-4 right-4 text-white text-xl"
            >
              ✕
            </button>

            {/* Image */}
            <div className="flex-1 flex items-center justify-center">
              <img
                src={records[activeIndex].photo_path}
                className="max-h-[90vh] max-w-[90vw] object-contain"
              />
            </div>

            {/* Thumbnails */}
            <div className="flex gap-2 overflow-x-auto p-3">
              {records.map((r, i) => (
                <img
                  key={r.id}
                  src={r.photo_path}
                  loading="lazy"
                  onClick={() => setActiveIndex(i)}
                  className={`h-14 w-14 rounded object-cover cursor-pointer ${
                    i === activeIndex
                      ? 'ring-2 ring-white'
                      : 'opacity-70'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </PanelTemplate>
  )
}

export default GardaLotoDashboard