import { useEffect } from 'react';
import { supabase } from '../../../../db/SupabaseClient';

interface DayOffModel {
  StartTime: string;
  PositionId: number;
  Nrp: string;
}

let offJsonData = {
  data: [
    {
      StartTime: '2023-01-06T07:00:00.000Z',
      PositionId: 1,
      Nrp: '1G03059',
    },
    {
      StartTime: '2023-01-07T07:00:00.000Z',
      PositionId: 1,
      Nrp: '61122016',
    },
    {
      StartTime: '2023-01-08T07:00:00.000Z',
      PositionId: 1,
      Nrp: '6122484',
    },
  ],
};

let dataInduksi: EventData[] = [];
let dataAllRoster: EventData[] = [];
let dataCuti: EventData[] = [];

let dataDinas: EventData[] = [];

function getColor(event: string) {
  if (event === 'OFF') {
    return '#d94c4c';
  } else if (event === 'S1') {
    return '#7fa900';
  } else if (event === 'S2') {
    return '#357cd2';
  } else if (event === 'CUTI') {
    return '#000000';
  } else if (event == 'INDUKSI') {
    return '#d9cb4c';
  } else {
    return '#ffffff';
  }
}

function getDaysKeyword(offDay: number) {
  switch (offDay) {
    case 1:
      return 'MO';
    case 2:
      return 'TU';
    case 3:
      return 'WE';
    case 4:
      return 'TH';
    case 5:
      return 'FR';
    case 6:
      return 'SA';
    case 7:
      return 'SU';
    default:
      return 'XX';
  }
}

class DataService {
  static parseOffData(jsonData: any) {
    let dataOff: EventData[] = [];

    dataOff = jsonData.map((event: any) => ({
      ...event,
      Nrp: event.nrp,
      PositionId: event.positionid,
      StartTime: new Date(event.max_date_period_start).toISOString(),
      EndTime: new Date(event.max_date_period_start).toISOString(),
      RecurrenceRule:
        'FREQ=WEEKLY;INTERVAL=1;BYDAY=' + getDaysKeyword(event.off_day),
      Subject: 'OFF',
      IsAllDay: true,
      IsBlock: true,
      Color: getColor('OFF'),
      Priority: 'medium',
    }));
    return dataOff;
  }

  static parseInductionData(jsonData: any) {
    let dataInduksi: EventData[] = [];
    dataInduksi = jsonData.map((event: any) => ({
      ...event,
      Nrp: event.nrp,
      PositionId: event.positionid,
      StartTime: new Date(event.max_date_period_start).toISOString(),
      EndTime: new Date(event.max_date_period_start).toISOString(),
      Subject: 'INDUKSI',
      IsAllDay: true,

      Color: getColor('INDUKSI'),
      Priority: 'high',
    }));
    return dataInduksi;
  }
  static parseLeaveData(jsonData: any) {
    let dataInduksi: EventData[] = [];
    dataInduksi = jsonData.map((event: any) => ({
      ...event,
      Nrp: event.nrp,
      PositionId: event.positionid,
      StartTime: new Date(event.max_date_leave_start).toISOString(),
      EndTime: new Date(event.max_date_leave_end).toISOString(),
      Subject: 'CUTI',
      IsAllDay: true,
      IsBlock: true,
      Color: getColor('CUTI'),
      Priority: 'high',
    }));
    return dataInduksi;
  }

  static async fetchRosterData() {
    try {
      const { data, error } = await supabase.rpc('get_all_recent_roster'); // Ensure function is created in Supabase

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error fetching joined data:', error);
      return [];
    }
  }
  static async fetchLeaveData() {
    try {
      const { data, error } = await supabase.rpc('get_all_recent_leave'); // Ensure function is created in Supabase

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error fetching joined data:', error);
      return [];
    }
  }

  static async getAllData() {
    let baseData = await DataService.fetchRosterData();
    let dataInduksi: EventData[] = [];
    let dataAllRoster: EventData[] = [];
    let dataCuti: EventData[] = [];
    let dataOff: EventData[] = [];
    let dataDinas: EventData[] = [];

    dataInduksi = DataService.parseInductionData(baseData);
    dataOff = DataService.parseOffData(baseData);
    dataCuti = DataService.parseLeaveData(baseData);

    dataAllRoster = [...dataInduksi, ...dataOff, ...dataCuti, ...dataDinas];

    return dataAllRoster;
  }
}

export { dataInduksi, dataCuti, dataDinas, dataAllRoster, DataService };
