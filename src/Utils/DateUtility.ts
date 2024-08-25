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

  export { formatDate }