'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function MaintenancePage() {
  const [equipment, setEquipment] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingLog, setEditingLog] = useState<any>(null);

  const [newLog, setNewLog] = useState({
    equipment_id: '',
    hours: '',
    separator_hours: '',
    work_done: '',
    cost: '',
    notes: ''
  });

  useEffect(() => {
    fetchEquipment();
    fetchMaintenance();
  }, []);

  const fetchEquipment = async () => {
    const { data } = await supabase.from('equipment').select('*').order('name');
    setEquipment(data || []);
  };

  const fetchMaintenance = async () => {
    const { data } = await supabase
      .from('maintenance_logs')
      .select(`
        *,
        equipment (name)
      `)
      .order('date', { ascending: false });
    setMaintenance(data || []);
  };

  const saveMaintenance = async () => {
    if (!newLog.equipment_id || !newLog.work_done) {
      alert("Please select equipment and describe the work");
      return;
    }

    const hours = newLog.hours ? parseFloat(newLog.hours) : null;
    const separatorHours = newLog.separator_hours ? parseFloat(newLog.separator_hours) : null;

    const payload = {
      equipment_id: newLog.equipment_id,
      date: new Date().toISOString().split('T')[0],
      hours: hours,
      separator_hours: separatorHours,
      work_done: newLog.work_done,
      cost: newLog.cost ? parseFloat(newLog.cost) : null,
      notes: newLog.notes || null
    };

    let error;
    if (editingLog) {
      ({ error } = await supabase.from('maintenance_logs').update(payload).eq('id', editingLog.id));
    } else {
      ({ error } = await supabase.from('maintenance_logs').insert(payload));
    }

    if (error) {
      alert("Error: " + error.message);
    } else {
      // Update equipment hours if provided
      if (hours !== null) {
        await supabase.rpc('update_equipment_hours', {
          equip_id: newLog.equipment_id,
          new_hours: hours,
          new_separator_hours: separatorHours
        });
      }

      alert(editingLog ? "Maintenance updated!" : "Maintenance log saved!");
      resetForm();
      fetchMaintenance();
      fetchEquipment();
    }
  };

  const resetForm = () => {
    setNewLog({ equipment_id: '', hours: '', separator_hours: '', work_done: '', cost: '', notes: '' });
    setEditingLog(null);
  };

  const editLog = (log: any) => {
    setEditingLog(log);
    setNewLog({
      equipment_id: log.equipment_id,
      hours: log.hours?.toString() || '',
      separator_hours: log.separator_hours?.toString() || '',
      work_done: log.work_done || '',
      cost: log.cost?.toString() || '',
      notes: log.notes || ''
    });
  };

  const deleteLog = async (id: string) => {
    if (!confirm("Delete this maintenance log?")) return;
    await supabase.from('maintenance_logs').delete().eq('id', id);
    fetchMaintenance();
  };

  const toggleExpand = (id: string) => {
    const newSet = new Set(expanded);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpanded(newSet);
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-6">Equipment Maintenance</h3>

      {/* Form */}
      <div className="bg-gray-100 p-6 rounded-xl mb-8">
        <h4 className="font-medium mb-4">{editingLog ? 'Edit Maintenance Log' : 'Log New Maintenance'}</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select value={newLog.equipment_id} onChange={(e) => setNewLog({...newLog, equipment_id: e.target.value})} className="p-3 border rounded-lg">
            <option value="">Select Equipment</option>
            {equipment.map(eq => (
              <option key={eq.id} value={eq.id}>{eq.name}</option>
            ))}
          </select>

          <input type="number" step="0.1" placeholder="Current Hours" value={newLog.hours} onChange={(e) => setNewLog({...newLog, hours: e.target.value})} className="p-3 border rounded-lg" />
          <input type="number" step="0.1" placeholder="Separator Hours (Combines)" value={newLog.separator_hours} onChange={(e) => setNewLog({...newLog, separator_hours: e.target.value})} className="p-3 border rounded-lg" />

          <input type="text" placeholder="Work Done" value={newLog.work_done} onChange={(e) => setNewLog({...newLog, work_done: e.target.value})} className="p-3 border rounded-lg md:col-span-2" />

          <input type="number" step="0.01" placeholder="Cost ($)" value={newLog.cost} onChange={(e) => setNewLog({...newLog, cost: e.target.value})} className="p-3 border rounded-lg" />

          <textarea placeholder="Notes" value={newLog.notes} onChange={(e) => setNewLog({...newLog, notes: e.target.value})} className="p-3 border rounded-lg md:col-span-2" />
        </div>

        <div className="mt-6 flex gap-4">
          <button onClick={saveMaintenance} className="bg-emerald-700 text-white px-8 py-3 rounded-lg hover:bg-emerald-600">
            {editingLog ? 'Update Log' : 'Save Maintenance Log'}
          </button>
          {editingLog && <button onClick={resetForm} className="border px-6 py-3 rounded-lg">Cancel</button>}
        </div>
      </div>

      {/* History */}
      <h4 className="font-medium mb-4">Maintenance History</h4>
      <div className="space-y-3">
        {maintenance.map(log => {
          const isExpanded = expanded.has(log.id);
          const workDoneShort = log.work_done?.length > 60 ? log.work_done.substring(0, 57) + '...' : log.work_done;

          return (
            <div key={log.id} className="bg-white border rounded-xl shadow">
              <div 
                onClick={() => toggleExpand(log.id)}
                className="p-6 grid grid-cols-12 items-center cursor-pointer hover:bg-gray-50"
              >
                <div className="col-span-4">
                  <span className="font-medium">{log.equipment?.name}</span>
                  <span className="ml-4 text-gray-500 text-sm">{log.date}</span>
                </div>
                
                <div className="col-span-5 text-center text-gray-700 font-medium truncate px-4">
                  {workDoneShort}
                </div>

                <div className="col-span-3 text-right">
                  {log.hours && <span className="font-medium">{log.hours} hrs</span>}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t p-6 bg-gray-50">
                  <div className="grid grid-cols-2 gap-y-4 text-sm">
                    {log.hours && <p><strong>Hours:</strong> {log.hours}</p>}
                    {log.separator_hours && <p><strong>Separator Hours:</strong> {log.separator_hours}</p>}
                    {log.cost && <p><strong>Cost:</strong> ${log.cost}</p>}
                    {log.work_done && <p className="col-span-2"><strong>Work Done:</strong> {log.work_done}</p>}
                    {log.notes && <p className="col-span-2"><strong>Notes:</strong> {log.notes}</p>}
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