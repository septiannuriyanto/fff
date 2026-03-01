import StockReporting from './components/StockReporting'
import TmrReporting from '../TMRReport/TMRReport'
import FuelmanReport from '../FuelmanReport/FuelmanReport'
import CoordinatorReport from '../FuelmanReport/CoordinatorReport'

const DailyReport = () => {
  return (
    <div>
      <div className="title">
        <h2 className="mb-2 text-title-sm font-bold text-black dark:text-white w-full">
          Daily Report
        </h2>
      </div>
      <div className="content-container flex flex-row gap-4 w-full justify-center">
        <FuelmanReport />
        <CoordinatorReport />
      </div>
    </div>
  )
}

export default DailyReport
