import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../../db/SupabaseClient';
import { useAuth } from '../../Authentication/AuthContext';
import ThemedPanelContainer from '../../../common/ThemedComponents/ThemedPanelContainer';
import toast from 'react-hot-toast';

import BacklogList from './components/BacklogList';
import LocationManager from './components/LocationManager';
import ScheduleManager from './components/ScheduleManager';
import InspectionDashboard from './components/InspectionDashboard';
import ScheduleSelection from './components/ScheduleSelection';
import InspectionBrief from './components/InspectionBrief';
import InspectionForm from './components/InspectionForm';
import ItemManager from './components/ItemManager';
import CategoryManager from './components/CategoryManager';
import PopulationManager from './components/PopulationManager';
import Breadcrumb, { BreadcrumbItem } from '../../../components/Breadcrumbs/Breadcrumb';

export type ViewMode = 'dashboard' | 'schedule_selection' | 'brief' | 'inspection';
export type Tab = 'inspections' | 'backlogs';

interface ActiveSchedule {
  id: string;
  period: number;
  start_date: string;
  end_date: string;
  status: string;
  infra_locations: { name: string; area: string | null };
}

interface ActiveInspection {
  id: string;
  schedule_id: string;
  infra_schedules: ActiveSchedule;
}

const InfrastructureInspection: React.FC = () => {
  const { currentUser } = useAuth();
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<Tab>(
    location.pathname.includes('/backlog') ? 'backlogs' : 'inspections'
  );
  const [viewMode, setViewMode] = useState<ViewMode>(
    id ? 'inspection' : 'dashboard'
  );

  const [selectedSchedule, setSelectedSchedule] = useState<ActiveSchedule | null>(null);
  const [currentInspectionId, setCurrentInspectionId] = useState<string | null>(id || null);
  const [activeInspection, setActiveInspection] = useState<ActiveInspection | null>(null);

  // Modals
  const [showLocationManager, setShowLocationManager] = useState(false);
  const [showScheduleManager, setShowScheduleManager] = useState(false);
  const [showItemManager, setShowItemManager] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showPopulationManager, setShowPopulationManager] = useState(false);

  // Synchronize internal state with URL changes (back button support)
  useEffect(() => {
    if (location.pathname.includes('/backlog')) {
      setActiveTab('backlogs');
      setViewMode('dashboard');
    } else if (id) {
      setCurrentInspectionId(id);
      setViewMode('inspection');
      setActiveTab('inspections');
    } else {
      setViewMode('dashboard');
      setActiveTab('inspections');
      setCurrentInspectionId(null);
    }
  }, [id, location.pathname]);

  // Define dynamic breadcrumbs
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);

  useEffect(() => {
    const baseBreadcrumb: BreadcrumbItem[] = [
      { label: 'Infrastructure', path: '/infrastructure' },
      { label: 'Inspection', path: '/infrastructure/inspection' }
    ];

    if (location.pathname.includes('/backlog')) {
      setBreadcrumbs([...baseBreadcrumb, { label: 'Backlogs' }]);
    } else if (id) {
      setBreadcrumbs([...baseBreadcrumb, { label: `Ongoing: ${id.substring(0, 8)}...` }]);
    } else {
      setBreadcrumbs(baseBreadcrumb);
    }
  }, [id, location.pathname]);

  // Check for ongoing inspection
  useEffect(() => {
    if (!currentUser) return;

    const checkOngoing = async () => {
      const { data } = await supabase
        .from('infra_inspections')
        .select(`
          id, 
          schedule_id, 
          infra_schedules (
            id, period, start_date, end_date, status,
            infra_locations (name, area)
          )
        `)
        .eq('inspector_id', currentUser.nrp)
        .eq('status', 'draft')
        .maybeSingle();

      if (data && data.infra_schedules) {
        // @ts-ignore - Supabase types join mapping quirks
        setActiveInspection(data);
      } else {
        setActiveInspection(null);
      }
    };
    checkOngoing();
  }, [currentUser, viewMode]); // Re-check when view mode changes (e.g. after submitting)

  const handleNewInspection = () => setViewMode('schedule_selection');

  const handleResumeInspection = () => {
    if (activeInspection) {
      navigate(`/infrastructure/inspection/${activeInspection.id}`);
    }
  };

  const handleScheduleSelect = (schedule: ActiveSchedule) => {
    setSelectedSchedule(schedule);
    setViewMode('brief');
  };

  /** Called when user confirms the brief — creates the inspection row in Supabase */
  const handleBriefConfirm = async () => {
    if (!selectedSchedule || !currentUser) return;

    // Resolve location_id from the schedule
    const { data: sched } = await supabase
      .from('infra_schedules')
      .select('location_id')
      .eq('id', selectedSchedule.id)
      .single();

    if (!sched?.location_id) { toast.error('Schedule has no associated location'); return; }

    // Reuse existing draft if any (double check)
    const { data: existing } = await supabase
      .from('infra_inspections')
      .select('id')
      .eq('schedule_id', selectedSchedule.id)
      .eq('inspector_id', currentUser.nrp)
      .eq('status', 'draft')
      .maybeSingle();

    if (existing?.id) {
      setCurrentInspectionId(existing.id);
    } else {
      const { data: created, error } = await supabase
        .from('infra_inspections')
        .insert({
          schedule_id: selectedSchedule.id,
          location_id: sched.location_id,
          inspector_id: currentUser.nrp,
          inspection_date: new Date().toISOString().split('T')[0],
          status: 'draft',
        })
        .select('id')
        .single();

      if (error || !created) { toast.error('Failed to start inspection'); return; }
      setCurrentInspectionId(created.id);
    }

    setViewMode('inspection');
  };

  const handleBack = () => {
    if (viewMode === 'inspection') {
       navigate('/infrastructure/inspection');
    } else if (viewMode === 'schedule_selection') {
       setViewMode('dashboard');
    } else if (viewMode === 'brief') {
       setViewMode('schedule_selection'); 
    }
  };

  const handleInspectionComplete = () => {
    setCurrentInspectionId(null);
    setSelectedSchedule(null);
    setActiveInspection(null);
    navigate('/infrastructure/inspection');
    toast.success('Inspection submitted!');
  };

  const tabs = [
    { id: 'inspections', label: 'Inspections' },
    { id: 'backlogs', label: 'Backlogs & Issues' },
  ];

  return (
    <ThemedPanelContainer 
      title="Infrastructure Inspection" 
      className="min-h-screen" 
      breadcrumb={<Breadcrumb items={breadcrumbs} />}
    >
      <div className="p-4">
        {/* Tabs */}
        {!id && (
          <div className="flex gap-2 mb-6 border-b border-white/10 pb-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === 'backlogs') navigate('/infrastructure/inspection/backlog');
                  else navigate('/infrastructure/inspection');
                }}
                className={`px-6 py-2 rounded-t-lg font-bold transition-all ${
                  activeTab === tab.id
                    ? 'text-blue-500 border-b-2 border-blue-500 bg-blue-500/5'
                    : 'opacity-60 hover:opacity-100 hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'inspections' && (
          <div className="animate-fade-in">
            {viewMode === 'dashboard' && (
              <InspectionDashboard
                user={currentUser ?? { position: 0, nrp: '' }}
                hasOngoing={!!activeInspection}
                onNewInspection={handleNewInspection}
                onOngoingInspection={handleResumeInspection}
                onBacklog={() => navigate('/infrastructure/inspection/backlog')}
                onCreateSchedule={() => setShowScheduleManager(true)}
                onCreateLocation={() => setShowLocationManager(true)}
                onCreatePopulation={() => setShowPopulationManager(true)}
                onCreateItems={() => setShowItemManager(true)}
                onCreateCategory={() => setShowCategoryManager(true)}
              />
            )}

            {viewMode === 'schedule_selection' && (
              <ScheduleSelection onSelect={handleScheduleSelect} onBack={handleBack} />
            )}

            {viewMode === 'brief' && selectedSchedule && (
              <InspectionBrief
                schedule={selectedSchedule}
                user={currentUser ?? { position: 0, nrp: '' }}
                onConfirm={handleBriefConfirm}
                onBack={handleBack}
              />
            )}

            {viewMode === 'inspection' && currentInspectionId && (
              <InspectionForm
                inspectionId={currentInspectionId}
                locationName={selectedSchedule?.infra_locations?.name ?? ''}
                period={selectedSchedule?.period ?? (activeInspection?.infra_schedules?.period ?? 0)}
                onComplete={handleInspectionComplete}
              />
            )}
          </div>
        )}

        {activeTab === 'backlogs' && <BacklogList />}

        {showLocationManager && <LocationManager onClose={() => setShowLocationManager(false)} />}
        {showScheduleManager && <ScheduleManager onClose={() => setShowScheduleManager(false)} />}
        {showItemManager && <ItemManager onClose={() => setShowItemManager(false)} />}
        {showCategoryManager && <CategoryManager onClose={() => setShowCategoryManager(false)} />}
        {showPopulationManager && <PopulationManager onClose={() => setShowPopulationManager(false)} />}
      </div>
    </ThemedPanelContainer>
  );
};

export default InfrastructureInspection;