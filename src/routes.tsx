import SignIn from './pages/Authentication/SignIn';
import SignUp from './pages/Authentication/SignUp';
import Dashboard from './pages/Dashboard';
import FuelConsumption from './pages/Dashboard/FuelConsumption/FuelConsumption';
import Infrastructure from './pages/Dashboard/Infrastructure/Infrastructure';
import Operational from './pages/Dashboard/Operational/Operational';
import RefuelingAnomaly from './pages/Dashboard/Operational/RefuelingAnomaly';
import FuelTruckBacklog from './pages/Dashboard/Infrastructure/FuelTruckBacklog/FuelTruckBacklog';
import Manpower from './pages/Dashboard/Manpower/Manpower';
import Profile from './pages/MasterData/MasterManpower/Profile/Profile';
import ProfileEdit from './pages/MasterData/MasterManpower/Profile/Edit/ProfileEdit';
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
import FuelmanReport from './pages/Reporting/FuelmanReport/FuelmanReport';

import BastFuel from './pages/Export/BastFuel/BastFuel';
import BastOli from './pages/Export/BastOli/BastOli';
import BaReconcile from './pages/Export/BaReconcile/BaReconcile';

import MasterManpower from './pages/MasterData/MasterManpower/MasterManpower';
import RegistrationList from './pages/Authentication/RegistrationList';
import ForgotPassword from './pages/Authentication/ForgotPassword';
import { ADMIN, ALL_ROLES, FUEL_PARTNER, FUEL_ROLES, OIL_ROLES, PLANT, SUPERVISOR } from './store/roles';
import FuelTruckBacklogRequest from './pages/Dashboard/Operational/components/FueltruckBacklogRequest';
import ResetPassword from './pages/Authentication/ResetPassword';
import PressurelessSummary from './pages/Dashboard/Infrastructure/PressurelessSummary';
import ManpowerRegistration from './pages/MasterData/components/ManpowerRegistration';
import DailyStockTakingOil from './pages/Oil/DailyStockTakingOil/DailyStockTakingOil';
import HousekeepingOil from './pages/Oil/HousekeepingOil/HousekeepingOil';
import StorageManagement from './pages/Oil/StorageManagement/StorageManagement';
import Materials from './pages/MasterData/Materials/Materials';
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
import GardaLotoReport from './pages/Reporting/GardaLotoReport/GardaLotoReport';
import GardaLotoSessionDetails from './pages/Dashboard/GardaLoto/GardaLotoSessionDetails';
import GardaLotoDashboard from './pages/Dashboard/GardaLoto/GardaLotoDashboard';
import AdminReport from './pages/Reporting/AdminReport/AdminReport';
import FilterChange from './pages/Plant/FilterChange/FilterChange';
import FilterChangeDb from './pages/Plant/FilterChangeDb/FilterChangeDb';
import LandingPage from './pages/LandingPage';
import BaCleanliness from './pages/Plant/Cleanliness/BaCleanliness';
import PlantDashboard from './pages/PlantDashboard';

import PublicRoute from './components/PublicRoute';
import FuelTripManagement from './pages/Dashboard/FuelTripManagement/FuelTripManagement';
import StockManagement from './pages/Dashboard/StockManagement/StockManagement';
import MasterCompetency from './pages/MasterData/Competency/MasterCompetency';
import FuelPartnerStock from './pages/Partner/Stock/FuelPartnerStock';
import InfrastructureInspection from './pages/Reporting/Infrastructure/InfrastructureInspection';

export interface AppRoute {
  path: string;
  component: React.ReactNode;
  title?: string;
  allowedRoles?: string[];
  isPublic?: boolean;
  keywords?: string[];
}

const routes: AppRoute[] = [
  {
    path: '/',
    component: (
      <PublicRoute>
        <LandingPage />
      </PublicRoute>
    ),
    allowedRoles: ALL_ROLES,
    keywords: ['landing', 'home', 'public']
  },
  {
    path: '/dashboard',
    component: <Dashboard />,
    title: 'FFF | Fuel Feasibility for Fleet',
    allowedRoles: ALL_ROLES,
    keywords: ['dashboard', 'home', 'overview', 'main']
  },
  {
    path: '/auth/signin',
    component: <SignIn />,
    allowedRoles: ALL_ROLES,
    keywords: ['login', 'signin', 'auth', 'authentication']
  },
  {
    path: '/auth/signup',
    component: <SignUp />,
    allowedRoles: ALL_ROLES,
    keywords: ['register', 'signup', 'auth', 'create account']
  },
  {
    path: '/auth/forgotpassword',
    component: <ForgotPassword />,
    allowedRoles: ALL_ROLES,
    keywords: ['forgot password', 'reset', 'auth', 'recovery']
  },
  {
    path: '/auth/resetpassword/:token',
    component: <ResetPassword />,
    allowedRoles: ALL_ROLES,
    keywords: ['reset password', 'auth']
  },
  {
    path: '/auth/registrationlist',
    component: <RegistrationList />,
    allowedRoles: SUPERVISOR,
    keywords: ['registration list', 'approve users', 'admin', 'users']
  },
  {
    path: '/fuelcons',
    component: <FuelConsumption />,
    title: 'FFF | Fuel Consumption',
    allowedRoles: ADMIN,
    keywords: ['fuel', 'consumption', 'dashboard', 'usage']
  },
  {
    path: '/trip',
    component: <FuelTripManagement />,
    title: 'FFF | Trip Management',
    allowedRoles: ADMIN,
    keywords: ['trip', 'management', 'fuel truck', 'tracking', 'dashboard']
  },
  {
    path: '/stock',
    component: <StockManagement />,
    title: 'FFF | Stock Management',
    allowedRoles: ADMIN,
    keywords: ['stock', 'inventory', 'fuel', 'management', 'dashboard']
  },
  {
    path: '/operational',
    component: <Operational />,
    title: 'FFF | Operational Dashboard',
    allowedRoles: ADMIN,
    keywords: ['operational', 'dashboard', 'operations']
  },
  {
    path: '/operational/ritation',
    component: <RefuelingAnomaly allowColumnsEdit />,
    title: 'FFF | Refueling Anomaly',
    allowedRoles: ADMIN,
    keywords: ['refueling', 'anomaly', 'ritation', 'operational', 'alert']
  },
  {
    path: '/infrastructure',
    component: <Infrastructure />,
    title: 'FFF | Infrastructure',
    allowedRoles: ADMIN,
    keywords: ['infrastructure', 'dashboard', 'plant', 'equipment']
  },
  {
    path: '/infrastructure/ftbacklog',
    component: <FuelTruckBacklog />,
    title: 'FFF | FT Backlog List',
    allowedRoles: ALL_ROLES,
    keywords: ['infrastructure', 'fuel truck', 'backlog', 'list', 'maintenance']
  },
  {
    path: '/infrastructure/ftbacklog/:unit_id',
    component: <FuelTruckBacklog />,
    title: 'FFF | FT Backlog List',
    allowedRoles: ALL_ROLES,
    keywords: ['infrastructure', 'fuel truck', 'backlog', 'list', 'maintenance']
  },
  {
    path: '/infrastructure/pressureless',
    component: <PressurelessSummary allowColumnsEdit />,
    title: 'FFF | Pressureless',
    allowedRoles: ALL_ROLES,
    keywords: ['infrastructure', 'pressureless', 'summary', 'equipment']
  },
  {
    path: '/infrastructure/inspection',
    component: <InfrastructureInspection />,
    title: 'FFF | Infrastructure Inspection',
    allowedRoles: ALL_ROLES,
    keywords: ['infrastructure', 'inspection', 'reporting', 'audit']
  },
  {
    path: '/infrastructure/inspection/backlog',
    component: <InfrastructureInspection />,
    title: 'FFF | Infrastructure Backlogs',
    allowedRoles: ALL_ROLES,
    keywords: ['infrastructure', 'inspection', 'backlogs', 'pending']
  },
  {
    path: '/infrastructure/inspection/:id',
    component: <InfrastructureInspection />,
    title: 'FFF | Ongoing Infrastructure Inspection',
    allowedRoles: ALL_ROLES,
    keywords: ['infrastructure', 'inspection', 'detail']
  },
  {
    path: '/manpower',
    component: <Manpower />,
    title: 'FFF | Manpower',
    allowedRoles: ADMIN,
    keywords: ['manpower', 'dashboard', 'personnel', 'hr']
  },
  {
    path: '/gardaloto',
    component: <GardaLotoDashboard />,
    allowedRoles: ALL_ROLES,
    keywords: ['gardaloto', 'dashboard', 'loto', 'safety']
  },
  {
    path: '/gardaloto/sessions/:session_id',
    component: <GardaLotoSessionDetails />,
    allowedRoles: ALL_ROLES,
    isPublic: true,
    keywords: ['gardaloto', 'session', 'details', 'loto']
  },
  {
    path: '/profile/:id',
    component: <Profile />,
    allowedRoles: ALL_ROLES,
    isPublic: true,
    keywords: ['profile', 'user', 'account', 'manpower']
  },
  {
    path: '/profile/:id/edit',
    component: <ProfileEdit />,
    title: 'FFF | Edit Profile',
    allowedRoles: ALL_ROLES,
    keywords: ['profile', 'edit', 'account', 'settings']
  },
  {
    path: '/settings/:id',
    component: <Settings />,
    title: 'FFF | Settings',
    allowedRoles: ALL_ROLES,
    keywords: ['settings', 'preferences', 'configuration', 'user']
  },
  {
    path: '/plan/fuelritationplan',
    component: <FuelRitationPlan />,
    title: 'FFF | Fuel Ritation Plan',
    allowedRoles: SUPERVISOR,
    keywords: ['plan', 'fuel ritation', 'schedule', 'planning']
  },
  // Operational Routes
  {
    path: '/operational/fleet',
    component: <FleetManagement />,
    title: 'FFF | Fleet Management',
    allowedRoles: SUPERVISOR,
    keywords: ['operational', 'fleet', 'management', 'vehicles']
  },
  {
    path: '/operational/delay',
    component: <FleetManagement />,
    title: 'FFF | Delay Refueling',
    allowedRoles: SUPERVISOR,
    keywords: ['operational', 'delay', 'refueling', 'fleet']
  },
  {
    path: '/operational/distribution',
    component: <RefuelingDistribution />,
    title: 'FFF | Refueling Distribution',
    allowedRoles: SUPERVISOR,
    keywords: ['operational', 'distribution', 'refueling']
  },
  {
    path: '/operational/hm',
    component: <HourMeterManagement />,
    title: 'FFF | Hour Meters',
    allowedRoles: SUPERVISOR,
    keywords: ['operational', 'hour meter', 'hm', 'equipment']
  },
  {
    path: '/operational/issuing',
    component: <IssuingFuel />,
    title: 'FFF | Issuing Fuel',
    allowedRoles: SUPERVISOR,
    keywords: ['operational', 'issuing', 'fuel']
  },
  // Reporting Routes
  {
    path: '/reporting/dailyreport',
    component: <DailyReport />,
    title: 'FFF | Daily Report',
    allowedRoles: FUEL_ROLES,
    isPublic: true,
    keywords: ['reporting', 'daily report', 'daily']
  },
  {
    path: '/reporting/fuelmanreport',
    component: <FuelmanReport />,
    title: 'FFF | Fuelman Report',
    allowedRoles: FUEL_ROLES,
    isPublic: true,
    keywords: ['reporting', 'fuelman', 'daily report', 'daily']
  },
  {
    path: '/reporting/adminreport',
    component: <AdminReport />,
    title: 'FFF | Admin Report',
    allowedRoles: ADMIN,
    keywords: ['reporting', 'admin', 'report', 'summary']
  },
  {
    path: '/reporting/logsheet',
    component: <Logsheet />,
    title: 'FFF | Logsheet',
    allowedRoles: FUEL_ROLES,
    keywords: ['reporting', 'logsheet', 'logs']
  },
  {
    path: '/reporting/stock',
    component: <StockReporting />,
    title: 'FFF | Stock Reporting',
    allowedRoles: FUEL_ROLES,
    keywords: ['reporting', 'stock', 'inventory']
  },
  {
    path: '/reporting/stocktaking',
    component: <StockTaking />,
    title: 'FFF | Stock Taking',
    allowedRoles: FUEL_ROLES,
    keywords: ['reporting', 'stock taking', 'inventory audit']
  },
  {
    path: '/reporting/ritation',
    component: <RitationReport />,
    title: 'FFF | Ritation Report',
    allowedRoles: FUEL_ROLES,
    isPublic: true,
    keywords: ['reporting', 'ritation', 'fuel trip']
  },
  {
    path: '/reporting/ritation/:id',
    component: <RitationReport />,
    title: 'FFF | Ritation Detail',
    allowedRoles: FUEL_ROLES,
    keywords: ['reporting', 'ritation', 'detail']
  },
  {
    path: '/reporting/tmr',
    component: <TMRReport />,
    title: 'FFF | TMR Report',
    allowedRoles: FUEL_ROLES,
    keywords: ['reporting', 'tmr', 'report']
  },
  {
    path: '/reporting/pressureless',
    component: <PressurelessReport />,
    title: 'FFF | Pressureless Reporting',
    allowedRoles: FUEL_ROLES,
    keywords: ['reporting', 'pressureless', 'infrastructure']
  },
  {
    path: '/reporting/fuelman',
    component: <FuelmanReport />,
    title: 'FFF | Fuelman Report',
    allowedRoles: ALL_ROLES,
    isPublic: true,
    keywords: ['reporting', 'fuelman', 'daily', 'report']
  },
  {
    path: '/reporting/ftbdrfu',
    component: <BreakdownRfuReport />,
    keywords: ['reporting', 'breakdown', 'rfu', 'fuel truck']
  },
  {
    path: '/reporting/ftbacklogreq',
    component: <FuelTruckBacklogRequest />,
    title: 'FFF | FT Backlog Request',
    allowedRoles: FUEL_ROLES,
    keywords: ['reporting', 'backlog', 'request', 'fuel truck']
  },
  {
    path: '/reporting/gardaloto',
    component: <GardaLotoReport />,
    title: 'FFF | Garda Loto Report',
    allowedRoles: ALL_ROLES,
    keywords: ['reporting', 'gardaloto', 'loto', 'safety']
  },
  // Partner Reporting Routes
  {
    path: '/partner/fuel',
    component: <FuelPartnerDashboard />,
    title: 'FFF | Fuel Partner Dashboard',
    allowedRoles: FUEL_PARTNER,
    keywords: ['partner', 'dashboard', 'fuel']
  },
  {
    path: '/partner/fuel/ritation',
    component: <FuelPartnerRitation />,
    title: 'FFF | Fuel Partner Ritation',
    allowedRoles: FUEL_PARTNER,
    keywords: ['partner', 'ritation', 'fuel']
  },
  {
    path: '/partner/fuel/stock',
    component: <FuelPartnerStock />,
    title: 'FFF | Fuel Partner stock',
    allowedRoles: FUEL_PARTNER,
    keywords: ['partner', 'stock', 'fuel']
  },
  {
    path: '/partner/fuel/additive',
    component: <AdditiveMonitoring />,
    allowedRoles: ALL_ROLES,
    keywords: ['partner', 'additive', 'monitoring', 'fuel']
  },
  // Oil Reporting Routes
  {
    path: '/oil/storagemgmt',
    component: <StorageManagement />,
    title: 'FFF | Oil Storage Management',
    allowedRoles: SUPERVISOR,
    keywords: ['oil', 'storage', 'management']
  },
  {
    path: '/oil/dst',
    component: <DailyStockTakingOil />,
    title: 'FFF | Daily Stock Taking Oil',
    allowedRoles: OIL_ROLES,
    keywords: ['oil', 'dst', 'daily stock taking']
  },
  {
    path: '/oil/dst/:alias',
    component: <DailyStockTakingOil />,
    allowedRoles: ALL_ROLES,
    keywords: ['oil', 'dst', 'daily stock taking']
  },
  {
    path: '/oil/dstreport',
    component: <DstOilReport />,
    title: 'FFF | Daily Stock Taking Oil Report',
    allowedRoles: OIL_ROLES,
    keywords: ['oil', 'dst', 'report', 'daily stock taking']
  },
  {
    path: '/oil/grease',
    component: <GreaseMonitoring />,
    title: 'FFF | Grease Monitoring',
    allowedRoles: OIL_ROLES,
    keywords: ['oil', 'grease', 'monitoring']
  },
  {
    path: '/oil/housekeeping',
    component: <HousekeepingOil />,
    title: 'FFF | Housekeeping Oil',
    allowedRoles: OIL_ROLES,
    keywords: ['oil', 'housekeeping', 'cleanliness']
  },
  // Plant Reporting Routes
  {
    path: '/plant/filterchange',
    component: <FilterChange />,
    title: 'FFF | Filter Change',
    allowedRoles: PLANT,
    keywords: ['plant', 'filter', 'change', 'maintenance']
  },
  {
    path: '/plant/filterchangedb',
    component: <FilterChangeDb />,
    title: 'FFF | Filter Change Dashboard',
    allowedRoles: PLANT,
    keywords: ['plant', 'filter', 'change', 'dashboard']
  },
  {
    path: '/plant/bacleanliness',
    component: <BaCleanliness />,
    title: 'FFF | Berita Acara Cleanliness',
    allowedRoles: PLANT,
    keywords: ['plant', 'ba', 'cleanliness', 'berita acara']
  },
  // Export Routes
  {
    path: '/export/bastfuel',
    component: <BastFuel />,
    title: 'FFF | Export BAST Fuel',
    allowedRoles: SUPERVISOR,
    keywords: ['export', 'bast', 'fuel', 'berita acara']
  },
  {
    path: '/export/bastoli',
    component: <BastOli />,
    title: 'FFF | Export BAST Oli',
    allowedRoles: SUPERVISOR,
    keywords: ['export', 'bast', 'oli', 'oil', 'berita acara']
  },
  {
    path: '/export/reconcilefuelowner',
    component: <BaReconcile />,
    title: 'FFF | Export BA Reconcile Owner',
    allowedRoles: SUPERVISOR,
    keywords: ['export', 'reconcile', 'ba', 'fuel owner', 'berita acara']
  },
  // Master Data Routes
  {
    path: '/master/library',
    component: <ComponentLibrary />,
    title: 'FFF | Component Library',
    allowedRoles: SUPERVISOR,
    keywords: ['master', 'library', 'component', 'data']
  },
  {
    path: '/master/manpower',
    component: <MasterManpower />,
    title: 'FFF | Master Manpower',
    allowedRoles: SUPERVISOR,
    keywords: ['master', 'manpower', 'personnel', 'hr', 'employees']
  },
  {
    path: '/master/competency',
    component: <MasterCompetency />,
    title: 'FFF | Master Competency',
    allowedRoles: SUPERVISOR,
    keywords: ['master', 'competency', 'skills', 'certification']
  },
  {
    path: '/master/storage/fuel',
    component: <MasterStorageFuel />,
    title: 'FFF | Master Storage Fuel',
    allowedRoles: SUPERVISOR,
    keywords: ['master', 'storage', 'fuel', 'tanks']
  },
  {
    path: '/master/materials',
    component: <Materials />,
    title: 'FFF | Materials',
    allowedRoles: SUPERVISOR,
    keywords: ['master', 'materials', 'items', 'inventory']
  },
  {
    path: '/master/materials/add',
    component: <Materials />,
    title: 'FFF | Add Material',
    allowedRoles: SUPERVISOR,
    keywords: ['master', 'add material', 'items']
  },
  {
    path: '/master/manpower/add',
    component: <ManpowerRegistration />,
    title: 'FFF | Master Manpower',
    allowedRoles: SUPERVISOR,
    keywords: ['master', 'add manpower', 'registration']
  },
  {
    path: '/master/schedule/refueling',
    component: <RefuelingSchedule />,
    title: 'FFF | Refueling Schedule',
    allowedRoles: SUPERVISOR,
    keywords: ['master', 'schedule', 'refueling']
  },
  {
    path: '/master/mrp',
    component: <MaterialRequirementPlanning />,
    title: 'FFF | MRP Database',
    allowedRoles: SUPERVISOR,
    keywords: ['master', 'mrp', 'material requirement', 'planning']
  },
  // UI ROUTES
  {
    path: '/chart',
    component: <Chart />,
    title: 'FFF | Fuel Feasibility for Fleet',
    allowedRoles: SUPERVISOR,
    keywords: ['chart', 'ui', 'components', 'visuals']
  },
  {
    path: '/calendar',
    component: <Calendar />,
    title: 'FFF | Fuel Feasibility for Fleet',
    allowedRoles: SUPERVISOR,
    keywords: ['calendar', 'ui', 'events', 'schedule']
  },
  {
    path: '/forms/form-elements',
    component: <FormElements />,
    title: 'FFF | Fuel Feasibility for Fleet',
    allowedRoles: SUPERVISOR,
    keywords: ['forms', 'elements', 'inputs', 'ui']
  },
  {
    path: '/forms/form-layout',
    component: <FormElements />,
    title: 'FFF | Fuel Feasibility for Fleet',
    allowedRoles: SUPERVISOR,
    keywords: ['forms', 'layout', 'ui']
  },
  {
    path: '/tables',
    component: <Tables />,
    title: 'FFF | Fuel Feasibility for Fleet',
    allowedRoles: SUPERVISOR,
    keywords: ['tables', 'grids', 'data', 'ui']
  },
  {
    path: '/ui/alerts',
    component: <Alerts />,
    title: 'FFF | Fuel Feasibility for Fleet',
    allowedRoles: SUPERVISOR,
    keywords: ['alerts', 'ui', 'notifications', 'warnings']
  },
  {
    path: '/ui/buttons',
    component: <Buttons />,
    title: 'FFF | Fuel Feasibility for Fleet',
    allowedRoles: SUPERVISOR,
    keywords: ['buttons', 'ui', 'interactive']
  },
  {
    path: '/plant-dashboard',
    component: <PlantDashboard />,
    title: 'FFF | PLANT Dashboard',
    allowedRoles: ALL_ROLES,
    keywords: ['plant', 'dashboard', 'overview']
  },
];

export default routes;
