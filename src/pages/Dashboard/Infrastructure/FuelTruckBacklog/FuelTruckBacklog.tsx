import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import BacklogTable from './components/BacklogTable';
import { FTBacklog } from './components/ftbacklog';
import { supabase } from '../../../../db/SupabaseClient';
import { getNameFromNrp } from '../../../../functions/get_nrp';
import SelectGroupOne from '../../../../components/Forms/SelectGroup/SelectGroupOne';
import { ComboBoxItem } from '../../../../types/ComboboxItem';

const FuelTruckBacklog = () => {
  const [backlogs, setBacklog] = useState<FTBacklog[]>([]);
  const [populations, setPopulations] = useState<ComboBoxItem[]>([])
  const [selectedOption, setSelectedOption] = useState<string>('');
  

  useEffect(() => {
    fetchBacklogs();
    fetchFT();
    
  }, []);

  const fetchBacklogs = async () => {
    const { data, error } = await supabase
      .from('unit_maintenance')
      .select(
        'req_id, created_at, unit_id, report_by, problem, description, area, isclosed, image_url, closed_by, closed_date'
      )
      .order('req_id', { ascending: false }); // Order by req_id descending
  
    if (error) {
      console.error(error.message);
      toast.error(error.message);
      return;
    }
  
    if (data) {
      try {
        // Use `Promise.all` to resolve all `getNameFromNrp` calls in parallel
        const updatedData = await Promise.all(
          data.map(async (record) => {
            // Call `getNameFromNrp` with `report_by`
            const updatedReportBy = await getNameFromNrp(record.report_by);
            return { ...record, report_by: updatedReportBy };
          })
        );
  
        console.log(updatedData);
        setBacklog(updatedData); // Update state with modified data
      } catch (updateError) {
        console.error('Error updating report_by:', updateError);
        toast.error('Failed to update report_by values.');
      }
    }
  };


  const fetchFT = async () => {
    try {
      const { data, error } = await supabase
        .from('storage')
        .select('unit_id')
        .order('unit_id', { ascending: true });
  
      if (error) {
        toast.error('Error loading population');
        return [];
      }
  
      // Map the fetched data to the ComboBoxItem format
      const populations: ComboBoxItem[] = data.map((item) => ({
        value: item.unit_id.toString(), // Assuming unit_id is a number, convert it to a string
        label: item.unit_id.toString(), // You can change this to something more descriptive if needed
      }));
  
      // Add "All" at the beginning of the array
      const allOption: ComboBoxItem = { value: 'all', label: 'All' };
      const updatedPopulations = [allOption, ...populations];
  
      // You can set the populations if you want to store them in state
      setPopulations(updatedPopulations);
  
      return updatedPopulations; // Return the mapped data with "All" added
    } catch (error) {
      toast.error('Error fetching data');
      return [];
    }
  };
  

  const handleChangeFilter = (val:string)=>{
    setSelectedOption(val);
  
  }
  
  

  return (
    <>
      <Toaster />
      <div className=" rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark mb-6">
        <div className="flex flex-wrap items-center">
          <div className="w-full border-stroke dark:border-strokedark xl:border-l-2">
            <div className="w-full p-4 sm:p-12.5 xl:p-5">
              <h2 className="mb-2 font-bold text-black dark:text-white sm:text-title-sm w-full">
                Fuel Truck Backlog Request
              </h2>
              <div className="backlog__filters mt-10">
                <SelectGroupOne items={populations} caption='Filter by Storage' placeholder='Storage Number' onChange={handleChangeFilter} ></SelectGroupOne>
              </div>
              <div className="main-content  w-full">
                <BacklogTable backlogs={backlogs} filter={selectedOption}/>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FuelTruckBacklog;
