import * as ReactDOM from 'react-dom';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { TimelineViews, TimelineMonth, Agenda, ScheduleComponent, ViewsDirective, ViewDirective, ResourcesDirective, ResourceDirective, Inject, Resize, DragAndDrop } from '@syncfusion/ej2-react-schedule';
import { extend } from '@syncfusion/ej2-base';
import * as dataSource from './datasource.json';
import { supabase } from '../../../../db/SupabaseClient';
// import './RosterGannt.css'
// import './bootstrap.min.css'
import './bootstrap5.css'
import { registerLicense } from '@syncfusion/ej2-base';


interface Incumbent {
    id: number;
    incumbent: number;
    // Add other fields from your 'incumbent' table
  };
interface Manpower {
    nrp: number;
    nama: string;
    position: number;
    color: string;
    // Add other fields from your 'incumbent' table
  }


const getColor = (position:number)=>{

    let colorCode = "";

    switch(position){
        case 1: colorCode = "#cb6bb2"
            break;
        case 2: colorCode = "#56ca85"
            break;
        case 3: colorCode = "#df5286"
            break;
        case 4: colorCode = "#7fa900"
            break;
        case 5: colorCode = "#ea7a57"
            break;
        case 6: colorCode = "#5978ee"
            break;
        default: colorCode = "#000000"
            break;

    }
    
    return colorCode;

}
  

const RosterGannt = () => {
    registerLicense(import.meta.env.VITE_SYNCFUSION_LICENSE_KEY);
    const [incumbents, setIncumbents] = useState<Incumbent[]>([]);
    const [menpower, setMenpower] = useState<Manpower[]>([]);

    const data: Record<string, any>[] =
        extend([], (dataSource as Record<string, any>).resourceData.concat((dataSource as Record<string, any>).timelineResourceData), null, true) as Record<string, any>[];
    const workDays: number[] = [0, 1, 2, 3, 4];

    useEffect(() => {
        const fetchIncumbents = async () => {
          const { data, error } = await supabase
            .from('incumbent')
            .select('*');
    
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
              .select('nrp, nama, position').order('nama'); ;
      
            if (error) {
              console.error('Error fetching names:', error);
            } else {
                console.log(data);
                
                const formattedData: Manpower[] = data.map((item: any) => ({
                    nrp: item.nrp,
                    nama: item.nama,
                    position: item.position,
                    color: getColor(item.position)
                  }));
              
              setMenpower(formattedData);
            }
          };
          fetchIncumbents();
        fetchNames();
      }, []);

    return (
        <div className='schedule-control-section'>
            <div className='col-lg-12 control-section'>
                <div className='control-wrapper'>
                    <ScheduleComponent cssClass='timeline-resource-grouping' width='100%' height='650px' selectedDate={new Date(2023,0,1)} currentView='TimelineMonth' workDays={workDays} eventSettings={{ dataSource: data }} group={{ resources: ['Projects', 'Categories'] }} >
                        <ResourcesDirective>
                            <ResourceDirective field='Position' title='Choose Position' name='Projects' allowMultiple={false} dataSource={incumbents} textField='incumbent' idField='id' colorField='color' />
                            <ResourceDirective field='Nrp' title='Names' name='Categories' allowMultiple={true} dataSource={menpower} textField='nama' idField='nrp' groupIDField='position' colorField='color' />
                        </ResourcesDirective>
                        <ViewsDirective>
                            {/* <ViewDirective option='TimelineDay' /> */}
                            {/* <ViewDirective option='TimelineWeek' /> */}
                            {/* <ViewDirective option='TimelineWorkWeek' /> */}
                            <ViewDirective option='TimelineMonth' />
                            {/* <ViewDirective option='Agenda' /> */}
                        </ViewsDirective>
                        <Inject services={[TimelineViews, TimelineMonth, Agenda, Resize, DragAndDrop]} />
                    </ScheduleComponent>
                </div>
            </div>
        </div>
    );
}
export default RosterGannt;