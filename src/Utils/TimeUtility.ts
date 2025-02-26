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
    const startDate = new Date(now.getFullYear(), now.getMonth() -1, 1);
    const endDate = new Date(now.getFullYear(), now.getMonth(), 0);
  
    return { startDate, endDate };
  }

  function formatTimeStamp(timeStamp:any) {
    const date = new Date(timeStamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}
  

export { getWeekNumber, getWeekStartAndEndDate, getCurrentMonthDates, getLastMonthDates, formatTimeStamp }