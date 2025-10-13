const formatNumberWithSeparator = (number: number): string => {
    return new Intl.NumberFormat('id-ID').format(number);
  };


  const normalizeToTwoDigit = (param: number) => {
    if (param < 10) {
      return `0${param}`;
    } else return param;
  };


  // Fungsi bantu (parse angka format Indonesia)
const parseIDNumber = (value: any): number => {
  if (value === null || value === undefined) return 0;
  const str = value.toString().trim();

  // Jika format Indonesia (mengandung koma sebagai desimal)
  if (str.includes(",") && str.match(/\.\d{3}/)) {
    // Contoh: "15.000,25" → hapus titik ribuan → "15000,25" → ubah koma ke titik
    return parseFloat(str.replace(/\./g, '').replace(/,/g, '.')) || 0;
  }

  // Jika format ribuan titik tanpa desimal: "15.000" → "15000"
  if (str.match(/^\d{1,3}(\.\d{3})+$/)) {
    return parseFloat(str.replace(/\./g, '')) || 0;
  }

  // Jika format Inggris (ribuan koma, desimal titik)
  if (str.match(/^\d{1,3}(,\d{3})*(\.\d+)?$/)) {
    return parseFloat(str.replace(/,/g, '')) || 0;
  }

  // Default
  return parseFloat(str.replace(/[^\d.]/g, '')) || 0;
};


  

  export { formatNumberWithSeparator, normalizeToTwoDigit,parseIDNumber }

