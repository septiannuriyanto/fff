
import RefuelingAnomaly from './RefuelingAnomaly';
import React, { useState, useEffect } from 'react'
import { supabase } from '../../../db/SupabaseClient'
import { Session } from '@supabase/supabase-js'; // Import Session type
import Ritation from './Ritation/page/RitationDashboard';
import ThemedPanelContainer from '../../../common/ThemedComponents/ThemedPanelContainer';
import RefuelingOutsideRest from '../../Operational/FleetManagement/RefuelingOutsideRest';
const Operational = () => {
  return (
    <ThemedPanelContainer title='Operational Dashboard'>
      <>
        <RefuelingOutsideRest></RefuelingOutsideRest>
      </>
    </ThemedPanelContainer>
  );
};

export default Operational;
