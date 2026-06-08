'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function ChemicalsPage() {
  const [chemicals, setChemicals] = useState<any[]>([]);
  const [newChemical, setNewChemical] = useState({ 
    name: '', 
    unit: 'GPA' 
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
    if (!newChemical.name) return alert("Chemical name is required");

    const { error } = await supabase.from('chemicals').insert({
      name: newChemical.name,
      unit: newChemical.unit
    });

    if (error) alert(error.message);
    else {
      setNewChemical({ name: '', unit: 'GPA' });
      fetchChemicals();
    }
  };

  const deleteChemical = async (id: string) => {
    if (!confirm("Delete this chemical?")) return;
    await supabase.from('chemicals').delete().eq('id', id);
    fetchChemicals();
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-6">Manage Chemicals</h3>

      <div className="bg-gray-100 p-6 rounded-xl mb-8">
        <h4 className="font-medium mb-4">Add New Chemical</h4>
        <div className="flex gap-4">
          <input 
            type="text" 
            placeholder="Chemical Name (e.g. Roundup PowerMax)" 
            value={newChemical.name}
            onChange={(e) => setNewChemical({...newChemical, name: e.target.value})}
            className="flex-1 p-3 border rounded-lg"
          />
          
          <select 
            value={newChemical.unit}
            onChange={(e) => setNewChemical({...newChemical, unit: e.target.value})}
            className="p-3 border rounded-lg"
          >
            {units.map(unit => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>

          <button onClick={addChemical} className="bg-emerald-700 text-white px-8 py-3 rounded-lg hover:bg-emerald-600">
            Add Chemical
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-4 text-left">Chemical Name</th>
              <th className="p-4">Unit</th>
              <th className="p-4 w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {chemicals.map(chem => (
              <tr key={chem.id} className="border-t">
                <td className="p-4 font-medium">{chem.name}</td>
                <td className="p-4">{chem.unit}</td>
                <td className="p-4">
                  <button 
                    onClick={() => deleteChemical(chem.id)} 
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}