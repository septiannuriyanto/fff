import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '../../../db/SupabaseClient';
import { USER_OPTIONS } from './users';

interface ScheduleDetail {
  id: number;
  start_date: string;
  recurrence_interval: number;
  specific_days: number[] | null;
}

interface RefuelingSchedule {
  id: number;
  unit_id: string;
  location: string | null;
  details: ScheduleDetail[];
  user: string | null;
  shift?: number | null;
}

export const SHIFT_OPTIONS = [
  { value: 1, label: 'Shift 1' },
  { value: 2, label: 'Shift 2' },
];

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const RefuelingSchedule: React.FC = () => {
  const [schedules, setSchedules] = useState<RefuelingSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<RefuelingSchedule | null>(null);

  const fetchSchedules = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('refueling_schedule')
      .select(`*, details:refueling_schedule_detail(*)`)
      .order('unit_id', { ascending: true });
    if (error) console.error(error);
    else setSchedules(data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleAdd = () => {
    setSelectedSchedule({
      id: 0,
      unit_id: '',
      location: '',
      user: '',
      shift: null,
      details: [
        {
          id: 0,
          start_date: format(new Date(), 'yyyy-MM-dd'),
          recurrence_interval: 1,
          specific_days: [],
        },
      ],
    });
  };

  const handleSave = async () => {
    if (!selectedSchedule) return;
    if (selectedSchedule.id === 0) {
      const { data, error } = await supabase
        .from('refueling_schedule')
        .insert({
          unit_id: selectedSchedule.unit_id,
          location: selectedSchedule.location,
          user: selectedSchedule.user,
          shift: selectedSchedule.shift,
        })
        .select();
      if (error) return console.error(error);
      const newId = data![0].id;
      for (const d of selectedSchedule.details) {
        await supabase.from('refueling_schedule_detail').insert({
          schedule_id: newId,
          start_date: d.start_date,
          recurrence_interval: d.recurrence_interval,
          specific_days: d.specific_days,
        });
      }
    } else {
      await supabase
        .from('refueling_schedule')
        .update({
          unit_id: selectedSchedule.unit_id,
          location: selectedSchedule.location,
          user: selectedSchedule.user,
          shift: selectedSchedule.shift,
        })
        .eq('id', selectedSchedule.id);
      for (const d of selectedSchedule.details) {
        if (d.id === 0) {
          await supabase.from('refueling_schedule_detail').insert({
            schedule_id: selectedSchedule.id,
            start_date: d.start_date,
            recurrence_interval: d.recurrence_interval,
            specific_days: d.specific_days,
          });
        } else {
          await supabase
            .from('refueling_schedule_detail')
            .update({
              start_date: d.start_date,
              recurrence_interval: d.recurrence_interval,
              specific_days: d.specific_days,
            })
            .eq('id', d.id);
        }
      }
    }
    setSelectedSchedule(null);
    fetchSchedules();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this schedule?')) return;
    await supabase.from('refueling_schedule_detail').delete().eq('schedule_id', id);
    await supabase.from('refueling_schedule').delete().eq('id', id);
    fetchSchedules();
  };

  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark mb-6 p-2 sm:p-4">
      <h2 className="mb-4 font-bold text-black dark:text-white sm:text-lg">
        Refueling Schedule
      </h2>

      <div className="flex justify-between mb-3">
        <button
          className="px-3 py-2 bg-blue-600 text-white rounded text-sm"
          onClick={handleAdd}
        >
          Add Schedule
        </button>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-slate-200 text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-2 py-1 border">Unit</th>
                <th className="px-2 py-1 border">Location</th>
                <th className="px-2 py-1 border">User</th>
                <th className="px-2 py-1 border">Shift</th>
                <th className="px-2 py-1 border">Details</th>
                <th className="px-2 py-1 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((s) => (
                <tr key={s.id}>
                  <td className="px-2 py-1 border">{s.unit_id}</td>
                  <td className="px-2 py-1 border">{s.location}</td>
                  <td className="px-2 py-1 border">{s.user}</td>
                  <td className="px-2 py-1 border">
                    {s.shift
                      ? SHIFT_OPTIONS.find((o) => o.value === s.shift)?.label
                      : '-'}
                  </td>
                  <td className="px-2 py-1 border">
                    {s.details.map((d) => (
                      <div key={d.id}>
                        Start: {d.start_date}, Interval: {d.recurrence_interval}, Days:{' '}
                        {d.specific_days?.map((i) => weekdays[i]).join(', ') || 'All'}
                      </div>
                    ))}
                  </td>
                  <td className="px-2 py-1 border whitespace-nowrap">
                    <button
                      className="px-2 py-1 bg-green-500 text-white rounded mr-1"
                      onClick={() => setSelectedSchedule(s)}
                    >
                      Edit
                    </button>
                    <button
                      className="px-2 py-1 bg-red-500 text-white rounded"
                      onClick={() => handleDelete(s.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
          <div className="bg-white dark:bg-gray-800 p-4 rounded w-full max-w-lg sm:max-w-xl md:max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold mb-4 text-lg">
              {selectedSchedule.id === 0 ? 'Add' : 'Edit'} Schedule
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium">Unit ID</span>
                <input
                  type="text"
                  value={selectedSchedule.unit_id}
                  onChange={(e) =>
                    setSelectedSchedule({ ...selectedSchedule, unit_id: e.target.value })
                  }
                  className="border px-2 py-1 w-full rounded"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium">User</span>
                <input
                  type="text"
                  list="user-options"
                  value={selectedSchedule.user || ''}
                  onChange={(e) =>
                    setSelectedSchedule({ ...selectedSchedule, user: e.target.value })
                  }
                  className="border px-2 py-1 w-full rounded"
                />
                <datalist id="user-options">
                  {USER_OPTIONS.map((u) => (
                    <option key={u} value={u} />
                  ))}
                </datalist>
              </label>

              <label className="block">
                <span className="text-sm font-medium">Shift</span>
                <select
                  value={selectedSchedule.shift ?? ''}
                  onChange={(e) =>
                    setSelectedSchedule({
                      ...selectedSchedule,
                      shift: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="border px-2 py-1 w-full rounded"
                >
                  <option value="">Select Shift</option>
                  {SHIFT_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium">Location</span>
                <input
                  type="text"
                  value={selectedSchedule.location || ''}
                  onChange={(e) =>
                    setSelectedSchedule({ ...selectedSchedule, location: e.target.value })
                  }
                  className="border px-2 py-1 w-full rounded"
                />
              </label>
            </div>

            <div className="mt-4 space-y-3">
              {selectedSchedule.details.map((d, idx) => (
                <div key={idx} className="border p-3 rounded space-y-2">
                  <label className="block">
                    <span className="text-sm font-medium">Start Date</span>
                    <input
                      type="date"
                      value={d.start_date}
                      onChange={(e) => {
                        const newDetails = [...selectedSchedule.details];
                        newDetails[idx].start_date = e.target.value;
                        setSelectedSchedule({ ...selectedSchedule, details: newDetails });
                      }}
                      className="border px-2 py-1 w-full rounded"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium">Interval (days)</span>
                    <input
                      type="number"
                      min={1}
                      value={d.recurrence_interval}
                      onChange={(e) => {
                        const newDetails = [...selectedSchedule.details];
                        newDetails[idx].recurrence_interval = Number(e.target.value);
                        setSelectedSchedule({ ...selectedSchedule, details: newDetails });
                      }}
                      className="border px-2 py-1 w-full rounded"
                    />
                  </label>
                  <div>
                    <span className="text-sm font-medium">Days of week</span>
                    <div className="grid grid-cols-7 gap-1 mt-1">
                      {weekdays.map((day, i) => {
                        const active = d.specific_days?.includes(i) || false;
                        return (
                          <div
                            key={i}
                            onClick={() => {
                              const newDetails = [...selectedSchedule.details];
                              if (!newDetails[idx].specific_days) newDetails[idx].specific_days = [];
                              if (active) {
                                newDetails[idx].specific_days =
                                  newDetails[idx].specific_days!.filter((x) => x !== i);
                              } else {
                                newDetails[idx].specific_days!.push(i);
                              }
                              setSelectedSchedule({ ...selectedSchedule, details: newDetails });
                            }}
                            className={`cursor-pointer text-center py-1 rounded-md text-xs ${
                              active
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            {day}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {selectedSchedule.details.length > 1 && (
                    <button
                      className="mt-1 px-2 py-1 bg-red-500 text-white rounded"
                      onClick={() => {
                        const newDetails = selectedSchedule.details.filter((_, index) => index !== idx);
                        setSelectedSchedule({ ...selectedSchedule, details: newDetails });
                      }}
                    >
                      Remove Detail
                    </button>
                  )}
                </div>
              ))}
              <button
                className="px-2 py-1 bg-blue-500 text-white rounded"
                onClick={() =>
                  setSelectedSchedule({
                    ...selectedSchedule,
                    details: [
                      ...selectedSchedule.details,
                      {
                        id: 0,
                        start_date: format(new Date(), 'yyyy-MM-dd'),
                        recurrence_interval: 1,
                        specific_days: [],
                      },
                    ],
                  })
                }
              >
                Add Detail
              </button>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                className="px-3 py-1 bg-gray-300 rounded"
                onClick={() => setSelectedSchedule(null)}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1 bg-green-500 text-white rounded"
                onClick={handleSave}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
