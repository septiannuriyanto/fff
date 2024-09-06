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

interface ActionCellRendererProps {
  data: any; // Define a more specific type if known
}

const ActionCellRenderer: React.FC<ActionCellRendererProps> = (props) => {
  const handleApprove = () => {
    console.log('Approve action for:', props.data);
  };

  const handleMail = async () => {
    const nrp = props.data.nrp;

    const { data, error } = await supabase
      .from('manpower')
      .select('email')
      .eq('nrp', nrp);
    if (error) {
      console.error('Error fetching email:', error);
      return;
    }
    const email = data[0].email;
    if(email){
        sendEmail(email)
    }
    else{
        alert('Anda belum mendaftarkan email')
    }

    // console.log('Mail action for:', props.data);
  };

  function sendEmail(email:string){

    console.log(email);
    
  }

  const handlePrint = () => {
    console.log('Print action for:', props.data);
  };

  const handleMore = () => {
    console.log('More action for:', props.data);
  };

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
