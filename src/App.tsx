import { useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';

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

function App() {
  const [loading, setLoading] = useState<boolean>(true);
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000);
  }, []);

  return loading ? (
    <Loader />
  ) : (
    <DefaultLayout>
      <Routes>
        <Route
          index
          element={
            <>
              <PageTitle title="FFF Dashboard | Fuel Feasibility for Fleet" />
              <ECommerce />
            </>
          }
        />
        <Route
          path="/calendar"
          element={
            <>
              <PageTitle title="FFF Dashboard | Fuel Feasibility for Fleet" />
              <Calendar />
            </>
          }
        />
        <Route
          path="/profile"
          element={
            <>
              <PageTitle title="FFF Dashboard | Fuel Feasibility for Fleet" />
              <Profile />
            </>
          }
        />
        <Route
          path="/forms/form-elements"
          element={
            <>
              <PageTitle title="FFF Dashboard | Fuel Feasibility for Fleet" />
              <FormElements />
            </>
          }
        />
        <Route
          path="/forms/form-layout"
          element={
            <>
              <PageTitle title="FFF Dashboard | Fuel Feasibility for Fleet" />
              <FormLayout />
            </>
          }
        />
        <Route
          path="/tables"
          element={
            <>
              <PageTitle title="TFFF Dashboard | Fuel Feasibility for Fleet" />
              <Tables />
            </>
          }
        />
        <Route
          path="/settings"
          element={
            <>
              <PageTitle title="FFF Dashboard | Fuel Feasibility for Fleet" />
              <Settings />
            </>
          }
        />
        <Route
          path="/chart"
          element={
            <>
              <PageTitle title="FFF Dashboard | Fuel Feasibility for Fleet" />
              <Chart />
            </>
          }
        />
        <Route
          path="/ui/alerts"
          element={
            <>
              <PageTitle title="FFF Dashboard | Fuel Feasibility for Fleet" />
              <Alerts />
            </>
          }
        />
        <Route
          path="/ui/buttons"
          element={
            <>
              <PageTitle title="FFF Dashboard | Fuel Feasibility for Fleet" />
              <Buttons />
            </>
          }
        />
        <Route
          path="/auth/signin"
          element={
            <>
              <PageTitle title="FFF Dashboard | Fuel Feasibility for Fleet" />
              <SignIn />
            </>
          }
        />
        <Route
          path="/auth/signup"
          element={
            <>
              <PageTitle title="FFF Dashboard | Fuel Feasibility for Fleet" />
              <SignUp />
            </>
          }
        />
        <Route
          path="/reporting/dailyreport"
          element={
            <>
              <PageTitle title="FFF Dashboard | Fuel Feasibility for Fleet" />
              <DailyReport />
            </>
          }
        />
        <Route
          path="/reporting/ritation"
          element={
            <>
              <PageTitle title="FFF Dashboard | Fuel Feasibility for Fleet" />
              <RitationReport />
            </>
          }
        />
        <Route
          path="/reporting/tmr"
          element={
            <>
              <PageTitle title="FFF Dashboard | Fuel Feasibility for Fleet" />
              <TMRReport />
            </>
          }
        />
        <Route
          path="/reporting/pressureless"
          element={
            <>
              <PageTitle title="FFF Dashboard | Fuel Feasibility for Fleet" />
              <PressurelessReport />
            </>
          }
        />
      </Routes>
      
    </DefaultLayout>
  );
}

export default App;
