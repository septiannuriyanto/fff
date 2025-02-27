import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import BacklogTable from './components/BacklogTable';
import { FTBacklog } from './components/ftbacklog';
import { supabase } from '../../../../db/SupabaseClient';
import { getNameFromNrp } from '../../../../functions/get_nrp';
import SelectGroupOne from '../../../../components/Forms/SelectGroup/SelectGroupOne';
import { ComboBoxItem } from '../../../../types/ComboboxItem';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAdd } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import { useParams } from "react-router-dom";
import ReusableSwitcher from '../../../../components/Switchers/SwitcherFour';

const FuelTruckBacklog = () => {
  const [backlogs, setBacklog] = useState<FTBacklog[]>([]);
  const [populations, setPopulations] = useState<ComboBoxItem[]>([]);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [ outs, setOuts ] = useState<boolean>(false)
  const navigate = useNavigate();


  const { unit_id } = useParams(); // Extract unit_id from the URL

  useEffect(() => {
    fetchBacklogs();
    fetchFT();
  }, [selectedOption]);

  const fetchBacklogs = async () => {
    try {
      let query = supabase
        .from('unit_maintenance')
        .select(
          'req_id, created_at, unit_id, report_by, problem, description, area, isclosed, image_url, closed_by, closed_date'
        )
        .order('req_id', { ascending: false }); // Order by req_id descending
  
      if (unit_id && !selectedOption) {
        handleChangeFilter(unit_id);
        query = query.eq('unit_id', unit_id);
      }
  
      const { data, error } = await query;
  
      if (error) throw new Error(error.message);
      if (!data) return;
  
      console.log("Raw Data:", data);
  
      // Resolve `getNameFromNrp` calls in parallel
      const updatedData = await Promise.all(
        data.map(async (record) => {
          const updatedReportBy = await getNameFromNrp(record.report_by);
          return { ...record, report_by: updatedReportBy };
        })
      );
  
      console.log("Updated Data:", updatedData);
      setBacklog(updatedData); // Update state with modified data
  
    } catch (err) {
      console.error("Error fetching backlogs:", err);
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

  const handleChangeFilter = (val: string) => {
    setSelectedOption(val);
  };

  return (
    <>
      <Toaster />
      <div className=" rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark mb-6">
        <div className="flex flex-wrap items-center">
          <div className="w-full border-stroke dark:border-strokedark xl:border-l-2">
            <div className="w-full p-4 sm:p-12.5 xl:p-5">
              <div className="form__header flex flex-row justify-between">
                <h2 className="mb-2 font-bold text-black dark:text-white sm:text-title-sm w-full">
                  Fuel Truck Backlogs
                </h2>
                <button onClick={()=> navigate('/reporting/ftbacklogreq') } className=" w-12 h-12 lg:flex items-center justify-center gap-2.5 rounded-md border-slate-800 border-solid border text-slate-800 py-2 px-4 text-center hover:bg-opacity-90 lg:px-4 xl:px-4">
                  
                    <FontAwesomeIcon icon={faAdd}></FontAwesomeIcon>
                </button>
              </div>

              <div className="backlog__filters mt-10">
                <SelectGroupOne
                  items={populations}
                  caption="Filter by Storage"
                  placeholder="Storage Number"
                  onChange={handleChangeFilter}
                ></SelectGroupOne>
              </div>

              <div className="outs__switcher pl-2 flex flex-row items-center gap-2 w-1/2 justify-center md:justify-start flex-wrap">
                    <ReusableSwitcher
                      textTrue="All"
                      textFalse="Outs"
                      onChange={() => {
                        setOuts(!outs);
                        console.log(outs);
                      }}
                    />
                  </div>
              <div className="main-content  w-full">
                <BacklogTable backlogs={backlogs} filter={selectedOption} outs_only={outs} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FuelTruckBacklog;
