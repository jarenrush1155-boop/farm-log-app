'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { mutateWithPin, promptPinForDelete } from '../../lib/pin';
import PinField from '../../components/PinField';
import TableScroll from '../../components/TableScroll';
import EmptyState from '../../components/EmptyState';
import { useToast } from '../../components/ToastProvider';

type Field = {
  id: string;
  name: string;
  acres: number;
  type: 'irrigated' | 'dryland';
  legal_description?: string;
  notes?: string;
};

export default function FieldsPage() {
  const { success, error } = useToast();
  const [fields, setFields] = useState<Field[]>([]);
  const [editingField, setEditingField] = useState<Field | null>(null);
  const [pin, setPin] = useState('');
  const [newField, setNewField] = useState({
    name: '',
    acres: '',
    type: 'irrigated' as 'irrigated' | 'dryland',
    legal_description: '',
    notes: '',
  });

  useEffect(() => {
    fetchFields();
  }, []);

  const fetchFields = async () => {
    const { data } = await supabase.from('fields').select('*').order('name');
    setFields(data || []);
  };

  const resetForm = () => {
    setNewField({ name: '', acres: '', type: 'irrigated', legal_description: '', notes: '' });
    setEditingField(null);
    setPin('');
  };

  const saveField = async () => {
    if (!newField.name || !newField.acres) {
      error('Field name and acres are required');
      return;
    }
    if (!pin) {
      error('Please enter the PIN to save');
      return;
    }

    const payload = {
      name: newField.name.trim(),
      acres: parseFloat(newField.acres),
      type: newField.type,
      legal_description: newField.legal_description.trim() || null,
      notes: newField.notes.trim() || null,
    };

    const { error: mutateError } = await mutateWithPin({
      pin,
      table: 'fields',
      action: editingField ? 'update' : 'insert',
      id: editingField?.id,
      data: payload,
    });

    if (mutateError) {
      error('Error saving field: ' + mutateError.message);
    } else {
      success(editingField ? 'Field updated!' : 'Field added!');
      resetForm();
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
      notes: field.notes || '',
    });
    setPin('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteField = async (id: string) => {
    const enteredPin = promptPinForDelete('this field');
    if (!enteredPin) return;

    const { error: mutateError } = await mutateWithPin({
      pin: enteredPin,
      table: 'fields',
      action: 'delete',
      id,
    });

    if (mutateError) error(mutateError.message);
    else {
      success('Field deleted');
      fetchFields();
    }
  };

  return (
    <div>
      <h3 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">Manage Fields</h3>

      <div className="card-panel">
        <h4 className="font-medium mb-4">{editingField ? 'Edit Field' : 'Add New Field'}</h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <input type="text" placeholder="Field Name" value={newField.name} onChange={(e) => setNewField({ ...newField, name: e.target.value })} className="form-input" />
          <input type="number" step="0.1" inputMode="decimal" placeholder="Acres" value={newField.acres} onChange={(e) => setNewField({ ...newField, acres: e.target.value })} className="form-input" />

          <select value={newField.type} onChange={(e) => setNewField({ ...newField, type: e.target.value as 'irrigated' | 'dryland' })} className="form-input">
            <option value="irrigated">Irrigated</option>
            <option value="dryland">Dryland</option>
          </select>

          <input type="text" placeholder="Legal Description (optional)" value={newField.legal_description} onChange={(e) => setNewField({ ...newField, legal_description: e.target.value })} className="form-input sm:col-span-2" />

          <textarea placeholder="Notes (optional)" value={newField.notes} onChange={(e) => setNewField({ ...newField, notes: e.target.value })} className="form-input sm:col-span-2" rows={2} />

          <div className="sm:col-span-2">
            <PinField value={pin} onChange={setPin} className="form-input" />
          </div>
        </div>

        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <button onClick={saveField} className="btn-primary">
            {editingField ? 'Update Field' : 'Add Field'}
          </button>
          {editingField && (
            <button onClick={resetForm} className="btn-secondary">
              Cancel
            </button>
          )}
        </div>
      </div>

      {fields.length === 0 ? (
        <EmptyState
          title="No fields yet"
          description="Add your first field using the form above to start logging operations, spray, and irrigation."
        />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 sm:hidden">
            {fields.map((field) => (
              <div key={field.id} className="bg-white border rounded-xl p-4 shadow-sm">
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="font-semibold">{field.name}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {field.acres} ac · <span className="capitalize">{field.type}</span>
                    </p>
                    {field.legal_description && <p className="text-xs text-gray-500 mt-1">{field.legal_description}</p>}
                  </div>
                </div>
                <div className="mt-3 flex gap-4">
                  <button onClick={() => editField(field)} className="text-blue-600 min-h-[44px]">
                    Edit
                  </button>
                  <button onClick={() => deleteField(field.id)} className="text-red-600 min-h-[44px]">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block bg-white rounded-xl shadow overflow-hidden">
            <TableScroll>
              <table className="w-full min-w-[640px]">
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
                  {fields.map((field) => (
                    <tr key={field.id} className="border-t hover:bg-gray-50">
                      <td className="p-4 font-medium">{field.name}</td>
                      <td className="p-4 text-right">{field.acres}</td>
                      <td className="p-4 text-center font-medium capitalize">{field.type}</td>
                      <td className="p-4 text-center text-sm text-gray-600">{field.legal_description || '—'}</td>
                      <td className="p-4 text-center">
                        <button onClick={() => editField(field)} className="text-blue-600 hover:underline mr-4 min-h-[44px]">
                          Edit
                        </button>
                        <button onClick={() => deleteField(field.id)} className="text-red-600 hover:underline min-h-[44px]">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          </div>
        </>
      )}
    </div>
  );
}
