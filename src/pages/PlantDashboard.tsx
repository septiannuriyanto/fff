import React from 'react';

const PlantDashboard: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50 dark:bg-green-900">
      <div className="bg-white dark:bg-boxdark rounded-2xl shadow-xl p-10 max-w-2xl w-full text-center">
        <h1 className="text-4xl font-bold text-green-700 dark:text-green-300 mb-4">PLANT Dashboard</h1>
        <p className="text-lg text-gray-700 dark:text-gray-200 mb-6">
          Selamat datang di dashboard khusus departemen PLANT.<br />
          Silakan hubungi admin untuk fitur lebih lanjut.
        </p>
        {/* Tambahkan komponen/fitur khusus PLANT di sini */}
      </div>
    </div>
  );
};

export default PlantDashboard;
