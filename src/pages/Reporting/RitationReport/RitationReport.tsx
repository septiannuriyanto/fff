import React, { useState, useEffect } from 'react';
import { supabase } from '../../../db/SupabaseClient';
import Autosuggest from 'react-autosuggest';
import {
  formatDateToIndonesianByDate,
  formatDateToString,
  formatDateToYyMmDd,
} from '../../../Utils/DateUtility';
import DropZone from '../../../components/DropZones/DropZone';
import {
  baseStorageUrl,
  getFileFromUrl,
  uploadImage,
} from '../../../services/ImageUploader';

import LogoIcon from '../../../images/logo/logo-icon.svg';
import {
  getFTFromWH,
  getNameFromNrp,
  getNrpFromName,
  getWHFromFT,
} from '../../../functions/get_nrp';
import {
  constructMessage,
  shareMessageToWhatsapp,
} from '../../../functions/share_message';
import { normalizeToTwoDigit } from '../../../Utils/NumberUtility';
import { getQtyByHeight } from '../../../functions/Interpolate';
import { useNavigate, useParams } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { LoaderLogoFlex } from '../../../common/Loader/LoaderLogo';
import { Session } from '@supabase/supabase-js';

const RitationReport: React.FC = () => {
  const [fetchedData, setFetchedData] = useState<RitasiFuelData>();
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [reportNumber, setReportNumber] = useState('');
  const [equipNumber, setEquipNumber] = useState<string>('');
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

  const [session, setSession] = useState<Session | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        console.log(session);

        setSession(session);
      } catch (error) {
        console.error('Error fetching session:', error);
      }
    };

    fetchSession();
  }, []);

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
    setFetchedData(data[0]);
    renderFoundData(data);
    return data;
  };

  const renderFoundData = async (data: any) => {
    const foundData = data[0];
    console.log(foundData);
    setReportNumber(
      parseInt(foundData.no_surat_jalan.slice(-2), 10).toString(),
    );
    const ft = await getFTFromWH(foundData.warehouse_id);
    const fuelman = await getNameFromNrp(foundData.fuelman_id);
    const opt = await getNameFromNrp(foundData.operator_id);

    

    setEquipNumber(ft);
    setFuelman(fuelman);
    setOperator(opt);
    setTeraDepanBefore(foundData.sonding_before_front);
    setTeraBelakangBefore(foundData.sonding_before_rear);
    setFlowmeterBefore(foundData.qty_flowmeter_before);
    setTeraDepanAfter(foundData.sonding_after_front);
    setTeraBelakangAfter(foundData.sonding_after_rear);
    setFlowmeterAfter(foundData.qty_flowmeter_after);
    if (foundData.flowmeter_before_url !== null) {
      const imgData = await getFileFromUrl(foundData.flowmeter_before_url);
      setFlowmeterBeforeFile(imgData);
    }
    if (foundData.flowmeter_after_url !== null) {
      const imgData = await getFileFromUrl(foundData.flowmeter_after_url);
      setFlowmeterAfterFile(imgData);
    }
    if (foundData.sj_url !== null) {
      const imgData = await getFileFromUrl(foundData.sj_url);
      setSuratJalanFile(imgData);
    }
  };

  useEffect(() => {
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

    const optNrp = await getNrpFromName(operator);
    const fmNrp = await getNrpFromName(fuelman);
    //Set loading screen

    //Upload Image
    const sjNumber = `G${formatDateToYyMmDd(new Date())}${normalizeToTwoDigit(
      parseInt(reportNumber),
    )}`;
    const imageUrl = `${baseStorageUrl}/${new Date().getFullYear()}/${sjNumber}/`;

    const flowmeterBeforeUrl = `${imageUrl}fm-before`;
    const flowmeterAfterUrl = `${imageUrl}fm-after`;
    const suratJalanUrl = `${imageUrl}surat-jalan`;

    //Count required data
    const flowmeterqty =
      parseFloat(flowmeterAfter) - parseFloat(flowmeterBefore);

    if (flowmeterqty < 0 || flowmeterqty > 20000) {
      console.log('Salah qty');

      toast.error('Cek kembali angka flowmeter anda');
      return;
    }

    const whId = await getWHFromFT(equipNumber);

    console.log(whId);

    //Count the quantities
    const avgQtyBefore =
      (parseFloat(teraDepanBefore) + parseFloat(teraBelakangBefore)) / 2;
    const avgQtyAfter =
      (parseFloat(teraDepanAfter) + parseFloat(teraBelakangAfter)) / 2;

    const qtySondingBefore = (await getQtyByHeight(avgQtyBefore, whId)) || 0;

    const qtySondingAfter = (await getQtyByHeight(avgQtyAfter, whId)) || 0;

    const qtySonding = qtySondingAfter - qtySondingBefore;

    // Construct the query object with data to insert or update

    try {
      if (!session) {
        let query = {
          no_surat_jalan: id,
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
          flowmeter_before_url: fetchedData!.flowmeter_before_url,
          flowmeter_after_url: fetchedData!.flowmeter_after_url,
          sj_url: fetchedData!.sj_url,
          ritation_date:  fetchedData!.ritation_date,
        };
        // Modify the record if there is an active session
        console.log(query);

        const { error } = await supabase
          .from('ritasi_fuel')
          .update(query)
          .eq('no_surat_jalan', query.no_surat_jalan); // Update based on a unique identifier

        if (error) {
          console.error(error.message);
          alert(error.message);
          setIsComplete(false);
          setIsLoading(false);
        } else {
          setIsComplete(true); // Update successful
        }
        navigate('/stockmanagement');
      } else {
        // Insert a new record if no session
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
          ritation_date : formatDateToString(new Date()),
        };

        const { error } = await supabase.from('ritasi_fuel').insert([query]);

        if (error) {
          console.error(error.message);
          alert(error.message);
          setIsComplete(false);
          setIsLoading(false);
        } else {
          setIsComplete(true); // Insertion successful
          navigate(`/reporting/ritation/${sjNumber}`);
        }
      }
    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
    }
  }; //end submit form

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
    localStorage.setItem('fuelman', newValue);
  };
  useEffect(() => {
    const savedFuelman = localStorage.getItem('fuelman');
    if (savedFuelman) {
      setFuelman(savedFuelman);
    }
  }, []); // Empty dependency array means this runs once on mount

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

  const [uploadProgressFmBefore, setUploadProgressFmBefore] = useState<
    number | null
  >(null);
  const [uploadProgressFmAfter, setUploadProgressFmAfter] = useState<
    number | null
  >(null);
  const [uploadProgressSuratJalan, setUploadProgressSuratJalan] = useState<
    number | null
  >(null);

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
        `G${formatDateToYyMmDd(new Date())}${normalizeToTwoDigit(
          parseInt(reportNumber),
        )}`,
        (progress: number) => {
          console.log(progress);

          setUploadProgressFmBefore(progress); // Update upload progress
        },
      );

      if (error) {
        alert(error);
        return;
      }

      if (id) {
        window.location.reload();
      }

      console.log('Flowmeter Before Uploaded:', imageUrl);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file, please try again.');
    } finally {
      setUploadProgressFmBefore(null); // Remove the progress when complete
      toast.success('File Uploaded');
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
        `G${formatDateToYyMmDd(new Date())}${normalizeToTwoDigit(
          parseInt(reportNumber),
        )}`,
        (progress: number) => {
          console.log(progress);

          setUploadProgressFmAfter(progress); // Update upload progress
        },
      );

      if (error) {
        alert(error);
        return;
      }
      if (id) {
        window.location.reload();
      }

      console.log('Flowmeter After Uploaded:', imageUrl);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file, please try again.');
    } finally {
      setUploadProgressFmAfter(null); // Remove the progress when complete
      toast.success('File Uploaded');
    }
  };

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
        `G${formatDateToYyMmDd(new Date())}${normalizeToTwoDigit(
          parseInt(reportNumber),
        )}`,
        (progress: number) => {
          console.log(progress);

          setUploadProgressSuratJalan(progress); // Update upload progress
        },
      );

      if (error) {
        alert(error);
        return;
      }

      if (id) {
        window.location.reload();
      }

      console.log('Surat Jalan Uploaded:', imageUrl);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file, please try again.');
    } finally {
      setUploadProgressSuratJalan(null); // Remove the progress when complete
      toast.success('File Uploaded');
    }
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

  const handleShareReport = async (e: any) => {
    e.preventDefault();
    console.log(id);
    const shareData = await fetchDetailReport(id);
    const info = constructMessage(shareData[0]);
    shareMessageToWhatsapp(info);
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
      <Toaster />
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
                disabled: id && !session ? true : false,
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
                disabled: id && !session ? true : false,
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
                disabled: id && !session ? true : false,
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
                disabled={id && !session ? true : false}
                value={teraDepanBefore}
                onChange={handleTeraDepanBeforeChange}
                pattern="[0-9]*\.?[0-9]*"
                inputMode="decimal"
                type="text"
                className="input_tera_before_front w-full p-2 border rounded mb-2"
              />
              <label htmlFor="input_tera_before_front">Tera Belakang</label>
              <input
                disabled={id && !session ? true : false}
                value={teraBelakangBefore}
                onChange={handleTeraBelakangBeforeChange}
                pattern="[0-9]*\.?[0-9]*"
                inputMode="decimal"
                type="text"
                className="input_tera_before_front w-full p-2 border rounded mb-2"
              />
              <label htmlFor="input__flowmeter-before">Flowmeter Awal</label>
              <input
                disabled={id && !session ? true : false}
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
                disabled={id && !session ? true : false}
                value={teraDepanAfter}
                onChange={handleTeraDepanAfterChange}
                pattern="[0-9]*\.?[0-9]*"
                inputMode="decimal"
                type="text"
                className="input_tera_after_front w-full p-2 border rounded mb-2"
              />
              <label htmlFor="input_tera_after_front">Tera Belakang</label>
              <input
                disabled={id && !session ? true : false}
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
                disabled={id && !session ? true : false}
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
                  <div className="upload-image-container relative">
                    {' '}
                    {/* Add relative positioning here */}
                    {uploadProgressFmBefore !== null && (
                      <div
                        className="absolute upload-overlay z-2 bg-white"
                        style={{
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          height: `${100 - uploadProgressFmBefore}%`, // Gradually decrease height as upload progresses
                          opacity: 1, // Optional: Adjust the opacity to make it semi-transparent
                        }}
                      >
                        <LoaderLogoFlex />
                      </div>
                    )}
                    <img
                      src={URL.createObjectURL(flowmeterBeforeFile)}
                      alt="Flowmeter Before"
                      className="upload-image h-32 w-32 object-contain bg-slate-700 mt-1"
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
                  <div className="upload-image-container relative">
                    {' '}
                    {/* Add relative positioning here */}
                    {uploadProgressFmAfter !== null && (
                      <div
                        className="absolute upload-overlay z-2 bg-white"
                        style={{
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          height: `${100 - uploadProgressFmAfter}%`, // Gradually decrease height as upload progresses
                          opacity: 1, // Optional: Adjust the opacity to make it semi-transparent
                        }}
                      >
                        <LoaderLogoFlex />
                      </div>
                    )}
                    <img
                      src={URL.createObjectURL(flowmeterAfterFile)}
                      alt="Flowmeter After"
                      className="upload-image h-32 w-32 object-contain bg-slate-700 mt-1"
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
            <div className="foto__surat-jalan w-full">
              {suratJalanFile ? (
                <div className="file-preview3">
                  <h2>Uploaded File:</h2>
                  <div className="upload-image-container relative">
                    {' '}
                    {/* Add relative positioning here */}
                    {uploadProgressSuratJalan !== null && (
                      <div
                        className="absolute upload-overlay z-2 bg-white"
                        style={{
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          height: `${100 - uploadProgressSuratJalan}%`, // Gradually decrease height as upload progresses
                          opacity: 1, // Optional: Adjust the opacity to make it semi-transparent
                        }}
                      >
                        <LoaderLogoFlex />
                      </div>
                    )}
                    <img
                      src={URL.createObjectURL(suratJalanFile)}
                      alt="Surat Jalan"
                      className="upload-image h-32 w-32 object-contain bg-slate-700 mt-1"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <DropZone
                    id="surat-jalan"
                    title="Surat Jalan"
                    onFileUpload={handleSuratJalanUpload}
                    uploadProgress={uploadProgressSuratJalan}
                    file={suratJalanFile}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {id ? (
          <div className="flex w-full flex-col gap-2">
            {session ? (
              <button
                type="submit"
                className="bg-green-400 py-2 rounded text-white"
              >
                Edit
              </button>
            ) : (
              <div></div>
            )}
            <button
              onClick={handleShareReport}
              className="bg-slate-400 py-2 text-white"
            >
              Share
            </button>
          </div>
        ) : (
          <button
            type="submit"
            className={`${
              id ? 'bg-green-500' : 'bg-primary'
            } text-white py-2 rounded hover:bg-blue-700`}
          >
            Submit
          </button>
        )}

        {/* <button
          type="submit"
          className={`${
            id ? 'bg-green-500' : 'bg-primary'
          } text-white py-2 rounded hover:bg-blue-700`}
        >
          {id ? `Update` : `Submit`}
        </button> */}
      </form>
    </div>
  );
};

export default RitationReport;
