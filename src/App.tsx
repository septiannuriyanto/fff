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
import RitationReport from './pages/Reporting/RitationReport/RitationReport';
import TMRReport from './pages/Reporting/TMRReport/TMRReport';
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
import StockTaking from './pages/Reporting/DailyReport/StockTaking/StockTaking';
import Ritation from './pages/Dashboard/Operational/Ritation/Ritation';
import FuelTruckMaintenanceRequest from './pages/Dashboard/Operational/components/FueltruckMaintenanceRequest';
import Logsheet from './pages/Reporting/Logsheet/Logsheet';
import ComponentTester from './pages/MasterData/ComponentLibrary';
import ComponentLibrary from './pages/MasterData/ComponentLibrary';
import MasterManpower from './pages/MasterData/MasterManpower';
import FuelRitationPlan from './pages/Dashboard/Planning/FuelRitationPlan/FuelRitationPlan';
import BastFuel from './pages/Export/BastFuel/BastFuel';
import BastOli from './pages/Export/BastOli/BastOli';
import BaReconcile from './pages/Export/BaReconcile/BaReconcile';
import BreakdownRfuReport from './pages/Reporting/Breakdown/BreakdownRfuReport';

function App() {
  return (
    <DefaultLayout>
      <Routes>
        <Route path="/auth/signin" element={<SignIn />} />
        <Route path="/auth/signup" element={<SignUp />} />

        {/* Protected Routes */}
        {/*============================================================================================================== DASHBOARDS  */}
        <Route
          path="/"
          element={
            <ProtectedRoute
              element={
                <>
                  <PageTitle title="FFF | Fuel Feasibility for Fleet" />
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
                  <PageTitle title="FFF | Fuel Feasibility for Fleet" />
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
                  <PageTitle title="FFF | Fuel Feasibility for Fleet" />
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
                  <PageTitle title="FFF | Operational Dashboard" />
                  <Operational />
                </>
              }
            />
          }
        />
        <Route
          path="/operational/ritation"
          element={
            <ProtectedRoute
              element={
                <>
                  <PageTitle title="FFF | Ritation Dashboard" />
                  <Ritation />
                </>
              }
            />
          }
        />
        <Route
          path="/anomaly"
          element={
            <>
              <PageTitle title="FFF | Anomaly Refueling" />
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
                  <PageTitle title="FFF | Fuel Feasibility for Fleet" />
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
              <PageTitle title="FFF | Pressureless Summary" />
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
                  <PageTitle title="FFF | Fuel Feasibility for Fleet" />
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
              <PageTitle title="FFF | Input Data Induksi" />
              <Induction />
            </>
          }
        />
        <Route
          path="/roster"
          element={
            <>
              <PageTitle title="FFF | Roster Manpower" />
              <Roster />
            </>
          }
        />
        <Route
          path="/scheduler"
          element={
            <>
              <PageTitle title="FFF | Scheduler Example" />
              <SchedulerExample />
            </>
          }
        />

        <Route
          path="/formcuti"
          element={
            <>
              <PageTitle title="FFF | Form Pengajuan Cuti" />
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
                  <PageTitle title="FFF | Daftar Cuti" />
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
                  <PageTitle title="FFF | Fuel Feasibility for Fleet" />
                  <Calendar />
                </>
              }
            />
          }
        />
        <Route
          path="/profile/:id"
          element={
            <ProtectedRoute
              element={
                <>
                  <PageTitle title="FFF | Fuel Feasibility for Fleet" />
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
                  <PageTitle title="FFF | Fuel Feasibility for Fleet" />
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
                  <PageTitle title="FFF | Fuel Feasibility for Fleet" />
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
                  <PageTitle title="FFF | Fuel Feasibility for Fleet" />
                  <Tables />
                </>
              }
            />
          }
        />
        <Route
          path="/settings/:id"
          element={
            <ProtectedRoute
              element={
                <>
                  <PageTitle title="FFF | Fuel Feasibility for Fleet" />
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
                  <PageTitle title="FFF | Fuel Feasibility for Fleet" />
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
                  <PageTitle title="FFF | Fuel Feasibility for Fleet" />
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
                  <PageTitle title="FFF | Fuel Feasibility for Fleet" />
                  <Buttons />
                </>
              }
            />
          }
        />
         {/*============================================================================================================== PLANNING  */}
         <Route
          path="/plan/fuelritationplan"
          element={
            <ProtectedRoute
              element={
                <>
                  <PageTitle title="FFF | Fuel Ritation Plan" />
                  <FuelRitationPlan />
                </>
              }
            />
          }
        />
        {/*============================================================================================================== REPORTING  */}
        <Route
          path="/reporting/dailyreport"
          element={
            <ProtectedRoute
              element={
                <>
                  <PageTitle title="FFF | Daily Report" />
                  <DailyReport />
                </>
              }
            />
          }
        />
         <Route
          path="/reporting/logsheet"
          element={
            <ProtectedRoute
              element={
                <>
                  <PageTitle title="FFF | Logsheet" />
                  <Logsheet />
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
                  <PageTitle title="FFF | Stock Reporting" />
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
            <PageTitle title="FFF | Stock Taking" />
            <StockTaking />
          </>
          }
        />
        <Route
          path="/reporting/ritation"
          element={
                <>
                  <PageTitle title="FFF | Ritation Report" />
                  <RitationReport />
                </>
          }
        />
        <Route
          path="/reporting/ritation/:id"
          element={
                <>
                  <PageTitle title="FFF | Ritation Detail" />
                  <RitationReport />
                </>
          }
        />
        <Route
          path="/reporting/tmr"
          element={
            <ProtectedRoute
              element={
                <>
                  <PageTitle title="FFF | TMR Report" />
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
              <PageTitle title="FFF | Pressureless Reporting" />
              <PressurelessReport />
            </>
          }
        />
        <Route
          path="/reporting/ftbdrfu"
          element={
            <>
              <PageTitle title="FFF | FT Breakdown - RFU" />
              <BreakdownRfuReport></BreakdownRfuReport>
            </>
          }
        />
        <Route
          path="/reporting/ftmaintenancerequest"
          element={
            <>
              <PageTitle title="FFF | FT Maintenance Request" />
              <FuelTruckMaintenanceRequest />
            </>
          }
        />


        {/*============================================================================================================== EXPORTS  */}
        <Route
          path="/export/bastfuel"
          element={
            <>
              <PageTitle title="FFF | Export BAST Fuel" />
              <BastFuel/>
            </>
          }
        />
        <Route
          path="/export/bastoli"
          element={
            <>
              <PageTitle title="FFF | Export BAST Oli" />
              <BastOli/>
            </>
          }
        />
        <Route
          path="/export/reconcilefuelowner"
          element={
            <>
              <PageTitle title="FFF | Export BA Reconcile Owner" />
              <BaReconcile/>
            </>
          }
        />
        {/*============================================================================================================== MASTER DATA  */}
        <Route
          path="/master/manpower"
          element={
            <>
              <PageTitle title="FFF | Manpower Master Data" />
              <MasterManpower></MasterManpower>
            </>
          }
        />
         <Route
          path="/master/equipment"
          element={
            <>
              <PageTitle title="FFF | Equipment Master Data" />
              
            </>
          }
        />
         <Route
          path="/master/fueltruck"
          element={
            <>
              <PageTitle title="FFF | FT Master Data" />
              
            </>
          }
        />
         <Route
          path="/master/library"
          element={
            <>
              <PageTitle title="FFF | Component Library" />
              <ComponentLibrary></ComponentLibrary>
            </>
          }
        />
      </Routes>
    </DefaultLayout>
  );
}

export default App;
