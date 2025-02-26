import React from 'react';
import { supabase } from '../../../../db/SupabaseClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckCircle,
  faEnvelope,
  faPrint,
  faEllipsisH,
  faEdit,
  faRemove,
  faShare,
} from '@fortawesome/free-solid-svg-icons';
import { Email } from './EmailTemplate';
import HardcopyLeaveLetterTemplate from './HardcopyLeaveLetterTemplate';

interface RitationActionCellRendererProps {

  data: any;  // The row data
  onApprove: (id: number) => void;
  onEdit: (data: any) => void;
  onDelete: (data: any) => void;
  onShare: (data: any) => void;
}

const RitationAction: React.FC<RitationActionCellRendererProps> = (props) => {

  const handleApprove = () => props.onApprove(props.data);
  const handleEdit = () => props.onEdit(props.data);
  const handleDelete = () => props.onDelete(props.data);
  const handleShare = () => props.onShare(props.data);

 

  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex gap-2">
        <button
          className="bg-transparent border-none cursor-pointer p-2 text-gray-700 hover:text-green-600 transition-colors duration-300"
          title="Toggle Approval"
          onClick={handleApprove}
        >
          <FontAwesomeIcon icon={faCheckCircle} />
        </button>
        <button
          className="bg-transparent border-none cursor-pointer p-2 text-gray-700 hover:text-sky-400 transition-colors duration-300"
          title="Edit"
          onClick={handleEdit}
        >
          <FontAwesomeIcon icon={faEdit} />
        </button>
        <button
          className="bg-transparent border-none cursor-pointer p-2 text-gray-700 hover:text-red-600 transition-colors duration-300"
          title="Delete"
          onClick={handleDelete}
        >
          <FontAwesomeIcon icon={faRemove} />
        </button>
        <button
          className="bg-transparent border-none cursor-pointer p-2 text-gray-700 hover:text-yellow-500 transition-colors duration-300"
          title="Share"
          onClick={handleShare}
        >
          <FontAwesomeIcon icon={faShare} />
        </button>
      </div>
    </div>
  );
};

export default RitationAction;
