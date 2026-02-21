import { useState, useEffect } from 'react'
import PanelTemplate from '../../../components/Panels/PanelTemplate'
import { ChevronLeft, ChevronRight, CheckCircle, Trash2, Edit, Flag, AlertCircle, Calendar as CalendarIcon, Moon, Sun } from 'lucide-react'
import { formatInTimeZone } from 'date-fns-tz'
import { addDays, format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { getShift } from '../../../Utils/TimeUtility'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import { supabase } from '../../../db/SupabaseClient'

type ReportStatus = 'complete' | 'incomplete'

interface ReportItem {
    id: string
    label: string
    status: ReportStatus
    path?: string
    count?: number
}

const initialItems: ReportItem[] = [
    { id: '1', label: 'Receiving', status: 'incomplete' },
    { id: '2', label: 'Issuing', status: 'incomplete' },
    { id: '3', label: 'DB50', status: 'incomplete' },
    { id: '4', label: 'Additive', status: 'incomplete', path: '/partner/fuel/additive' },
    { id: '5', label: 'Order', status: 'incomplete' },
    { id: '6', label: 'Digitalisasi', status: 'incomplete' },
    { id: '7', label: 'Stock Taking Fuel', status: 'incomplete' },
    { id: '8', label: 'Stock Taking Oli', status: 'incomplete' },
    { id: '9', label: 'Perizinan Ekspedisi', status: 'incomplete' },
    { id: '10', label: 'DOP', status: 'incomplete' },
    { id: '11', label: 'GardaLOTO Verification', status: 'incomplete', path: '/reporting/gardaloto' },
]

const AdminReport = () => {
  const timeZone = 'Asia/Makassar'
  const [currentDate, setCurrentDate] = useState(new Date())
  const [items, setItems] = useState<ReportItem[]>(initialItems)
  const navigate = useNavigate()
  const [currentShift, setCurrentShift] = useState(getShift())

  // Check GardaLOTO & Additive status on date/shift change
  useEffect(() => {
    checkGardaLotoStatus()
    checkAdditiveStatus()
  }, [currentDate, currentShift])

  const checkGardaLotoStatus = async () => {
      try {
          // Assuming 'issued_date' is formatted as YYYY-MM-DD in the database
          const dateStr = format(currentDate, 'yyyy-MM-dd')
          
          const { count, error } = await supabase
            .from('loto_verification')
            .select('*', { count: 'exact', head: true })
            .eq('issued_date', dateStr)
            .eq('shift', currentShift)

          if (error) {
              console.error("Error checking GardaLOTO status:", error)
              return
          }

          const hasRecord = count !== null && count > 0

          setItems(prev => prev.map(item => {
              if (item.id === '11') {
                  return { 
                      ...item, 
                      status: hasRecord ? 'complete' : 'incomplete',
                      count: count || 0
                  }
              }
              return item
          }))

      } catch (err) {
          console.error("Failed to check status:", err)
      }
  }

  const checkAdditiveStatus = async () => {
      try {
        const dateStr = format(currentDate, 'yyyy-MM-dd')

        const { data, error } = await supabase
            .from('additive_record')
            .select('qty_additive, reserve_qty, mr_number')
            .eq('ritation_date', dateStr)
        
        if (error) {
            console.error("Error checking Additive status:", error)
            return
        }

        if (!data || data.length === 0) {
            // No records found, maybe default to incomplete? Or whatever logic.
            // Requirement says compare sums. If no records, sums are 0. 0 > 0 is false.
            // So incomplete.
             setItems(prev => prev.map(item => {
                if (item.id === '4') {
                    return { ...item, status: 'incomplete' }
                }
                return item
            }))
            return
        }

        let totalAdditive = 0
        let totalReserve = 0
        let hasNullMr = false

        data.forEach((rec: any) => {
            totalAdditive += Number(rec.qty_additive || 0)
            totalReserve += Number(rec.reserve_qty || 0)
            if (rec.mr_number === null || rec.mr_number === '') {
                hasNullMr = true
            }
        })

        // Condition: total reserve_qty > qty_additive AND no record null on mr_number
        const isComplete = (totalReserve > totalAdditive) && !hasNullMr

        setItems(prev => prev.map(item => {
            if (item.id === '4') {
                return { ...item, status: isComplete ? 'complete' : 'incomplete' }
            }
            return item
        }))

      } catch (err) {
          console.error("Failed to check Additive status:", err)
      }
  }


  const toggleShift = () => {
    setCurrentShift(prev => prev === 1 ? 2 : 1)
  }

  const handleChangeDate = (days: number) => {
    setCurrentDate(prev => addDays(prev, days))
  }

  const toggleStatus = (id: string) => {
    // Prevent manual toggle for GardaLOTO (id 11) if logic dictates it's automatic, 
    // but user requirements imply the button might still be there for incomplete ones.
    // However, for GardaLOTO complete state, user said "button icon tidak dapat diklik".
    // We handle that in rendering.
    
    setItems(prev => prev.map(item => 
        item.id === id 
            ? { ...item, status: item.status === 'complete' ? 'incomplete' : 'complete' }
            : item
    ))
  }

  const clearItem = (id: string) => {
      setItems(prev => prev.map(item => 
        item.id === id 
            ? { ...item, status: 'incomplete' }
            : item
    ))
  }

  // Windows Vista-like button style class
  const vistaBtnClass = `
    relative flex items-center justify-center p-2 rounded-lg transition-all duration-200
    bg-gradient-to-b from-white via-[#f0f0f0] to-[#e0e0e0]
    border border-[#707070]
    shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_2px_2px_rgba(0,0,0,0.2)]
    hover:from-[#f8fcff] hover:via-[#e8f5ff] hover:to-[#d8efff]
    hover:border-[#3c7fb1] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_4px_rgba(0,0,0,0.3),0_0_2px_#3c7fb1]
    active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]
    active:from-[#dcdcdc] active:to-[#f0f0f0]
    group
  `

  return (
    <PanelTemplate title='Admin Report'>
        <div className="flex items-center gap-4 mb-6 p-4 bg-gradient-to-b from-gray-50 to-gray-100 rounded-xl border border-gray-200 shadow-inner">
            <button 
                onClick={() => handleChangeDate(-1)}
                className={vistaBtnClass}
                aria-label="Previous Day"
            >
                <ChevronLeft size={20} className="text-gray-700 group-hover:text-blue-700 drop-shadow-sm" />
            </button>
            
            <div className={`
                relative flex items-center justify-center gap-3 flex-1 py-1 px-4 rounded-lg
                bg-white border border-gray-300
                shadow-[inset_0_2px_4px_rgba(0,0,0,0.1),0_1px_0_rgba(255,255,255,1)]
            `}>
                 <DatePicker
                    selected={currentDate}
                    onChange={(date) => date && setCurrentDate(date)}
                    dateFormat="dd MMM yyyy"
                    className="w-32 bg-transparent text-center font-bold text-lg text-gray-800 focus:outline-none cursor-pointer"
                    wrapperClassName="w-auto"
                    customInput={
                        <button className="flex items-center gap-2 hover:bg-gray-50 px-2 py-1 rounded transition-colors">
                            <span className="text-sm font-bold text-gray-800 tracking-wide">
                                {formatInTimeZone(currentDate, timeZone, 'dd MMM yyyy')}
                            </span>
                            <CalendarIcon size={16} className="text-gray-500" />
                        </button>
                    }
                />
                
                <div className="h-6 w-px bg-gray-300 mx-2"></div>

                <button
                    onClick={toggleShift}
                    className={`
                        flex items-center gap-2 px-3 py-1 rounded-md text-sm font-bold uppercase tracking-wider transition-all
                        ${currentShift === 1 
                            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border border-yellow-200' 
                            : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border border-indigo-200'
                        }
                    `}
                >
                    {currentShift === 1 ? <Sun size={16} /> : <Moon size={16} />}
                    Shift {currentShift}
                </button>
            </div>

            <button 
                onClick={() => handleChangeDate(1)}
                className={vistaBtnClass}
                aria-label="Next Day"
            >
                <ChevronRight size={20} className="text-gray-700 group-hover:text-blue-700 drop-shadow-sm" />
            </button>
        </div>

        {/* Panel Pengumuman (Green Theme) */}
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 shadow-sm dark:border-green-800 dark:bg-green-900/20">
            <h3 className="mb-2 text-lg font-bold text-green-800 dark:text-green-200">
                Pengumuman
            </h3>
            <div className="text-sm text-green-700 dark:text-green-300">
                <p>Tidak ada pengumuman hari ini.</p>
            </div>
        </div>

        {/* Panel Daily Activities */}
        <div className="rounded-lg border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark">
            <h3 className="mb-4 text-lg font-bold text-black dark:text-white border-b pb-2 dark:border-strokedark">
                Daily Activities
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {items.map((item) => {
                    // Special logic for GardaLOTO (id 11)
                    const isGardaLotoCompleted = item.id === '11' && item.status === 'complete'

                    return (
                    <div 
                        key={item.id} 
                        className={`
                            relative flex flex-col justify-between p-4 rounded-xl border-2 transition-all duration-200
                            shadow-sm hover:shadow-md
                            ${item.status === 'complete' 
                                ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-200 dark:from-green-900/20 dark:to-green-900/10 dark:border-green-800' 
                                : 'bg-gradient-to-br from-red-50 to-red-100 border-red-200 dark:from-red-900/20 dark:to-red-900/10 dark:border-red-800'
                            }
                        `}
                    >
                        {/* Header: Label & Status Icon */}
                        <div className="flex items-start justify-between mb-3">
                            <span className={`text-lg font-bold leading-tight ${item.status === 'complete' ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'}`}>
                                {item.label}
                            </span>
                            <button 
                                onClick={() => !isGardaLotoCompleted && toggleStatus(item.id)}
                                disabled={isGardaLotoCompleted}
                                className={`
                                    flex-shrink-0 p-1.5 rounded-full transition-colors duration-200 shadow-sm
                                    ${item.status === 'complete' 
                                        ? `text-green-600 bg-white ${isGardaLotoCompleted ? 'cursor-default opacity-80' : 'hover:bg-green-50'} dark:bg-green-800 dark:text-green-100` 
                                        : 'text-red-500 bg-white hover:bg-red-50 dark:bg-red-800 dark:text-red-100'
                                    }
                                `}
                            >
                                {item.status === 'complete' ? <CheckCircle size={22} /> : <AlertCircle size={22} />}
                            </button>
                        </div>

                        {/* Footer: Controls */}
                        <div className="flex items-center gap-2 mt-auto pt-3 border-t border-black/5 dark:border-white/5">
                             {/* Show "xx Records" text instead of button if GardaLOTO is complete */}
                             {isGardaLotoCompleted ? (
                                <div className="flex-1 py-1.5 px-3 rounded-md text-sm font-bold text-center bg-green-200/50 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800">
                                    {item.count} Records
                                </div>
                             ) : (
                                <button
                                    onClick={() => {
                                        if (item.status === 'incomplete' && item.path) {
                                            navigate(item.path)
                                        } else {
                                            toggleStatus(item.id)
                                        }
                                    }}
                                    className={`
                                        flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-bold uppercase tracking-wide transition-all shadow-sm border
                                        ${item.status === 'complete'
                                            ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 hover:border-blue-300'
                                            : 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100 hover:border-orange-300'
                                        }
                                    `}
                                >
                                    {item.status === 'complete' ? <Edit size={14} /> : <Flag size={14} />}
                                    {item.status === 'complete' ? 'Edit' : 'Follow Up'}
                                </button>
                             )}
                            
                            {/* Hide trash for GardaLOTO complete, show for others complete */}
                            {item.status === 'complete' && !isGardaLotoCompleted && (
                                <button
                                    onClick={() => clearItem(item.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white rounded-md transition-all shadow-sm border border-transparent hover:border-red-100"
                                    title="Clear Item"
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>
                    </div>
                )})}
            </div>
        </div>
    </PanelTemplate>
  )
}

export default AdminReport