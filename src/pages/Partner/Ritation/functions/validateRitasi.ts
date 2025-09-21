export function validateRitasiForm({
  selectedPetugas,
  unit,
  diff,
  noSuratJalan,
  operator,
  fuelman,
  sondingBeforeRear,
  sondingBeforeFront,
  sondingAfterRear,
  sondingAfterFront,
  volumeBefore,
  volumeAfter,
  photoUrl,
}: any): string | null {
  if (!selectedPetugas) return 'Pilih Nama Petugas terlebih dahulu!';
  if (!unit) return 'Pilih Unit terlebih dahulu!';
  if (diff < 0) return 'Selisih flowmeter tidak boleh negatif!';
  if (diff > 20000) return 'Flowmeter tidak boleh melebihi maks tangki 20.000 liter!';
  if (!noSuratJalan) return 'Nomor Surat Jalan tidak valid!';
  if (!operator) return 'Pilih Operator terlebih dahulu!';
  if (!fuelman) return 'Pilih Fuelman terlebih dahulu!';
  if (!sondingBeforeRear || !sondingBeforeFront) return 'Isi Sonding Before terlebih dahulu!';
  if (!sondingAfterRear || !sondingAfterFront) return 'Isi Sonding After terlebih dahulu!';
  if (volumeBefore === 0) return 'Volume Sonding Before tidak valid atau tidak ditemukan di tera tangki!';
  if (volumeAfter === 0) return 'Volume Sonding After tidak valid atau tidak ditemukan di tera tangki!';
  if (!photoUrl) return 'Upload foto Surat Jalan terlebih dahulu!';

  return null; // semua oke
}
