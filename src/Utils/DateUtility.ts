const formatDate = (date:number) => {
    // Create a new Date object and add 8 hours to get UTC+8
    const utcDate = new Date(date + 8 * 60 * 60 * 1000);
  
    // Format the date and time components
    const day = String(utcDate.getUTCDate()).padStart(2, '0');
    const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0'); // Months are zero-based
    const year = utcDate.getUTCFullYear();
    const hours = String(utcDate.getUTCHours()).padStart(2, '0');
    const minutes = String(utcDate.getUTCMinutes()).padStart(2, '0');
    const seconds = String(utcDate.getUTCSeconds()).padStart(2, '0');
  
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };

  const formatDateToString = (date:Date) => {
    // Format the date and time components
    const day = String(date.getDate());
    const month = String(date.getMonth() + 1);
    const year = String(date.getFullYear());
    return `${year}/${month}/${day}`;
  };

  const formatDateToDdMmyy = (date: Date) => {
    // Format the day, month, and year components with leading zeros if necessary
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2); 
    return `${day}${month}${year}`;
  };

  const formatDateToIndonesian = (date: number) => {
    // Create a new Date object and add 8 hours to get UTC+8
    const utcDate = new Date(date + 8 * 60 * 60 * 1000);
  
    // Format the date using Indonesian locale with full month name
    const formattedDate = utcDate.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long', // Full month name
      year: 'numeric',
    });
  
    return formattedDate;
  };

  const formatDateToIndonesianByDate = (date: Date) => {
    // Add 8 hours to get UTC+8
    const utcDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  
    // Format the date using Indonesian locale with full month name
    const formattedDate = utcDate.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long', // Full month name
      year: 'numeric',
    });
  
    return formattedDate;
  };
  
  

  const formatDateForSupabase = (date: Date) => {
    if (!date) return null;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // getMonth() returns 0-based month, so add 1
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  const formatDateToISO = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  };

  export { formatDate, formatDateForSupabase, formatDateToIndonesian, formatDateToIndonesianByDate, formatDateToISO, formatDateToString, formatDateToDdMmyy }