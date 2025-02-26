import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckCircle,
  faEdit,
  faRemove,
  faShare,
} from '@fortawesome/free-solid-svg-icons';
interface BacklogActionCellRendererProps {

  data: any;  // The row data
  onApprove: (id: number) => void;
}

const BacklogAction: React.FC<BacklogActionCellRendererProps> = (props) => {

  const handleApprove = () => props.onApprove(props.data);
 

  return (
    <div className="flex items-center justify-between h-full w-full">
        <button
          className="bg-transparent border-none cursor-pointer p-2 text-gray-700 hover:text-green-600 transition-colors duration-300"
          title="Complete Maintenance"
          onClick={handleApprove}
        >
          <FontAwesomeIcon icon={faCheckCircle} width={20} height={20}/>
        </button>

    </div>
  );
};

export default BacklogAction;
