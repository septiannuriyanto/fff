const formatIDNumber = (num: number) => {
  return num.toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};
export default formatIDNumber;