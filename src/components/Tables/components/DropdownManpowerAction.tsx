import { faEdit, faEllipsis, faEye, faRemove } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useRef, useState } from "react";

interface DropdownManpowerActionProps {
  rowId: string; // Adjust the type as needed
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const DropdownManpowerAction: React.FC<DropdownManpowerActionProps> = ({ rowId, onView, onEdit, onDelete }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

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
        className="text-[#98A6AD] hover:text-body"
        ref={trigger}
        onClick={() => setDropdownOpen(!dropdownOpen)}
      >
        <FontAwesomeIcon icon={faEllipsis} />
      </button>
      <div
        ref={dropdown}
        className={`absolute right-0 top-full z-40 w-40 space-y-1 rounded-sm border border-stroke bg-white p-1.5 shadow-default dark:border-strokedark dark:bg-boxdark ${dropdownOpen ? 'block' : 'hidden'}`}
      >
        <button
          onClick={() => {
            onView(rowId);
            setDropdownOpen(false);
          }}
          className="flex w-full items-center gap-2 rounded-sm px-4 py-1.5 text-left text-sm hover:bg-gray dark:hover:bg-meta-4"
        >
          <FontAwesomeIcon icon={faEye} />
          View
        </button>
        <button
          onClick={() => {
            onEdit(rowId);
            setDropdownOpen(false);
          }}
          className="flex w-full items-center gap-2 rounded-sm px-4 py-1.5 text-left text-sm hover:bg-gray dark:hover:bg-meta-4"
        >
          <FontAwesomeIcon icon={faEdit} />
          Edit
        </button>
        <button
          onClick={() => {
            onDelete(rowId);
            setDropdownOpen(false);
          }}
          className="flex w-full items-center gap-2 rounded-sm px-4 py-1.5 text-left text-sm hover:bg-gray dark:hover:bg-meta-4"
        >
          <FontAwesomeIcon icon={faRemove} />
          Delete
        </button>
      </div>
    </div>
  );
};

export default DropdownManpowerAction;
