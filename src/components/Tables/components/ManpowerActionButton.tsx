import { faEdit, faEye, faRemove } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface ManpowerActionButtonProps {
  rowId: string; // Adjust the type as needed
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const ManpowerActionButton: React.FC<ManpowerActionButtonProps> = ({ rowId, onView, onEdit, onDelete }) => {
  return (
    <div className="action-buttons flex items-center justify-center space-x-3.5">
      <button 
        className="hover:text-primary cursor-pointer" 
        onClick={() => onView(rowId)}
      >
        <FontAwesomeIcon icon={faEye} />
      </button>
      <button 
        className="hover:text-primary" 
        onClick={() => onEdit(rowId)}
      >
        <FontAwesomeIcon icon={faEdit} />
      </button>
      <button 
        className="hover:text-primary cursor-pointer" 
        onClick={() => onDelete(rowId)}
      >
        <FontAwesomeIcon icon={faRemove} />
      </button>
    </div>
  );
};

export default ManpowerActionButton;
