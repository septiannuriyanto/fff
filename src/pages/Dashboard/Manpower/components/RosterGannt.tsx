import * as ReactDOM from 'react-dom';
import * as React from 'react';
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
  CellTemplateArgs,
  ActionEventArgs 
} from '@syncfusion/ej2-react-schedule';
import { extend } from '@syncfusion/ej2-base';
import * as dataSource from './datasource.json';
import { supabase } from '../../../../db/SupabaseClient';
import './RosterGannt.css';
// import './bootstrap.min.css'
import './bootstrap5.css';
import { registerLicense } from '@syncfusion/ej2-base';
import rosterDataJson from './rosterdata.json';
import { DataService, getColor } from './RosterDataFetcher';

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
  const [data, setData] = useState<Record<string, any>[]>();
  const [eventCounts, setEventCounts] = useState<Record<string, number>>({});

  const [summary, setSummary] = useState<EventSummary>(eventSummary);
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
            console.log(fetchedData);
            setData(fetchedData)
            
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
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
   const onActionBegin = (args: ActionEventArgs) => {
    if (args.requestType === 'eventCreate') {
      // Set the color based on the subject
      const subject = args.data[0].Subject;
      const color = getColor(subject.toUpperCase());
      args.data[0].Color = color; // Add color property to event data
      args.data[0].Subject = subject.toUpperCase();
      DataService.insertData(args.data[0])
      
      // Additional logic for adding events
    } else if (args.requestType === 'eventChange') {
      const subject = args.data.Subject;
      const color = getColor(subject.toUpperCase());
      args.data.Color = color; // Add color property to event data
      args.data.Subject = subject.toUpperCase();
      DataService.editData(args.data)
      // Additional logic for editing events
      schedulerRef.current.refreshEvents();
    } else if (args.requestType === 'eventRemove') {
      DataService.removeData(args.data[0])
      // Additional logic for removing events
    }
  };


  const onActionComplete = (args) => {
    if (args.requestType === 'eventCreate' || args.requestType === 'eventChange' || args.requestType === 'eventRemove') {
      schedulerRef.current.refreshEvents();
    }
  };



 

  return (
    <div className="schedule-control-section">
      <div className="col-lg-12 control-section">
        <div className="control-wrapper">
          <ScheduleComponent
         ref={schedulerRef}
         actionComplete={onActionComplete}
            cssClass="timeline-resource-grouping"
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

          {/* Footer with event counts */}
          <div className="schedule-footer">
            {Object.entries(summary).map(([date, subjects]) => (
              <div key={date} className="summary-day">
                <h4>{date}</h4>
                {Object.entries(subjects).map(([subject, count]) => (
                  <div key={subject}>
                    {subject}: {count}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
export default RosterGannt;
