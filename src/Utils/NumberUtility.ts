const formatNumberWithSeparator = (number: number): string => {
    return new Intl.NumberFormat('en-US').format(number);
  };


  const normalizeToTwoDigit = (param: number) => {
    if (param < 10) {
      return `0${param}`;
    } else return param;
  };

  

  export { formatNumberWithSeparator, normalizeToTwoDigit }