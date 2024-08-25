import React, { useState, useEffect } from 'react';
import { supabase } from '../../db/SupabaseClient';
import Autosuggest from 'react-autosuggest';
import { sendMessageToChannel } from '../../services/TelegramSender';
import { formatDate } from '../../Utils/DateUtility';

// Define the types
interface PopulationData {
  code_number: string;
}

interface ManpowerData {
  nama: string;
}

const PressurelessReport: React.FC = () => {
  const [equipNumber, setEquipNumber] = useState<string>('');
  const [pressurelessCondition, setPressurelessCondition] = useState<number>(1);
  const [reportBy, setReportBy] = useState<string>('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [codeNumbers, setCodeNumbers] = useState<string[]>([]);
  const [reportBySuggestions, setReportBySuggestions] = useState<string[]>([]);
  const [names, setNames] = useState<string[]>([]);

  useEffect(() => {
    const fetchCodeNumbers = async () => {
      const { data, error } = await supabase
        .from<PopulationData>('population')
        .select('code_number')
        .eq('pressureless', true);
      if (error) {
        console.error(error);
      } else {
        setCodeNumbers(data?.map((item) => item.code_number) || []);
      }
    };

    const fetchNames = async () => {
      const { data, error } = await supabase
        .from<ManpowerData>('manpower')
        .select('nama');

      if (error) {
        console.error(error);
      } else {
        setNames(data?.map((item) => item.nama) || []);
      }
    };

    fetchCodeNumbers();
    fetchNames();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const { error } = await supabase.from('pressureless_report').insert([
      {
        equip_number: equipNumber,
        pressureless_condition: pressurelessCondition,
        report_by: reportBy,
      },
    ]);

    if (error) {
      console.error(error);
    } else {
      alert('Data successfully submitted');
      setEquipNumber('');
      setPressurelessCondition(1);
      setReportBy('');
      const message =  `PRESSURELESS REPORT\n\nLast Checked :${formatDate(Date.now())}\nReported by : ${reportBy}\nUnit : ${equipNumber}\nCondition : ${pressurelessCondition}\nVisit : https://fff-project.vercel.app/pressureless`;
      sendMessageToChannel(message);
    }
  };

  const getSuggestions = (value: string, list: string[]): string[] => {
    const inputValue = value.trim().toLowerCase();
    const inputLength = inputValue.length;

    return inputLength === 0
      ? []
      : list.filter(
          (item) => item.toLowerCase().slice(0, inputLength) === inputValue,
        );
  };

  const getSuggestionValue = (suggestion: string): string => suggestion;

  const renderSuggestion = (suggestion: string) => <div>{suggestion}</div>;

  const onSuggestionsFetchRequested = ({ value }: { value: string }) => {
    setSuggestions(getSuggestions(value, codeNumbers));
  };

  const onReportBySuggestionsFetchRequested = ({
    value,
  }: {
    value: string;
  }) => {
    setReportBySuggestions(getSuggestions(value, names));
  };

  const onSuggestionsClearRequested = () => {
    setSuggestions([]);
  };

  const onReportBySuggestionsClearRequested = () => {
    setReportBySuggestions([]);
  };

  const onEquipNumberChange = (
    event: React.FormEvent<HTMLElement>,
    { newValue }: { newValue: string },
  ) => {
    setEquipNumber(newValue);
  };

  const onReportByChange = (
    event: React.FormEvent<HTMLElement>,
    { newValue }: { newValue: string },
  ) => {
    setReportBy(newValue);
  };

  return (
    <div className="max-w-lg mx-auto p-5 font-sans bg-white dark:bg-boxdark">
      <h1 className="text-center text-2xl font-bold mb-5">
        Input Pressureless Device Condition
      </h1>
      <form onSubmit={handleSubmit} className="flex flex-col">
        <div className="mb-4">
          <label className="block text-gray-700">Equipment Number:</label>
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
        <div className="mb-4">
          <label className="block text-gray-700">Pressureless Condition:</label>
          <div className="flex flex-col gap-2 mt-2">
            <div>
              <input
                type="radio"
                value={1}
                checked={pressurelessCondition === 1}
                onChange={() => setPressurelessCondition(1)}
                className="mr-2"
              />
              <label>Tidak ada tumpahan</label>
            </div>
            <div>
              <input
                type="radio"
                value={2}
                checked={pressurelessCondition === 2}
                onChange={() => setPressurelessCondition(2)}
                className="mr-2"
              />
              <label>
                Tumpah pada akhir refueling, Ada back pressure pada nozzle
              </label>
            </div>
            <div>
              <input
                type="radio"
                value={3}
                checked={pressurelessCondition === 3}
                onChange={() => setPressurelessCondition(3)}
                className="mr-2"
              />
              <label>
                Tumpah pada akhir refueling, Tidak ada back pressure pada nozzle
              </label>
            </div>
            <div>
              <input
                type="radio"
                value={4}
                checked={pressurelessCondition === 4}
                onChange={() => setPressurelessCondition(4)}
                className="mr-2"
              />
              <label>Tumpah sejak awal pengisian</label>
            </div>
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-gray-700">Reported By:</label>
          <Autosuggest
            suggestions={reportBySuggestions}
            onSuggestionsFetchRequested={onReportBySuggestionsFetchRequested}
            onSuggestionsClearRequested={onReportBySuggestionsClearRequested}
            getSuggestionValue={getSuggestionValue}
            renderSuggestion={renderSuggestion}
            inputProps={{
              placeholder: 'Ketik nama anda',
              value: reportBy,
              onChange: onReportByChange,
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

export default PressurelessReport;
