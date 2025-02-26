
import { useEffect, useState, useRef } from 'react';
import {
  TimelineViews,
  TimelineMonth,
  Agenda,
  ScheduleComponent,
  ViewsDirective,
  ViewDirective,
  ResourcesDirective,
  ResourceDirective,
  Inject,
  Resize,
  DragAndDrop,
  EventRenderedArgs,
  ActionEventArgs,
} from '@syncfusion/ej2-react-schedule';

import { supabase } from '../../../../db/SupabaseClient';
import './RosterGannt.css';
// import './bootstrap.min.css'
import './bootstrap5.css';
import { registerLicense } from '@syncfusion/ej2-base';
import rosterDataJson from './rosterdata.json';
import { DataService, getColor } from './RosterDataFetcher';
import { Button } from 'rsuite';
import { LoaderLogo } from '../../../../common/Loader/LoaderLogo';

interface Incumbent {
  id: number;
  name: string;
  // Add other fields from your 'incumbent' table
}

interface Menpower {
  id: number;
  nrp: string;
  text: string;
  groupId: number;
  // Add other fields from your 'incumbent' table
}

interface EventSummary {
  [date: string]: {
    [subject: string]: number;
  };
}

interface RosterData {
  rosterData: EventData[];
}

const processEventData = (events: EventData[]): EventSummary => {
  const summary: EventSummary = {};

  events.forEach((event) => {
    const eventDate = new Date(event.StartTime).toDateString();
    const eventSubject = event.Subject;

    if (!summary[eventDate]) {
      summary[eventDate] = {};
    }

    if (!summary[eventDate][eventSubject]) {
      summary[eventDate][eventSubject] = 0;
    }

    summary[eventDate][eventSubject] += 1;
  });

  return summary;
};

const rosterData = rosterDataJson as { rosterData: EventData[] };
const data: EventData[] = rosterData.rosterData;

const eventSummary = processEventData(data);

const RosterGannt = () => {
  registerLicense(import.meta.env.VITE_SYNCFUSION_LICENSE_KEY);
  const [incumbents, setIncumbents] = useState<Incumbent[]>([]);
  const [menpower, setMenpower] = useState<Menpower[]>([]);
  const [data, setData] = useState<Record<string, any>[]>([]);
  const [eventCounts, setEventCounts] = useState<Record<string, number>>({});

  const [summary, setSummary] = useState<EventSummary>(eventSummary);

  const [ isLoading, setIsloading ] = useState<boolean>(true)
  const schedulerRef = useRef(null);
  const scheduleRef = useRef<ScheduleComponent>(null);
  const workDays: number[] = [0, 1, 2, 3, 4, 5];
  // Type assertion for the imported JSON data
  // const rosterData = rosterDataJson as RosterData;
  // const rosterdataArray: EventData[] = rosterData.rosterData; // Extract the array

  useEffect(() => {
    const loadData = async () => {
      try {
        const fetchedData = await DataService.getAllData();
        console.log('All Data  Loaded');
        
        console.log(fetchedData);
        setData(fetchedData);
        
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsloading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    const fetchIncumbents = async () => {
      const { data, error } = await supabase.from('incumbent').select('*');

      if (error) {
        console.error('Error fetching incumbents:', error);
      } else {
        // console.log(data);

        setIncumbents(data || []);
      }
    };
    const fetchNames = async () => {
      const { data, error } = await supabase
        .from('manpower')
        .select('nrp, nama, position')
        .order('off_day')
        .order('nama', { ascending: true });

      if (error) {
        console.error('Error fetching names:', error);
      } else {
        // console.log(data);
        let idCounter = 1;
        let lastPosition: number | null = null; // To keep track of the previous position
        let menpowerData: Menpower[] = [];

        data.forEach((item: any) => {
          let position: number = 0;
          position = item.position;
          if (position == lastPosition) {
            // If the current position is the same as the last one, increment the idCounter
            idCounter++;
          } else {
            // If the position has changed, reset the idCounter to 1
            idCounter = 1;
          }

          // Update lastPosition to the current position

          lastPosition = position;
          // Push the formatted data into menpowerData
          menpowerData.push({
            text: toProperCase(item.nama),
            id: idCounter,
            nrp: item.nrp,
            groupId: item.position,
          });
        });
        // console.log(menpowerData);

        // Update state with menpowerData
        setMenpower(menpowerData);
      }
    };
    fetchIncumbents();
    fetchNames();
  }, []);

  useEffect(() => {
    if (scheduleRef.current) {
      const scheduler = scheduleRef.current;
      const updateCounts = () => {
        const events = scheduler.getCurrentViewEvents();
        const counts: Record<string, number> = {};
        events.forEach((event) => {
          const dateKey = event.StartTime.toDateString();
          counts[dateKey] = (counts[dateKey] || 0) + 1;
        });
        setEventCounts(counts);
      };

      scheduler.eventRendered = updateCounts;
      scheduler.dataBound = updateCounts;

      updateCounts(); // Initial count update
    }
  }, []);

  function toProperCase(str: string) {
    return str.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
  }

  const onEventRendered = (args: EventRenderedArgs) => {
    const eventData = args.data as EventData;
    if (eventData.Color) {
      args.element.style.backgroundColor = eventData.Color;
    }
    // Apply z-index based on custom priority logic
    if (eventData.Priority === 'high') {
      args.element.style.zIndex = '3'; // Higher z-index for high priority
    } else if (eventData.Priority === 'medium') {
      args.element.style.zIndex = '2'; // Medium z-index for medium priority
    } else if (eventData.Priority === 'low') {
      args.element.style.zIndex = '1'; // Lower z-index for low priority
    }
  };

  // Handle the event added
  const onActionBegin = async (args: ActionEventArgs) => {
    if (args.requestType === 'eventCreate') {
      const prevData = data;
      // Set the color based on the subject
      const subject = args.data[0].Subject;
      const color = getColor(subject.toUpperCase());
      args.data[0].Color = color; // Add color property to event data
      args.data[0].Subject = subject.toUpperCase();
      const result = await DataService.insertData(args.data[0]);
      if(result){
      
      }
     
      // Additional logic for adding events
    } else if (args.requestType === 'eventChange') {
      const subject = args.data.Subject;
      const color = getColor(subject.toUpperCase());
      args.data.Color = color; // Add color property to event data
      args.data.Subject = subject.toUpperCase();
      const result = await DataService.editData(args.data);
      if(result){
      
      }
      // Additional logic for editing events
    } else if (args.requestType === 'eventRemove') {
      const result = await DataService.removeData(args.data[0]);
      if (result === true) {
        // Remove the event from the state
        
        // setData((prevData) =>
        //   prevData.filter((event) => event.id !== args.data[0].id),
        // );
      }
    }
  };

  const onActionComplete = (args: ActionEventArgs) => {
    if (
      args.requestType === 'eventCreate' ||
      args.requestType === 'eventChange' ||
      args.requestType === 'eventRemove'
    ) {
      // scheduleRef.current.refresh();
    }
  };

  const DateHeaderTemplate = (props) => {
    const date = new Date(props.date);
    const dayName = date.toLocaleDateString('id-ID', { weekday: 'short' }); // Get day name (e.g., "Monday");
    const isMinggu = dayName.toLowerCase().includes('min'); 

    return (
    <div
      className={`custom-date-header ${isMinggu ? 'red-header' : ''}`} // Conditionally apply class
    >
      {dayName}
      <br/>
      {date.getDate()}
    </div>)
  };

  const handleSynchronizeData = async () => {
    setIsloading(true); // Show loading state

    try {
        // Retrieve existing data from localStorage
        const localStorageData = JSON.parse(localStorage.getItem('shiftlyrecords') || '[]');

        if (localStorageData.length === 0) {
            console.log('No data to synchronize.');
            setIsloading(false); // Hide loading state
            return;
        }

        // Prepare the data to be synchronized with Supabase
        const recordsToSync = localStorageData.map((record: any) => ({
            Id: record.Id,
            Nrp: record.Nrp,
            StartTime: record.StartTime,
            EndTime: record.EndTime,
            date_start: record.date_start,
            date_end: record.date_end,
            recurrence_rule: record.recurrence_rule,
            Subject: record.Subject.toUpperCase(),
        }));

        // Insert or update the records in Supabase
        for (const record of recordsToSync) {
            // Check if record exists in Supabase
            const { data, error } = await supabase
                .from('shiftly_plan')
                .select('id')
                .eq('id', record.Id);

            if (error) {
                console.log('Error checking Supabase:', error.message);
                continue;
            }

            if (data && data.length > 0) {
                // If record exists, update it
                const { error: updateError } = await supabase
                    .from('shiftly_plan')
                    .update({
                        nrp: record.Nrp,
                        date_start: record.date_start,
                        date_end: record.date_end,
                        recurrence_rule: record.recurrence_rule,
                        subject: record.Subject,
                    })
                    .eq('id', record.Id);

                if (updateError) {
                    console.log(`Error updating record ${record.Id}:`, updateError.message);
                } else {
                    console.log(`Record ${record.Id} updated successfully.`);
                }
            } else {
                // If record doesn't exist, insert it
                const { error: insertError } = await supabase
                    .from('shiftly_plan')
                    .insert({
                        id: record.Id,
                        nrp: record.Nrp,
                        date_start: record.date_start,
                        date_end: record.date_end,
                        recurrence_rule: record.recurrence_rule,
                        subject: record.Subject,
                    });

                if (insertError) {
                    console.log(`Error inserting record ${record.Id}:`, insertError.message);
                } else {
                    console.log(`Record ${record.Id} inserted successfully.`);
                }
            }
        }

        // Once synchronization is complete, clear the localStorage
        localStorage.removeItem('shiftlyrecords');

        setIsloading(false); // Hide loading state
        console.log('Data synchronization complete and localStorage cleared.');
    } catch (err) {
        console.error('Error synchronizing data:', err);
        setIsloading(false); // Hide loading state in case of error
    }
};

  

  return (
    <div className="schedule-control-section">
      <div className="col-lg-12 control-section">
        { isLoading? <LoaderLogo/> : <div className="control-wrapper">
          <ScheduleComponent
          timezone='Asia/Singapore'
            dateHeaderTemplate={DateHeaderTemplate}
            ref={schedulerRef}
            actionComplete={onActionComplete}
            cssClass='schedule-cell-dimension'
            width="100%"
            height="650px"
            selectedDate={new Date()}
            currentView="TimelineMonth"
            workDays={workDays}
            eventRendered={onEventRendered}
            eventSettings={{ dataSource: data }}
            group={{ resources: ['Projects', 'Categories'] }}
            actionBegin={onActionBegin}
          >
            <ResourcesDirective>
              <ResourceDirective
                field="PositionId"
                title="Choose Project"
                name="Projects"
                allowMultiple={false}
                dataSource={incumbents}
                textField="incumbent"
                idField="id"
                colorField="color"
              />
              {/* <ResourceDirective field='TaskId' title='Category' name='Categories' allowMultiple={true} dataSource={categoryData} textField='text' idField='id' groupIDField='groupId' colorField='color' /> */}
              <ResourceDirective
                field="Nrp"
                title="Category"
                name="Categories"
                allowMultiple={true}
                dataSource={menpower}
                textField="text"
                idField="nrp"
                groupIDField="groupId"
                colorField="color"
              />
            </ResourcesDirective>
            <ViewsDirective>
              {/* <ViewDirective option='TimelineDay' /> */}
              {/* <ViewDirective option='TimelineWeek' /> */}
              {/* <ViewDirective option='TimelineWorkWeek' /> */}
              <ViewDirective option="TimelineMonth" />
              {/* <ViewDirective option='Agenda' /> */}
            </ViewsDirective>
            <Inject
              services={[
                TimelineViews,
                TimelineMonth,
                Agenda,
                Resize,
                DragAndDrop,
              ]}
            />
          </ScheduleComponent>
            <Button className='mt-4 bg-blue-700 text-white hover:bg-blue-200 hover:text-blue-600' onClick={handleSynchronizeData}>Synchronize</Button>
        </div> }
      </div>
    </div>
  );
};
export default RosterGannt;
