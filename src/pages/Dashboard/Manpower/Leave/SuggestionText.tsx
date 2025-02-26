import React, { useEffect, useState } from 'react';
import Autosuggest from 'react-autosuggest';
import { supabase } from '../../../../db/SupabaseClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRemove } from '@fortawesome/free-solid-svg-icons';

interface SuggestionTextProps {
  isAutoClear?: boolean;
  isMandatory?: boolean;
  storageId?: string;
  label: string;
  placeholder?: string;
  tableName: string;
  columnName: any;
  onSetName?: (name: string) => void; // Make this prop nullable
  onNameSelected: (name: string) => void; // This should remain required
}

const SuggestionText: React.FC<SuggestionTextProps> = ({
  isAutoClear,
  isMandatory,
  storageId,
  label,
  placeholder,
  tableName,
  columnName,
  onSetName, // Destructure the new prop
  onNameSelected,
}) => {
  const [name, setName] = useState<string>('');
  const [names, setNames] = useState<string[]>([]);
  const [namesSuggestions, setNamesSuggestions] = useState<string[]>([]);

  const onNameSuggestionsFetchRequested = ({ value }: { value: string }) => {
    setNamesSuggestions(getSuggestions(value, names));
  };

  const onNameSuggestionsClearRequested = () => {
    setNamesSuggestions([]);
  };

  const getSuggestionValue = (suggestion: string): string => suggestion;

  const renderSuggestion = (suggestion: string) => <div>{suggestion}</div>;

  const getSuggestions = (value: string, list: string[]): string[] => {
    const inputValue = value.trim().toLowerCase();
    const inputLength = inputValue.length;

    return inputLength === 0
      ? []
      : list.filter((item) => item.toLowerCase().includes(inputValue));
  };

  const onNameChange = (
    event: React.FormEvent<HTMLElement>,
    { newValue }: { newValue: string },
  ) => {
    if (storageId) {
      localStorage.setItem(storageId, newValue);
    }
    setName(newValue);
    if (onSetName) {
      // Call only if onSetName is defined
      onSetName(newValue);
    }
  };

  const handleClear = () => {
    setName('');
    if (onSetName) {
      // Call only if onSetName is defined
      onSetName('');
    }
    if (storageId) {
      localStorage.removeItem(storageId);
    }
  };

  const onSuggestionSelected = (
    event: React.FormEvent<HTMLElement>,
    { suggestion }: { suggestion: string },
  ) => {
    if (isAutoClear) {
      setName('');
    } else {
      setName(suggestion);
    }
    if (onSetName) {
      // Call only if onSetName is defined
      onSetName(suggestion);
    }
    onNameSelected(suggestion);
    setNamesSuggestions([]);
  };

  useEffect(() => {
    if (!storageId) {
      return;
    }
    const savedItem = localStorage.getItem(storageId);
    if (savedItem) {
      setName(savedItem);
      if (onSetName) {
        // Call only if onSetName is defined
        onSetName(savedItem);
      }
    }
  }, [storageId, onSetName]);

  useEffect(() => {
    const fetchNames = async () => {
      const { data, error } = await supabase.from(tableName).select(columnName);

      if (error) {
        console.error(error);
      } else {
        const sortedNames = data?.map((item) => item[columnName]).sort() || [];
        setNames(sortedNames);
      }
    };
    fetchNames();
  }, [tableName, columnName]);

  return (
    <div className="mb-2 relative w-full">
      <label className=" text-gray-700 flex items-center">
        {label} { isMandatory?  <span className="ml-1 w-2.5 h-2.5 bg-red-500 rounded-full"></span> : <span/>}
       
      </label>
      <div className="relative">
        <Autosuggest
          suggestions={namesSuggestions}
          onSuggestionsFetchRequested={onNameSuggestionsFetchRequested}
          onSuggestionsClearRequested={onNameSuggestionsClearRequested}
          getSuggestionValue={getSuggestionValue}
          renderSuggestion={renderSuggestion}
          inputProps={{
            placeholder: placeholder || 'Ketik dan pilih',
            value: name,
            onChange: onNameChange,
            className: 'w-full p-2 rounded border-[1.5px] border-stroke pr-10',
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
          onSuggestionSelected={onSuggestionSelected}
        />
        {name && (
          <span
            onClick={handleClear}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 cursor-pointer"
            aria-label="Clear"
          >
            <FontAwesomeIcon icon={faRemove} />
          </span>
        )}
      </div>
    </div>
  );
};

export default SuggestionText;
