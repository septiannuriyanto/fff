import React, { useState } from 'react';
import PanelTemplate from '../../../components/Panels/PanelTemplate';
import InputLotoVerification from './components/InputLotoVerification';
import ReconcileLotoImages from './components/ReconcileLotoImages';

const GardaLotoReport: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'verification' | 'reconciliation'>('verification');

  return (
    <PanelTemplate title="Garda Loto Report">
      <div className="flex border-b mb-4">
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'verification'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('verification')}
        >
          Input Loto Verification
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'reconciliation'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('reconciliation')}
        >
          Reconcile Loto Images
        </button>
      </div>

      <div className="mt-4">
        {activeTab === 'verification' && <InputLotoVerification />}
        {activeTab === 'reconciliation' && <ReconcileLotoImages />}
      </div>
    </PanelTemplate>
  );
};
  
export default GardaLotoReport;
