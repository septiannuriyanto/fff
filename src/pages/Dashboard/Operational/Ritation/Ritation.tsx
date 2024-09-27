import React, { useState, useEffect } from 'react';
import DatePickerOne from '../../../../components/Forms/DatePicker/DatePickerOne';
import { formatDateToString } from '../../../../Utils/DateUtility';
import { supabase } from '../../../../db/SupabaseClient';
import RitationAction from '../components/RitationAction';
import toast, { Toaster } from 'react-hot-toast';
import CardDataStats from '../../../../components/CardDataStats';
import { formatNumberWithSeparator } from '../../../../Utils/NumberUtility';
import { constructMessage, shareMessageToWhatsapp } from '../../../../functions/share_message';

const Ritation = () => {
  const [date, setDate] = useState<Date | null>(new Date());
  const [dataRitasi, setDataRitasi] = useState<RitasiFuelData[]>([]);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [expandedImageId, setExpandedImageId] = useState<string | null>(null);
  const [rotationAngle, setRotationAngle] = useState<{ [key: string]: number }>({});
  const [ritationQtyTotal, setRitationQtyTotal] = useState<number>(0);


  const calculateTotalQtySj = (data: RitasiFuelData[]): number => {
    return data.reduce((total, item) => total + item.qty_sj, 0);
  };
  

  const fetchRitationReport = async () => {
    const { data, error } = await supabase
      .from('ritasi_fuel')
      .select(
        `
        *,
        fuelman:manpower!ritasi_fuel_fuelman_id_fkey(nrp, nama),
        operator:manpower!ritasi_fuel_operator_id_fkey(nrp, nama),
        unit:storage!ritasi_fuel_warehouse_id_fkey(warehouse_id, unit_id)
      `,
      )
      .eq('ritation_date', formatDateToString(date!))
      .order('no_surat_jalan');

    if (error) {
      console.log(error);
      return;
    }

    const enrichedData = data.map((item: any) => ({
      ...item,
      fuelman_name: item.fuelman?.nama || 'Unknown',
      operator_name: item.operator?.nama || 'Unknown',
      unit: item.unit?.unit_id || 'Unknown',
    }));

    const totalRitasi = calculateTotalQtySj(enrichedData as RitasiFuelData[])

    setRitationQtyTotal(totalRitasi);

    setDataRitasi(enrichedData as RitasiFuelData[]);
  };

  useEffect(() => {
    fetchRitationReport();
  }, [date]);

  const handleDateChange = async (date: Date | null) => {
    setDate(date);
  };

  const handleApprove = async (id: string) => {
    const targetRow = dataRitasi.find((row) => row.no_surat_jalan === id);

    if (!targetRow) {
      console.error('Row not found');
      return;
    }

    const newValidationState = !targetRow.isValidated;

    const { error } = await supabase
      .from('ritasi_fuel')
      .update({ isValidated: newValidationState })
      .eq('no_surat_jalan', id);

    if (error) {
      console.error('Error updating validation state:', error);
      return;
    }
    toast.success('Approved');
    setDataRitasi((prevRows) =>
      prevRows.map((row) =>
        row.no_surat_jalan === id
          ? { ...row, isValidated: !row.isValidated }
          : row,
      ),
    );
  };


  const handleShare = (row:any)=>{
    const info = constructMessage(row);
    console.log(info);
    shareMessageToWhatsapp(info);
    
    
  }

  const toggleEvidencePanel = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const handleImageClick = (id: string) => {
    setExpandedImageId(expandedImageId === id ? null : id);
    setRotationAngle((prev) => ({
      ...prev,
      [id]: 0,
    }));
  };

  const rotateLeft = (id: string) => {
    setRotationAngle((prev) => ({
      ...prev,
      [id]: (prev[id] || 0) - 90,
    }));
  };

  const rotateRight = (id: string) => {
    setRotationAngle((prev) => ({
      ...prev,
      [id]: (prev[id] || 0) + 90,
    }));
  };

  return (
    <>
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark mb-6">
        <div className="flex flex-wrap items-center">
          <div className="w-full border-stroke dark:border-strokedark xl:border-l-2">
            <div className="w-full p-4 sm:p-12.5 xl:p-5">
              <div className="header block sm:flex">
                <h2 className="mb-2 font-bold text-black dark:text-white sm:text-title-sm w-full">
                  Ritation Dashboard
                </h2>
                <Toaster />
                <DatePickerOne
                  enabled={true}
                  handleChange={handleDateChange}
                  setValue={date ? formatDateToString(new Date(date)) : ''}
                />
              </div>

              <div className="ritation__table w-full">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-4 2xl:gap-7.5">
                <CardDataStats
                title="Ritation Qty (liter)"
                total={ formatNumberWithSeparator(ritationQtyTotal) }
                rate="0.43%"
                levelUpBad
                >
                  <div></div>
                </CardDataStats>
              </div>
                <div className="flex flex-col">
                  <div className="overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 sm:px-6 lg:px-8">
                      <div className="overflow-hidden">
                        <table className="min-w-full text-left text-sm font-light text-surface dark:text-white">
                          <thead className="border-b border-neutral-200 font-medium dark:border-white/10">
                            <tr>
                              <th scope="col" className="px-6 py-4">#</th>
                              <th scope="col" className="px-6 py-4">DO Number</th>
                              <th scope="col" className="px-6 py-4">Operator</th>
                              <th scope="col" className="px-6 py-4">Fuelman</th>
                              <th scope="col" className="px-2 py-4">FT Number</th>
                              <th scope="col" className="px-6 py-4">Before</th>
                              <th scope="col" className="px-6 py-4">After</th>
                              <th scope="col" className="px-6 py-4">Qty</th>
                              <th scope="col" className="px-6 py-4">Evidence</th>
                              <th scope="col" className="px-6 py-4">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dataRitasi.map((row, index) => (
                              <React.Fragment key={index}>
                                <tr
                                  className={`border-b border-neutral-200 transition duration-500 ease-in-out dark:border-white/10 ${
                                    row.isValidated
                                      ? 'bg-green-50 dark:bg-green-900'
                                      : 'hover:bg-neutral-100 dark:hover:bg-neutral-600'
                                  }`}
                                >
                                  <td className="whitespace-nowrap px-6 py-4 font-medium">{index + 1}</td>
                                  <td className="whitespace-nowrap px-6 py-4 font-medium">{row.no_surat_jalan}</td>
                                  <td className="whitespace-nowrap px-6 py-4">
                                    {row.operator_name.split(' ').map((name, index) => (
                                      <div key={index}>{name}</div>
                                    ))}
                                  </td>
                                  <td className="whitespace-nowrap px-6 py-4">
                                    {row.fuelman_name.split(' ').map((name, index) => (
                                      <div key={index}>{name}</div>
                                    ))}
                                  </td>
                                  <td className="whitespace-nowrap px-2 py-4">
                                    {row.unit}<br />({row.warehouse_id})
                                  </td>
                                  <td className="whitespace-nowrap px-6 py-4">{row.qty_flowmeter_before}</td>
                                  <td className="whitespace-nowrap px-6 py-4">{row.qty_flowmeter_after}</td>
                                  <td className="whitespace-nowrap px-6 py-4">{row.qty_sj}</td>
                                  <td className="whitespace-nowrap px-6 py-4">
                                    <button
                                      onClick={() => toggleEvidencePanel(row.no_surat_jalan)}
                                      className="text-blue-500 hover:underline"
                                    >
                                      {expandedRow === row.no_surat_jalan ? 'Hide' : 'View'}
                                    </button>
                                  </td>
                                  <td className="whitespace-nowrap px-6 py-4">
                                    <RitationAction onApprove={() => handleApprove(row.no_surat_jalan)} onShare={()=> handleShare(row)} />
                                  </td>
                                </tr>
                                {/* Toggle evidence panel */}
                                {expandedRow === row.no_surat_jalan && (
                                  <tr>
                                    <td colSpan={9} className="px-6 py-4">
                                      <div className="overflow-hidden transition-max-height duration-500 ease-in-out max-h-[600px] bg-gray-100 dark:bg-gray-800 p-4 rounded">
                                        <div className="flex justify-center space-x-4 relative">
                                          
                                          {/* Loop over the images */}
                                          {['flowmeter_before_url', 'flowmeter_after_url', 'sj_url'].map((urlType, idx) => (
                                            <div
                                              key={idx}
                                              className={`cursor-pointer transition-all duration-300 relative ${
                                                expandedImageId === `${row.no_surat_jalan}-${urlType}`
                                                  ? 'w-full h-auto max-w-full' // Full width when expanded
                                                  : 'w-32 h-32' // Normal size
                                              }`}
                                            >
                                              <img
                                                src={row[urlType]}
                                                alt={urlType}
                                                className={`rounded-md object-cover transition-all duration-300 ${
                                                  expandedImageId === `${row.no_surat_jalan}-${urlType}`
                                                    ? 'scale-100' // Normal scale when expanded
                                                    : 'scale-75' // Smaller scale when collapsed
                                                }`}
                                                onClick={() => handleImageClick(`${row.no_surat_jalan}-${urlType}`)}
                                                style={{
                                                  transform: `rotate(${rotationAngle[`${row.no_surat_jalan}-${urlType}`] || 0}deg)`,
                                                  transition: 'transform 0.5s',
                                                }}
                                              />
                                              
                                              {/* Rotation buttons */}
                                              <div className="absolute top-0 right-0 flex flex-col space-y-2">
                                                <button
                                                  className="bg-yellow-300 p-1 rounded-full"
                                                  onClick={() => rotateLeft(`${row.no_surat_jalan}-${urlType}`)}
                                                >
                                                  &#9664; {/* Rotate left icon */}
                                                </button>
                                                <button
                                                  className="bg-yellow-300 p-1 rounded-full"
                                                  onClick={() => rotateRight(`${row.no_surat_jalan}-${urlType}`)}
                                                >
                                                  &#9654; {/* Rotate right icon */}
                                                </button>
                                              </div>
                                            </div>
                                          ))}
                                          
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}    
                              </React.Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Ritation;
