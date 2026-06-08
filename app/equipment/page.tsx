'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type Equipment = {
  id: string;
  type: 'motorized' | 'implement';
  name: string;
  year?: string;
  make?: string;
  model?: string;
  hours?: number;
  separator_hours?: number;
  serial_number?: string;
  width?: number;
  notes?: string;
};

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Equipment | null>(null);

  const [newEquip, setNewEquip] = useState({
    type: 'motorized' as 'motorized' | 'implement',
    name: '',
    year: '',
    make: '',
    model: '',
    hours: '',
    separator_hours: '',
    serial_number: '',
    width: '',
    notes: ''
  });

  useEffect(() => {
    fetchEquipment();
  }, []);

  const fetchEquipment = async () => {
    const { data } = await supabase.from('equipment').select('*').order('name');
    setEquipment(data || []);
  };

  const saveEquipment = async () => {
    if (!newEquip.name) return alert("Name is required");

    const payload = {
      type: newEquip.type,
      name: newEquip.name,
      year: newEquip.year || null,
      make: newEquip.make || null,
      model: newEquip.model || null,
      hours: newEquip.hours ? parseFloat(newEquip.hours) : null,
      separator_hours: newEquip.separator_hours ? parseFloat(newEquip.separator_hours) : null,
      serial_number: newEquip.serial_number || null,
      width: newEquip.width ? parseFloat(newEquip.width) : null,
      notes: newEquip.notes || null
    };

    if (editing) {
      await supabase.from('equipment').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('equipment').insert(payload);
    }

    resetForm();
    fetchEquipment();
  };

  const resetForm = () => {
    setNewEquip({
      type: 'motorized',
      name: '',
      year: '',
      make: '',
      model: '',
      hours: '',
      separator_hours: '',
      serial_number: '',
      width: '',
      notes: ''
    });
    setEditing(null);
  };

  const editEquipment = (item: Equipment) => {
    setEditing(item);
    setNewEquip({
      type: item.type,
      name: item.name,
      year: item.year || '',
      make: item.make || '',
      model: item.model || '',
      hours: item.hours?.toString() || '',
      separator_hours: item.separator_hours?.toString() || '',
      serial_number: item.serial_number || '',
      width: item.width?.toString() || '',
      notes: item.notes || ''
    });
  };

  const deleteEquipment = async (id: string) => {
    if (!confirm("Delete this equipment?")) return;
    await supabase.from('equipment').delete().eq('id', id);
    fetchEquipment();
  };

  const toggleExpand = (id: string) => {
    const newSet = new Set(expanded);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpanded(newSet);
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-6">Equipment</h3>

      {/* Add/Edit Form */}
      <div className="bg-gray-100 p-6 rounded-xl mb-8">
        <h4 className="font-medium mb-4">{editing ? 'Edit Equipment' : 'Add New Equipment'}</h4>

        <select value={newEquip.type} onChange={(e) => setNewEquip({...newEquip, type: e.target.value as 'motorized' | 'implement'})} className="w-full p-3 border rounded-lg mb-4">
          <option value="motorized">Motorized Equipment</option>
          <option value="implement">Implement</option>
        </select>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="text" placeholder="Name" value={newEquip.name} onChange={(e) => setNewEquip({...newEquip, name: e.target.value})} className="p-3 border rounded-lg" />
          <input type="text" placeholder="Year" value={newEquip.year} onChange={(e) => setNewEquip({...newEquip, year: e.target.value})} className="p-3 border rounded-lg" />
          <input type="text" placeholder="Make" value={newEquip.make} onChange={(e) => setNewEquip({...newEquip, make: e.target.value})} className="p-3 border rounded-lg" />
          <input type="text" placeholder="Model" value={newEquip.model} onChange={(e) => setNewEquip({...newEquip, model: e.target.value})} className="p-3 border rounded-lg" />

          {newEquip.type === 'motorized' && (
            <>
              <input type="number" step="0.1" placeholder="Hours" value={newEquip.hours} onChange={(e) => setNewEquip({...newEquip, hours: e.target.value})} className="p-3 border rounded-lg" />
              <input type="number" step="0.1" placeholder="Separator Hours (Combines)" value={newEquip.separator_hours} onChange={(e) => setNewEquip({...newEquip, separator_hours: e.target.value})} className="p-3 border rounded-lg" />
              <input type="text" placeholder="Serial Number" value={newEquip.serial_number} onChange={(e) => setNewEquip({...newEquip, serial_number: e.target.value})} className="p-3 border rounded-lg md:col-span-2" />
            </>
          )}

          {newEquip.type === 'implement' && (
            <input type="number" step="0.1" placeholder="Width (ft)" value={newEquip.width} onChange={(e) => setNewEquip({...newEquip, width: e.target.value})} className="p-3 border rounded-lg" />
          )}

          <textarea placeholder="Notes" value={newEquip.notes} onChange={(e) => setNewEquip({...newEquip, notes: e.target.value})} className="p-3 border rounded-lg md:col-span-2" rows={2} />
        </div>

        <div className="mt-6 flex gap-4">
          <button onClick={saveEquipment} className="bg-emerald-700 text-white px-8 py-3 rounded-lg hover:bg-emerald-600">
            {editing ? 'Update Equipment' : 'Add Equipment'}
          </button>
          {editing && <button onClick={resetForm} className="border px-6 py-3 rounded-lg">Cancel</button>}
        </div>
      </div>

      {/* Equipment List */}
      <div className="space-y-4">
        {equipment.map(eq => {
          const isExpanded = expanded.has(eq.id);
          return (
            <div key={eq.id} className="bg-white border rounded-xl shadow">
              <div onClick={() => toggleExpand(eq.id)} className="p-6 flex justify-between items-center cursor-pointer hover:bg-gray-50">
                <div>
                  <h4 className="font-semibold text-lg">{eq.name}</h4>
                  <p className="text-sm text-gray-600">{eq.year} {eq.make} {eq.model}</p>
                </div>
                <span className="capitalize text-emerald-600">{eq.type}</span>
              </div>

              {isExpanded && (
                <div className="border-t p-6 bg-gray-50">
                  <div className="grid grid-cols-2 gap-6 text-sm">
                    {eq.year && <p><strong>Year:</strong> {eq.year}</p>}
                    {eq.make && <p><strong>Make:</strong> {eq.make}</p>}
                    {eq.model && <p><strong>Model:</strong> {eq.model}</p>}
                    {eq.hours && <p><strong>Hours:</strong> {eq.hours}</p>}
                    {eq.separator_hours && <p><strong>Separator Hours:</strong> {eq.separator_hours}</p>}
                    {eq.serial_number && <p><strong>Serial #:</strong> {eq.serial_number}</p>}
                    {eq.width && <p><strong>Width:</strong> {eq.width} ft</p>}
                    {eq.notes && <p className="md:col-span-2"><strong>Notes:</strong> {eq.notes}</p>}
                  </div>

                  <div className="mt-6 flex gap-4">
                    <button onClick={() => editEquipment(eq)} className="text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => deleteEquipment(eq.id)} className="text-red-600 hover:underline">Delete</button>
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