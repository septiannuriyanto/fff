import React from 'react'
import FuelStockManagement from './pages/FuelStockManagement'
import FirstStockMilestone from './pages/FirstStockMilestone'

const StockManagement = () => {
  return (
    <div className='flex flex-col gap-4'>
      <FuelStockManagement/>
      <FirstStockMilestone/>
    </div>
  )
}

export default StockManagement