import { toZonedTime } from "date-fns-tz";

function getWeekNumber(date: Date): number {
  // Copying date so the original date won't be modified
  const tempDate = new Date(date.valueOf());

  // ISO week date weeks start on Monday, so correct the day number
  const dayNum = (date.getDay() + 6) % 7;

  // Set the target to the nearest Thursday (current date + 4 - current day number)
  tempDate.setDate(tempDate.getDate() - dayNum + 3);

  // ISO 8601 week number of the year for this date
  const firstThursday = tempDate.valueOf();

  // Set the target to the first day of the year
  // First set the target to January 1st
  tempDate.setMonth(0, 1);

  // If this is not a Thursday, set the target to the next Thursday
  if (tempDate.getDay() !== 4) {
    tempDate.setMonth(0, 1 + ((4 - tempDate.getDay()) + 7) % 7);
  }

  // The weeknumber is the number of weeks between the first Thursday of the year
  // and the Thursday in the target week
  return 1 + Math.ceil((firstThursday - tempDate.valueOf()) / 604800000); // 604800000 = number of milliseconds in a week
}

function getWeekStartAndEndDate(year: number, weekNumber: number): { startDate: Date, endDate: Date } {
  // Create a new date object set to January 1st of the specified year
  const firstDayOfYear = new Date(year, 0, 1);

  // Find the day number of the first Thursday of the year
  const firstThursday = firstDayOfYear.getDate() + (4 - firstDayOfYear.getDay() + 7) % 7;

  // Set the date to the first Thursday of the year
  const firstThursdayOfYear = new Date(year, 0, firstThursday);

  // Calculate the start date of the specified week
  const weekStartDate = new Date(firstThursdayOfYear);
  weekStartDate.setDate(firstThursdayOfYear.getDate() - firstThursdayOfYear.getDay() + 1 + (weekNumber - 1) * 7);

  // Calculate the end date of the specified week
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekStartDate.getDate() + 6);

  return { startDate: weekStartDate, endDate: weekEndDate };
}

function getCurrentMonthDates(): { startDate: Date; endDate: Date } {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return { startDate, endDate };
}

function getLastMonthDates(): { startDate: Date; endDate: Date } {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endDate = new Date(now.getFullYear(), now.getMonth(), 0);

  return { startDate, endDate };
}

function formatTimeStamp(timeStamp: any) {
  const date = new Date(timeStamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

const getMakassarDate = () => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Makassar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });


  const parts = formatter.formatToParts(new Date());
  const year = parts.find(p => p.type === 'year')!.value;
  const month = parts.find(p => p.type === 'month')!.value;
  const day = parts.find(p => p.type === 'day')!.value;

  return `${year}-${month}-${day}`;
};

const getMakassarDateObject = () => {
  const timeZone = 'Asia/Makassar';
  const now = new Date();
  const zonedDate = toZonedTime(now, timeZone);
  return zonedDate; // hasilnya Date object sesuai waktu Makassar
};

// ✅ 2️⃣ Tentukan shift berdasarkan jam Makassar
// Shift 1 = 06:00–17:59, Shift 2 = 18:00–05:59
 const getShift = (): 1 | 2 => {
  const makassarDate = getMakassarDateObject();
  const hour = makassarDate.getHours();

  if (hour >= 6 && hour < 18) {
    return 1; // shift 1
  } else {
    return 2; // shift 2
  }
};

 const getShiftString = (): "1" | "2" => {
  const makassarDate = getMakassarDateObject();
  const hour = makassarDate.getHours();

  if (hour >= 6 && hour < 18) {
    return "1"; // shift 1
  } else {
    return "2"; // shift 2
  }
};



const getMakassarShiftlyDate = (): string => {
  const timeZone = 'Asia/Makassar';
  const now = new Date();
  const zonedDate = toZonedTime(now, timeZone);

  const hour = zonedDate.getHours();
  if (hour >= 0 && hour < 6) {
    // Mundur 1 hari kalau masih antara jam 00:00–05:59
    zonedDate.setDate(zonedDate.getDate() - 1);
  }

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(zonedDate);
  const year = parts.find(p => p.type === 'year')!.value;
  const month = parts.find(p => p.type === 'month')!.value;
  const day = parts.find(p => p.type === 'day')!.value;

  return `${year}-${month}-${day}`; // ✅ hasil akhir: yyyy-MM-dd
};

 const getMakassarShiftlyDateObject = (): Date => {
  const makassarDate = getMakassarDateObject();
  const hour = makassarDate.getHours();

  // Kalau jam 00:00–05:59, maka mundur 1 hari (masih bagian dari shift 2)
  if (hour >= 0 && hour < 6) {
    makassarDate.setDate(makassarDate.getDate() - 1);
  }

  return makassarDate;
};



export { getWeekNumber, 
  getWeekStartAndEndDate, 
  getCurrentMonthDates, 
  getLastMonthDates, 
  formatTimeStamp, 
  getMakassarDate, 
  getMakassarDateObject, 
  getShift, 
  getShiftString,
  getMakassarShiftlyDateObject,
  getMakassarShiftlyDate,
}