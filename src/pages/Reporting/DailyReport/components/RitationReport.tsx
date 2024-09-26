import React, { useState, useEffect } from 'react';
import { supabase } from '../../../../db/SupabaseClient';
import Autosuggest from 'react-autosuggest';
import { sendMessageToChannel } from '../../../../services/TelegramSender';
import {
  formatDate,
  formatDateToDdMmyy,
  formatDateToIndonesianByDate,
  formatDateToString,
  formatDateToYyMmDd,
} from '../../../../Utils/DateUtility';
import DropZone from './DropZone';
import { uploadImage } from '../../../../services/ImageUploader';
import { getQtyByHeight } from '../../../../functions/Interpolate';
import LogoIcon from '../../../../images/logo/logo-icon.svg';
import { getNrpFromName } from '../../../../functions/get_nrp';
// Define the types
interface PopulationData {
  unit_id: string;
  warehouse_id: string;
}

interface ManpowerData {
  nama: string;
}

const RitationReport: React.FC = () => {
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

  useEffect(() => {
    const fetchCodeNumbers = async () => {
      const { data, error } = await supabase
        .from('storage')
        .select('unit_id, warehouse_id')
        .order('warehouse_id');
      if (error) {
        console.error(error);
      } else {
        console.log(data);

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

    fetchCodeNumbers();
    fetchFuelman();
    fetchOperator();
  }, []);

  // const getReportNumber = async () => {
  //   const { data, error } = await supabase
  //     .from('ritasi_fuel')
  //     .select('no_surat_jalan')
  //     .eq('ritation_date', formatDateToString(new Date()));

  //   if (error) {
  //     console.error(error);
  //     return;
  //   }
  //   return data.length;
  // };

  // const fetchReportNumber = async () => {
  //   const { data, error } = await supabase
  //     .from('ritasi_fuel')
  //     .select('no_surat_jalan')
  //     .eq('ritation_date', formatDateToString(new Date()));

  //   if (error) {
  //     console.error(error);
  //     return;
  //   }
  //   setReportNumber(data.length);
  // };

  // useEffect(() => {
  //   fetchReportNumber();
  // }, []);

  const normalizeReportNumber = (param: number) => {
    if (param < 10) {
      return `0${param}`;
    } else return param;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const optNrp = await getNrpFromName(operator);
    const fmNrp = await getNrpFromName(fuelman);
    //Set loading screen
    setIsLoading(true);
    //Upload Image
    const flowmeterBeforeUrl = await uploadImage(
      flowmeterBeforeFile!,
      'fm-before',
      `G${formatDateToDdMmyy(new Date())}${normalizeReportNumber(
        parseInt(reportNumber),
      )}`,
    );
    const flowmeterAfterUrl = await uploadImage(
      flowmeterAfterFile!,
      'fm-after',
      `G${formatDateToDdMmyy(new Date())}${normalizeReportNumber(
        parseInt(reportNumber),
      )}`,
    );
    const suratJalanUrl = await uploadImage(
      suratJalanFile!,
      'surat-jalan',
      `G${formatDateToDdMmyy(new Date())}${normalizeReportNumber(
        parseInt(reportNumber),
      )}`,
    );

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
      no_surat_jalan: `G${formatDateToYyMmDd(
        new Date(),
      )}${normalizeReportNumber(parseInt(reportNumber))}`,
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
      flowmeter_before_url: flowmeterBeforeUrl.imageUrl,
      flowmeter_after_url: flowmeterAfterUrl.imageUrl,
      sj_url: suratJalanUrl.imageUrl,
      ritation_date: formatDateToString(new Date()),
    };

    const { error } = await supabase.from('ritasi_fuel').insert([query]);

    if (error) {
      console.error(error);
      alert(error);
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

  const handleFlowmeterBeforeUpload = async (file: File) => {
    setFlowmeterBeforeFile(file);
    // You can add additional logic here, like validating the file or processing it
    console.log('Flowmeter Before Uploaded:', file);
  };
  const handleFlowmeterAfterUpload = (file: File) => {
    setFlowmeterAfterFile(file);
    // You can add additional logic here, like validating the file or processing it
    console.log('Flowmeter After Uploaded:', file);
  };
  const handleSuratJalanUpload = (file: File) => {
    setSuratJalanFile(file);
    // You can add additional logic here, like validating the file or processing it
    console.log('Surat Jalan uploaded:', file);
  };

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

    const no_surat_jalan = `G${formatDateToDdMmyy(
      new Date(),
    )}${normalizeReportNumber(newReportNumber || 0)}`;

    const { data, error } = await supabase
      .from('ritasi_fuel')
      .select(
        'ritation_date,qty_sonding_before, qty_sonding_after, qty_sonding, qty_flowmeter_before, qty_flowmeter_after',
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

    const message = encodeURIComponent(information);

    // WhatsApp API link
    const whatsappUrl = `https://api.whatsapp.com/send?text=${message}`;

    // Open the URL
    window.open(whatsappUrl, '_blank');
  };

  const handleChangeReportNumber = (e:any) =>{
    setReportNumber(e.target.value)
    console.log(e.target.value);
    
  }

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
      <h1 className="text-center text-2xl font-bold mb-5">Input Ritasi</h1>
      <form onSubmit={handleSubmit} className="flex flex-col">

        <div className="header-input flex flex-row w-full gap-4 mb-2">
        <div className="input__sj-number w-full">
          <label htmlFor="input_tera_before_front">Nomor Surat Jalan</label>
          <input
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
                  <img
                    id="fm-before"
                    src={URL.createObjectURL(flowmeterBeforeFile)}
                    alt={flowmeterBeforeFile.name}
                    className="thumbnail w-full h-auto"
                  />
                </div>
              ) : (
                <DropZone
                  id="fm-before"
                  title="Flowmeter Before"
                  onFileUpload={handleFlowmeterBeforeUpload}
                />
              )}
            </div>
            <div className="foto__flowmeter-after w-full">
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
            </div>
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
          className="bg-primary text-white py-2 rounded hover:bg-blue-700"
        >
          Submit
        </button>
      </form>
    </div>
  );
};

export default RitationReport;
