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

import MasterManpower from './pages/MasterData/MasterManpower/MasterManpower';
import RegistrationList from './pages/Authentication/RegistrationList';
import ForgotPassword from './pages/Authentication/ForgotPassword';
import { ADMIN, ALL_ROLES, FUEL_PARTNER, FUEL_ROLES, OIL_ROLES, SUPERVISOR } from './store/roles';
import FuelTruckBacklogRequest from './pages/Dashboard/Operational/components/FueltruckBacklogRequest';
import ResetPassword from './pages/Authentication/ResetPassword';
import PressurelessSummary from './pages/Dashboard/Infrastructure/PressurelessSummary';
import ManpowerRegistration from './pages/MasterData/components/ManpowerRegistration';
import DailyStockTakingOil from './pages/Oil/DailyStockTakingOil/DailyStockTakingOil';
import HousekeepingOil from './pages/Oil/HousekeepingOil/HousekeepingOil';
import StorageManagement from './pages/Oil/StorageManagement/StorageManagement';
import AddMaterialPage from './pages/MasterData/Materials/AddMaterialPage';
import DstOilReport from './pages/Oil/DailyStockTakingReport/DstOilReport';
import FuelPartnerDashboard from './pages/Partner/Dashboard/FuelPartnerDashboard';
import FuelPartnerRitation from './pages/Partner/Ritation/FuelPartnerRitation';
import AdditiveMonitoring from './pages/Partner/Additive/AdditiveMonitoring';
import { RefuelingSchedule } from './pages/MasterData/MasterSchedule/RefuelingSchedule';
import ComponentLibrary from './pages/MasterData/ComponentLibrary/ComponentLibrary';
import MaterialRequirementPlanning from './pages/MasterData/MaterialRequirementPlanning.tsx/MaterialRequirementPlanning';
import GreaseMonitoring from './pages/Dashboard/Infrastructure/Grease/GreaseMonitoring';
import MasterStorageFuel from './pages/MasterData/Storage/Fuel/MasterStorageFuel';
import FleetManagement from './pages/Operational/FleetManagement/FleetManagement';
import RefuelingDistribution from './pages/Operational/RefuelingDistribution/RefuelingDistribution';
import HourMeterManagement from './pages/Operational/HourMeterManagement/HourMeterManagement';
import IssuingFuel from './pages/Operational/IssuingFuel/IssuingFuel';


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
    allowedRoles: ALL_ROLES
  },
  {
    path: '/infrastructure/ftbacklog/:unit_id',
    component: <FuelTruckBacklog />,
    title: 'FFF | FT Backlog List',
    allowedRoles: ALL_ROLES
  },
  {
    path: '/infrastructure/pressureless',
    component: <PressurelessSummary allowColumnsEdit />,
    title: 'FFF | Fuel Feasibility for Fleet',
    allowedRoles: ALL_ROLES
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

  // Operational Routes
  {
    path: '/operational/fleet',
    component: <FleetManagement />,
    title: 'FFF | Fleet Management',
    allowedRoles: SUPERVISOR
  },
  {
    path: '/operational/delay',
    component: <FleetManagement />,
    title: 'FFF | Delay Refueling',
    allowedRoles: SUPERVISOR
  },
  {
    path: '/operational/distribution',
    component: <RefuelingDistribution />,
    title: 'FFF | Refueling Distribution',
    allowedRoles: SUPERVISOR
  },
  {
    path: '/operational/hm',
    component: <HourMeterManagement />,
    title: 'FFF | Hour Meters',
    allowedRoles: SUPERVISOR
  },
  {
    path: '/operational/issuing',
    component: <IssuingFuel />,
    title: 'FFF | Issuing Fuel',
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
    // title: 'FFF | FT Breakdown - RFU',
    // allowedRoles: FUEL_ROLES
  },
  {
    path: '/reporting/ftbacklogreq',
    component: <FuelTruckBacklogRequest />,
    title: 'FFF | FT Backlog Request',
    allowedRoles: FUEL_ROLES
  },

  // Partner Reporting Routes
  {
    path: '/partner/fuel',
    component: <FuelPartnerDashboard />,
    title: 'FFF | Fuel Partner Dashboard',
    allowedRoles: FUEL_PARTNER
  },
  {
    path: '/partner/fuel/ritation',
    component: <FuelPartnerRitation />,
    title: 'FFF | Fuel Partner Ritation',
    allowedRoles: FUEL_PARTNER
  },
  {
    path: '/partner/fuel/additive',
    component: <AdditiveMonitoring />,
    allowedRoles: ALL_ROLES
  },

  // Oil Reporting Routes
   {
    path: '/oil/storagemgmt',
    component: <StorageManagement />,
    title: 'FFF | Oil Storage Management',
    allowedRoles: SUPERVISOR
  },
  {
    path: '/oil/dst',
    component: <DailyStockTakingOil />,
    title: 'FFF | Daily Stock Taking Oil',
    allowedRoles: OIL_ROLES
  },

  {
  path: '/oil/dst/:alias',   // ← warehouse jadi path param
  component: <DailyStockTakingOil />,
  allowedRoles: ALL_ROLES,
},
   {
    path: '/oil/dstreport',
    component: <DstOilReport />,
    title: 'FFF | Daily Stock Taking Oil Report',
    allowedRoles: OIL_ROLES
  },
      {
    path: '/oil/grease',
    component: <GreaseMonitoring />,
    title: 'FFF | Grease Monitoring',
    allowedRoles: OIL_ROLES,
  },

    {
    path: '/oil/housekeeping',
    component: <HousekeepingOil />,
    title: 'FFF | Housekeeping Oil',
    allowedRoles: OIL_ROLES
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
    path: '/master/library',
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
  {
    path: '/master/storage/fuel',
    component: <MasterStorageFuel />,
    title: 'FFF | Master Storage Fuel',
    allowedRoles: SUPERVISOR
  },
  {
    path: '/master/addmaterial',
    component: <AddMaterialPage />,
    title: 'FFF | Add Material',
    allowedRoles: SUPERVISOR
  },
{
    path: '/master/manpower/add',
    component: <ManpowerRegistration />,
    title: 'FFF | Master Manpower',
    allowedRoles: SUPERVISOR
  },
  {
    path: '/master/schedule/refueling',
    component: <RefuelingSchedule />,
    title: 'FFF | Refueling Schedule',
    allowedRoles: SUPERVISOR
  },
  {
    path: '/master/mrp',
    component: <MaterialRequirementPlanning />,
    title: 'FFF | MRP Database',
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
