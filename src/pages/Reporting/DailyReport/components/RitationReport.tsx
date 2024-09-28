import React, { useState, useEffect } from 'react';
import { supabase } from '../../../../db/SupabaseClient';
import Autosuggest from 'react-autosuggest';
import { sendMessageToChannel } from '../../../../services/TelegramSender';
import {
  formatDate,
  formatDateToIndonesianByDate,
  formatDateToString,
  formatDateToYyMmDd,
} from '../../../../Utils/DateUtility';
import DropZone from './DropZone';
import { baseStorageUrl, getFileFromUrl, uploadImage } from '../../../../services/ImageUploader';

import LogoIcon from '../../../../images/logo/logo-icon.svg';
import { getNrpFromName } from '../../../../functions/get_nrp';
import { shareMessageToWhatsapp } from '../../../../functions/share_message';
import { normalizeToTwoDigit } from '../../../../Utils/NumberUtility';
import { getQtyByHeight } from '../../../../functions/Interpolate';
import { useParams } from 'react-router-dom';
// Define the types
interface PopulationData {
  unit_id: string;
  warehouse_id: string;
}

interface ManpowerData {
  nama: string;
}

const RitationReport: React.FC = () => {

  
  const [fetchedData, setFetchedData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [reportNumber, setReportNumber] = useState('');
  const [equipNumber, setEquipNumber] = useState<string>('');
  const [pressurelessCondition, setPressurelessCondition] = useState<number>(1);
  const [reportBy, setReportBy] = useState<string>('');
  const [fuelman, setFuelman] = useState<string>('');
  const [operator, setOperator] = useState<string>('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [codeNumbers, setCodeNumbers] = useState<string[]>([]);
  const [warehouses, setWarehouses] = useState<string[]>([]);
  const [fuelmanSuggestions, setFuelmanSuggestions] = useState<string[]>([]);
  const [operatorSuggestions, setOperatorSuggestions] = useState<string[]>([]);

  const [fuelmen, setFuelmen] = useState<string[]>([]);
  const [operators, setOperators] = useState<string[]>([]);

  const { id } = useParams<{ id: string }>();



  useEffect(() => {
    const fetchDetailReport = async (id: string) => {
      const { data, error } = await supabase
        .from('ritasi_fuel')
        .select('*')
        .eq('no_surat_jalan', id);
      if (error) {
        console.error(error);
        return;
      }
      if (data.length == 0) {
        console.log('No Data Found!');
        return;
      }
      renderFoundData(data);
      setFetchedData(data);
    };

    const renderFoundData = async (data: any) => {
      const foundData = data[0];
      console.log(foundData);
      setReportNumber(
        parseInt(foundData.no_surat_jalan.slice(-2), 10).toString(),
      );
      setEquipNumber(foundData.warehouse_id);
      setFuelman(foundData.fuelman_id);
      setOperator(foundData.operator_id);
      setTeraDepanBefore(foundData.sonding_before_front);
      setTeraBelakangBefore(foundData.sonding_before_rear);
      setFlowmeterBefore(foundData.qty_flowmeter_before);
      setTeraDepanAfter(foundData.sonding_after_front);
      setTeraBelakangAfter(foundData.sonding_after_rear);
      setFlowmeterAfter(foundData.qty_flowmeter_after);
      if (foundData.flowmeter_before_url !== null) {
        setFlowmeterBeforeFile(
          await getFileFromUrl(foundData.flowmeter_before_url),
        );
      }
      if (foundData.flowmeter_after_url !== null) {
        setFlowmeterAfterFile(
          await getFileFromUrl(foundData.flowmeter_after_url),
        );
      }
      if (foundData.sj_url !== null) {
        setSuratJalanFile(await getFileFromUrl(foundData.sj_url));
      }
    };

    const fetchCodeNumbers = async () => {
      const { data, error } = await supabase
        .from('storage')
        .select('unit_id, warehouse_id')
        .order('warehouse_id');
      if (error) {
        console.error(error);
      } else {
        const units = data?.map((item) => item.unit_id) || [];
        const whs = data?.map((item) => item.warehouse_id) || [];

        setCodeNumbers(units);
        setWarehouses(whs);
      }
    };

    const fetchFuelman = async () => {
      const { data, error } = await supabase
        .from('manpower')
        .select('nama')
        .eq('position', 5);

      if (error) {
        console.error(error);
      } else {
        setFuelmen(data?.map((item) => item.nama) || []);
      }
    };
    const fetchOperator = async () => {
      const { data, error } = await supabase
        .from('manpower')
        .select('nama')
        .eq('position', 4);

      if (error) {
        console.error(error);
      } else {
        setOperators(data?.map((item) => item.nama) || []);
      }
    };

    if (id) {
      fetchDetailReport(id);
      return;
    }

    fetchCodeNumbers();
    fetchFuelman();
    fetchOperator();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (id) {
      console.log('Updating Records');

      return;
    }

    const optNrp = await getNrpFromName(operator);
    const fmNrp = await getNrpFromName(fuelman);
    //Set loading screen
    setIsLoading(true);
    //Upload Image
    const sjNumber = `G${formatDateToYyMmDd(new Date())}${normalizeToTwoDigit(
        parseInt(reportNumber),
      )}`;
    const imageUrl = `${baseStorageUrl}${new Date().getFullYear()}/${sjNumber}/`;

    const flowmeterBeforeUrl = `${imageUrl}/fm-before`;
    const flowmeterAfterUrl = `${imageUrl}/fm-after`;
    const suratJalanUrl = `${imageUrl}/surat-jalan`;

    //Count required data
    const flowmeterqty =
      parseFloat(flowmeterAfter) - parseFloat(flowmeterBefore);
    const whId = findWarehouseId(equipNumber);

    //Count the quantities
    const avgQtyBefore =
      (parseFloat(teraDepanBefore) + parseFloat(teraBelakangBefore)) / 2;
    const avgQtyAfter =
      (parseFloat(teraDepanAfter) + parseFloat(teraBelakangAfter)) / 2;
    const qtySondingBefore = (await getQtyByHeight(avgQtyBefore, whId)) || 0;
    const qtySondingAfter = (await getQtyByHeight(avgQtyAfter, whId)) || 0;
    const qtySonding = qtySondingAfter - qtySondingBefore;

    //construct the query
    let query = {
      no_surat_jalan: `G${formatDateToYyMmDd(new Date())}${normalizeToTwoDigit(
        parseInt(reportNumber),
      )}`,
      queue_num: parseInt(reportNumber),
      warehouse_id: whId,
      operator_id: optNrp,
      fuelman_id: fmNrp,
      qty_sj: flowmeterqty,
      qty_flowmeter_before: flowmeterBefore,
      qty_flowmeter_after: flowmeterAfter,
      qty_sonding: qtySonding,
      qty_sonding_before: qtySondingBefore,
      qty_sonding_after: qtySondingAfter,
      sonding_before_front: teraDepanBefore,
      sonding_before_rear: teraBelakangBefore,
      sonding_after_front: teraDepanAfter,
      sonding_after_rear: teraBelakangAfter,
      flowmeter_before_url: flowmeterBeforeUrl,
      flowmeter_after_url: flowmeterAfterUrl,
      sj_url: suratJalanUrl,
      ritation_date: formatDateToString(new Date()),
    };

    const { error } = await supabase.from('ritasi_fuel').insert([query]);

    if (error) {
      console.error(error.message);
      alert(error.message);
      setIsComplete(false);
      setIsLoading(false);
    } else {
      //Ditch loading screen
      setIsComplete(true);

      // setEquipNumber('');
      // setPressurelessCondition(1);
      // setReportBy('');
      // const message = `PRESSURELESS REPORT\n\nLast Checked :${formatDate(
      //   Date.now(),
      // )}\nReported by : ${reportBy}\nUnit : ${equipNumber}\nCondition : ${pressurelessCondition}\nVisit : https://fff-project.vercel.app/pressureless`;
      // sendMessageToChannel(message);
    }
  };

  //SUGGESTION GETTER & RENDERER
  const getSuggestions = (value: string, list: string[]): string[] => {
    const inputValue = value.trim().toUpperCase();
    const inputLength = inputValue.length;

    return inputLength === 0
      ? []
      : list.filter((item) => item.slice(0, inputLength) === inputValue);
  };
  const getSuggestionValue = (suggestion: string): string => suggestion;
  const renderSuggestion = (suggestion: string) => <div>{suggestion}</div>;

  //SUGGESTION FETCH REQUEST
  const onSuggestionsFetchRequested = ({ value }: { value: string }) => {
    setSuggestions(getSuggestions(value, codeNumbers));
  };

  const onFuelmanSuggestionsFetchRequested = ({ value }: { value: string }) => {
    setFuelmanSuggestions(getSuggestions(value, fuelmen));
  };

  const onOperatorSuggestionsFetchRequested = ({
    value,
  }: {
    value: string;
  }) => {
    setOperatorSuggestions(getSuggestions(value, operators));
  };

  //SUGGESTION CLEAR REQUEST
  const onSuggestionsClearRequested = () => {
    setSuggestions([]);
  };

  const onFuelmanSuggestionsClearRequested = () => {
    setFuelmanSuggestions([]);
  };
  const onOperatorSuggestionsClearRequested = () => {
    setOperatorSuggestions([]);
  };

  const onEquipNumberChange = (
    event: React.FormEvent<HTMLElement>,
    { newValue }: { newValue: string },
  ) => {
    setEquipNumber(newValue);
  };

  const findWarehouseId = (unitId: string) => {
    const result = codeNumbers.indexOf(unitId);
    return warehouses[result]; // Return the warehouse_id or null if not found
  };

  const onFuelmanChange = (
    event: React.FormEvent<HTMLElement>,
    { newValue }: { newValue: string },
  ) => {
    setFuelman(newValue);
  };

  const onOperatorChange = (
    event: React.FormEvent<HTMLElement>,
    { newValue }: { newValue: string },
  ) => {
    setOperator(newValue);
  };

  //HANDLE PICTURES UPLOAD
  const [flowmeterBeforeFile, setFlowmeterBeforeFile] = useState<File | null>(
    null,
  );
  const [flowmeterAfterFile, setFlowmeterAfterFile] = useState<File | null>(
    null,
  );
  const [suratJalanFile, setSuratJalanFile] = useState<File | null>(null);

  const [uploadProgressFmBefore, setUploadProgressFmBefore] = useState<number | null>(null);
  const [uploadProgressFmAfter, setUploadProgressFmAfter] = useState<number | null>(null);
  const [uploadProgressSuratJalan, setUploadProgressSuratJalan] = useState<number | null>(null);

  const handleFlowmeterBeforeUpload = async (file: File) => {
    if (!reportNumber) {
      alert('Isikan nomor surat jalan terlebih dahulu');
      return;
    }
  
    setFlowmeterBeforeFile(file);
    setUploadProgressFmBefore(0); // Set initial progress to 0
  
    try {
      const { imageUrl, error } = await uploadImage(
        file,
        'fm-before',
        `G${formatDateToYyMmDd(new Date())}${normalizeToTwoDigit(parseInt(reportNumber))}`,
        (progress: number) => {
          console.log(progress);
          
          setUploadProgressFmBefore(progress); // Update upload progress
        }
      );
  
      if (error) {
        alert(error);
        return;
      }
  
      console.log('Flowmeter Before Uploaded:', imageUrl);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file, please try again.');
    } finally {
      setUploadProgressFmBefore(null); // Remove the progress when complete
    }
  };
  
  const handleFlowmeterAfterUpload = async (file: File) => {
    if (!reportNumber) {
      alert('Isikan nomor surat jalan terlebih dahulu');
      return;
    }
  
    setFlowmeterAfterFile(file);
    setUploadProgressFmAfter(0); // Set initial progress to 0
  
    try {
      const { imageUrl, error } = await uploadImage(
        file,
        'fm-after',
        `G${formatDateToYyMmDd(new Date())}${normalizeToTwoDigit(parseInt(reportNumber))}`,
        (progress: number) => {
          console.log(progress);
          
          setUploadProgressFmAfter(progress); // Update upload progress
        }
      );
  
      if (error) {
        alert(error);
        return;
      }
  
      console.log('Flowmeter After Uploaded:', imageUrl);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file, please try again.');
    } finally {
      setUploadProgressFmAfter(null); // Remove the progress when complete
    }
  };
  // const handleFlowmeterAfterUpload = (file: File) => {
  //   setFlowmeterAfterFile(file);
  //   // You can add additional logic here, like validating the file or processing it
  //   console.log('Flowmeter After Uploaded:', file);
  // };

  const handleSuratJalanUpload = async (file: File) => {
    if (!reportNumber) {
      alert('Isikan nomor surat jalan terlebih dahulu');
      return;
    }
  
    setSuratJalanFile(file);
    setUploadProgressSuratJalan(0); // Set initial progress to 0
  
    try {
      const { imageUrl, error } = await uploadImage(
        file,
        'surat-jalan',
        `G${formatDateToYyMmDd(new Date())}${normalizeToTwoDigit(parseInt(reportNumber))}`,
        (progress: number) => {
          console.log(progress);
          
          setUploadProgressSuratJalan(progress); // Update upload progress
        }
      );
  
      if (error) {
        alert(error);
        return;
      }
  
      console.log('Surat Jalan Uploaded:', imageUrl);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file, please try again.');
    } finally {
      setUploadProgressSuratJalan(null); // Remove the progress when complete
    }
  };

  // const handleSuratJalanUpload = (file: File) => {
  //   setSuratJalanFile(file);
  //   // You can add additional logic here, like validating the file or processing it
  //   console.log('Surat Jalan uploaded:', file);
  // };

  //HANDLE RITATION DATA
  const [teraDepanBefore, setTeraDepanBefore] = React.useState('');
  const [teraDepanAfter, setTeraDepanAfter] = React.useState('');
  const [teraBelakangBefore, setTeraBelakangBefore] = React.useState('');
  const [teraBelakangAfter, setTeraBelakangAfter] = React.useState('');
  const [flowmeterBefore, setFlowmeterBefore] = React.useState('');
  const [flowmeterAfter, setFlowmeterAfter] = React.useState('');

  const handleTeraDepanBeforeChange = (event: any) => {
    const newValue = event.target.value;
    // Only allow numbers and periods
    if (/^[0-9]*\.?[0-9]*$/.test(newValue) || newValue === '') {
      setTeraDepanBefore(newValue);
    }
  };
  const handleTeraDepanAfterChange = (event: any) => {
    const newValue = event.target.value;
    // Only allow numbers and periods
    if (/^[0-9]*\.?[0-9]*$/.test(newValue) || newValue === '') {
      setTeraDepanAfter(newValue);
    }
  };
  const handleTeraBelakangBeforeChange = (event: any) => {
    const newValue = event.target.value;
    // Only allow numbers and periods
    if (/^[0-9]*\.?[0-9]*$/.test(newValue) || newValue === '') {
      setTeraBelakangBefore(newValue);
    }
  };
  const handleTeraBelakangAfterChange = (event: any) => {
    const newValue = event.target.value;
    // Only allow numbers and periods
    if (/^[0-9]*\.?[0-9]*$/.test(newValue) || newValue === '') {
      setTeraBelakangAfter(newValue);
    }
  };
  const handleFlowmeterBeforeChange = (event: any) => {
    const newValue = event.target.value;
    // Only allow numbers and periods
    if (/^[0-9]*\.?[0-9]*$/.test(newValue) || newValue === '') {
      setFlowmeterBefore(newValue);
    }
  };
  const handleFlowmeterAfterChange = (event: any) => {
    const newValue = event.target.value;
    // Only allow numbers and periods
    if (/^[0-9]*\.?[0-9]*$/.test(newValue) || newValue === '') {
      setFlowmeterAfter(newValue);
    }
  };

  const handleShareInformation = async (e: any) => {
    e.preventDefault();
    const newReportNumber = parseInt(reportNumber);

    const no_surat_jalan = `G${formatDateToYyMmDd(
      new Date(),
    )}${normalizeToTwoDigit(newReportNumber || 0)}`;

    const { data, error } = await supabase
      .from('ritasi_fuel')
      .select(
        'ritation_date, qty_sonding_before, qty_sonding_after, qty_sonding, qty_flowmeter_before, qty_flowmeter_after',
      )
      .eq('no_surat_jalan', no_surat_jalan);

    if (error) {
      alert(error.message);
      return;
    }
    console.log(no_surat_jalan);

    console.log(data);

    const flowmeterqty =
      parseFloat(flowmeterAfter) - parseFloat(flowmeterBefore);

    const url = `https://fff-project.vercel.app/reporting/ritation/${no_surat_jalan}`;

    const averageTeraBefore =
      (parseFloat(teraDepanBefore) + parseFloat(teraBelakangBefore)) / 2;
    const averageTeraAfter =
      (parseFloat(teraDepanAfter) + parseFloat(teraBelakangAfter)) / 2;
    const information = `LAPORAN RITASI\n
    *====== Data Ritasi =======*
    Tanggal : ${formatDateToIndonesianByDate(new Date(data[0].ritation_date))}
    No. Surat jalan : ${no_surat_jalan}
    Fuel Truck : ${equipNumber}
    Operator : ${operator}
    Fuelman : ${fuelman}
    *====== Sonding Before =======*
    Depan : ${teraDepanBefore} cm
    Belakang : ${teraBelakangBefore} cm
    Rata-Rata : ${averageTeraBefore} cm
    Qty : ${data[0].qty_sonding_before} liter
    *====== Sonding After =======*
    Depan : ${teraDepanAfter} cm
    Belakang : ${teraBelakangAfter} cm
    Rata-Rata : ${averageTeraAfter} cm
    Qty : ${data[0].qty_sonding_after} liter
    *====== Flowmeter =======*
    Before : ${data[0].qty_flowmeter_before}
    After : ${data[0].qty_flowmeter_after}
    Selisih : ${
      data[0].qty_flowmeter_after - data[0].qty_flowmeter_before
    } liter
    *====== Summary =======*
    Qty by Sonding ${data[0].qty_sonding} liter
    Qty by SJ : ${flowmeterqty} liter
    \nDetail : ${url}
    `;

    shareMessageToWhatsapp(information);
  };

  const handleChangeReportNumber = (e: any) => {
    setReportNumber(e.target.value);
    console.log(e.target.value);
  };

  return isLoading ? (
    <div>
      <div className="flex flex-col">
        <div className="flex h-screen items-center justify-center bg-white">
          {isComplete ? (
            <div></div>
          ) : (
            <div className="h-32 w-32 animate-spin rounded-full border-4 border-solid border-black border-t-transparent z-1 absolute m-auto"></div>
          )}
          <div className="flex justify-center items-center">
            <img
              className="align-middle h-12 z-99 absolute m-auto"
              src={LogoIcon}
              alt=""
            />

            <div className="relative top-25 text-center">
              <h1 className="font-bold text-black">
                Fuel Feasibility for Fleet
              </h1>
              {isComplete ? (
                <div>
                  <h1 className="mt-3">
                    Selesai, silahkan share ke group dengan klik tombol di bawah
                  </h1>
                  <button
                    onClick={handleShareInformation}
                    className="bg-primary text-white py-2 rounded hover:bg-blue-700 w-full"
                  >
                    Share
                  </button>
                </div>
              ) : (
                <h4>Now Loading....</h4>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div className="max-w-lg mx-auto p-5 font-sans bg-white dark:bg-boxdark">
      <h1 className="text-center text-2xl font-bold mb-5">
        {id ? `Update Ritasi` : `Input Ritasi`}
      </h1>
      <form onSubmit={handleSubmit} className="flex flex-col">
        <div className="header-input flex flex-row w-full gap-4 mb-2">
          <div className="input__sj-number w-full">
            <label htmlFor="input_tera_before_front">Nomor Surat Jalan</label>
            <input
              disabled={id ? true : false}
              value={reportNumber}
              onChange={handleChangeReportNumber}
              pattern="[0-9]*\.?[0-9]*"
              inputMode="decimal"
              type="text"
              className="input_tera_before_front w-full p-2 border rounded"
            />
          </div>
          <div className=" w-full">
            <label className="block text-gray-700">Nomor FT :</label>
            <Autosuggest
              suggestions={suggestions}
              onSuggestionsFetchRequested={onSuggestionsFetchRequested}
              onSuggestionsClearRequested={onSuggestionsClearRequested}
              getSuggestionValue={getSuggestionValue}
              renderSuggestion={renderSuggestion}
              inputProps={{
                placeholder: 'Ketik Kode Unit',
                value: equipNumber,
                onChange: onEquipNumberChange,
                className: 'w-full p-2  border rounded',
                required: true,
              }}
              theme={{
                container: 'relative',
                suggestionsContainerOpen:
                  'absolute z-10 mt-1 w-full bg-white border rounded shadow-lg',
                suggestion: 'p-2 hover:bg-gray-200',
                suggestionHighlighted: 'bg-gray-300',
                input: 'w-full p-2 border rounded',
              }}
            />
          </div>
        </div>

        <div className="data_menpower-ritasi flex flex-row justify-between grow gap-4 mb-4">
          <div className="w-full">
            <label className="block text-gray-700">Fuelman:</label>
            <Autosuggest
              suggestions={fuelmanSuggestions}
              onSuggestionsFetchRequested={onFuelmanSuggestionsFetchRequested}
              onSuggestionsClearRequested={onFuelmanSuggestionsClearRequested}
              getSuggestionValue={getSuggestionValue}
              renderSuggestion={renderSuggestion}
              inputProps={{
                placeholder: 'Ketik dan pilih nama',
                value: fuelman,
                onChange: onFuelmanChange,
                className: 'w-full p-2 mt-1 border rounded',
                required: true,
              }}
              theme={{
                container: 'relative',
                suggestionsContainerOpen:
                  'absolute z-10 mt-1 w-full bg-white border rounded shadow-lg',
                suggestion: 'p-2 hover:bg-gray-200',
                suggestionHighlighted: 'bg-gray-300',
                input: 'w-full p-2 border rounded',
              }}
            />
          </div>
          <div className="w-full">
            <label className="block text-gray-700">Operator:</label>
            <Autosuggest
              suggestions={operatorSuggestions}
              onSuggestionsFetchRequested={onOperatorSuggestionsFetchRequested}
              onSuggestionsClearRequested={onOperatorSuggestionsClearRequested}
              getSuggestionValue={getSuggestionValue}
              renderSuggestion={renderSuggestion}
              inputProps={{
                placeholder: 'Ketik dan pilih nama',
                value: operator,
                onChange: onOperatorChange,
                className: 'w-full p-2 mt-1 border rounded',
                required: true,
              }}
              theme={{
                container: 'relative',
                suggestionsContainerOpen:
                  'absolute z-10 mt-1 w-full bg-white border rounded shadow-lg',
                suggestion: 'p-2 hover:bg-gray-200',
                suggestionHighlighted: 'bg-gray-300',
                input: 'w-full p-2 border rounded',
              }}
            />
          </div>
        </div>
        <div className="mb-4">
          <div className="data_menpower-ritasi flex flex-row justify-between grow gap-4 mb-4">
            <div className="input__tera-before w-full ">
              <h1 className="block text-gray-700 my-6">
                Data Sebelum Top up :
              </h1>
              <label htmlFor="input_tera_before_front">Tera Depan</label>
              <input
                value={teraDepanBefore}
                onChange={handleTeraDepanBeforeChange}
                pattern="[0-9]*\.?[0-9]*"
                inputMode="decimal"
                type="text"
                className="input_tera_before_front w-full p-2 border rounded mb-2"
              />
              <label htmlFor="input_tera_before_front">Tera Belakang</label>
              <input
                value={teraBelakangBefore}
                onChange={handleTeraBelakangBeforeChange}
                pattern="[0-9]*\.?[0-9]*"
                inputMode="decimal"
                type="text"
                className="input_tera_before_front w-full p-2 border rounded mb-2"
              />
              <label htmlFor="input__flowmeter-before">Flowmeter Awal</label>
              <input
                value={flowmeterBefore}
                onChange={handleFlowmeterBeforeChange}
                pattern="[0-9]*\.?[0-9]*"
                inputMode="decimal"
                type="text"
                className="input__flowmeter-before w-full p-2 border rounded mb-2"
              />
            </div>

            <div className="input__tera-after w-full">
              <h1 className="block text-gray-700 my-6">
                Data Setelah Top up :
              </h1>
              <label htmlFor="input_tera_after_front">Tera Depan</label>
              <input
                value={teraDepanAfter}
                onChange={handleTeraDepanAfterChange}
                pattern="[0-9]*\.?[0-9]*"
                inputMode="decimal"
                type="text"
                className="input_tera_after_front w-full p-2 border rounded mb-2"
              />
              <label htmlFor="input_tera_after_front">Tera Belakang</label>
              <input
                value={teraBelakangAfter}
                onChange={handleTeraBelakangAfterChange}
                pattern="[0-9]*\.?[0-9]*"
                inputMode="decimal"
                type="text"
                className="input_tera_after_front w-full p-2 border rounded mb-2"
              />
              <label htmlFor="input__flowmeter-before-front">
                Flowmeter Akhir
              </label>
              <input
                value={flowmeterAfter}
                onChange={handleFlowmeterAfterChange}
                inputMode="decimal"
                type="text"
                className="input__flowmeter-after w-full p-2 border rounded mb-2"
              />
            </div>
          </div>
          <div className="data_menpower-ritasi flex flex-row justify-between grow gap-4 mb-4">
            <div className="foto__flowmeter-before w-full">

              {flowmeterBeforeFile ? (
                <div className="file-preview1">
                <h2>Uploaded File:</h2>
                <div className="upload-image-container relative"> {/* Add relative positioning here */}
                  {uploadProgressFmBefore !== null && (
                    <div
                      className="absolute upload-overlay z-2 bg-white"
                      style={{
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        height: `${100 - uploadProgressFmBefore}%`, // Gradually decrease height as upload progresses
                        opacity: 0.5, // Optional: Adjust the opacity to make it semi-transparent
                      }}
                    ></div>
                  )}
              
                  <img
                    src={URL.createObjectURL(flowmeterBeforeFile)}
                    alt="Flowmeter Before"
                    className="upload-image"
                  />
                </div>
              </div>
              
              ) : (
                <div>
                  <DropZone
                    id="fm-before"
                    title="Flowmeter Before"
                    onFileUpload={handleFlowmeterBeforeUpload}
                    uploadProgress={uploadProgressFmBefore}
                    file={flowmeterBeforeFile}
                  />
                </div>
              )}

            </div>
            {/* //============================================================================================ */}
            <div className="foto__flowmeter-after w-full">

              {flowmeterAfterFile ? (
                <div className="file-preview2">
                <h2>Uploaded File:</h2>
                <div className="upload-image-container relative"> {/* Add relative positioning here */}
                  {uploadProgressFmAfter !== null && (
                    <div
                      className="absolute upload-overlay z-2 bg-white"
                      style={{
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        height: `${100 - uploadProgressFmAfter}%`, // Gradually decrease height as upload progresses
                        opacity: 0.5, // Optional: Adjust the opacity to make it semi-transparent
                      }}
                    ></div>
                  )}
              
                  <img
                    src={URL.createObjectURL(flowmeterAfterFile)}
                    alt="Flowmeter After"
                    className="upload-image"
                  />
                </div>
              </div>
              
              ) : (
                <div>
                  <DropZone
                    id="fm-after"
                    title="Flowmeter After"
                    onFileUpload={handleFlowmeterAfterUpload}
                    uploadProgress={uploadProgressFmAfter}
                    file={flowmeterAfterFile}
                  />
                </div>
              )}
              
            </div>
            {/* //============================================================================================ */}
            {/* <div className="foto__flowmeter-after w-full">
              {flowmeterAfterFile ? (
                <div className="file-preview2">
                  <h2>Uploaded File:</h2>
                  <img
                    id="fm-after"
                    src={URL.createObjectURL(flowmeterAfterFile)}
                    alt={flowmeterAfterFile.name}
                    className="thumbnail w-full h-auto"
                  />
                </div>
              ) : (
                <DropZone
                  id="fm-after"
                  title="Flowmeter After"
                  onFileUpload={handleFlowmeterAfterUpload}
                />
              )}
            </div> */}
            {/* //============================================================================================ */}
            <div className="foto__surat-jalan w-full">
              {suratJalanFile ? (
                <div className="file-preview3">
                  <h2>Uploaded File:</h2>
                  <img
                    id="surat-jalan"
                    src={URL.createObjectURL(suratJalanFile)}
                    alt={suratJalanFile.name}
                    className="thumbnail w-full h-auto"
                  />
                </div>
              ) : (
                <DropZone
                  id="surat-jalan"
                  title="Surat Jalan"
                  onFileUpload={handleSuratJalanUpload}
                />
              )}
            </div>
          </div>
        </div>

        <button
          type="submit"
          className={`${
            id ? 'bg-green-500' : 'bg-primary'
          } text-white py-2 rounded hover:bg-blue-700`}
        >
          {id ? `Update` : `Submit`}
        </button>
      </form>
    </div>
  );
};

export default RitationReport;
