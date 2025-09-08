import React, { useEffect, useState } from 'react';
import AlterStatusModal from './AlterStatusModal';
import { supabase } from '../../../db/SupabaseClient';
import { statusColors } from './component/statuscolor';
import BreakdownRfuHeatmap from './BreakdownRfuHeatmap';

type Storage = {
  warehouse_id: string;
  unit_id: string;
};

type RfuStatus = {
  status: 'RFU' | 'BD' | 'PS';
  reported_at: string;
};

type Manpower = {
  nrp: string;
  nama: string;
};

const BreakdownRfuReport: React.FC = () => {
  const [units, setUnits] = useState<Storage[]>([]);
  const [latestStatus, setLatestStatus] = useState<Record<string, RfuStatus | null>>({});
  const [manpower, setManpower] = useState<Manpower[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<Storage | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedReporter, setSelectedReporter] = useState<string>('');
  const [remark, setRemark] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      const { data: storageData } = await supabase
        .from('storage')
        .select('warehouse_id, unit_id')
        .eq('type', 'FT')
        .eq('status', 'RUNNING')
        .order('warehouse_id', { ascending: true });

      if (storageData) {
        setUnits(storageData);
        for (const u of storageData) {
          const { data: statusData } = await supabase
            .from('rfu_status')
            .select('status, reported_at')
            .eq('warehouse_id', u.warehouse_id)
            .order('reported_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          setLatestStatus(prev => ({ ...prev, [u.warehouse_id]: statusData || null }));
        }
      }

      const { data: mp } = await supabase
        .from('manpower')
        .select('nrp, nama')
        .eq('section', 'FAO')
        .order('nama', { ascending: true });

      if (mp) setManpower(mp);
    };
    fetchData();
  }, []);

  const openModal = (unit: Storage) => {
    setSelectedUnit(unit);
    const now = new Date();
    setSelectedDate(now.toISOString().slice(0, 10));
    setSelectedTime(now.toTimeString().slice(0, 5));
    setSelectedReporter('');
    setNewStatus('');
  };

  const handleSubmit = async () => {
    if (!selectedUnit || !newStatus || !selectedReporter) return;

    const reportedAt = new Date(`${selectedDate}T${selectedTime}`);

    // 1. Cari ID report terakhir untuk unit ini (warehouse_id)
    const { data: lastRecord } = await supabase
      .from('rfu_status')
      .select('id')
      .eq('warehouse_id', selectedUnit.warehouse_id)
      .order('reported_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 2. Insert record baru
    const { data: newRecord, error: insertError } = await supabase
      .from('rfu_status')
      .insert([
        {
          warehouse_id: selectedUnit.warehouse_id,
          unit_id: selectedUnit.unit_id,
          status: newStatus,
          reported_at: reportedAt.toISOString(),
          reported_by: selectedReporter,
          remark: remark,
        },
      ])
      .select('id, reported_at')
      .maybeSingle();

    if (insertError || !newRecord) {
      console.error(insertError);
      return;
    }

    // 3. Update next_status_timestamp di record terakhir
    if (lastRecord?.id) {
      const { error: updateError } = await supabase
        .from('rfu_status')
        .update({ next_status_timestamp: newRecord.reported_at })
        .eq('id', lastRecord.id);

      if (updateError) {
        console.error(updateError);
        return;
      }
    }

    window.location.reload();
  };

  return (
    <>
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark mb-6">
        <div className="flex flex-wrap items-center">
          <div className="w-full border-stroke dark:border-strokedark xl:border-l-2">
            <div className="w-full p-4 sm:p-12.5 xl:p-5">
              <h2 className="mb-2 font-bold text-black dark:text-white sm:text-title-sm w-full">
                Breakdown RFU Report
              </h2>

              <div className="main-content w-full">
                <div className="p-4 space-y-4">
                  {units.map(unit => {
                    const status = latestStatus[unit.warehouse_id]?.status || 'NA';
                    const reportedAt = latestStatus[unit.warehouse_id]?.reported_at;
                    return (
                      <div
                        key={unit.warehouse_id}
                        className="flex items-center justify-between p-2 border rounded"
                      >
                        <div className="flex items-center space-x-4">
                          <div>{unit.unit_id}</div>
                          <span className={`px-2 py-1 rounded-full text-sm ${statusColors[status]}`}>
                            {status === 'NA' ? 'N/A' : status}
                          </span>
                          <span className="text-sm text-gray-600">
                            Last report: {reportedAt ? new Date(reportedAt).toLocaleString() : '-'}
                          </span>
                        </div>
                        <button
                          onClick={() => openModal(unit)}
                          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          Alter
                        </button>
                      </div>
                    );
                  })}

                  {selectedUnit && (
                    <AlterStatusModal
                      unitId={selectedUnit.unit_id}
                      currentStatus={latestStatus[selectedUnit.warehouse_id]?.status || ''}
                      manpower={manpower}
                      selectedDate={selectedDate}
                      selectedTime={selectedTime}
                      selectedReporter={selectedReporter}
                      newStatus={newStatus}
                      onStatusChange={setNewStatus}
                      onDateChange={setSelectedDate}
                      onTimeChange={setSelectedTime}
                      onReporterChange={setSelectedReporter}
                      onCancel={() => setSelectedUnit(null)}
                      onSubmit={handleSubmit}
                      remark={remark}
                      onRemarkChange={setRemark}
                    />
                  )}
                </div>
              </div>
            </div>
            <BreakdownRfuHeatmap storages={units} />
          </div>
        </div>
      </div>
    </>
  );
};

export default BreakdownRfuReport;
