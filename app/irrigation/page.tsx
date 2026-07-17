'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { mutateWithPin, promptPinForDelete } from '../../lib/pin';
import PinField from '../../components/PinField';
import TableScroll from '../../components/TableScroll';

export default function IrrigationPage() {
  const [fields, setFields] = useState<any[]>([]);
  const [readings, setReadings] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [readingPin, setReadingPin] = useState('');
  const [applicationPin, setApplicationPin] = useState('');

  const [newReading, setNewReading] = useState({ field_id: '', date: '', acre_feet: '' });
  const [newApplication, setNewApplication] = useState({ field_id: '', date: '', inches_applied: '' });

  const [editingReading, setEditingReading] = useState<any>(null);
  const [editingApplication, setEditingApplication] = useState<any>(null);

  useEffect(() => {
    fetchFields();
    fetchReadings();
    fetchApplications();
  }, []);

  const fetchFields = async () => {
    const { data } = await supabase.from('fields').select('*').order('name');
    setFields(data || []);
  };

  const fetchReadings = async () => {
    const { data } = await supabase.from('irrigation_readings').select('*').order('date', { ascending: false });
    setReadings(data || []);
  };

  const fetchApplications = async () => {
    const { data } = await supabase.from('irrigation_applications').select('*').order('date', { ascending: false });
    setApplications(data || []);
  };

  const saveReading = async () => {
    if (!newReading.field_id || !newReading.acre_feet) return alert('Field and Acre-Feet required');
    if (!readingPin) return alert('Please enter the PIN to save');

    const payload = {
      field_id: newReading.field_id,
      date: newReading.date || new Date().toISOString().split('T')[0],
      meter_reading: parseFloat(newReading.acre_feet),
    };

    const { error } = await mutateWithPin({
      pin: readingPin,
      table: 'irrigation_readings',
      action: editingReading ? 'update' : 'insert',
      id: editingReading?.id,
      data: payload,
    });

    if (error) alert(error.message);
    else {
      setEditingReading(null);
      setNewReading({ field_id: '', date: '', acre_feet: '' });
      setReadingPin('');
      fetchReadings();
    }
  };

  const saveApplication = async () => {
    if (!newApplication.field_id || !newApplication.inches_applied) return alert('Field and Inches required');
    if (!applicationPin) return alert('Please enter the PIN to save');

    const payload = {
      field_id: newApplication.field_id,
      date: newApplication.date || new Date().toISOString().split('T')[0],
      inches_applied: parseFloat(newApplication.inches_applied),
    };

    const { error } = await mutateWithPin({
      pin: applicationPin,
      table: 'irrigation_applications',
      action: editingApplication ? 'update' : 'insert',
      id: editingApplication?.id,
      data: payload,
    });

    if (error) alert(error.message);
    else {
      setEditingApplication(null);
      setNewApplication({ field_id: '', date: '', inches_applied: '' });
      setApplicationPin('');
      fetchApplications();
    }
  };

  const deleteReading = async (id: string) => {
    const enteredPin = promptPinForDelete('this meter reading');
    if (!enteredPin) return;

    const { error } = await mutateWithPin({
      pin: enteredPin,
      table: 'irrigation_readings',
      action: 'delete',
      id,
    });

    if (error) alert(error.message);
    else fetchReadings();
  };

  const deleteApplication = async (id: string) => {
    const enteredPin = promptPinForDelete('this application');
    if (!enteredPin) return;

    const { error } = await mutateWithPin({
      pin: enteredPin,
      table: 'irrigation_applications',
      action: 'delete',
      id,
    });

    if (error) alert(error.message);
    else fetchApplications();
  };

  const editReading = (reading: any) => {
    setEditingReading(reading);
    setNewReading({
      field_id: reading.field_id,
      date: reading.date,
      acre_feet: reading.meter_reading.toString(),
    });
    setReadingPin('');
  };

  const editApplication = (app: any) => {
    setEditingApplication(app);
    setNewApplication({
      field_id: app.field_id,
      date: app.date,
      inches_applied: app.inches_applied.toString(),
    });
    setApplicationPin('');
  };

  const getCurrentYearReadings = (fieldId: string) => {
    const currentYear = new Date().getFullYear();
    return readings
      .filter((r) => r.field_id === fieldId && new Date(r.date).getFullYear() === currentYear)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const totalInchesApplied = (fieldId: string) => {
    return applications.filter((a) => a.field_id === fieldId).reduce((sum, a) => sum + (a.inches_applied || 0), 0);
  };

  return (
    <div>
      <h3 className="text-xl sm:text-2xl font-semibold mb-6 sm:mb-8">Irrigation Records</h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        <div>
          <h4 className="font-medium mb-3">{editingReading ? 'Edit' : 'Add'} Meter Reading (Acre-Feet)</h4>
          <div className="card-panel mb-0">
            <select value={newReading.field_id} onChange={(e) => setNewReading({ ...newReading, field_id: e.target.value })} className="form-input mb-3">
              <option value="">Select Field</option>
              {fields.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <input type="date" value={newReading.date} onChange={(e) => setNewReading({ ...newReading, date: e.target.value })} className="form-input mb-3" />
            <input type="number" step="0.01" inputMode="decimal" placeholder="Acre-Feet" value={newReading.acre_feet} onChange={(e) => setNewReading({ ...newReading, acre_feet: e.target.value })} className="form-input mb-3" />
            <div className="mb-3">
              <PinField value={readingPin} onChange={setReadingPin} className="form-input" />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={saveReading} className="btn-primary">
                {editingReading ? 'Update Reading' : 'Add Reading'}
              </button>
              {editingReading && (
                <button
                  onClick={() => {
                    setEditingReading(null);
                    setNewReading({ field_id: '', date: '', acre_feet: '' });
                    setReadingPin('');
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-3">{editingApplication ? 'Edit' : 'Add'} Sprinkler Application (Inches)</h4>
          <div className="card-panel mb-0">
            <select value={newApplication.field_id} onChange={(e) => setNewApplication({ ...newApplication, field_id: e.target.value })} className="form-input mb-3">
              <option value="">Select Field</option>
              {fields.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <input type="date" value={newApplication.date} onChange={(e) => setNewApplication({ ...newApplication, date: e.target.value })} className="form-input mb-3" />
            <input type="number" step="0.01" inputMode="decimal" placeholder="Inches Applied" value={newApplication.inches_applied} onChange={(e) => setNewApplication({ ...newApplication, inches_applied: e.target.value })} className="form-input mb-3" />
            <div className="mb-3">
              <PinField value={applicationPin} onChange={setApplicationPin} className="form-input" />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={saveApplication} className="btn-primary">
                {editingApplication ? 'Update Application' : 'Add Application'}
              </button>
              {editingApplication && (
                <button
                  onClick={() => {
                    setEditingApplication(null);
                    setNewApplication({ field_id: '', date: '', inches_applied: '' });
                    setApplicationPin('');
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <h4 className="font-medium mt-8 sm:mt-10 mb-3">2026 Irrigation Summary (Inches Depth)</h4>
      <div className="bg-white rounded-xl shadow-sm mb-8 sm:mb-10">
        <TableScroll>
          <table className="w-full min-w-[640px]">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 sm:p-4 text-left">Field</th>
                <th className="p-3 sm:p-4 text-right">Acres</th>
                <th className="p-3 sm:p-4 text-right">Meter Diff (AF)</th>
                <th className="p-3 sm:p-4 text-right">Meter Inches</th>
                <th className="p-3 sm:p-4 text-right">Sprinkler Inches</th>
                <th className="p-3 sm:p-4 text-right">Difference</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field) => {
                const acres = field.acres || 0;
                const yearReadings = getCurrentYearReadings(field.id);
                const first = yearReadings[0]?.meter_reading || 0;
                const latest = yearReadings[yearReadings.length - 1]?.meter_reading || first;
                const meterDiffAF = latest - first;
                const meterInches = acres > 0 ? (meterDiffAF * 12) / acres : 0;
                const sprinklerInches = totalInchesApplied(field.id);
                const difference = meterInches - sprinklerInches;

                return (
                  <tr key={field.id} className="border-t">
                    <td className="p-3 sm:p-4 font-medium">{field.name}</td>
                    <td className="p-3 sm:p-4 text-right">{acres}</td>
                    <td className="p-3 sm:p-4 text-right">{meterDiffAF.toFixed(2)}</td>
                    <td className="p-3 sm:p-4 text-right">{meterInches.toFixed(2)}</td>
                    <td className="p-3 sm:p-4 text-right">{sprinklerInches.toFixed(2)}</td>
                    <td className="p-3 sm:p-4 text-right font-medium">{difference.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableScroll>
      </div>

      <h4 className="font-medium mb-3">Meter Reading History</h4>
      <div className="bg-white rounded-xl shadow-sm mb-8 sm:mb-10">
        <TableScroll>
          <table className="w-full min-w-[480px]">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 sm:p-4 text-left">Date</th>
                <th className="p-3 sm:p-4 text-left">Field</th>
                <th className="p-3 sm:p-4 text-right">Acre-Feet</th>
                <th className="p-3 sm:p-4 w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {readings.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3 sm:p-4">{r.date}</td>
                  <td className="p-3 sm:p-4">{fields.find((f) => f.id === r.field_id)?.name}</td>
                  <td className="p-3 sm:p-4 text-right">{r.meter_reading}</td>
                  <td className="p-3 sm:p-4">
                    <button onClick={() => editReading(r)} className="text-blue-600 hover:underline mr-3 min-h-[44px]">
                      Edit
                    </button>
                    <button onClick={() => deleteReading(r.id)} className="text-red-600 hover:underline min-h-[44px]">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </div>

      <h4 className="font-medium mb-3">Sprinkler Application History</h4>
      <div className="bg-white rounded-xl shadow-sm">
        <TableScroll>
          <table className="w-full min-w-[480px]">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 sm:p-4 text-left">Date</th>
                <th className="p-3 sm:p-4 text-left">Field</th>
                <th className="p-3 sm:p-4 text-right">Inches</th>
                <th className="p-3 sm:p-4 w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="p-3 sm:p-4">{a.date}</td>
                  <td className="p-3 sm:p-4">{fields.find((f) => f.id === a.field_id)?.name}</td>
                  <td className="p-3 sm:p-4 text-right">{a.inches_applied}</td>
                  <td className="p-3 sm:p-4">
                    <button onClick={() => editApplication(a)} className="text-blue-600 hover:underline mr-3 min-h-[44px]">
                      Edit
                    </button>
                    <button onClick={() => deleteApplication(a.id)} className="text-red-600 hover:underline min-h-[44px]">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </div>
    </div>
  );
}
