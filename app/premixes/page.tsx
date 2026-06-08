'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function PremixesPage() {
  const [premixes, setPremixes] = useState<any[]>([]);
  const [chemicals, setChemicals] = useState<any[]>([]);
  
  const [newPremix, setNewPremix] = useState({ 
    name: '', 
    description: '' 
  });
  
  const [selectedChemicals, setSelectedChemicals] = useState<Array<{name: string, rate: string}>>([]);

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
    if (selectedChemicals.find(c => c.name === chemName)) return;
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
      alert("Premix name and at least one chemical required");
      return;
    }

    const { error } = await supabase.from('premixes').insert({
      name: newPremix.name,
      description: newPremix.description,
      chemicals: selectedChemicals
    });

    if (error) alert(error.message);
    else {
      alert("Premix saved!");
      setNewPremix({ name: '', description: '' });
      setSelectedChemicals([]);
      fetchPremixes();
    }
  };

  const deletePremix = async (id: string) => {
    if (!confirm("Delete this premix?")) return;
    await supabase.from('premixes').delete().eq('id', id);
    fetchPremixes();
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-6">Manage Premixes</h3>

      <div className="bg-gray-100 p-6 rounded-xl mb-8">
        <h4 className="font-medium mb-4">Create New Premix</h4>
        
        <input 
          type="text" 
          placeholder="Premix Name (e.g. Standard Burndown)" 
          value={newPremix.name}
          onChange={(e) => setNewPremix({...newPremix, name: e.target.value})}
          className="w-full p-3 border rounded-lg mb-4"
        />
        
        <input 
          type="text" 
          placeholder="Description (optional)" 
          value={newPremix.description}
          onChange={(e) => setNewPremix({...newPremix, description: e.target.value})}
          className="w-full p-3 border rounded-lg mb-6"
        />

        {/* Add Chemicals to Premix */}
        <div className="mb-6">
          <p className="font-medium mb-2">Add Chemicals to this Premix:</p>
          <div className="flex gap-2 mb-4">
            <select 
              onChange={(e) => addChemicalToPremix(e.target.value)}
              className="flex-1 p-3 border rounded-lg"
            >
              <option value="">Select Chemical...</option>
              {chemicals.map(chem => (
                <option key={chem.id} value={chem.name}>{chem.name} ({chem.unit})</option>
              ))}
            </select>
          </div>

          {/* Selected Chemicals */}
          <div className="space-y-3">
            {selectedChemicals.map((item, index) => (
              <div key={index} className="flex gap-3 items-center bg-white p-3 rounded-lg border">
                <span className="flex-1 font-medium">{item.name}</span>
                <input 
                  type="text" 
                  placeholder="Rate (e.g. 12 GPA)" 
                  value={item.rate}
                  onChange={(e) => updateRate(index, e.target.value)}
                  className="w-48 p-2 border rounded-lg"
                />
                <button 
                  onClick={() => removeChemical(index)}
                  className="text-red-600 hover:text-red-800 px-3"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        <button onClick={addPremix} className="bg-emerald-700 text-white px-8 py-3 rounded-lg hover:bg-emerald-600">
          Save Premix
        </button>
      </div>

      {/* Existing Premixes List */}
      <h4 className="font-medium mb-4">Saved Premixes</h4>
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-4 text-left">Premix Name</th>
              <th className="p-4">Chemicals</th>
              <th className="p-4 w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {premixes.map(pm => (
              <tr key={pm.id} className="border-t">
                <td className="p-4 font-medium">{pm.name}</td>
                <td className="p-4 text-sm">
                  {pm.chemicals?.map((c: any, i: number) => (
                    <span key={i}>{c.name} ({c.rate}){i < pm.chemicals.length-1 ? ', ' : ''}</span>
                  ))}
                </td>
                <td className="p-4">
                  <button onClick={() => deletePremix(pm.id)} className="text-red-600 hover:text-red-800">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}