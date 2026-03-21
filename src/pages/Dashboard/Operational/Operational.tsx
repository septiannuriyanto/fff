
import ThemedPanelContainer from '../../../common/ThemedComponents/ThemedPanelContainer';
import RefuelingOutsideRest from '../../Operational/FleetManagement/RefuelingOutsideRest';
import IssuingFuel from '../../Operational/IssuingFuel/IssuingFuel';
const Operational = () => {
  return (
    <ThemedPanelContainer title='Operational Dashboard'>
      <div className='flex flex-col gap-2'>
        <RefuelingOutsideRest />
        <IssuingFuel />
      </div>
    </ThemedPanelContainer>
  );
};

export default Operational;
