import React from 'react';
import LogoTaka from './../../../../images/logo/logo_taka.jpg';
import './HardopyLeaveLetterTemplate.css';

const months = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];
var tglSurat = new Date();
var dateString =
  tglSurat.getDate() +
  ' ' +
  months[tglSurat.getMonth()] +
  ' ' +
  tglSurat.getFullYear();

interface HardcopyLeaveLetterTemplateProps {
  detail?: Detail; // `detail` is optional and will be of type `Detail`
}

class HardcopyLeaveLetterTemplate extends React.PureComponent<HardcopyLeaveLetterTemplateProps> {
  parseTimestamp = (time) => {
    const timeObj = new Date(time.toDate());
    const year = timeObj.getFullYear();
    return year;
  };


  adjustDateEnd = (dateEndStr:string) => {
    // Parse the string to a Date object
    const dateEnd = new Date(dateEndStr);
  
    // Check if the date parsing was successful
    if (isNaN(dateEnd.getTime())) {
      throw new Error('Invalid date format');
    }
  
    // Add one day to the date
    dateEnd.setDate(dateEnd.getDate() + 1);
  
    // Format the date back to a string (assuming original format is YYYY-MM-DD)
    const year = dateEnd.getFullYear();
    const month = String(dateEnd.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const day = String(dateEnd.getDate()).padStart(2, '0');
  
    return `${day}-${month}-${year}`;
  };

  formatDateddmmyy = (dateEndStr:string) => {
    // Parse the string to a Date object
    const dateEnd = new Date(dateEndStr);
  
    // Check if the date parsing was successful
    if (isNaN(dateEnd.getTime())) {
      throw new Error('Invalid date format');
    }
  
    // Format the date back to a string (assuming original format is YYYY-MM-DD)
    const year = dateEnd.getFullYear();
    const month = String(dateEnd.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const day = String(dateEnd.getDate()).padStart(2, '0');
  
    return `${day}-${month}-${year}`;
  };




  render() {
    const { detail } = this.props;

    return (
      <div
        id="output-report"
        className=" pageMargin w-[210mm] h-[99mm] m-auto p-[0.25in] border border-gray-300  bg-white"
      >
        <table className="table-fixed w-full mt-0 items-center border-collapse border border-slate-300  text-center ">
          <thead>
            <tr>
              <th className="py-1 font-bold uppercase  text-xs text-gray-600 table-cell border border-slate-300 w-1/3">
                <img src={LogoTaka} className=" h-8 w-8 ml-2" alt="" />
              </th>
              <th className="py-1 uppercase  text-gray-600 table-cell border border-slate-300 text-center justify-center w-1/3">
                <div className="flex flex-col text-center align-middle h-full mb-4">
                  <h1 className="font-bold text-xs">FORM CUTI</h1>
                  <h3 className="text-xs font-normal">NO : BRCG/SM/FAO/SC/{new Date().getFullYear().toString()}/{detail?.id}</h3>
                </div>
              </th>
              <th className="py-1 font-bold uppercase  text-xs text-gray-600 table-cell border border-slate-300 text-center w-1/3 ">
                <div className="no__surat flex flex-col align-middle text-center h-full w-full items-center mb-4">
                  <h3>03.001/TAKA/2024</h3>
                </div>
              </th>
            </tr>
          </thead>
        </table>

        <div className="flex mb-2 mt-0">
          <div className="w-1/3 ">
            <div className="footer__sign text-start">
              <h1 className=" font-bold underline text-xs mb-2">
                Dengan ini saya,{' '}
              </h1>
              <h1 className="text-xs">Nama</h1>
              <h1 className="text-xs">NRP</h1>
              <h1 className="text-xs">Bagian / Div / Dept</h1>
              <h1 className="text-xs">Tanggal Cuti</h1>
              <h1 className="text-xs">Masuk Kembali Tanggal</h1>
              <h1 className="text-xs">Keterangan</h1>
            </div>
          </div>
          <div className="w-2/3 ">
            <div className="footer__sign text-start">
              <h1 className="text-white">&#160;</h1>
              <h1 className="text-xs">: {detail ? detail.nama : ''}</h1>
              <h1 className="text-xs">: {detail ? detail.nrp : ''}</h1>
              <h1 className="text-xs">: {detail ? `${detail.position_name} / SUPPLY MANAGEMENT / FUEL AND OIL` : ''}</h1>
              <h1 className="text-xs">: {detail ?  this.formatDateddmmyy(detail.date_start) : ''}</h1>
              <h1 className="text-xs">: {detail ? this.adjustDateEnd(detail.date_end) : ''}</h1>
              <h1 className="text-xs">: {detail ? detail.remark : ''}</h1>
            </div>
          </div>
        </div>

        <div className="mt-4 list__barang h-1/3 w-full block">
          <table className="py-2 table-fixed w-full mt-3 items-start border-collapse border border-slate-300">
            <thead>
              <tr>
                <th className=" font-bold uppercase bg-slate-200 text-xs text-gray-600 table-cell border-slate-300">
                <h1 className='mb-4'>Diajukan</h1>
                </th>
                <th className=" font-bold uppercase bg-slate-200 text-xs text-gray-600 table-cell border-slate-300">
                <h1 className='mb-4'>Disetujui</h1>
                </th>
                <th className=" font-bold uppercase bg-slate-200 text-xs text-gray-600 table-cell border-slate-300">
                <h1 className='mb-4'>Diketahui</h1>
                </th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td className="py-2 font-bold uppercase  text-xs text-gray-600 table-cell border border-slate-300 h-15"></td>
                <td className="py-2 font-bold uppercase  text-xs text-gray-600 table-cell border border-slate-300 h-15"></td>
                <td className="py-2 font-bold uppercase  text-xs text-gray-600 table-cell border border-slate-300 h-15"></td>
              </tr>
              <tr className='text-center align-middle'>
                <td className=" font-bold uppercase  text-xs text-gray-600 table-cell border border-slate-300 h-3 text-center justify-center ">
                  <h1 className='mb-4'>Karyawan</h1>
                </td>
                <td className=" font-bold uppercase  text-xs text-gray-600 table-cell border border-slate-300 h-3 text-center justify-center">
                  <h1 className='mb-4'>SM Section Head</h1>
                </td>
                <td className=" font-bold uppercase  text-xs text-gray-600 table-cell border border-slate-300 h-3 text-center justify-center">
                  <h1 className='mb-4'>PJO / Koordinator TAKA</h1>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }
}

export default HardcopyLeaveLetterTemplate;
