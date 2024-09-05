import { useEffect } from 'react';
import { supabase } from '../../../../db/SupabaseClient';
import { format } from 'date-fns';

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
  } else if (event === 'S1' || event === 'S') {
    return '#7fa900';
  } else if (event === 'S2' || event === 'M') {
    return '#357cd2';
  } else if (event === 'CUTI' || event === 'C') {
    return '#000000';
  } else if (event == 'INDUKSI' || event === 'IND') {
    return '#d9cb4c';
  } else if (event == 'SAKIT' || event === 'SK') {
    return '#69f59f';
  } else if (event == 'IJIN' || event == 'IZIN' || event === 'I') {
    return '#9f00e3';
  } else if (event == 'ALPA' || event == 'ALFA' || event === 'A') {
    return '#ff00a2';
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

    dataOff = jsonData
      .filter((event: any) => event.max_date_leave_end !== null)
      .map((event: any) => ({
        ...event,
        Nrp: event.nrp,
        PositionId: event.positionid,
        StartTime: new Date(event.max_date_period_start).toISOString(),
        EndTime: new Date(event.max_date_period_start).toISOString(),
        RecurrenceRule:
          'FREQ=WEEKLY;INTERVAL=1;BYDAY=' + getDaysKeyword(event.off_day),
        Subject: 'OFF',
        IsAllDay: true,
        // IsBlock: true,
        Color: getColor('OFF'),
        Priority: 'medium',
      }));
    return dataOff;
  }

  static parseInductionData(jsonData: any) {
    let dataInduksi: EventData[] = [];
    dataInduksi = jsonData
      .filter((event: any) => event.max_date_leave_end !== null)
      .map((event: any) => ({
        ...event,
        Nrp: event.nrp,
        PositionId: event.positionid,
        StartTime: new Date(event.max_date_period_start).toISOString(),
        EndTime: new Date(event.max_date_period_start).toISOString(),
        Subject: 'INDUKSI',
        IsAllDay: true,
        // IsBlock: true,
        Color: getColor('INDUKSI'),
        Priority: 'high',
      }));
    return dataInduksi;
  }
  static parseLeaveData(jsonData: any) {
    let dataInduksi: EventData[] = [];
    dataInduksi = jsonData
      .filter((event: any) => event.max_date_leave_end !== null)
      .map((event: any) => ({
        ...event,
        Nrp: event.nrp,
        PositionId: event.positionid,
        StartTime: new Date(event.max_date_leave_start).toISOString(),
        EndTime: new Date(event.max_date_leave_end).toISOString(),
        Subject: 'CUTI',
        IsAllDay: true,
        // IsBlock: true,
        Color: getColor('CUTI'),
        Priority: 'high',
      }));
    return dataInduksi;
  }

  static parseShiftlyData(jsonData: any) {
    let dataShiftly: EventData[] = [];
    dataShiftly = jsonData
      .filter((event: any) => event.date_end !== null)
      .map((event: any) => ({
        ...event,
        Nrp: event.nrp,
        PositionId: event.positionid,
        StartTime: new Date(event.date_start).toISOString(),
        EndTime: new Date(event.date_end).toISOString(),
        Subject: event.subject.toUpperCase(),
        IsAllDay: true,
        // IsBlock: true,
        Color: getColor(event.subject.toUpperCase()),
        Priority: 'low',
      }));
    return dataShiftly;
  }

  static async fetchRosterData() {
    try {
      const { data, error } = await supabase.rpc('get_all_recent_roster'); // Ensure function is created in Supabase

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error fetching roster data:', error);
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
      console.error('Error fetching leave data:', error);
      return [];
    }
  }
  static async fetchShiftlyData() {
    try {
      const { data, error } = await supabase.rpc('get_shiftly_plan');

      if (error) {
        throw new Error(error.message);
      }


      return data;
    } catch (error) {
      console.error('Error fetching shiftly data:', error);
      return [];
    }
  }

  static async getAllData() {
    let baseData = await DataService.fetchRosterData();
    let shiftlyData = await this.fetchShiftlyData();
    let dataInduksi: EventData[] = [];
    let dataAllRoster: EventData[] = [];
    let dataCuti: EventData[] = [];
    let dataOff: EventData[] = [];
    let dataDinas: EventData[] = [];

    dataInduksi = DataService.parseInductionData(baseData);
    dataOff = DataService.parseOffData(baseData);
    dataCuti = DataService.parseLeaveData(baseData);
    dataDinas = DataService.parseShiftlyData(shiftlyData);

    dataAllRoster = [...dataInduksi, ...dataOff, ...dataCuti, ...dataDinas];

    return dataAllRoster;
  }

  static async insertData(data: any) {
    const startDate = new Date(data.StartTime);
    const endDate = new Date(data.EndTime);

    endDate.setDate(endDate.getDate() - 1);

    // Extract and format the date portion
    const formattedStartDate = format(startDate, 'yyyy-MM-dd'); // YYYY-MM-DD
    const formattedEndDate = format(endDate, 'yyyy-MM-dd'); // YYYY-MM-DD

    const query = {
      id: data.Id,
      nrp: data.Nrp,
      date_start: formattedStartDate,
      date_end: formattedEndDate,
      recurrence_rule: data.RecurrenceRule,
      subject: data.Subject.toUpperCase(),
    };
    console.log('Data inputted:', data);
    const { error } = await supabase.from('shiftly_plan').insert([query]);
    if (error) {
      console.error('Error inserting data:', error);
      return;
    }
    console.log('Data added:', query);
  }

  static async editData(data: any) {
    const startDate = new Date(data.StartTime);
    const endDate = new Date(data.EndTime);

    endDate.setDate(endDate.getDate() - 1);

    // Extract and format the date portion
    const formattedStartDate = format(startDate, 'yyyy-MM-dd'); // YYYY-MM-DD
    const formattedEndDate = format(endDate, 'yyyy-MM-dd'); // YYYY-MM-DD

    const query = {
      nrp: data.Nrp,
      date_start: formattedStartDate,
      date_end: formattedEndDate,
      recurrence_rule: data.RecurrenceRule,
      subject: data.Subject.toUpperCase(),
    };
    console.log('Data input:', data);
    const { error } = await supabase
    .from('shiftly_plan')
    .update(query)
    .eq('id', data.Id); // Assuming 'id' is the primary key column

    if (error) {
      console.error('Error updating data:', error);
      return;
    }
    console.log('Data updated:', query);
  }

  static async removeData(data: any) {
    // Delete the record from the shiftly_plan table using the ID
    const { error } = await supabase
      .from('shiftly_plan')
      .delete()
      .eq('id', data.id); // Assuming 'id' is the primary key column

    if (error) {
      console.error('Error removing data:', error);
      return;
    }
    console.log('Data removed:', data);
  }
}

export {
  dataInduksi,
  dataCuti,
  dataDinas,
  dataAllRoster,
  DataService,
  getColor,
};
