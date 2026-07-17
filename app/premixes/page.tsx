'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { mutateWithPin, promptPinForDelete } from '../../lib/pin';
import PinField from '../../components/PinField';
import TableScroll from '../../components/TableScroll';

export default function PremixesPage() {
  const [premixes, setPremixes] = useState<any[]>([]);
  const [chemicals, setChemicals] = useState<any[]>([]);
  const [pin, setPin] = useState('');

  const [newPremix, setNewPremix] = useState({
    name: '',
    description: '',
  });

  const [selectedChemicals, setSelectedChemicals] = useState<Array<{ name: string; rate: string }>>([]);

  useEffect(() => {
    fetchPremixes();
    fetchChemicals();
  }, []);

  const fetchPremixes = async () => {
    const { data } = await supabase.from('premixes').select('*').order('name');
    setPremixes(data || []);
  };

  const fetchChemicals = async () => {
    const { data } = await supabase.from('chemicals').select('*').order('name');
    setChemicals(data || []);
  };

  const addChemicalToPremix = (chemName: string) => {
    if (!chemName || selectedChemicals.find((c) => c.name === chemName)) return;
    setSelectedChemicals([...selectedChemicals, { name: chemName, rate: '' }]);
  };

  const updateRate = (index: number, rate: string) => {
    const updated = [...selectedChemicals];
    updated[index].rate = rate;
    setSelectedChemicals(updated);
  };

  const removeChemical = (index: number) => {
    setSelectedChemicals(selectedChemicals.filter((_, i) => i !== index));
  };

  const addPremix = async () => {
    if (!newPremix.name || selectedChemicals.length === 0) {
      alert('Premix name and at least one chemical required');
      return;
    }
    if (!pin) return alert('Please enter the PIN to save');

    const { error } = await mutateWithPin({
      pin,
      table: 'premixes',
      action: 'insert',
      data: {
        name: newPremix.name,
        description: newPremix.description,
        chemicals: selectedChemicals,
      },
    });

    if (error) alert(error.message);
    else {
      alert('Premix saved!');
      setNewPremix({ name: '', description: '' });
      setSelectedChemicals([]);
      setPin('');
      fetchPremixes();
    }
  };

  const deletePremix = async (id: string) => {
    const enteredPin = promptPinForDelete('this premix');
    if (!enteredPin) return;

    const { error } = await mutateWithPin({
      pin: enteredPin,
      table: 'premixes',
      action: 'delete',
      id,
    });

    if (error) alert(error.message);
    else fetchPremixes();
  };

  return (
    <div>
      <h3 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">Manage Premixes</h3>

      <div className="card-panel">
        <h4 className="font-medium mb-4">Create New Premix</h4>

        <input
          type="text"
          placeholder="Premix Name (e.g. Standard Burndown)"
          value={newPremix.name}
          onChange={(e) => setNewPremix({ ...newPremix, name: e.target.value })}
          className="form-input mb-3"
        />

        <input
          type="text"
          placeholder="Description (optional)"
          value={newPremix.description}
          onChange={(e) => setNewPremix({ ...newPremix, description: e.target.value })}
          className="form-input mb-5"
        />

        <div className="mb-5">
          <p className="font-medium mb-2">Add Chemicals to this Premix:</p>
          <div className="flex gap-2 mb-4">
            <select
              onChange={(e) => {
                addChemicalToPremix(e.target.value);
                e.target.value = '';
              }}
              className="form-input flex-1"
              defaultValue=""
            >
              <option value="">Select Chemical...</option>
              {chemicals.map((chem) => (
                <option key={chem.id} value={chem.name}>
                  {chem.name} ({chem.unit})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            {selectedChemicals.map((item, index) => (
              <div key={index} className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center bg-white p-3 rounded-lg border">
                <span className="flex-1 font-medium">{item.name}</span>
                <input type="text" placeholder="Rate (e.g. 12 GPA)" value={item.rate} onChange={(e) => updateRate(index, e.target.value)} className="form-input sm:w-48" />
                <button onClick={() => removeChemical(index)} className="text-red-600 hover:text-red-800 px-2 min-h-[44px] self-start sm:self-auto">
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <PinField value={pin} onChange={setPin} className="form-input" />
        </div>

        <button onClick={addPremix} className="btn-primary">
          Save Premix
        </button>
      </div>

      <h4 className="font-medium mb-3">Saved Premixes</h4>

      <div className="space-y-3 sm:hidden">
        {premixes.map((pm) => (
          <div key={pm.id} className="bg-white border rounded-xl p-4 shadow-sm">
            <p className="font-medium">{pm.name}</p>
            <p className="text-sm text-gray-600 mt-1">
              {pm.chemicals?.map((c: any, i: number) => (
                <span key={i}>
                  {c.name} ({c.rate})
                  {i < pm.chemicals.length - 1 ? ', ' : ''}
                </span>
              ))}
            </p>
            <button onClick={() => deletePremix(pm.id)} className="text-red-600 mt-2 min-h-[44px]">
              Delete
            </button>
          </div>
        ))}
      </div>

      <div className="hidden sm:block bg-white rounded-xl shadow-sm overflow-hidden">
        <TableScroll>
          <table className="w-full min-w-[520px]">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4 text-left">Premix Name</th>
                <th className="p-4 text-left">Chemicals</th>
                <th className="p-4 w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {premixes.map((pm) => (
                <tr key={pm.id} className="border-t">
                  <td className="p-4 font-medium">{pm.name}</td>
                  <td className="p-4 text-sm">
                    {pm.chemicals?.map((c: any, i: number) => (
                      <span key={i}>
                        {c.name} ({c.rate})
                        {i < pm.chemicals.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </td>
                  <td className="p-4">
                    <button onClick={() => deletePremix(pm.id)} className="text-red-600 hover:text-red-800 min-h-[44px]">
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
