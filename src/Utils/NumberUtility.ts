const formatNumberWithSeparator = (number: number): string => {
    return new Intl.NumberFormat('en-US').format(number);
  };

  

  export { formatNumberWithSeparator }