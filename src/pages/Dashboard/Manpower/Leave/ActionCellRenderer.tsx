import React from 'react';
import { supabase } from '../../../../db/SupabaseClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckCircle,
  faEnvelope,
  faPrint,
  faEllipsisH,
} from '@fortawesome/free-solid-svg-icons';
import { Email } from './EmailTemplate';
import HardcopyLeaveLetterTemplate from './HardcopyLeaveLetterTemplate';

interface ActionCellRendererProps {
  value: any; // You might want to define a more specific type here
  data: any;  // The row data
  onApprove: (data: any) => void;
  onMail: (data: any) => void;
  onPrint: (data: any) => void;
  onMore: (data: any) => void;
}

const ActionCellRenderer: React.FC<ActionCellRendererProps> = (props) => {

  const handleApprove = () => props.onApprove(props.data);
  const handleMail = () => props.onMail(props.data);
  const handlePrint = () => props.onPrint(props.data);
  const handleMore = () => props.onMore(props.data);

 

  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex gap-2">
        <button
          className="bg-transparent border-none cursor-pointer p-2 text-gray-700 hover:text-green-600 transition-colors duration-300"
          title="Approve"
          onClick={handleApprove}
        >
          <FontAwesomeIcon icon={faCheckCircle} />
        </button>
        <button
          className="bg-transparent border-none cursor-pointer p-2 text-gray-700 hover:text-sky-400 transition-colors duration-300"
          title="Mail"
          onClick={handleMail}
        >
          <FontAwesomeIcon icon={faEnvelope} />
        </button>
        <button
          className="bg-transparent border-none cursor-pointer p-2 text-gray-700 hover:text-orange-400 transition-colors duration-300"
          title="Print"
          onClick={handlePrint}
        >
          <FontAwesomeIcon icon={faPrint} />
        </button>
        <button
          className="bg-transparent border-none cursor-pointer p-2 text-gray-700 hover:text-red-400 transition-colors duration-300"
          title="More"
          onClick={handleMore}
        >
          <FontAwesomeIcon icon={faEllipsisH} />
        </button>
      </div>
    </div>
  );
};

export default ActionCellRenderer;
