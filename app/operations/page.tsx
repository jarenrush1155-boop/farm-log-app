'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { mutateWithPin, promptPinForDelete } from '../../lib/pin';
import PinField from '../../components/PinField';

export default function OperationsPage() {
  const [operations, setOperations] = useState<any[]>([]);
  const [fields, setFields] = useState<any[]>([]);

  const [opType, setOpType] = useState('tillage');
  const [formData, setFormData] = useState<any>({});
  const [pin, setPin] = useState('');
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
    if (!formData.field_id) return alert('Please select a field');
    if (!pin) return alert('Please enter the PIN to save');

    const payload = {
      field_id: formData.field_id,
      operation_type: opType,
      date: formData.date || new Date().toISOString().split('T')[0],
      acres: formData.acres ? parseFloat(formData.acres) : null,
      details: formData,
      notes: formData.notes || null,
    };

    let errorMessage: string | null = null;

    if (editingOp) {
      // Prefer existing RPC if present; fall back to generic mutate_with_pin
      const { error: updateError } = await supabase.rpc('update_operation_with_pin', {
        p_id: editingOp.id,
        p_field_id: payload.field_id,
        p_operation_type: payload.operation_type,
        p_date: payload.date,
        p_acres: payload.acres,
        p_details: payload.details,
        p_notes: payload.notes,
        p_pin: pin,
      });

      if (updateError?.message?.includes('Could not find the function')) {
        const fallback = await mutateWithPin({
          pin,
          table: 'operations',
          action: 'update',
          id: editingOp.id,
          data: payload,
        });
        errorMessage = fallback.error?.message ?? null;
      } else {
        errorMessage = updateError?.message ?? null;
      }
    } else {
      const { error: insertError } = await supabase.rpc('insert_operation_with_pin', {
        p_field_id: payload.field_id,
        p_operation_type: payload.operation_type,
        p_date: payload.date,
        p_acres: payload.acres,
        p_details: payload.details,
        p_notes: payload.notes,
        p_pin: pin,
      });

      if (insertError?.message?.includes('Could not find the function')) {
        const fallback = await mutateWithPin({
          pin,
          table: 'operations',
          action: 'insert',
          data: payload,
        });
        errorMessage = fallback.error?.message ?? null;
      } else {
        errorMessage = insertError?.message ?? null;
      }
    }

    if (errorMessage) {
      alert('Error: ' + errorMessage);
    } else {
      alert(editingOp ? 'Operation updated!' : 'Operation saved!');
      resetForm();
      fetchOperations();
    }
  };

  const resetForm = () => {
    setFormData({});
    setPin('');
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
      notes: op.notes,
    });
    setPin('');
  };

  const deleteOperation = async (id: string) => {
    const enteredPin = promptPinForDelete('this operation');
    if (!enteredPin) return;

    // Prefer dedicated RPC; fall back to generic mutate_with_pin
    const { error: rpcError } = await supabase.rpc('delete_operation_with_pin', {
      p_id: id,
      p_pin: enteredPin,
    });

    let errorMessage = rpcError?.message ?? null;
    if (rpcError?.message?.includes('Could not find the function')) {
      const fallback = await mutateWithPin({
        pin: enteredPin,
        table: 'operations',
        action: 'delete',
        id,
      });
      errorMessage = fallback.error?.message ?? null;
    }

    if (errorMessage) alert('Error: ' + errorMessage);
    else fetchOperations();
  };

  const toggleExpand = (id: string) => {
    const newSet = new Set(expanded);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpanded(newSet);
  };

  const renderDynamicFields = () => {
    switch (opType) {
      case 'planting':
        return (
          <>
            <input type="text" placeholder="Crop" value={formData.crop || ''} onChange={(e) => updateForm('crop', e.target.value)} className="form-input" />
            <input type="text" placeholder="Variety" value={formData.variety || ''} onChange={(e) => updateForm('variety', e.target.value)} className="form-input" />
            <input type="text" placeholder="Plant Population / Seeding Rate" value={formData.population || ''} onChange={(e) => updateForm('population', e.target.value)} className="form-input" />
          </>
        );

      case 'strip_till':
        return (
          <>
            <input type="text" placeholder="Product 1" value={formData.product1 || ''} onChange={(e) => updateForm('product1', e.target.value)} className="form-input" />
            <input type="text" placeholder="Rate 1" value={formData.rate1 || ''} onChange={(e) => updateForm('rate1', e.target.value)} className="form-input" />
            <input type="text" placeholder="Product 2 (optional)" value={formData.product2 || ''} onChange={(e) => updateForm('product2', e.target.value)} className="form-input" />
            <input type="text" placeholder="Rate 2 (optional)" value={formData.rate2 || ''} onChange={(e) => updateForm('rate2', e.target.value)} className="form-input" />
          </>
        );

      case 'harvest':
        return (
          <>
            <input type="text" placeholder="Crop" value={formData.crop || ''} onChange={(e) => updateForm('crop', e.target.value)} className="form-input" />
            <input type="number" step="0.1" inputMode="decimal" placeholder="Avg Yield (bu/ac)" value={formData.yield || ''} onChange={(e) => updateForm('yield', e.target.value)} className="form-input" />
          </>
        );

      case 'drilling':
        return (
          <>
            <input type="text" placeholder="Front Tank Product" value={formData.front_product || ''} onChange={(e) => updateForm('front_product', e.target.value)} className="form-input" />
            <input type="text" placeholder="Front Tank Rate" value={formData.front_rate || ''} onChange={(e) => updateForm('front_rate', e.target.value)} className="form-input" />
            <input type="text" placeholder="Middle Tank Product" value={formData.middle_product || ''} onChange={(e) => updateForm('middle_product', e.target.value)} className="form-input" />
            <input type="text" placeholder="Middle Tank Rate" value={formData.middle_rate || ''} onChange={(e) => updateForm('middle_rate', e.target.value)} className="form-input" />
            <input type="text" placeholder="Back Tank Product" value={formData.back_product || ''} onChange={(e) => updateForm('back_product', e.target.value)} className="form-input" />
            <input type="text" placeholder="Back Tank Rate" value={formData.back_rate || ''} onChange={(e) => updateForm('back_rate', e.target.value)} className="form-input" />
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div>
      <h3 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">Field Operations</h3>

      <div className="card-panel">
        <h4 className="font-medium mb-4">{editingOp ? 'Edit Operation' : 'Log New Operation'}</h4>

        <select
          value={opType}
          onChange={(e) => {
            setOpType(e.target.value);
            setFormData({});
          }}
          className="form-input mb-5"
        >
          <option value="tillage">Tillage</option>
          <option value="planting">Planting</option>
          <option value="strip_till">Strip Till</option>
          <option value="dirt_work">Dirt Work</option>
          <option value="harvest">Harvest</option>
          <option value="drilling">Drilling</option>
        </select>

        <div className="space-y-3">
          <select value={formData.field_id || ''} onChange={(e) => updateForm('field_id', e.target.value)} className="form-input">
            <option value="">Select Field</option>
            {fields.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.acres} ac)
              </option>
            ))}
          </select>

          <input type="date" value={formData.date || ''} onChange={(e) => updateForm('date', e.target.value)} className="form-input" />

          <input type="number" step="0.1" inputMode="decimal" placeholder="Acres Covered" value={formData.acres || ''} onChange={(e) => updateForm('acres', e.target.value)} className="form-input" />

          {renderDynamicFields()}

          <textarea placeholder="Notes (include equipment used here)" value={formData.notes || ''} onChange={(e) => updateForm('notes', e.target.value)} className="form-input h-24" />

          <PinField value={pin} onChange={setPin} className="form-input" />
        </div>

        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <button onClick={saveOperation} className="btn-primary">
            {editingOp ? 'Update Operation' : 'Save Operation'}
          </button>
          {editingOp && (
            <button onClick={resetForm} className="btn-secondary">
              Cancel
            </button>
          )}
        </div>
      </div>

      <h4 className="font-medium mb-4">Recent Operations</h4>
      <div className="space-y-3">
        {operations.map((op) => {
          const field = fields.find((f) => f.id === op.field_id);
          const isExpanded = expanded.has(op.id);
          const details = op.details || {};

          return (
            <div key={op.id} className="bg-white border rounded-xl shadow-sm">
              <button type="button" onClick={() => toggleExpand(op.id)} className="w-full p-4 sm:p-6 flex flex-col sm:flex-row sm:justify-between gap-1 text-left cursor-pointer hover:bg-gray-50 min-h-[64px] rounded-xl">
                <div>
                  <span className="capitalize font-medium">
                    {op.operation_type === 'strip_till' ? 'Strip Till' : op.operation_type === 'dirt_work' ? 'Dirt Work' : op.operation_type}
                  </span>
                  <span className="ml-3 text-gray-500 text-sm">{op.date}</span>
                </div>
                <div className="text-sm sm:text-base text-gray-700">
                  {field?.name} • {op.acres} acres
                </div>
              </button>

              {isExpanded && (
                <div className="border-t p-6 bg-gray-50">
                  <div className="text-sm space-y-1">
                    {details.crop && (
                      <p>
                        <strong>Crop:</strong> {details.crop}
                      </p>
                    )}
                    {details.variety && (
                      <p>
                        <strong>Variety:</strong> {details.variety}
                      </p>
                    )}
                    {details.population && (
                      <p>
                        <strong>Population:</strong> {details.population}
                      </p>
                    )}
                    {details.yield && (
                      <p>
                        <strong>Yield:</strong> {details.yield} bu/ac
                      </p>
                    )}
                    {details.product1 && (
                      <p>
                        <strong>Product 1:</strong> {details.product1} @ {details.rate1}
                      </p>
                    )}
                    {details.product2 && (
                      <p>
                        <strong>Product 2:</strong> {details.product2} @ {details.rate2}
                      </p>
                    )}
                    {details.front_product && (
                      <p>
                        <strong>Front Tank:</strong> {details.front_product} @ {details.front_rate}
                      </p>
                    )}
                    {details.middle_product && (
                      <p>
                        <strong>Middle Tank:</strong> {details.middle_product} @ {details.middle_rate}
                      </p>
                    )}
                    {details.back_product && (
                      <p>
                        <strong>Back Tank:</strong> {details.back_product} @ {details.back_rate}
                      </p>
                    )}
                  </div>
                  {op.notes && (
                    <p className="mt-4">
                      <strong>Notes:</strong> {op.notes}
                    </p>
                  )}

                  <div className="mt-6 flex gap-6">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        editOperation(op);
                      }}
                      className="text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteOperation(op.id);
                      }}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
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
