import { faEdit, faEllipsis, faEye, faRemove } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "../../../contexts/ThemeContext";
import ThemedGlassmorphismPanel from '../../../common/ThemedComponents/ThemedGlassmorphismPanel';

interface DropdownManpowerActionProps {
  rowId: string; // Adjust the type as needed
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  showEdit?: boolean; // New prop to control Edit visibility
}

const DropdownManpowerAction: React.FC<DropdownManpowerActionProps> = ({ rowId, onView, onEdit, onDelete, showEdit = true }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { activeTheme } = useTheme();
  const { popup } = activeTheme;

  const trigger = useRef<HTMLButtonElement>(null);
  const dropdown = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const clickHandler = ({ target }: MouseEvent) => {
      if (!dropdown.current) return;
      if (!dropdownOpen || dropdown.current.contains(target as Node) || trigger.current?.contains(target as Node)) return;
      setDropdownOpen(false);
    };
    document.addEventListener("click", clickHandler);
    return () => document.removeEventListener("click", clickHandler);
  }, [dropdownOpen]);

  // Close if the esc key is pressed
  useEffect(() => {
    const keyHandler = ({ key }: KeyboardEvent) => {
      if (!dropdownOpen || key !== 'Escape') return;
      setDropdownOpen(false);
    };
    document.addEventListener("keydown", keyHandler);
    return () => document.removeEventListener("keydown", keyHandler);
  }, [dropdownOpen]);

  return (
    <div className="relative flex">
      <button
        className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all flex items-center justify-center shadow-sm"
        ref={trigger}
        onClick={() => setDropdownOpen(!dropdownOpen)}
      >
        <FontAwesomeIcon icon={faEllipsis} />
      </button>
      <ThemedGlassmorphismPanel
        ref={dropdown}
        className={`absolute right-0 top-full z-40 w-40 space-y-1 rounded-sm p-1.5 ${dropdownOpen ? 'block' : 'hidden'}`}
      >
        <button
          onClick={() => {
            onView(rowId);
            setDropdownOpen(false);
          }}
          className="flex w-full items-center gap-2 rounded-sm px-4 py-1.5 text-left text-sm hover:bg-gray dark:hover:bg-meta-4"
        >
          <FontAwesomeIcon icon={faEye} />
          View Profile
        </button>
        {showEdit && (
          <button
            onClick={() => {
              onEdit(rowId);
              setDropdownOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-sm px-4 py-1.5 text-left text-sm hover:bg-gray dark:hover:bg-meta-4"
          >
            <FontAwesomeIcon icon={faEdit} />
            Edit Profile
          </button>
        )}
        <button
          onClick={() => {
            onDelete(rowId);
            setDropdownOpen(false);
          }}
          className="flex w-full items-center gap-2 rounded-sm px-4 py-1.5 text-left text-sm hover:bg-gray dark:hover:bg-meta-4"
        >
          <FontAwesomeIcon icon={faRemove} />
          Delete User
        </button>
      </ThemedGlassmorphismPanel>
    </div>
  );
};

export default DropdownManpowerAction;
