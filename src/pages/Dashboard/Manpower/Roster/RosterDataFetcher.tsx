import { useEffect } from 'react';
import { supabase } from '../../../../db/SupabaseClient';
import { format } from 'date-fns';
import { formatDateForSupabase } from '../../../../Utils/DateUtility';

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
        Nrp: event.Nrp,
        PositionId: event.PositionId,
        StartTime: new Date(event.date_start).toISOString(),
        EndTime: new Date(event.date_end).toISOString(),
        Subject: event.Subject,
        IsAllDay: true,
        // IsBlock: true,
        Color: getColor(event.Subject),
        Priority: 'low',
        RecurrenceRule : event.RecurrenceRule,
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


  static parseFetchedDataFromSupabase(data: any) {
    // If data is an array, we can map over it
    if (Array.isArray(data)) {
      return data.map(item => {
        return {
          Id: item.id,
          Color: item.color,  // Assuming a default color, can be adjusted
          EndTime: item.endtime || item.date_end,  // Choose the correct date field
          IsAllDay: true,  // Assuming it's always true, adjust as needed
          Nrp: item.nrp,
          PositionId: item.positionid,
          StartTime: item.starttime || item.date_start,  // Choose the correct date field
          Subject: item.subject,
          date_end: item.endtime,  // Correct key for end date
          date_start: item.starttime,  // Correct key for start date
          RecurrenceRule : item.recurrencerule,
        };
      });
    }
  
    // If data is a single object (not an array), manually parse it similarly
    return {
      Id: data.id,
      Color: data.color,  // Assuming a default color, can be adjusted
      EndTime: data.endtime || data.date_end,  // Choose the correct date field
      IsAllDay: true,  // Assuming it's always true, adjust as needed
      Nrp: data.nrp,
      PositionId: data.positionid,
      StartTime: data.starttime || data.date_start,  // Choose the correct date field
      Subject: data.subject,
      date_end: data.starttime,  // Correct key for end date
      date_start: data.starttime,  // Correct key for start date
    };
  }

  static async fetchShiftlyData() {
    try {
      // Fetch data from Supabase
      const { data: fetchedData, error } = await supabase.rpc('get_shiftly_plan');
  
      if (error) {
        throw new Error(error.message);
      }
  
      // Parse fetched data
      const formattedData = DataService.parseFetchedDataFromSupabase(fetchedData);
  
      // Ensure formattedData is always an array
      const finalFormattedData = Array.isArray(formattedData) ? formattedData : [formattedData];
  
      // Initialize final data as fetched data
      let finalData = [...finalFormattedData];
  
      // Retrieve data from localStorage if available
      const localData = localStorage.getItem('shiftlyrecords');
      if (localData) {
        console.log('Data fetched from local storage');
        const parsedLocalData = JSON.parse(localData);
  
        // Create a map of Ids for faster lookup
        const localDataMap = new Map(parsedLocalData.map((item: any) => [item.Id, item]));

        console.log(localDataMap);
        
  
        // Merge local data into fetched data, prioritizing Supabase data
        finalData = finalFormattedData.map((supabaseItem: any) => {
          const localItem = localDataMap.get(supabaseItem.Id);
          return localItem ? { ...localItem, ...supabaseItem } : supabaseItem;
        });
  
        // Add any local records that are not in Supabase data
        const supabaseIds = new Set(finalFormattedData.map((item: any) => item.Id));
        const additionalLocalData = parsedLocalData.filter((item: any) => !supabaseIds.has(item.Id));
  
        // Combine the final data
        finalData = [...finalData, ...additionalLocalData];
      }
  
      // Log the final combined data for debugging
      console.log('Final combined data:', finalData);
  
      // Return the final combined data
      return finalData;
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
    console.log('Inserting data to local storage');
    console.log(data);

    // Create the start and adjusted (end) dates
    const startDate = new Date(data.StartTime);
    const adjustedDate = new Date(startDate.getTime() + (24 * 60 * 60 * 1000) - 1000); // 1 day minus 1 second

    // Format the start and end dates
    const formattedStartDate = format(startDate, 'yyyy-MM-dd'); // YYYY-MM-DD
    const formattedEndDate = format(adjustedDate, 'yyyy-MM-dd'); // Adjusted date

    const newRecord = {
        ...data,
        Id: data.Id,
        Nrp: data.Nrp,
        StartTime: data.StartTime,
        EndTime: data.EndTime,
        date_start: formattedStartDate,
        date_end: formattedEndDate,
        RecurrenceRule: data.RecurrenceRule,
        Subject: data.Subject.toUpperCase(),
        PositionId: data.PositionId,
        recurrence_rule : data.RecurrenceRule,
    };

    // Retrieve existing data from localStorage
    const existingData = JSON.parse(localStorage.getItem('shiftlyrecords') || '[]');

    // Check if the record already exists
    const recordIndex = existingData.findIndex((record: any) => record.Id === newRecord.Id);
    if (recordIndex !== -1) {
        // Update the existing record
        existingData[recordIndex] = { ...existingData[recordIndex], ...newRecord };
    } else {
        // Add the new record
        existingData.push(newRecord);
    }

    // Save the updated data back to localStorage
    localStorage.setItem('shiftlyrecords', JSON.stringify(existingData));

    console.log('Updated Local Storage:', existingData);
}


  // static async editData(data: any) {
  //   const startDate = new Date(data.StartTime);
  //   const endDate = new Date(data.EndTime);


  //   // Extract and format the date portion
  //   const formattedStartDate = format(startDate, 'yyyy-MM-dd'); // YYYY-MM-DD
  //   const formattedEndDate = format(endDate, 'yyyy-MM-dd'); // YYYY-MM-DD

  //   const query = {
  //     nrp: data.Nrp,
  //     date_start: formattedStartDate,
  //     date_end: formattedEndDate,
  //     recurrence_rule: data.RecurrenceRule,
  //     subject: data.Subject.toUpperCase(),
  //   };
  //   console.log('Data input:', data);
  //   const { error } = await supabase
  //   .from('shiftly_plan')
  //   .update(query)
  //   .eq('id', data.Id); // Assuming 'id' is the primary key column

  //   if (error) {
  //     console.error('Error updating data:', error);
  //     return false;
  //   }
  //   console.log('Data updated:', query);
  //   return true;
  // }

  static async editData(event: any) {
    console.log('Editing data in local storage');
    console.log(`Event received:`, event);
  
    // Retrieve existing data from localStorage
    const existingData = JSON.parse(localStorage.getItem('shiftlyrecords') || '[]');
  
    // Find the record by Id in localStorage
    const recordIndex = existingData.findIndex((record: any) => record.Id === event.Id);
  
    if (recordIndex !== -1) {
      // If the record is found in localStorage, update the record
      existingData[recordIndex] = { ...existingData[recordIndex],
         ...event,
         date_start : formatDateForSupabase(new Date(event.StartTime)),
         date_end: formatDateForSupabase(new Date(new Date(event.EndTime).getTime() - 1000)),
         StartTime : event.StartTime,
         EndTime : event.EndTime,
         recurrence_rule : event.RecurrenceRule,
        };
      console.log('Record found in local storage and updated');
    } else {
      console.log('Record not found in local storage. Fetching from Supabase...');
      try {
        // Fetch the record from Supabase if not found in local storage
        const { data: supabaseData, error } = await supabase
          .from('shiftly_plan')
          .select('*')
          .eq('id', event.Id)
          .single(); // Assume only one record should be returned
  
        if (error || !supabaseData) {
          console.log('Error or no data found from Supabase:', error);
          return;
        }
  
        console.log('Record fetched from Supabase:', supabaseData);
  
        // Add the Supabase data to the event data and update the local storage
        existingData.push({ ...supabaseData,
          ...event,
        date_start : formatDateForSupabase(new Date(event.StartTime)),
        date_end : formatDateForSupabase(new Date(event.EndTime)),
        StartTime : event.StartTime,
        EndTime : event.EndTime,
        recurrence_rule : event.RecurrenceRule,
        });
  
        console.log('Record added from Supabase to local storage');
      } catch (err) {
        console.error('Error fetching data from Supabase:', err);
        return;
      }
    }
  
    // Save the updated data back to localStorage
    localStorage.setItem('shiftlyrecords', JSON.stringify(existingData));
  
    console.log('Updated Local Storage after edit:', existingData);
  }
  



  // static async removeData(data: any) {
  //   // Delete the record from the shiftly_plan table using the ID
  //   const { error } = await supabase
  //     .from('shiftly_plan')
  //     .delete()
  //     .eq('id', data.id); // Assuming 'id' is the primary key column

  //   if (error) {
  //     console.error('Error removing data:', error);
  //     return false;
  //   }
  //   console.log('Data removed:', data);
  //   return true;
  // }
  static async removeData(event: any) {
    console.log('Removing data');
    console.log(`Event received:`, event);
  
    // Retrieve existing data from localStorage
    const existingData = JSON.parse(localStorage.getItem('shiftlyrecords') || '[]');
  
    // Check if the record exists in localStorage
    const recordIndex = existingData.findIndex((record: any) => record.Id === event.Id);
  
    if (recordIndex !== -1) {
      // If the record exists in localStorage, filter it out
      const updatedData = existingData.filter((record: any) => record.Id !== event.Id);
  
      // Save the updated data back to localStorage
      localStorage.setItem('shiftlyrecords', JSON.stringify(updatedData));
  
      console.log('Record removed from localStorage');
      console.log('Updated Local Storage after removal:', updatedData);
    } else {
      console.log('Record not found in localStorage. Proceeding to delete from Supabase.');
  
      // If the record does not exist in localStorage, delete the record from Supabase
      try {
        const { data, error } = await supabase
          .from('shiftly_plan')
          .delete()
          .eq('id', event.Id);
  
        if (error) {
          console.error('Error removing record from Supabase:', error);
          return;
        }
  
        console.log('Record removed from Supabase:', data);
      } catch (error) {
        console.error('Error deleting record from Supabase:', error);
      }
    }
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
