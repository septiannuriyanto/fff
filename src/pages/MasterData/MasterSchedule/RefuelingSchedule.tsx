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
  const [selectedSchedule, setSelectedSchedule] =
    useState<RefuelingSchedule | null>(null);

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
    <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark mb-6">
      <div className="flex flex-wrap items-center">
        <div className="w-full border-stroke dark:border-strokedark xl:border-l-2">
          <div className="w-full p-4 sm:p-12.5 xl:p-5">
            <h2 className="mb-2 font-bold text-black dark:text-white sm:text-title-sm w-full">
              Refueling Schedule
            </h2>

            <div className="p-4">
              <div className="flex justify-between mb-3">
                <button
                  className="px-3 py-1 bg-blue-600 text-white rounded"
                  onClick={handleAdd}
                >
                  Add Schedule
                </button>
              </div>

              {isLoading ? (
                <p>Loading...</p>
              ) : (
                <table className="min-w-full border border-slate-200">
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
                              Start: {d.start_date}, Interval:{' '}
                              {d.recurrence_interval}, Days:{' '}
                              {d.specific_days
                                ?.map((i) => weekdays[i])
                                .join(', ') || 'All'}
                            </div>
                          ))}
                        </td>
                        <td className="px-2 py-1 border">
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
              )}

              {selectedSchedule && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white p-4 rounded w-full max-w-md">
                    <h3 className="font-semibold mb-2">
                      {selectedSchedule.id === 0 ? 'Add' : 'Edit'} Schedule
                    </h3>
                    <label className="block mb-2">
                      Unit ID:
                      <input
                        type="text"
                        value={selectedSchedule.unit_id}
                        onChange={(e) =>
                          setSelectedSchedule({
                            ...selectedSchedule,
                            unit_id: e.target.value,
                          })
                        }
                        className="border px-2 py-1 w-full"
                      />
                    </label>
                    <label className="block mb-2">
                      User:
                      <input
                        type="text"
                        list="user-options"
                        value={selectedSchedule.user || ''}
                        onChange={(e) =>
                          setSelectedSchedule({
                            ...selectedSchedule,
                            user: e.target.value,
                          })
                        }
                        className="border px-2 py-1 w-full"
                      />
                      <datalist id="user-options">
                        {USER_OPTIONS.map((u) => (
                          <option key={u} value={u} />
                        ))}
                      </datalist>
                    </label>
                    <label className="block mb-2">
                      Shift:
                      <select
                        value={selectedSchedule.shift ?? ''}
                        onChange={(e) =>
                          setSelectedSchedule({
                            ...selectedSchedule,
                            shift: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        className="border px-2 py-1 w-full"
                      >
                        <option value="">Select Shift</option>
                        {SHIFT_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block mb-2">
                      Location:
                      <input
                        type="text"
                        value={selectedSchedule.location || ''}
                        onChange={(e) =>
                          setSelectedSchedule({
                            ...selectedSchedule,
                            location: e.target.value,
                          })
                        }
                        className="border px-2 py-1 w-full"
                      />
                    </label>

                    <div className="mb-2">
                      {selectedSchedule.details.map((d, idx) => (
                        <div key={idx} className="border p-2 mb-2 rounded">
                          <label className="block">
                            Start Date:
                            <input
                              type="date"
                              value={d.start_date}
                              onChange={(e) => {
                                const newDetails = [...selectedSchedule.details];
                                newDetails[idx].start_date = e.target.value;
                                setSelectedSchedule({
                                  ...selectedSchedule,
                                  details: newDetails,
                                });
                              }}
                              className="border px-2 py-1 w-full"
                            />
                          </label>
                          <label className="block">
                            Interval (days):
                            <input
                              type="number"
                              min={1}
                              value={d.recurrence_interval}
                              onChange={(e) => {
                                const newDetails = [...selectedSchedule.details];
                                newDetails[idx].recurrence_interval =
                                  Number(e.target.value);
                                setSelectedSchedule({
                                  ...selectedSchedule,
                                  details: newDetails,
                                });
                              }}
                              className="border px-2 py-1 w-full"
                            />
                          </label>
                          <label className="block">
                            Days of week:
                            <div className="grid grid-cols-7 gap-1 mt-1">
                              {weekdays.map((day, i) => {
                                const active = d.specific_days?.includes(i) || false;
                                return (
                                  <div
                                    key={i}
                                    onClick={() => {
                                      const newDetails = [...selectedSchedule.details];
                                      if (!newDetails[idx].specific_days)
                                        newDetails[idx].specific_days = [];
                                      if (active) {
                                        newDetails[idx].specific_days =
                                          newDetails[idx].specific_days!.filter(
                                            (x) => x !== i,
                                          );
                                      } else {
                                        newDetails[idx].specific_days!.push(i);
                                      }
                                      setSelectedSchedule({
                                        ...selectedSchedule,
                                        details: newDetails,
                                      });
                                    }}
                                    className={`cursor-pointer text-center py-1 rounded-md transition-all duration-300 text-sm ${
                                      active
                                        ? 'bg-green-500 text-white shadow-lg scale-105'
                                        : 'bg-gray-200 text-gray-700 shadow-none'
                                    }`}
                                  >
                                    {day}
                                  </div>
                                );
                              })}
                            </div>
                          </label>
                          {selectedSchedule.details.length > 1 && (
                            <button
                              className="mt-1 px-2 py-1 bg-red-500 text-white rounded"
                              onClick={() => {
                                const newDetails = selectedSchedule.details.filter(
                                  (_, index) => index !== idx,
                                );
                                setSelectedSchedule({
                                  ...selectedSchedule,
                                  details: newDetails,
                                });
                              }}
                            >
                              Remove
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

                    <div className="flex justify-end gap-2">
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
          </div>
        </div>
      </div>
    </div>
  );
};
