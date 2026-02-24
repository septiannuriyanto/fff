import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../contexts/ThemeContext';

interface ThemedAutoSuggestProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
  className?: string;
}

const ThemedAutoSuggest: React.FC<ThemedAutoSuggestProps> = ({
  label,
  value,
  onChange,
  suggestions,
  placeholder = '',
  required = false,
  autoFocus = false,
  className = 'mb-4',
}) => {
  const { activeTheme } = useTheme();
  const inputTheme = activeTheme.input;
  const popupTheme = activeTheme.popup;

  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  const updateDropdownPosition = () => {
    if (inputContainerRef.current) {
      const rect = inputContainerRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  };

  useEffect(() => {
    if (showSuggestions) {
      updateDropdownPosition();
      window.addEventListener('scroll', updateDropdownPosition, true);
      window.addEventListener('resize', updateDropdownPosition);
    }
    return () => {
      window.removeEventListener('scroll', updateDropdownPosition, true);
      window.removeEventListener('resize', updateDropdownPosition);
    };
  }, [showSuggestions]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const isInsideContainer = containerRef.current && containerRef.current.contains(event.target as Node);
      const isInsideDropdown = dropdownRef.current && dropdownRef.current.contains(event.target as Node);

      if (!isInsideContainer && !isInsideDropdown) {
        setShowSuggestions(false);
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getSuggestions = (value: string): string[] => {
    const inputValue = (value || '').trim().toUpperCase();
    const inputLength = inputValue.length;
    if (inputLength === 0 || !suggestions) return [];

    return suggestions.filter(suggestion =>
      suggestion && suggestion.toUpperCase().includes(inputValue)
    );
  };

  const filteredSuggestions = getSuggestions(value);

  const renderSuggestion = (suggestion: string) => (
    <div
      className="px-4 py-2 cursor-pointer transition-colors font-medium"
      style={{ color: popupTheme.textColor }}
    >
      {suggestion}
    </div>
  );

  const handleSuggestionSelected = (
    _event: any,
    { suggestion }: { suggestion: string }
  ) => {
    onChange(suggestion);
    setShowSuggestions(false);
    setIsFocused(false);
  };

  return (
    <div className={className} ref={containerRef}>
      <label
        className="mb-2.5 block font-medium"
        style={{ color: inputTheme.textColor }}
      >
        {label}
        {required && (
          <span className="ml-1 w-2.5 h-2.5 bg-red-500 rounded-full inline-block" />
        )}
      </label>
      <div className="relative" ref={inputContainerRef}>
        <input
          type="text"
          placeholder={placeholder}
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => {
            setIsFocused(true);
            setShowSuggestions(true);
          }}
          style={{
            backgroundColor: inputTheme.color,
            color: inputTheme.textColor,
            borderColor: isFocused ? activeTheme.ui.primaryColor : inputTheme.borderColor,
            borderWidth: inputTheme.borderWidth,
            borderRadius: inputTheme.borderRadius,
          }}
          className="w-full outline-none transition px-5 py-3"
        />

        {/* Custom suggestions dropdown with Portal and Solid Color */}
        {showSuggestions && filteredSuggestions.length > 0 &&
          createPortal(
            <div
              ref={dropdownRef}
              style={{
                position: 'absolute',
                top: `${dropdownPos.top}px`,
                left: `${dropdownPos.left}px`,
                width: `${dropdownPos.width}px`,
                backgroundColor: popupTheme.backgroundColor,
                borderRadius: popupTheme.borderRadius,
                border: `1px solid ${popupTheme.borderColor || activeTheme.ui.primaryColor}`, // Visible border
                zIndex: 9999,
                marginTop: '4px',
                overflow: 'hidden',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
              }}
            >
              <ul className="list-none m-0 p-0 max-h-60 overflow-y-auto">
                {filteredSuggestions.map((suggestion, index) => (
                  <li
                    key={index}
                    onMouseDown={(e) => {
                      e.preventDefault(); // crucial to prevent focus loss
                      handleSuggestionSelected(e, { suggestion });
                    }}
                    className="cursor-pointer transition-colors hover:bg-white/20"
                    style={{
                      borderBottom: index < filteredSuggestions.length - 1 ? `1px solid ${popupTheme.separatorColor || 'rgba(255,255,255,0.1)'}` : 'none'
                    }}
                  >
                    {renderSuggestion(suggestion)}
                  </li>
                ))}
              </ul>
            </div>,
            document.body
          )
        }
      </div>
    </div>
  );
};

export default ThemedAutoSuggest;
