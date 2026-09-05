'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { mutateWithPin, promptPinForDelete } from '../../lib/pin';
import PinField from '../../components/PinField';
import TableScroll from '../../components/TableScroll';
import EmptyState from '../../components/EmptyState';

export default function ChemicalsPage() {
  const [chemicals, setChemicals] = useState<any[]>([]);
  const [pin, setPin] = useState('');
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

  const addChemical = async () => {
    if (!newChemical.name) return alert('Chemical name is required');
    if (!pin) return alert('Please enter the PIN to save');

    const { error } = await mutateWithPin({
      pin,
      table: 'chemicals',
      action: 'insert',
      data: {
        name: newChemical.name,
        unit: newChemical.unit,
      },
    });

    if (error) alert(error.message);
    else {
      setNewChemical({ name: '', unit: 'GPA' });
      setPin('');
      fetchChemicals();
    }
  };

  const deleteChemical = async (id: string) => {
    const enteredPin = promptPinForDelete('this chemical');
    if (!enteredPin) return;

    const { error } = await mutateWithPin({
      pin: enteredPin,
      table: 'chemicals',
      action: 'delete',
      id,
    });

    if (error) alert(error.message);
    else fetchChemicals();
  };

  return (
    <div>
      <h3 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">Manage Chemicals</h3>

      <div className="card-panel">
        <h4 className="font-medium mb-4">Add New Chemical</h4>
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

          <PinField value={pin} onChange={setPin} className="form-input" />

          <button onClick={addChemical} className="btn-primary sm:col-span-2 lg:col-span-4 sm:w-auto sm:justify-self-start">
            Add Chemical
          </button>
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
                <button onClick={() => deleteChemical(chem.id)} className="text-red-600 min-h-[44px] px-2">
                  Delete
                </button>
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
                    <th className="p-4 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {chemicals.map((chem) => (
                    <tr key={chem.id} className="border-t">
                      <td className="p-4 font-medium">{chem.name}</td>
                      <td className="p-4 text-center">{chem.unit}</td>
                      <td className="p-4 text-center">
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
