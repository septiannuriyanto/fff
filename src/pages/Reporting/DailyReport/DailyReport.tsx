import StockReporting from './components/StockReporting'
import TmrReporting from '../TMRReport/TMRReport'

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
        <TmrReporting />
      </div>
    </div>
  )
}

export default DailyReport
