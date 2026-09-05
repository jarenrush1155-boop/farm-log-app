'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { mutateWithPin } from '../../lib/pin';
import TableScroll from '../../components/TableScroll';
import EmptyState from '../../components/EmptyState';
import { useToast } from '../../components/ToastProvider';
import { usePin } from '../../components/PinProvider';

export default function ChemicalsPage() {
  const { success, error } = useToast();
  const { requestPin, requestPinForDelete } = usePin();
  const [chemicals, setChemicals] = useState<any[]>([]);
  const [editingChemical, setEditingChemical] = useState<any>(null);
  const [newChemical, setNewChemical] = useState({
    name: '',
    unit: 'GPA',
  });

  const units = ['GPA', 'oz/acre', 'lbs/acre', 'pint/acre', 'oz/gal', 'lbs/gal', 'pint/gal'];

  useEffect(() => {
    fetchChemicals();
  }, []);

  const fetchChemicals = async () => {
    const { data } = await supabase.from('chemicals').select('*').order('name');
    setChemicals(data || []);
  };

  const resetForm = () => {
    setNewChemical({ name: '', unit: 'GPA' });
    setEditingChemical(null);
  };

  const saveChemical = async () => {
    if (!newChemical.name) {
      error('Chemical name is required');
      return;
    }

    const pin = await requestPin({
      title: editingChemical ? 'Enter PIN to update' : 'Enter PIN to save',
      message: editingChemical ? 'Confirm PIN to update this chemical.' : 'Confirm PIN to add this chemical.',
    });
    if (!pin) return;

    const { error: mutateError } = await mutateWithPin({
      pin,
      table: 'chemicals',
      action: editingChemical ? 'update' : 'insert',
      id: editingChemical?.id,
      data: {
        name: newChemical.name,
        unit: newChemical.unit,
      },
    });

    if (mutateError) error(mutateError.message);
    else {
      success(editingChemical ? 'Chemical updated!' : 'Chemical added!');
      resetForm();
      fetchChemicals();
    }
  };

  const editChemical = (chem: any) => {
    setEditingChemical(chem);
    setNewChemical({
      name: chem.name || '',
      unit: chem.unit || 'GPA',
    });
  };

  const deleteChemical = async (id: string) => {
    const enteredPin = await requestPinForDelete('this chemical');
    if (!enteredPin) return;

    const { error: mutateError } = await mutateWithPin({
      pin: enteredPin,
      table: 'chemicals',
      action: 'delete',
      id,
    });

    if (mutateError) error(mutateError.message);
    else {
      success('Chemical deleted');
      if (editingChemical?.id === id) resetForm();
      fetchChemicals();
    }
  };

  return (
    <div>
      <h3 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">Manage Chemicals</h3>

      <div className="card-panel">
        <h4 className="font-medium mb-4">{editingChemical ? 'Edit Chemical' : 'Add New Chemical'}</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Chemical Name (e.g. Roundup PowerMax)"
            value={newChemical.name}
            onChange={(e) => setNewChemical({ ...newChemical, name: e.target.value })}
            className="form-input sm:col-span-2"
          />

          <select value={newChemical.unit} onChange={(e) => setNewChemical({ ...newChemical, unit: e.target.value })} className="form-input">
            {units.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>

          <div className="flex flex-col sm:flex-row gap-3 sm:col-span-2 lg:col-span-4">
            <button onClick={saveChemical} className="btn-primary sm:w-auto">
              {editingChemical ? 'Update Chemical' : 'Add Chemical'}
            </button>
            {editingChemical && (
              <button onClick={resetForm} className="btn-secondary sm:w-auto">
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {chemicals.length === 0 ? (
        <EmptyState
          title="No chemicals yet"
          description="Add chemicals here so you can build premixes and spray logs."
        />
      ) : (
        <>
          <div className="space-y-3 sm:hidden">
            {chemicals.map((chem) => (
              <div key={chem.id} className="bg-white border rounded-xl p-4 flex items-center justify-between gap-3 shadow-sm">
                <div>
                  <p className="font-medium">{chem.name}</p>
                  <p className="text-sm text-gray-600">{chem.unit}</p>
                </div>
                <div className="flex gap-3 shrink-0">
                  <button onClick={() => editChemical(chem)} className="text-blue-600 min-h-[44px] px-2">
                    Edit
                  </button>
                  <button onClick={() => deleteChemical(chem.id)} className="text-red-600 min-h-[44px] px-2">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden sm:block bg-white rounded-xl shadow overflow-hidden">
            <TableScroll>
              <table className="w-full min-w-[400px]">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-4 text-left">Chemical Name</th>
                    <th className="p-4">Unit</th>
                    <th className="p-4 w-36">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {chemicals.map((chem) => (
                    <tr key={chem.id} className="border-t">
                      <td className="p-4 font-medium">{chem.name}</td>
                      <td className="p-4 text-center">{chem.unit}</td>
                      <td className="p-4 text-center">
                        <button onClick={() => editChemical(chem)} className="text-blue-600 hover:text-blue-800 text-sm min-h-[44px] mr-3">
                          Edit
                        </button>
                        <button onClick={() => deleteChemical(chem.id)} className="text-red-600 hover:text-red-800 text-sm min-h-[44px]">
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
