import { Routes, Route } from 'react-router-dom';
import Loader from './common/Loader';
import PageTitle from './components/PageTitle';
import SignIn from './pages/Authentication/SignIn';
import SignUp from './pages/Authentication/SignUp';
import Calendar from './pages/Calendar';
import Chart from './pages/Chart';
import ECommerce from './pages/Dashboard/Analytics';
import FormElements from './pages/Form/FormElements';
import FormLayout from './pages/Form/FormLayout';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Tables from './pages/Tables';
import Alerts from './pages/UiElements/Alerts';
import Buttons from './pages/UiElements/Buttons';
import DefaultLayout from './layout/DefaultLayout';
import DailyReport from './pages/Reporting/DailyReport';
import RitationReport from './pages/Reporting/RitationReport';
import TMRReport from './pages/Reporting/TMRReport';
import PressurelessReport from './pages/Reporting/PressurelessReport';
import Analytics from './pages/Dashboard/Analytics';
import ProtectedRoute from './pages/ProtectedRoute'; // Adjust the import path as necessary

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
            <ProtectedRoute element={
              <>
                <PageTitle title="FFF Dashboard | Fuel Feasibility for Fleet" />
                <ECommerce />
              </>
            } />
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute element={
              <>
                <PageTitle title="FFF Dashboard | Fuel Feasibility for Fleet" />
                <Analytics />
              </>
            } />
          }
        />
        <Route
          path="/calendar"
          element={
            <ProtectedRoute element={
              <>
                <PageTitle title="FFF Dashboard | Fuel Feasibility for Fleet" />
                <Calendar />
              </>
            } />
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute element={
              <>
                <PageTitle title="FFF Dashboard | Fuel Feasibility for Fleet" />
                <Profile />
              </>
            } />
          }
        />
        <Route
          path="/forms/form-elements"
          element={
            <ProtectedRoute element={
              <>
                <PageTitle title="FFF Dashboard | Fuel Feasibility for Fleet" />
                <FormElements />
              </>
            } />
          }
        />
        <Route
          path="/forms/form-layout"
          element={
            <ProtectedRoute element={
              <>
                <PageTitle title="FFF Dashboard | Fuel Feasibility for Fleet" />
                <FormLayout />
              </>
            } />
          }
        />
        <Route
          path="/tables"
          element={
            <ProtectedRoute element={
              <>
                <PageTitle title="FFF Dashboard | Fuel Feasibility for Fleet" />
                <Tables />
              </>
            } />
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute element={
              <>
                <PageTitle title="FFF Dashboard | Fuel Feasibility for Fleet" />
                <Settings />
              </>
            } />
          }
        />
        <Route
          path="/chart"
          element={
            <ProtectedRoute element={
              <>
                <PageTitle title="FFF Dashboard | Fuel Feasibility for Fleet" />
                <Chart />
              </>
            } />
          }
        />
        <Route
          path="/ui/alerts"
          element={
            <ProtectedRoute element={
              <>
                <PageTitle title="FFF Dashboard | Fuel Feasibility for Fleet" />
                <Alerts />
              </>
            } />
          }
        />
        <Route
          path="/ui/buttons"
          element={
            <ProtectedRoute element={
              <>
                <PageTitle title="FFF Dashboard | Fuel Feasibility for Fleet" />
                <Buttons />
              </>
            } />
          }
        />
        <Route
          path="/reporting/dailyreport"
          element={
            <ProtectedRoute element={
              <>
                <PageTitle title="FFF Dashboard | Fuel Feasibility for Fleet" />
                <DailyReport />
              </>
            } />
          }
        />
        <Route
          path="/reporting/ritation"
          element={
            <ProtectedRoute element={
              <>
                <PageTitle title="FFF Dashboard | Fuel Feasibility for Fleet" />
                <RitationReport />
              </>
            } />
          }
        />
        <Route
          path="/reporting/tmr"
          element={
            <ProtectedRoute element={
              <>
                <PageTitle title="FFF Dashboard | Fuel Feasibility for Fleet" />
                <TMRReport />
              </>
            } />
          }
        />
        <Route
          path="/reporting/pressureless"
          element={
            <ProtectedRoute element={
              <>
                <PageTitle title="FFF Dashboard | Fuel Feasibility for Fleet" />
                <PressurelessReport />
              </>
            } />
          }
        />
      </Routes>
    </DefaultLayout>
  );
}

export default App;
