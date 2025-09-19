export const formatNoSuratJalan = (
  nomor: string | number,
  tanggal: Date,
  ss: string
) => {
  if (!nomor || !tanggal || !ss) return ''; // tidak tampil kalau belum lengkap

  const nn = String(nomor).padStart(2, '0'); // auto 0 depan
  const yy = String(tanggal.getFullYear()).slice(-2);
  const mm = String(tanggal.getMonth() + 1).padStart(2, '0');
  const dd = String(tanggal.getDate()).padStart(2, '0');

  return `G${yy}${mm}${dd}${ss}${nn}`;
};
