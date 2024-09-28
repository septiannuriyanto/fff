import React, { useState, useEffect } from 'react';
import DatePickerOne from '../../../../components/Forms/DatePicker/DatePickerOne';
import {
  convertDateToYYMM,
  convertDateToYYYYMM,
  formatDateToString,
} from '../../../../Utils/DateUtility';
import { supabase } from '../../../../db/SupabaseClient';
import RitationAction from '../components/RitationAction';
import toast, { Toaster } from 'react-hot-toast';
import { formatNumberWithSeparator } from '../../../../Utils/NumberUtility';
import {
  constructMessage,
  shareMessageToWhatsapp,
} from '../../../../functions/share_message';
import RitationSubtotalByFTChart from '../components/RitationSubtotalByFTChart';
import LeftRightPanel from '../../../../components/LeftRightPanel';
import LeftRightEnhancedPanel from '../../../../components/LeftRightEnhancedPanel';
import RitationValidationChart from '../components/RitationValidationChart';
import DailyRitationChart from '../components/DailyRitationChart';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faRotateLeft,
  faRotateRight,
  faUpload,
} from '@fortawesome/free-solid-svg-icons';
import {
  baseStorageUrl,
  uploadImage,
} from '../../../../services/ImageUploader';
import { Link } from 'react-router-dom';

const Ritation = () => {
  const [date, setDate] = useState<Date | null>(new Date());
  const [dataRitasi, setDataRitasi] = useState<RitasiFuelData[]>([]);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [expandedImageId, setExpandedImageId] = useState<string | null>(null);
  const [rotationAngle, setRotationAngle] = useState<{ [key: string]: number }>(
    {},
  );
  const [ritationQtyPlan, setRitationQtyPlan] = useState<number>(0);
  const [ritationQtyTotal, setRitationQtyTotal] = useState<number>(0);
  const [ritationQtyToday, setRitationQtyToday] = useState<number>(0);
  const [ritationDaily, setRitationDaily] = useState<Record<string, number>>(
    {},
  );

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

    const totalRitasi = calculateTotalQtySj(enrichedData as RitasiFuelData[]);

    setRitationQtyToday(totalRitasi);

    setDataRitasi(enrichedData as RitasiFuelData[]);
  };

  const fetchRitationPlan = async () => {
    const period = convertDateToYYYYMM(new Date());
    const { data, error } = await supabase
      .from('plan_order')
      .select('plan_fuel_ob, plan_fuel_coal')
      .eq('period', period);
    if (error) {
      console.log(error.message);
      return;
    }
    const totalPlan = data[0].plan_fuel_ob + data[0].plan_fuel_coal;
    setRitationQtyPlan(totalPlan);
  };
  const fetchRitationActual = async () => {
    const period = convertDateToYYMM(new Date());
    const sjFilter = `G${period}%`;

    const { data, error } = await supabase.rpc(
      'rpc_get_total_qty_sj_in_monthly',
      { sj_prefix: sjFilter },
    );

    if (error) {
      console.error('Error fetching data:', error);
      return;
    }

    setRitationQtyTotal(data);
  };

  const fetchRitationActualByDate = async () => {
    const period = convertDateToYYMM(new Date());
    const sjFilter = `G${period}%`;

    const { data, error } = await supabase
      .from('ritasi_fuel')
      .select('qty_sj, ritation_date') // Include ritation_date in the select statement
      .like('no_surat_jalan', sjFilter); // 'G2409%' filters records where sj_number starts with 'G2409'

    if (error) {
      console.error('Error fetching data:', error);
      return;
    }

    // Get the number of days in the current month
    const daysInMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      0,
    ).getDate();

    // Create an array for all dates in the current month
    const allDates: string[] = [];
    for (let day = 2; day <= daysInMonth + 1; day++) {
      const date = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        day,
      );
      allDates.push(date.toISOString().split('T')[0]); // Format as YYYY-MM-DD
    }

    // Group data by ritation_date
    const groupedData = data.reduce<Record<string, number>>((acc, item) => {
      const date = item.ritation_date; // Ensure ritation_date is in a suitable format
      acc[date] = (acc[date] || 0) + item.qty_sj; // Sum qty_sj for this date
      return acc;
    }, {});

    // Prepare final data with 0 values for days without ritation
    const totalByDate = allDates.map((date) => ({
      date,
      total: groupedData[date] || 0, // Use 0 if no data for this date
    }));

    // Set your state with totalByDate
    setRitationDaily(totalByDate);
  };

  useEffect(() => {
    fetchRitationActualByDate();
  }, []);

  useEffect(() => {
    fetchRitationPlan();
    fetchRitationActual();
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

  const handleShare = (row: any) => {
    const info = constructMessage(row);
    console.log(info);
    shareMessageToWhatsapp(info);
  };

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

  function extractFullYear(input: string) {
    // Use a regular expression to match the year part
    const match = input.match(/G(\d{2})/);
    if (match && match[1]) {
      const lastTwoDigits = match[1]; // Extract last two digits
      // Convert to full year by adding 2000 or 2100 depending on the context
      const fullYear = parseInt(lastTwoDigits, 10) + 2000;
      return fullYear; // Return the full year as a number
    }
    return null; // Return null if no match found
  }

  const getFileName = (urlType: string) => {
    if (urlType == 'flowmeter_before_url') {
      return 'fm-before';
    }
    if (urlType == 'flowmeter_after_url') {
      return 'fm-after';
    }
    if (urlType == 'sj_url') {
      return 'surat-jalan';
    } else return null;
  };

  const reuploadImage = async (id: string, urlType: string) => {
    const imgPath = `${baseStorageUrl}/${extractFullYear(id)}/${id}`;

    // Create a file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';

    // Trigger the file selection dialog
    fileInput.click();

    // Handle file selection
    fileInput.onchange = async (event) => {
      const file = event.target.files?.[0]; // Get the selected file
      if (!file) {
        alert('No file selected.');
        return;
      }

      try {
        const { imageUrl, error } = await uploadImage(
          file,
          getFileName(urlType) || 'none',
          id,
          (progress: number) => {
            console.log(progress);
          },
        );

        if (error) {
          alert(error);
          return;
        }

        console.log('File Uploaded:', imageUrl);
      } catch (error) {
        console.error('Error uploading file:', error);
        alert('Error uploading file, please try again.');
      } finally {
        await fetchRitationReport();
      }
    };
  };

  return (
    <>
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark mb-6">
        <div className="flex flex-wrap items-center">
          <div className="w-full border-stroke dark:border-strokedark xl:border-l-2">
            <div className="w-full p-4 sm:p-12.5 xl:p-5">
              <div className="header block sm:flex mb-2">
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
                <DailyRitationChart
                  groupedData={ritationDaily}
                  totalPlan={ritationQtyPlan}
                />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3 2xl:gap-7.5 mt-2">
                  {/* <CardDataStats
                title="Ritation Qty (liter)"
                total={ formatNumberWithSeparator(ritationQtyTotal) }
                rate="0.43%"
                levelUpBad
                >
                  <div></div>
                </CardDataStats> */}
                  <div className="flex flex-col justify-between gap-2">
                    <LeftRightEnhancedPanel
                      panelTitle="Monthly Progress (Liter)"
                      titleLeft="Progress Fulfill"
                      totalLeft={
                        formatNumberWithSeparator(
                          parseFloat(
                            (
                              (ritationQtyTotal / ritationQtyPlan) *
                              100
                            ).toFixed(2),
                          ), // Convert to number after rounding
                        ) + '%'
                      }
                      titleRight="of"
                      totalRightTop={formatNumberWithSeparator(
                        ritationQtyTotal,
                      )}
                      totalRightBottom={formatNumberWithSeparator(
                        ritationQtyPlan,
                      )}
                    />

                    <LeftRightPanel
                      panelTitle="Daily Ritation Stats (Liter)"
                      title1="Ritation Qty (liter)"
                      total1={formatNumberWithSeparator(ritationQtyToday)}
                      title2="Ritation Count"
                      total2={dataRitasi.length.toString()}
                    />
                  </div>

                  <RitationSubtotalByFTChart data={dataRitasi} />
                  <RitationValidationChart data={dataRitasi} />
                </div>
                <div className="flex flex-col">
                  <div className="overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 sm:px-6 lg:px-8">
                      <div className="overflow-hidden">
                        <table className="min-w-full text-left text-sm font-light text-surface dark:text-white">
                          <thead className="border-b border-neutral-200 font-medium dark:border-white/10">
                            <tr>
                              <th scope="col" className="px-6 py-4">
                                #
                              </th>
                              <th scope="col" className="px-6 py-4">
                                DO Number
                              </th>
                              <th scope="col" className="px-6 py-4">
                                Operator
                              </th>
                              <th scope="col" className="px-6 py-4">
                                Fuelman
                              </th>
                              <th scope="col" className="px-2 py-4">
                                FT Number
                              </th>
                              <th scope="col" className="px-6 py-4">
                                Before/After
                              </th>
                              <th scope="col" className="px-6 py-4">
                                Qty
                              </th>
                              <th scope="col" className="px-6 py-4">
                                Evidence
                              </th>
                              <th scope="col" className="px-6 py-4">
                                Action
                              </th>
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
                                  <td className="whitespace-nowrap px-6 py-4 font-medium">
                                    {index + 1}
                                  </td>
                                  <td className="whitespace-nowrap px-6 py-4 font-medium">
                                    <a
                                      href={`/reporting/ritation/${row.no_surat_jalan}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline"
                                    >
                                      {row.no_surat_jalan}
                                    </a>
                                  </td>
                                  <td className="whitespace-nowrap px-6 py-4">
                                    {row.operator_name
                                      .split(' ')
                                      .map((name, index) => (
                                        <div key={index}>{name}</div>
                                      ))}
                                  </td>
                                  <td className="whitespace-nowrap px-6 py-4">
                                    {row.fuelman_name
                                      .split(' ')
                                      .map((name, index) => (
                                        <div key={index}>{name}</div>
                                      ))}
                                  </td>
                                  <td className="whitespace-nowrap px-2 py-4">
                                    {row.unit}
                                    <br />({row.warehouse_id})
                                  </td>
                                  <td className="whitespace-nowrap px-6 py-4 text-right">
                                    {row.qty_flowmeter_before}
                                    <br />
                                    {row.qty_flowmeter_after}
                                  </td>
                                  <td className="whitespace-nowrap px-6 py-4">
                                    {row.qty_sj}
                                  </td>
                                  <td className="whitespace-nowrap px-6 py-4">
                                    <button
                                      onClick={() =>
                                        toggleEvidencePanel(row.no_surat_jalan)
                                      }
                                      className="text-blue-500 hover:underline"
                                    >
                                      {expandedRow === row.no_surat_jalan
                                        ? 'Hide'
                                        : 'View'}
                                    </button>
                                  </td>
                                  <td className="whitespace-nowrap px-6 py-4">
                                    <RitationAction
                                      onApprove={() =>
                                        handleApprove(row.no_surat_jalan)
                                      }
                                      onShare={() => handleShare(row)}
                                    />
                                  </td>
                                </tr>
                                {/* Toggle evidence panel */}
                                {expandedRow === row.no_surat_jalan && (
                                  <tr>
                                    <td colSpan={9} className="px-6 py-4">
                                      <div className="overflow-hidden transition-max-height duration-500 ease-in-out max-h-[600px] bg-gray-100 dark:bg-gray-800 p-4 rounded">
                                        <div className="flex justify-center space-x-4 relative">
                                          {/* Loop over the images */}
                                          {[
                                            'flowmeter_before_url',
                                            'flowmeter_after_url',
                                            'sj_url',
                                          ].map((urlType, idx) => (
                                            <div
                                              key={idx}
                                              className={`cursor-pointer transition-all duration-300 relative ${
                                                expandedImageId ===
                                                `${row.no_surat_jalan}-${urlType}`
                                                  ? 'w-full h-auto max-w-full' // Full width when expanded
                                                  : 'w-32 h-32' // Normal size
                                              }`}
                                            >
                                              <img
                                                src={row[urlType]}
                                                alt={urlType}
                                                className={`rounded-md object-cover transition-all duration-300 ${
                                                  expandedImageId ===
                                                  `${row.no_surat_jalan}-${urlType}`
                                                    ? 'scale-100' // Normal scale when expanded
                                                    : 'scale-75' // Smaller scale when collapsed
                                                }`}
                                                onClick={() =>
                                                  handleImageClick(
                                                    `${row.no_surat_jalan}-${urlType}`,
                                                  )
                                                }
                                                style={{
                                                  transform: `rotate(${
                                                    rotationAngle[
                                                      `${row.no_surat_jalan}-${urlType}`
                                                    ] || 0
                                                  }deg)`,
                                                  transition: 'transform 0.5s',
                                                }}
                                              />

                                              {/* Rotation buttons */}
                                              <div className="absolute top-0 right-0 flex flex-col space-y-2">
                                                <button
                                                  className="bg-yellow-300 p-1 rounded-full"
                                                  onClick={() =>
                                                    rotateLeft(
                                                      `${row.no_surat_jalan}-${urlType}`,
                                                    )
                                                  }
                                                >
                                                  <FontAwesomeIcon
                                                    icon={faRotateLeft}
                                                  />
                                                  {/* Rotate left icon */}
                                                </button>
                                                <button
                                                  className="bg-yellow-300 p-1 rounded-full"
                                                  onClick={() =>
                                                    rotateRight(
                                                      `${row.no_surat_jalan}-${urlType}`,
                                                    )
                                                  }
                                                >
                                                  <FontAwesomeIcon
                                                    icon={faRotateRight}
                                                  />
                                                  {/* Rotate right icon */}
                                                </button>
                                                <button
                                                  className="bg-yellow-300 p-1 rounded-full"
                                                  onClick={() =>
                                                    reuploadImage(
                                                      row.no_surat_jalan,
                                                      urlType,
                                                    )
                                                  }
                                                >
                                                  <FontAwesomeIcon
                                                    icon={faUpload}
                                                  />
                                                  {/* Optionally, you can add text next to the icon */}
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
