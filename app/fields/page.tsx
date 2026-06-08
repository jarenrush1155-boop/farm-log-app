'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type Field = {
  id: string;
  name: string;
  acres: number;
  type: 'irrigated' | 'dryland';
  legal_description?: string;
  notes?: string;
};

export default function FieldsPage() {
  const [fields, setFields] = useState<Field[]>([]);
  const [editingField, setEditingField] = useState<Field | null>(null);
  const [newField, setNewField] = useState({ 
    name: '', 
    acres: '', 
    type: 'irrigated' as 'irrigated' | 'dryland', 
    legal_description: '',
    notes: '' 
  });

  useEffect(() => {
    fetchFields();
  }, []);

  const fetchFields = async () => {
    const { data } = await supabase.from('fields').select('*').order('name');
    setFields(data || []);
  };

  const saveField = async () => {
    if (!newField.name || !newField.acres) {
      alert("Field name and acres are required");
      return;
    }

    const payload = {
      name: newField.name.trim(),
      acres: parseFloat(newField.acres),
      type: newField.type,
      legal_description: newField.legal_description.trim() || null,
      notes: newField.notes.trim() || null
    };

    let error;
    if (editingField) {
      ({ error } = await supabase.from('fields').update(payload).eq('id', editingField.id));
    } else {
      ({ error } = await supabase.from('fields').insert(payload));
    }

    if (error) {
      alert("Error saving field: " + error.message);
    } else {
      alert(editingField ? "Field updated!" : "Field added!");
      setNewField({ name: '', acres: '', type: 'irrigated', legal_description: '', notes: '' });
      setEditingField(null);
      fetchFields();
    }
  };

  const editField = (field: Field) => {
    setEditingField(field);
    setNewField({
      name: field.name,
      acres: field.acres.toString(),
      type: field.type,
      legal_description: field.legal_description || '',
      notes: field.notes || ''
    });
  };

  const deleteField = async (id: string) => {
    if (!confirm("Delete this field? This cannot be undone.")) return;
    const { error } = await supabase.from('fields').delete().eq('id', id);
    if (error) alert(error.message);
    else fetchFields();
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-6">Manage Fields</h3>

      {/* Add / Edit Form */}
      <div className="bg-gray-100 p-6 rounded-xl mb-8">
        <h4 className="font-medium mb-4">{editingField ? 'Edit Field' : 'Add New Field'}</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input 
            type="text" 
            placeholder="Field Name" 
            value={newField.name}
            onChange={(e) => setNewField({...newField, name: e.target.value})}
            className="p-3 border rounded-lg" 
          />
          <input 
            type="number" 
            step="0.1" 
            placeholder="Acres" 
            value={newField.acres}
            onChange={(e) => setNewField({...newField, acres: e.target.value})}
            className="p-3 border rounded-lg" 
          />

          <select 
            value={newField.type} 
            onChange={(e) => setNewField({...newField, type: e.target.value as 'irrigated' | 'dryland'})}
            className="p-3 border rounded-lg"
          >
            <option value="irrigated">Irrigated</option>
            <option value="dryland">Dryland</option>
          </select>

          <input 
            type="text" 
            placeholder="Legal Description (optional)" 
            value={newField.legal_description}
            onChange={(e) => setNewField({...newField, legal_description: e.target.value})}
            className="p-3 border rounded-lg md:col-span-2" 
          />

          <textarea 
            placeholder="Notes (optional)" 
            value={newField.notes}
            onChange={(e) => setNewField({...newField, notes: e.target.value})}
            className="p-3 border rounded-lg md:col-span-2" 
            rows={2}
          />
        </div>

        <div className="mt-6 flex gap-4">
          <button 
            onClick={saveField} 
            className="bg-emerald-700 text-white px-8 py-3 rounded-lg hover:bg-emerald-600"
          >
            {editingField ? 'Update Field' : 'Add Field'}
          </button>
          
          {editingField && (
            <button 
              onClick={() => {
                setEditingField(null);
                setNewField({ name: '', acres: '', type: 'irrigated', legal_description: '', notes: '' });
              }} 
              className="border px-6 py-3 rounded-lg"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Fields Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
<thead className="bg-gray-100">
  <tr>
    <th className="p-4 text-left">Field Name</th>
    <th className="p-4 text-right">Acres</th>
    <th className="p-4 text-center">Type</th>
    <th className="p-4 text-center">Legal Description</th>
    <th className="p-4 w-32 text-center">Actions</th>
  </tr>
</thead>
<tbody>
  {fields.map(field => (
    <tr key={field.id} className="border-t hover:bg-gray-50">
      <td className="p-4 font-medium">{field.name}</td>
      <td className="p-4 text-right">{field.acres}</td>
      <td className="p-4 text-center font-medium">{field.type}</td>
      <td className="p-4 text-center text-sm text-gray-600">{field.legal_description || '—'}</td>
      <td className="p-4 text-center">
        <button onClick={() => editField(field)} className="text-blue-600 hover:underline mr-4">Edit</button>
        <button onClick={() => deleteField(field.id)} className="text-red-600 hover:underline">Delete</button>
      </td>
    </tr>
  ))}
</tbody>
        </table>
      </div>
    </div>
  );
}