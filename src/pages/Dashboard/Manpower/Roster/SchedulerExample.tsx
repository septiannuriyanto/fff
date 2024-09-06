import * as ReactDOM from 'react-dom';
import * as React from 'react';
import { useEffect, useRef } from 'react';
import { ScheduleComponent, ViewsDirective, ViewDirective, TimelineViews,TimelineMonth, Inject, EventRenderedArgs, ResourcesDirective, ResourceDirective, ResourceDetails, ActionEventArgs, RenderCellEventArgs, PopupOpenEventArgs, Resize, DragAndDrop } from '@syncfusion/ej2-react-schedule';
import { extend, isNullOrUndefined } from '@syncfusion/ej2-base';
import * as dataSource from './datasource.json';
import './bootstrap5.css'
import './RosterGannt.css'

/**
 * schedule room scheduler sample
 */

const SchedulerExample = () => {
    const data: Record<string, any>[] = extend([], (dataSource as Record<string, any>).roomData, null, true) as Record<string, any>[];
    let scheduleObj = useRef<ScheduleComponent>(null);
    const ownerData: Record<string, any>[] = [
        { text: 'Jammy', id: 1, color: '#ea7a57', capacity: 20, type: 'Conference' },
        { text: 'Tweety', id: 2, color: '#7fa900', capacity: 7, type: 'Cabin' },
        { text: 'Nestle', id: 3, color: '#5978ee', capacity: 5, type: 'Cabin' },
        { text: 'Phoenix', id: 4, color: '#fec200', capacity: 15, type: 'Conference' },
        { text: 'Mission', id: 5, color: '#df5286', capacity: 25, type: 'Conference' },
        { text: 'Hangout', id: 6, color: '#00bdae', capacity: 10, type: 'Cabin' },
        { text: 'Rick Roll', id: 7, color: '#865fcf', capacity: 20, type: 'Conference' },
        { text: 'Rainbow', id: 8, color: '#1aaa55', capacity: 8, type: 'Cabin' },
        { text: 'Swarm', id: 9, color: '#df5286', capacity: 30, type: 'Conference' },
        { text: 'Photogenic', id: 10, color: '#710193', capacity: 25, type: 'Conference' }
    ];

    const getRoomName = (value: ResourceDetails) => {
        return (value as ResourceDetails).resourceData[(value as ResourceDetails).resource.textField];
    }

    const getRoomType = (value: ResourceDetails) => {
        return (value as ResourceDetails).resourceData.type;
    }

    const getRoomCapacity = (value: ResourceDetails) => {
        return (value as ResourceDetails).resourceData.capacity;
    }

    const isReadOnly = (endDate: Date): boolean => {
        return (endDate < new Date(2021, 6, 31, 0, 0));
    }

    const resourceHeaderTemplate = (props:any) => {
        return (
            <div className="template-wrap">
                <div className="room-name">{getRoomName(props)}</div>
                <div className="room-type">{getRoomType(props)}</div>
                <div className="room-capacity">{getRoomCapacity(props)}</div>
            </div>
        );
    }

    const onActionBegin = (args: ActionEventArgs): void => {
        if (args.requestType === 'eventCreate' || args.requestType === 'eventChange') {
            let data: Record<string, any> = args.data instanceof Array ? args.data[0] : args.data;
            args.cancel = !scheduleObj.current.isSlotAvailable(data);
        }
    }

    const onEventRendered = (args: EventRenderedArgs): void => {
        let data: Record<string, any> = args.data;
        if (isReadOnly(data.EndTime as Date)) {
            args.element.setAttribute('aria-readonly', 'true');
            args.element.classList.add('e-read-only');
        }
    }

    const onRenderCell = (args: RenderCellEventArgs): void => {
        if (args.element.classList.contains('e-work-cells')) {
            if (args.date < new Date(2021, 6, 31, 0, 0)) {
                args.element.setAttribute('aria-readonly', 'true');
                args.element.classList.add('e-read-only-cells');
            }
        }
        if (args.elementType === 'emptyCells' && args.element.classList.contains('e-resource-left-td')) {
            let target: HTMLElement = args.element.querySelector('.e-resource-text') as HTMLElement;
            target.innerHTML = '<div class="name">Rooms</div><div class="type">Type</div><div class="capacity">Capacity</div>';
        }
    }

    const onPopupOpen = (args: PopupOpenEventArgs): void => {
        let data: Record<string, any> = args.data as Record<string, any>;
        if (args.type === 'QuickInfo' || args.type === 'Editor' || args.type === 'RecurrenceAlert' || args.type === 'DeleteAlert') {
            let target: HTMLElement = (args.type === 'RecurrenceAlert' ||
                args.type === 'DeleteAlert') ? args.element[0] : args.target;
            if (!isNullOrUndefined(target) && target.classList.contains('e-work-cells')) {
                if ((target.classList.contains('e-read-only-cells')) ||
                    (!scheduleObj.current.isSlotAvailable(data))) {
                    args.cancel = true;
                }
            } else if (!isNullOrUndefined(target) && target.classList.contains('e-appointment') &&
                (isReadOnly(data.EndTime as Date))) {
                args.cancel = true;
            }
        }
    }

    return (
        <div className='schedule-control-section'>
            <div className='col-lg-12 control-section'>
                <div className='control-wrapper'>
                    <ScheduleComponent cssClass='timeline-resource-grouping' ref={scheduleObj} width='100%' height='650px' selectedDate={new Date(2021, 7, 2)} workHours={{ start: '08:00', end: '18:00' }} timeScale={{ interval: 60, slotCount: 1 }} resourceHeaderTemplate={resourceHeaderTemplate} eventSettings={{ dataSource: data, fields: { id: 'Id', subject: { title: 'Summary', name: 'Subject' }, location: { title: 'Location', name: 'Location' }, description: { title: 'Comments', name: 'Description' }, startTime: { title: 'From', name: 'StartTime' }, endTime: { title: 'To', name: 'EndTime' } } }} eventRendered={onEventRendered} popupOpen={onPopupOpen} actionBegin={onActionBegin} renderCell={onRenderCell} group={{ enableCompactView: false, resources: ['MeetingRoom'] }} >
                        <ResourcesDirective>
                            <ResourceDirective field='RoomId' title='Room Type' name='MeetingRoom' allowMultiple={true} dataSource={ownerData} textField='text' idField='id' colorField='color' />
                        </ResourcesDirective>
                        < ViewsDirective >
                            <ViewDirective option='TimelineDay' />
                            <ViewDirective option='TimelineMonth' />
                        </ViewsDirective>
                        < Inject services={[TimelineViews, TimelineMonth, Resize, DragAndDrop]} />
                    </ScheduleComponent>
                </div>
            </div>

        </div>
    );
}
export default SchedulerExample;