'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function OperationsPage() {
  const [operations, setOperations] = useState<any[]>([]);
  const [fields, setFields] = useState<any[]>([]);

  const [opType, setOpType] = useState('tillage');
  const [formData, setFormData] = useState<any>({});
  const [editingOp, setEditingOp] = useState<any>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchFields();
    fetchOperations();
  }, []);

  const fetchFields = async () => {
    const { data } = await supabase.from('fields').select('*');
    setFields(data || []);
  };

  const fetchOperations = async () => {
    const { data } = await supabase.from('operations').select('*').order('date', { ascending: false });
    setOperations(data || []);
  };

  const updateForm = (key: string, value: any) => {
    setFormData({ ...formData, [key]: value });
  };

  const saveOperation = async () => {
    if (!formData.field_id) return alert("Please select a field");

    const payload = {
      field_id: formData.field_id,
      operation_type: opType,
      date: formData.date || new Date().toISOString().split('T')[0],
      acres: formData.acres ? parseFloat(formData.acres) : null,
      details: formData,
      notes: formData.notes
    };

    let error;
    if (editingOp) {
      ({ error } = await supabase.from('operations').update(payload).eq('id', editingOp.id));
    } else {
      ({ error } = await supabase.from('operations').insert(payload));
    }

    if (error) alert("Error: " + error.message);
    else {
      alert(editingOp ? "Operation updated!" : "Operation saved!");
      resetForm();
      fetchOperations();
    }
  };

  const resetForm = () => {
    setFormData({});
    setEditingOp(null);
    setOpType('tillage');
  };

  const editOperation = (op: any) => {
    setEditingOp(op);
    setOpType(op.operation_type);
    setFormData({
      ...op.details,
      field_id: op.field_id,
      date: op.date,
      acres: op.acres,
      notes: op.notes
    });
  };

  const deleteOperation = async (id: string) => {
    if (!confirm("Delete this operation?")) return;
    await supabase.from('operations').delete().eq('id', id);
    fetchOperations();
  };

  const toggleExpand = (id: string) => {
    const newSet = new Set(expanded);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpanded(newSet);
  };

  const renderDynamicFields = () => {
    switch(opType) {
      case 'planting':
        return (
          <>
            <input type="text" placeholder="Crop" value={formData.crop || ''} onChange={(e) => updateForm('crop', e.target.value)} className="w-full p-3 border rounded-lg" />
            <input type="text" placeholder="Variety" value={formData.variety || ''} onChange={(e) => updateForm('variety', e.target.value)} className="w-full p-3 border rounded-lg" />
            <input type="text" placeholder="Plant Population / Seeding Rate" value={formData.population || ''} onChange={(e) => updateForm('population', e.target.value)} className="w-full p-3 border rounded-lg" />
          </>
        );

      case 'strip_till':
        return (
          <>
            <input type="text" placeholder="Product 1" value={formData.product1 || ''} onChange={(e) => updateForm('product1', e.target.value)} className="w-full p-3 border rounded-lg" />
            <input type="text" placeholder="Rate 1" value={formData.rate1 || ''} onChange={(e) => updateForm('rate1', e.target.value)} className="w-full p-3 border rounded-lg" />
            <input type="text" placeholder="Product 2 (optional)" value={formData.product2 || ''} onChange={(e) => updateForm('product2', e.target.value)} className="w-full p-3 border rounded-lg" />
            <input type="text" placeholder="Rate 2 (optional)" value={formData.rate2 || ''} onChange={(e) => updateForm('rate2', e.target.value)} className="w-full p-3 border rounded-lg" />
          </>
        );

      case 'harvest':
        return (
          <>
            <input type="text" placeholder="Crop" value={formData.crop || ''} onChange={(e) => updateForm('crop', e.target.value)} className="w-full p-3 border rounded-lg" />
            <input type="number" step="0.1" placeholder="Avg Yield (bu/ac)" value={formData.yield || ''} onChange={(e) => updateForm('yield', e.target.value)} className="w-full p-3 border rounded-lg" />
          </>
        );

      case 'drilling':
        return (
          <>
            <input type="text" placeholder="Front Tank Product" value={formData.front_product || ''} onChange={(e) => updateForm('front_product', e.target.value)} className="w-full p-3 border rounded-lg" />
            <input type="text" placeholder="Front Tank Rate" value={formData.front_rate || ''} onChange={(e) => updateForm('front_rate', e.target.value)} className="w-full p-3 border rounded-lg" />
            <input type="text" placeholder="Middle Tank Product" value={formData.middle_product || ''} onChange={(e) => updateForm('middle_product', e.target.value)} className="w-full p-3 border rounded-lg" />
            <input type="text" placeholder="Middle Tank Rate" value={formData.middle_rate || ''} onChange={(e) => updateForm('middle_rate', e.target.value)} className="w-full p-3 border rounded-lg" />
            <input type="text" placeholder="Back Tank Product" value={formData.back_product || ''} onChange={(e) => updateForm('back_product', e.target.value)} className="w-full p-3 border rounded-lg" />
            <input type="text" placeholder="Back Tank Rate" value={formData.back_rate || ''} onChange={(e) => updateForm('back_rate', e.target.value)} className="w-full p-3 border rounded-lg" />
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-6">Field Operations</h3>

      <div className="bg-gray-100 p-6 rounded-xl mb-8">
        <h4 className="font-medium mb-4">{editingOp ? 'Edit Operation' : 'Log New Operation'}</h4>
        
        <select value={opType} onChange={(e) => { setOpType(e.target.value); setFormData({}); }} className="w-full p-3 border rounded-lg mb-6">
          <option value="tillage">Tillage</option>
          <option value="planting">Planting</option>
          <option value="strip_till">Strip Till</option>
          <option value="dirt_work">Dirt Work</option>
          <option value="harvest">Harvest</option>
          <option value="drilling">Drilling</option>
        </select>

        <div className="space-y-4">
          <select value={formData.field_id || ''} onChange={(e) => updateForm('field_id', e.target.value)} className="w-full p-3 border rounded-lg">
            <option value="">Select Field</option>
            {fields.map(f => <option key={f.id} value={f.id}>{f.name} ({f.acres} ac)</option>)}
          </select>

          <input type="date" value={formData.date || ''} onChange={(e) => updateForm('date', e.target.value)} className="w-full p-3 border rounded-lg" />

          <input type="number" step="0.1" placeholder="Acres Covered" value={formData.acres || ''} onChange={(e) => updateForm('acres', e.target.value)} className="w-full p-3 border rounded-lg" />

          {renderDynamicFields()}

          <textarea placeholder="Notes (include equipment used here)" value={formData.notes || ''} onChange={(e) => updateForm('notes', e.target.value)} className="w-full p-3 border rounded-lg h-24" />
        </div>

        <div className="mt-6 flex gap-4">
          <button onClick={saveOperation} className="bg-emerald-700 text-white px-8 py-3 rounded-lg hover:bg-emerald-600">
            {editingOp ? 'Update Operation' : 'Save Operation'}
          </button>
          {editingOp && <button onClick={resetForm} className="border px-6 py-3 rounded-lg">Cancel</button>}
        </div>
      </div>

      {/* Operations List */}
      <h4 className="font-medium mb-4">Recent Operations</h4>
      <div className="space-y-3">
        {operations.map(op => {
          const field = fields.find(f => f.id === op.field_id);
          const isExpanded = expanded.has(op.id);
          const details = op.details || {};

          return (
            <div key={op.id} className="bg-white border rounded-xl shadow">
              <div onClick={() => toggleExpand(op.id)} className="p-6 flex justify-between cursor-pointer hover:bg-gray-50">
                <div>
                  <span className="capitalize font-medium">
                    {op.operation_type === 'strip_till' ? 'Strip Till' : 
                     op.operation_type === 'dirt_work' ? 'Dirt Work' : op.operation_type}
                  </span>
                  <span className="ml-4 text-gray-500">{op.date}</span>
                </div>
                <div>
                  {field?.name} • {op.acres} acres
                </div>
              </div>

              {isExpanded && (
                <div className="border-t p-6 bg-gray-50">
                  <div className="text-sm space-y-1">
                    {details.crop && <p><strong>Crop:</strong> {details.crop}</p>}
                    {details.variety && <p><strong>Variety:</strong> {details.variety}</p>}
                    {details.population && <p><strong>Population:</strong> {details.population}</p>}
                    {details.yield && <p><strong>Yield:</strong> {details.yield} bu/ac</p>}
                    {details.product1 && <p><strong>Product 1:</strong> {details.product1} @ {details.rate1}</p>}
                    {details.product2 && <p><strong>Product 2:</strong> {details.product2} @ {details.rate2}</p>}
                    {details.front_product && <p><strong>Front Tank:</strong> {details.front_product} @ {details.front_rate}</p>}
                    {details.middle_product && <p><strong>Middle Tank:</strong> {details.middle_product} @ {details.middle_rate}</p>}
                    {details.back_product && <p><strong>Back Tank:</strong> {details.back_product} @ {details.back_rate}</p>}
                  </div>
                  {op.notes && <p className="mt-4"><strong>Notes:</strong> {op.notes}</p>}

                  <div className="mt-6 flex gap-6">
                    <button onClick={() => editOperation(op)} className="text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => deleteOperation(op.id)} className="text-red-600 hover:underline">Delete</button>
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