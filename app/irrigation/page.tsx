'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function IrrigationPage() {
  const [fields, setFields] = useState<any[]>([]);
  const [readings, setReadings] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);

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

  // Save Reading (Add or Update)
  const saveReading = async () => {
    if (!newReading.field_id || !newReading.acre_feet) return alert("Field and Acre-Feet required");

    const payload = {
      field_id: newReading.field_id,
      date: newReading.date || new Date().toISOString().split('T')[0],
      meter_reading: parseFloat(newReading.acre_feet)
    };

    if (editingReading) {
      await supabase.from('irrigation_readings').update(payload).eq('id', editingReading.id);
      setEditingReading(null);
    } else {
      await supabase.from('irrigation_readings').insert(payload);
    }

    setNewReading({ field_id: '', date: '', acre_feet: '' });
    fetchReadings();
  };

  // Save Application (Add or Update)
  const saveApplication = async () => {
    if (!newApplication.field_id || !newApplication.inches_applied) return alert("Field and Inches required");

    const payload = {
      field_id: newApplication.field_id,
      date: newApplication.date || new Date().toISOString().split('T')[0],
      inches_applied: parseFloat(newApplication.inches_applied)
    };

    if (editingApplication) {
      await supabase.from('irrigation_applications').update(payload).eq('id', editingApplication.id);
      setEditingApplication(null);
    } else {
      await supabase.from('irrigation_applications').insert(payload);
    }

    setNewApplication({ field_id: '', date: '', inches_applied: '' });
    fetchApplications();
  };

  const deleteReading = async (id: string) => {
    if (!confirm("Delete this meter reading?")) return;
    await supabase.from('irrigation_readings').delete().eq('id', id);
    fetchReadings();
  };

  const deleteApplication = async (id: string) => {
    if (!confirm("Delete this application?")) return;
    await supabase.from('irrigation_applications').delete().eq('id', id);
    fetchApplications();
  };

  const editReading = (reading: any) => {
    setEditingReading(reading);
    setNewReading({
      field_id: reading.field_id,
      date: reading.date,
      acre_feet: reading.meter_reading.toString()
    });
  };

  const editApplication = (app: any) => {
    setEditingApplication(app);
    setNewApplication({
      field_id: app.field_id,
      date: app.date,
      inches_applied: app.inches_applied.toString()
    });
  };

  // Calculations
  const getCurrentYearReadings = (fieldId: string) => {
    const currentYear = new Date().getFullYear();
    return readings
      .filter(r => r.field_id === fieldId && new Date(r.date).getFullYear() === currentYear)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const getMeterDifferenceInches = (fieldId: string) => {
    const yearReadings = getCurrentYearReadings(fieldId);
    if (yearReadings.length < 2) return 0;
    const first = yearReadings[0].meter_reading || 0;
    const latest = yearReadings[yearReadings.length - 1].meter_reading || 0;
    const acreFeetDiff = latest - first;
    const acres = fields.find(f => f.id === fieldId)?.acres || 1;
    return (acreFeetDiff * 12) / acres;
  };

  const totalInchesApplied = (fieldId: string) => {
    return applications
      .filter(a => a.field_id === fieldId)
      .reduce((sum, a) => sum + (a.inches_applied || 0), 0);
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-8">Irrigation Records</h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Meter Reading Form */}
        <div>
          <h4 className="font-medium mb-4">
            {editingReading ? 'Edit' : 'Add'} Meter Reading (Acre-Feet)
          </h4>
          <div className="bg-gray-100 p-6 rounded-xl">
            <select value={newReading.field_id} onChange={(e) => setNewReading({...newReading, field_id: e.target.value})} className="w-full p-3 border rounded-lg mb-4">
              <option value="">Select Field</option>
              {fields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <input type="date" value={newReading.date} onChange={(e) => setNewReading({...newReading, date: e.target.value})} className="w-full p-3 border rounded-lg mb-4" />
            <input type="number" step="0.01" placeholder="Acre-Feet" value={newReading.acre_feet} onChange={(e) => setNewReading({...newReading, acre_feet: e.target.value})} className="w-full p-3 border rounded-lg mb-4" />
            
            <button onClick={saveReading} className="bg-emerald-700 text-white px-6 py-3 rounded-lg mr-3">
              {editingReading ? 'Update Reading' : 'Add Reading'}
            </button>
            {editingReading && <button onClick={() => {setEditingReading(null); setNewReading({ field_id: '', date: '', acre_feet: '' });}} className="text-gray-600">Cancel</button>}
          </div>
        </div>

        {/* Application Form */}
        <div>
          <h4 className="font-medium mb-4">
            {editingApplication ? 'Edit' : 'Add'} Sprinkler Application (Inches)
          </h4>
          <div className="bg-gray-100 p-6 rounded-xl">
            <select value={newApplication.field_id} onChange={(e) => setNewApplication({...newApplication, field_id: e.target.value})} className="w-full p-3 border rounded-lg mb-4">
              <option value="">Select Field</option>
              {fields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <input type="date" value={newApplication.date} onChange={(e) => setNewApplication({...newApplication, date: e.target.value})} className="w-full p-3 border rounded-lg mb-4" />
            <input type="number" step="0.01" placeholder="Inches Applied" value={newApplication.inches_applied} onChange={(e) => setNewApplication({...newApplication, inches_applied: e.target.value})} className="w-full p-3 border rounded-lg mb-4" />
            
            <button onClick={saveApplication} className="bg-emerald-700 text-white px-6 py-3 rounded-lg mr-3">
              {editingApplication ? 'Update Application' : 'Add Application'}
            </button>
            {editingApplication && <button onClick={() => {setEditingApplication(null); setNewApplication({ field_id: '', date: '', inches_applied: '' });}} className="text-gray-600">Cancel</button>}
          </div>
        </div>
      </div>

      {/* Summary */}
      <h4 className="font-medium mt-10 mb-4">2026 Irrigation Summary (Inches Depth)</h4>
      <div className="bg-white rounded-xl shadow overflow-hidden mb-10">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-4 text-left">Field</th>
              <th className="p-4 text-right">Acres</th>
              <th className="p-4 text-right">Meter Diff (AF)</th>
              <th className="p-4 text-right">Meter Inches</th>
              <th className="p-4 text-right">Sprinkler Inches</th>
              <th className="p-4 text-right">Difference</th>
            </tr>
          </thead>
          <tbody>
            {fields.map(field => {
              const acres = field.acres || 0;
              const yearReadings = getCurrentYearReadings(field.id);
              const first = yearReadings[0]?.meter_reading || 0;
              const latest = yearReadings[yearReadings.length-1]?.meter_reading || first;
              const meterDiffAF = latest - first;
              const meterInches = acres > 0 ? (meterDiffAF * 12) / acres : 0;
              const sprinklerInches = totalInchesApplied(field.id);
              const difference = meterInches - sprinklerInches;

              return (
                <tr key={field.id} className="border-t">
                  <td className="p-4 font-medium">{field.name}</td>
                  <td className="p-4 text-right">{acres}</td>
                  <td className="p-4 text-right">{meterDiffAF.toFixed(2)}</td>
                  <td className="p-4 text-right">{meterInches.toFixed(2)}</td>
                  <td className="p-4 text-right">{sprinklerInches.toFixed(2)}</td>
                  <td className="p-4 text-right font-medium">{difference.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* History Tables with Edit/Delete */}
      <h4 className="font-medium mb-4">Meter Reading History</h4>
      <div className="bg-white rounded-xl shadow overflow-hidden mb-10">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-4">Date</th>
              <th className="p-4">Field</th>
              <th className="p-4 text-right">Acre-Feet</th>
              <th className="p-4 w-32">Actions</th>
            </tr>
          </thead>
          <tbody>
            {readings.map(r => (
              <tr key={r.id} className="border-t">
                <td className="p-4">{r.date}</td>
                <td className="p-4">{fields.find(f => f.id === r.field_id)?.name}</td>
                <td className="p-4 text-right">{r.meter_reading}</td>
                <td className="p-4">
                  <button onClick={() => editReading(r)} className="text-blue-600 hover:underline mr-3">Edit</button>
                  <button onClick={() => deleteReading(r.id)} className="text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h4 className="font-medium mb-4">Sprinkler Application History</h4>
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-4">Date</th>
              <th className="p-4">Field</th>
              <th className="p-4 text-right">Inches</th>
              <th className="p-4 w-32">Actions</th>
            </tr>
          </thead>
          <tbody>
            {applications.map(a => (
              <tr key={a.id} className="border-t">
                <td className="p-4">{a.date}</td>
                <td className="p-4">{fields.find(f => f.id === a.field_id)?.name}</td>
                <td className="p-4 text-right">{a.inches_applied}</td>
                <td className="p-4">
                  <button onClick={() => editApplication(a)} className="text-blue-600 hover:underline mr-3">Edit</button>
                  <button onClick={() => deleteApplication(a.id)} className="text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}