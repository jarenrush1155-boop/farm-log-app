'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function SprayLogsPage() {
  const [sprayLogs, setSprayLogs] = useState<any[]>([]);
  const [fields, setFields] = useState<any[]>([]);
  const [premixes, setPremixes] = useState<any[]>([]);

  const [newSpray, setNewSpray] = useState({
    field_id: '',
    date: new Date().toISOString().split('T')[0],
    acres_sprayed: '',
    temperature: '',
    wind_direction: 'N',
    wind_speed: '',
    notes: '',
    chemicals: [] as Array<{name: string, rate: string}>
  });

  const [editingLog, setEditingLog] = useState<any>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const windDirections = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

  useEffect(() => {
    fetchFields();
    fetchPremixes();
    fetchSprayLogs();
  }, []);

  const fetchFields = async () => {
    const { data } = await supabase.from('fields').select('*');
    setFields(data || []);
  };

  const fetchPremixes = async () => {
    const { data } = await supabase.from('premixes').select('*').order('name');
    setPremixes(data || []);
  };

  const fetchSprayLogs = async () => {
    const { data } = await supabase.from('spray_logs').select('*').order('date', { ascending: false });
    setSprayLogs(data || []);
  };

  const handleFieldChange = (fieldId: string) => {
    const selectedField = fields.find(f => f.id === fieldId);
    setNewSpray({
      ...newSpray,
      field_id: fieldId,
      acres_sprayed: selectedField ? selectedField.acres.toString() : ''
    });
  };

  const selectPremix = (premix: any) => {
    setNewSpray({
      ...newSpray,
      chemicals: premix.chemicals || []
    });
  };

  const addChemicalRow = () => {
    setNewSpray({
      ...newSpray,
      chemicals: [...newSpray.chemicals, { name: '', rate: '' }]
    });
  };

  const updateChemical = (index: number, field: 'name' | 'rate', value: string) => {
    const updated = [...newSpray.chemicals];
    updated[index][field] = value;
    setNewSpray({...newSpray, chemicals: updated});
  };

  const removeChemical = (index: number) => {
    const updated = newSpray.chemicals.filter((_, i) => i !== index);
    setNewSpray({...newSpray, chemicals: updated});
  };

  const saveSprayLog = async () => {
    if (!newSpray.field_id || newSpray.chemicals.length === 0) {
      alert("Field and at least one chemical required");
      return;
    }

    const chemicalMix = newSpray.chemicals.map(c => `${c.name} @ ${c.rate}`).join(', ');

    const payload = {
      field_id: newSpray.field_id,
      date: newSpray.date,
      acres_sprayed: newSpray.acres_sprayed ? parseFloat(newSpray.acres_sprayed) : null,
      chemical_mix: chemicalMix,
      temperature: newSpray.temperature ? parseFloat(newSpray.temperature) : null,
      wind_direction: newSpray.wind_direction,
      wind_speed: newSpray.wind_speed ? parseFloat(newSpray.wind_speed) : null,
      notes: newSpray.notes
    };

    let error;
    if (editingLog) {
      ({ error } = await supabase.from('spray_logs').update(payload).eq('id', editingLog.id));
    } else {
      ({ error } = await supabase.from('spray_logs').insert(payload));
    }

    if (error) alert(error.message);
    else {
      alert(editingLog ? "Spray log updated!" : "Spray log saved!");
      resetForm();
      fetchSprayLogs();
    }
  };

  const resetForm = () => {
    setNewSpray({
      field_id: '',
      date: new Date().toISOString().split('T')[0],
      acres_sprayed: '',
      temperature: '',
      wind_direction: 'N',
      wind_speed: '',
      notes: '',
      chemicals: []
    });
    setEditingLog(null);
  };

  const editLog = (log: any) => {
    setEditingLog(log);
    setNewSpray({
      field_id: log.field_id,
      date: log.date,
      acres_sprayed: log.acres_sprayed?.toString() || '',
      temperature: log.temperature?.toString() || '',
      wind_direction: log.wind_direction,
      wind_speed: log.wind_speed?.toString() || '',
      notes: log.notes || '',
      chemicals: [] 
    });
  };

  const deleteLog = async (id: string) => {
    if (!confirm("Delete this spray log?")) return;
    await supabase.from('spray_logs').delete().eq('id', id);
    fetchSprayLogs();
  };

  const toggleExpand = (id: string) => {
    const newSet = new Set(expanded);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpanded(newSet);
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-6">Spray Logs</h3>

      <div className="bg-gray-100 p-6 rounded-xl mb-8">
        <h4 className="font-medium mb-4">{editingLog ? 'Edit Spray Log' : 'New Spray Log'}</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select value={newSpray.field_id} onChange={(e) => handleFieldChange(e.target.value)} className="p-3 border rounded-lg">
            <option value="">Select Field</option>
            {fields.map(f => <option key={f.id} value={f.id}>{f.name} ({f.acres} ac)</option>)}
          </select>

          <input type="number" step="0.1" placeholder="Acres Sprayed" value={newSpray.acres_sprayed} onChange={(e) => setNewSpray({...newSpray, acres_sprayed: e.target.value})} className="p-3 border rounded-lg" />

          <input type="date" value={newSpray.date} onChange={(e) => setNewSpray({...newSpray, date: e.target.value})} className="p-3 border rounded-lg" />

          {/* Premix Quick Select */}
          <div className="md:col-span-2">
            <p className="text-sm text-gray-600 mb-2">Premix Quick Select:</p>
            <div className="flex flex-wrap gap-2">
              {premixes.map((pm, i) => (
                <button key={i} onClick={() => selectPremix(pm)} className="bg-white border border-emerald-200 hover:border-emerald-400 px-4 py-2 rounded-lg text-sm">
                  {pm.name}
                </button>
              ))}
            </div>
          </div>

          {/* Manual Chemicals */}
          <div className="md:col-span-2">
            <p className="text-sm text-gray-600 mb-2">Chemicals Used:</p>
            {newSpray.chemicals.map((chem, index) => (
              <div key={index} className="flex gap-3 mb-3">
                <input type="text" placeholder="Chemical Name" value={chem.name} onChange={(e) => updateChemical(index, 'name', e.target.value)} className="flex-1 p-3 border rounded-lg" />
                <input type="text" placeholder="Rate" value={chem.rate} onChange={(e) => updateChemical(index, 'rate', e.target.value)} className="w-40 p-3 border rounded-lg" />
                <button onClick={() => removeChemical(index)} className="text-red-600">Remove</button>
              </div>
            ))}
            <button onClick={addChemicalRow} className="text-emerald-600 hover:underline text-sm">+ Add Another Chemical</button>
          </div>

          <input type="number" placeholder="Temperature (°F)" value={newSpray.temperature} onChange={(e) => setNewSpray({...newSpray, temperature: e.target.value})} className="p-3 border rounded-lg" />
          <input type="number" placeholder="Wind Speed (mph)" value={newSpray.wind_speed} onChange={(e) => setNewSpray({...newSpray, wind_speed: e.target.value})} className="p-3 border rounded-lg" />

          <select value={newSpray.wind_direction} onChange={(e) => setNewSpray({...newSpray, wind_direction: e.target.value})} className="p-3 border rounded-lg">
            {windDirections.map(dir => <option key={dir} value={dir}>{dir}</option>)}
          </select>

          <textarea placeholder="Notes" value={newSpray.notes} onChange={(e) => setNewSpray({...newSpray, notes: e.target.value})} className="p-3 border rounded-lg md:col-span-2" />
        </div>

        <div className="mt-6 flex gap-4">
          <button onClick={saveSprayLog} className="bg-emerald-700 text-white px-8 py-3 rounded-lg hover:bg-emerald-600">
            {editingLog ? 'Update Spray Log' : 'Save Spray Log'}
          </button>
          {editingLog && <button onClick={() => {setEditingLog(null); resetForm();}} className="border px-6 py-3 rounded-lg">Cancel</button>}
        </div>
      </div>

      {/* History */}
      <h4 className="font-medium mb-4">Recent Spray Logs</h4>
      <div className="space-y-3">
        {sprayLogs.map(log => {
          const isExpanded = expanded.has(log.id);
          return (
            <div key={log.id} className="bg-white border rounded-xl shadow">
              <div onClick={() => toggleExpand(log.id)} className="p-6 flex justify-between cursor-pointer hover:bg-gray-50">
                <div>
                  <span className="font-medium">{fields.find(f => f.id === log.field_id)?.name}</span>
                  <span className="ml-4 text-gray-500">{log.date}</span>
                </div>
                <div className="text-right text-sm">
                  {log.acres_sprayed && <span>{log.acres_sprayed} acres</span>}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t p-6 bg-gray-50">
                  <div className="grid grid-cols-2 gap-8">
                    {/* Chemicals Table */}
                    <div>
                      <p className="font-medium mb-3">Chemicals Used</p>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left pb-2">Chemical</th>
                            <th className="text-right pb-2">Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {log.chemical_mix.split(', ').map((item: string, i: number) => (
                            <tr key={i} className="border-b last:border-0">
                              <td className="py-1">{item.split(' @ ')[0]}</td>
                              <td className="py-1 text-right">{item.split(' @ ')[1]}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Weather & Acres */}
                    <div>
                      <p className="font-medium mb-3">Details</p>
                      <div className="space-y-2 text-sm">
                        {log.acres_sprayed && <p><strong>Acres Sprayed:</strong> {log.acres_sprayed}</p>}
                        {log.temperature && <p><strong>Temperature:</strong> {log.temperature}°F</p>}
                        {log.wind_speed && <p><strong>Wind Speed:</strong> {log.wind_speed} mph</p>}
                        {log.wind_direction && <p><strong>Wind Direction:</strong> {log.wind_direction}</p>}
                      </div>
                      {log.notes && <p className="mt-4"><strong>Notes:</strong> {log.notes}</p>}
                    </div>
                  </div>

                  <div className="mt-6 flex gap-6">
                    <button onClick={() => editLog(log)} className="text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => deleteLog(log.id)} className="text-red-600 hover:underline">Delete</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}