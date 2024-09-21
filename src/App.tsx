import { Routes, Route } from 'react-router-dom';
import PageTitle from './components/PageTitle';
import SignIn from './pages/Authentication/SignIn';
import SignUp from './pages/Authentication/SignUp';
import Calendar from './pages/Calendar';
import Chart from './pages/Chart';
import FormElements from './pages/Form/FormElements';
import FormLayout from './pages/Form/FormLayout';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Tables from './pages/Tables';
import Alerts from './pages/UiElements/Alerts';
import Buttons from './pages/UiElements/Buttons';
import DefaultLayout from './layout/DefaultLayout';
import DailyReport from './pages/Reporting/DailyReport/DailyReport';
import RitationReport from './pages/Reporting/DailyReport/components/RitationReport';
import TMRReport from './pages/Reporting/DailyReport/components/TMRReport';
import PressurelessReport from './pages/Reporting/PressurelessReport';
import FuelConsumption from './pages/Dashboard/FuelConsumption/FuelConsumption';
import ProtectedRoute from './pages/ProtectedRoute'; // Adjust the import path as necessary
import Dashboard from './pages/Dashboard';
import StockManagement from './pages/Dashboard/Stock Management/StockManagement';
import Infrastructure from './pages/Dashboard/Infrastructure/Infrastructure';
import Manpower from './pages/Dashboard/Manpower/Manpower';
import PressurelessSummary from './pages/Dashboard/Infrastructure/PressurelessSummary';
import Operational from './pages/Dashboard/Operational/Operational';
import Induction from './pages/Dashboard/Manpower/Induction';
import Roster from './pages/Dashboard/Manpower/Roster';
import LeaveRequest from './pages/Dashboard/Manpower/Leave/LeaveRequest';
import SchedulerExample from './pages/Dashboard/Manpower/Roster/SchedulerExample';
import LeaveList from './pages/Dashboard/Manpower/Leave/LeaveList';
import RefuelingAnomaly from './pages/Dashboard/Operational/RefuelingAnomaly';
import StockReporting from './pages/Reporting/DailyReport/components/StockReporting';
import StockTaking from './pages/Reporting/DailyReport/components/StockTaking';

function App() {
  return (
    <DefaultLayout>
      <Routes>
        <Route path="/auth/signin" element={<SignIn />} />
        <Route path="/auth/signup" element={<SignUp />} />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute
              element={
                <>
                  <PageTitle title="FFF Dashboard | Fuel Feasibility for Fleet" />
                  <Dashboard />
                </>
              }
            />
          }
        />
        <Route
          path="/fuelcons"
          element={
            <ProtectedRoute
              element={
                <>
                  <PageTitle title="FFF Dashboard | Fuel Feasibility for Fleet" />
                  <FuelConsumption />
                </>
              }
            />
          }
        />
        <Route
          path="/stockmanagement"
          element={
            <ProtectedRoute
              element={
                <>
                  <PageTitle title="FFF Dashboard | Fuel Feasibility for Fleet" />
                  <StockManagement />
                </>
              }
            />
          }
        />
        <Route
          path="/operational"
          element={
            <ProtectedRoute
              element={
                <>
                  <PageTitle title="FFF Dashboard | Operational Dashboard" />
                  <Operational />
                </>
              }
            />
          }
        />
        <Route
          path="/anomaly"
          element={
            <>
              <PageTitle title="FFF Dashboard | Anomaly Refueling" />
              <RefuelingAnomaly />
            </>
          }
        />
        <Route
          path="/infrastructure"
          element={
            <ProtectedRoute
              element={
                <>
                  <PageTitle title="FFF Dashboard | Fuel Feasibility for Fleet" />
                  <Infrastructure />
                </>
              }
            />
          }
        />
        <Route
          path="/pressureless"
          element={
            <>
              <PageTitle title="FFF Dashboard | Pressureless Summary" />
              <PressurelessSummary />
            </>
          }
        />
        <Route
          path="/manpower"
          element={
            <ProtectedRoute
              element={
                <>
                  <PageTitle title="FFF Dashboard | Fuel Feasibility for Fleet" />
                  <Manpower />
                </>
              }
            />
          }
        />
        <Route
          path="/induksi"
          element={
            <>
              <PageTitle title="FFF Dashboard | Input Data Induksi" />
              <Induction />
            </>
          }
        />
        <Route
          path="/roster"
          element={
            <>
              <PageTitle title="FFF Dashboard | Roster Manpower" />
              <Roster />
            </>
          }
        />
        <Route
          path="/scheduler"
          element={
            <>
              <PageTitle title="FFF Dashboard | Scheduler Example" />
              <SchedulerExample />
            </>
          }
        />

        <Route
          path="/formcuti"
          element={
            <>
              <PageTitle title="FFF Dashboard | Form Pengajuan Cuti" />
              <LeaveRequest />
            </>
          }
        />
        <Route
          path="/cuti"
          element={
            <ProtectedRoute
              element={
                <>
                  <PageTitle title="FFF Dashboard | Daftar Cuti" />
                  <LeaveList />
                </>
              }
            />
          }
        />

        <Route
          path="/calendar"
          element={
            <ProtectedRoute
              element={
                <>
                  <PageTitle title="FFF Dashboard | Fuel Feasibility for Fleet" />
                  <Calendar />
                </>
              }
            />
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute
              element={
                <>
                  <PageTitle title="FFF Dashboard | Fuel Feasibility for Fleet" />
                  <Profile />
                </>
              }
            />
          }
        />
        <Route
          path="/forms/form-elements"
          element={
            <ProtectedRoute
              element={
                <>
                  <PageTitle title="FFF Dashboard | Fuel Feasibility for Fleet" />
                  <FormElements />
                </>
              }
            />
          }
        />
        <Route
          path="/forms/form-layout"
          element={
            <ProtectedRoute
              element={
                <>
                  <PageTitle title="FFF Dashboard | Fuel Feasibility for Fleet" />
                  <FormLayout />
                </>
              }
            />
          }
        />
        <Route
          path="/tables"
          element={
            <ProtectedRoute
              element={
                <>
                  <PageTitle title="FFF Dashboard | Fuel Feasibility for Fleet" />
                  <Tables />
                </>
              }
            />
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute
              element={
                <>
                  <PageTitle title="FFF Dashboard | Fuel Feasibility for Fleet" />
                  <Settings />
                </>
              }
            />
          }
        />
        <Route
          path="/chart"
          element={
            <ProtectedRoute
              element={
                <>
                  <PageTitle title="FFF Dashboard | Fuel Feasibility for Fleet" />
                  <Chart />
                </>
              }
            />
          }
        />
        <Route
          path="/ui/alerts"
          element={
            <ProtectedRoute
              element={
                <>
                  <PageTitle title="FFF Dashboard | Fuel Feasibility for Fleet" />
                  <Alerts />
                </>
              }
            />
          }
        />
        <Route
          path="/ui/buttons"
          element={
            <ProtectedRoute
              element={
                <>
                  <PageTitle title="FFF Dashboard | Fuel Feasibility for Fleet" />
                  <Buttons />
                </>
              }
            />
          }
        />
        <Route
          path="/reporting/dailyreport"
          element={
            <ProtectedRoute
              element={
                <>
                  <PageTitle title="FFF Dashboard | Daily Report" />
                  <DailyReport />
                </>
              }
            />
          }
        />
        <Route
          path="/reporting/stock"
          element={
            <ProtectedRoute
              element={
                <>
                  <PageTitle title="FFF Dashboard | Stock Reporting" />
                  <StockReporting />
                </>
              }
            />
          }
        />
        <Route
          path="/reporting/stocktaking"
          element={
            <>
            <PageTitle title="FFF Dashboard | Stock Taking" />
            <StockTaking />
          </>
          }
        />
        <Route
          path="/reporting/ritation"
          element={
            <ProtectedRoute
              element={
                <>
                  <PageTitle title="FFF Dashboard | Ritation Report" />
                  <RitationReport />
                </>
              }
            />
          }
        />
        <Route
          path="/reporting/tmr"
          element={
            <ProtectedRoute
              element={
                <>
                  <PageTitle title="FFF Dashboard | TMR Report" />
                  <TMRReport />
                </>
              }
            />
          }
        />
        <Route
          path="/reporting/pressureless"
          element={
            <>
              <PageTitle title="FFF Dashboard | Pressureless Reporting" />
              <PressurelessReport />
            </>
          }
        />
      </Routes>
    </DefaultLayout>
  );
}

export default App;
