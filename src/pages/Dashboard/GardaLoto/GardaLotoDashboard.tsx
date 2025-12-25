import React from 'react';
import PanelTemplate from '../../PanelTemplate'
import LotoAchievementByWarehouse from './LotoAchievementByWarehouse'
import LotoTrendChart from './LotoTrendChart'
import LotoCountByFuelman from './components/LotoCountByFuelman';



const GardaLotoDashboard = () => {
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);
  const [selectedWarehouse, setSelectedWarehouse] = React.useState<string | null>(null);

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setSelectedWarehouse(null);
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            setSelectedDate(null);
            setSelectedWarehouse(null);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <PanelTemplate title='Garda Loto Dashboard'>
      <div className='flex flex-col gap-4 relative'>
        {selectedDate && (
             <button 
                onClick={() => { setSelectedDate(null); setSelectedWarehouse(null); }}
                className="absolute top-0 right-0 z-10 bg-red-50 text-red-600 px-3 py-1 text-xs font-semibold rounded-full border border-red-200 hover:bg-red-100 transition-colors shadow-sm"
             >
                Reset Filter (ESC)
             </button>
        )}
      <LotoTrendChart onDataPointClick={handleDateClick} />
      <div className='flex gap-4'>
        <LotoAchievementByWarehouse 
            selectedDate={selectedDate}
            selectedWarehouse={selectedWarehouse}
            onSelectWarehouse={setSelectedWarehouse}
        />
      </div>
      <LotoCountByFuelman />
      </div>
    </PanelTemplate>
  )
}

export default GardaLotoDashboard
