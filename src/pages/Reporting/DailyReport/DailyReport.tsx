import React from 'react'
import StockReporting from './components/StockReporting'
import RitationReporting from './components/RitationReport'
import TmrReporting from './components/TMRReport'

const DailyReport = () => {
  return (
    <div>
      <div className="title">
        <h2 className="mb-2 text-title-sm font-bold text-black dark:text-white w-full">
          Daily Report
        </h2>
      </div>
      <div className="content-container">
        <StockReporting />
        <RitationReporting />
        <TmrReporting />
      </div>
    </div>
  )
}

export default DailyReport
