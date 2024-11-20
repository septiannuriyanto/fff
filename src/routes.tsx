import SignIn from './pages/Authentication/SignIn';
import SignUp from './pages/Authentication/SignUp';
import Dashboard from './pages/Dashboard';
import FuelConsumption from './pages/Dashboard/FuelConsumption/FuelConsumption';
import StockManagement from './pages/Dashboard/Stock Management/StockManagement';
import Infrastructure from './pages/Dashboard/Infrastructure/Infrastructure';
import Operational from './pages/Dashboard/Operational/Operational';
import RefuelingAnomaly from './pages/Dashboard/Operational/RefuelingAnomaly';
import FuelTruckBacklog from './pages/Dashboard/Infrastructure/FuelTruckBacklog/FuelTruckBacklog';
import Manpower from './pages/Dashboard/Manpower/Manpower';
import Profile from './pages/Profile';
import Calendar from './pages/Calendar';
import FormElements from './pages/Form/FormElements';
import Tables from './pages/Tables';
import Settings from './pages/Settings';
import Chart from './pages/Chart';
import Alerts from './pages/UiElements/Alerts';
import Buttons from './pages/UiElements/Buttons';
import FuelRitationPlan from './pages/Dashboard/Planning/FuelRitationPlan/FuelRitationPlan';

import DailyReport from './pages/Reporting/DailyReport/DailyReport';
import Logsheet from './pages/Reporting/Logsheet/Logsheet';
import StockReporting from './pages/Reporting/DailyReport/components/StockReporting';
import StockTaking from './pages/Reporting/DailyReport/StockTaking/StockTaking';
import RitationReport from './pages/Reporting/RitationReport/RitationReport';
import TMRReport from './pages/Reporting/TMRReport/TMRReport';
import PressurelessReport from './pages/Reporting/PressurelessReport';
import BreakdownRfuReport from './pages/Reporting/Breakdown/BreakdownRfuReport';

import BastFuel from './pages/Export/BastFuel/BastFuel';
import BastOli from './pages/Export/BastOli/BastOli';
import BaReconcile from './pages/Export/BaReconcile/BaReconcile';
import ComponentLibrary from './pages/MasterData/ComponentLibrary';
import MasterManpower from './pages/MasterData/MasterManpower';
import RegistrationList from './pages/Authentication/RegistrationList';
import ForgotPassword from './pages/Authentication/ForgotPassword';
import { ADMIN, ALL_ROLES, FUEL_ROLES, SUPERVISOR } from './store/roles';
import FuelTruckBacklogRequest from './pages/Dashboard/Operational/components/FueltruckBacklogRequest';
import ResetPassword from './pages/Authentication/ResetPassword';


const routes = [
  {
    path: '/',
    component: <Dashboard />,
    title: 'FFF | Fuel Feasibility for Fleet',
    allowedRoles: ALL_ROLES
  },

  {
    path: '/auth/signin',
    component: <SignIn />,
    allowedRoles: ALL_ROLES
  },
  {
    path: '/auth/signup',
    component: <SignUp />,
    allowedRoles: ALL_ROLES
  },
  {
    path: '/auth/forgotpassword',
    component: <ForgotPassword />,
    allowedRoles: ALL_ROLES
  },
  {
    path: '/auth/resetpassword/:token',
    component: <ResetPassword />,
    allowedRoles: ALL_ROLES
  },


  {
    path: '/auth/registrationlist',
    component: <RegistrationList />,
    allowedRoles: SUPERVISOR
  },

  {
    path: '/fuelcons',
    component: <FuelConsumption />,
    title: 'FFF | Fuel Feasibility for Fleet',
    allowedRoles: ADMIN
  },
  {
    path: '/stockmanagement',
    component: <StockManagement />,
    title: 'FFF | Fuel Feasibility for Fleet',
    allowedRoles: ADMIN
  },
  {
    path: '/operational',
    component: <Operational />,
    title: 'FFF | Operational Dashboard',
    allowedRoles: ADMIN
  },
  {
    path: '/operational/ritation',
    component: <RefuelingAnomaly allowColumnsEdit />,
    title: 'FFF | Ritation Dashboard',
    allowedRoles: ADMIN
  },
  {
    path: '/infrastructure',
    component: <Infrastructure />,
    title: 'FFF | Fuel Feasibility for Fleet',
    allowedRoles: ADMIN
  },
  {
    path: '/infrastructure/ftbacklog',
    component: <FuelTruckBacklog />,
    title: 'FFF | FT Backlog List',
    allowedRoles: ADMIN
  },
  {
    path: '/manpower',
    component: <Manpower />,
    title: 'FFF | Fuel Feasibility for Fleet',
    allowedRoles: ADMIN
  },

  {
    path: '/profile/:id',
    component: <Profile />,
    title: 'FFF | Fuel Feasibility for Fleet',
    allowedRoles: ALL_ROLES
  },

  {
    path: '/settings/:id',
    component: <Settings />,
    title: 'FFF | Fuel Feasibility for Fleet',
    allowedRoles: ALL_ROLES
  },

  {
    path: '/plan/fuelritationplan',
    component: <FuelRitationPlan />,
    title: 'FFF | Fuel Ritation Plan',
    allowedRoles: SUPERVISOR
  },
  // Reporting Routes
  {
    path: '/reporting/dailyreport',
    component: <DailyReport />,
    title: 'FFF | Daily Report',
    allowedRoles: FUEL_ROLES
  },
  {
    path: '/reporting/logsheet',
    component: <Logsheet />,
    title: 'FFF | Logsheet',
    allowedRoles: FUEL_ROLES
  },
  {
    path: '/reporting/stock',
    component: <StockReporting />,
    title: 'FFF | Stock Reporting',
    allowedRoles: FUEL_ROLES
  },
  {
    path: '/reporting/stocktaking',
    component: <StockTaking />,
    title: 'FFF | Stock Taking',
    allowedRoles: FUEL_ROLES
  },
  {
    path: '/reporting/ritation',
    component: <RitationReport />,
    title: 'FFF | Ritation Report',
    allowedRoles: FUEL_ROLES
  },
  {
    path: '/reporting/ritation/:id',
    component: <RitationReport />,
    title: 'FFF | Ritation Detail',
    allowedRoles: FUEL_ROLES
  },
  {
    path: '/reporting/tmr',
    component: <TMRReport />,
    title: 'FFF | TMR Report',
    allowedRoles: FUEL_ROLES
  },
  {
    path: '/reporting/pressureless',
    component: <PressurelessReport />,
    title: 'FFF | Pressureless Reporting',
    allowedRoles: FUEL_ROLES
  },
  {
    path: '/reporting/ftbdrfu',
    component: <BreakdownRfuReport />,
    title: 'FFF | FT Breakdown - RFU',
    allowedRoles: FUEL_ROLES
  },
  {
    path: '/reporting/ftbacklogreq',
    component: <FuelTruckBacklogRequest />,
    title: 'FFF | FT Backlog Request',
    allowedRoles: FUEL_ROLES
  },
  // Export Routes
  {
    path: '/export/bastfuel',
    component: <BastFuel />,
    title: 'FFF | Export BAST Fuel',
    allowedRoles: SUPERVISOR
  },
  {
    path: '/export/bastoli',
    component: <BastOli />,
    title: 'FFF | Export BAST Oli',
    allowedRoles: SUPERVISOR
  },
  {
    path: '/export/reconcilefuelowner',
    component: <BaReconcile />,
    title: 'FFF | Export BA Reconcile Owner',
    allowedRoles: SUPERVISOR
  },
  // Master Data Routes
  {
    path: '/master/componentlibrary',
    component: <ComponentLibrary />,
    title: 'FFF | Component Library',
    allowedRoles: SUPERVISOR
  },
  {
    path: '/master/manpower',
    component: <MasterManpower />,
    title: 'FFF | Master Manpower',
    allowedRoles: SUPERVISOR
  },

  //UI ROUTES
  {
    path: '/chart',
    component: <Chart />,
    title: 'FFF | Fuel Feasibility for Fleet',
    allowedRoles: SUPERVISOR
  },
  {
    path: '/calendar',
    component: <Calendar />,
    title: 'FFF | Fuel Feasibility for Fleet',
    allowedRoles: SUPERVISOR
  },
  {
    path: '/forms/form-elements',
    component: <FormElements />,
    title: 'FFF | Fuel Feasibility for Fleet',
    allowedRoles: SUPERVISOR
  },
  {
    path: '/forms/form-layout',
    component: <FormElements />,
    title: 'FFF | Fuel Feasibility for Fleet',
    allowedRoles: SUPERVISOR
  },
  {
    path: '/tables',
    component: <Tables />,
    title: 'FFF | Fuel Feasibility for Fleet',
    allowedRoles: SUPERVISOR
  },
  {
    path: '/ui/alerts',
    component: <Alerts />,
    title: 'FFF | Fuel Feasibility for Fleet',
    allowedRoles: SUPERVISOR
  },
  {
    path: '/ui/buttons',
    component: <Buttons />,
    title: 'FFF | Fuel Feasibility for Fleet',
    allowedRoles: SUPERVISOR
  },
];

export default routes;
