'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { mutateWithPin, promptPinForDelete } from '../../lib/pin';
import PinField from '../../components/PinField';
import EmptyState from '../../components/EmptyState';

type Equipment = {
  id: string;
  type: 'motorized' | 'implement';
  name: string;
  year?: string;
  make?: string;
  model?: string;
  /** Hours at purchase / when first added (user-set). */
  initial_hours?: number | null;
  /** Highest hours from maintenance logs (auto-maintained). */
  current_hours?: number | null;
  /** Legacy column; kept in sync with current_hours in DB. */
  hours?: number | null;
  separator_hours?: number | null;
  serial_number?: string;
  width?: number;
  notes?: string;
};

const emptyForm = {
  type: 'motorized' as 'motorized' | 'implement',
  name: '',
  year: '',
  make: '',
  model: '',
  initial_hours: '',
  separator_hours: '',
  serial_number: '',
  width: '',
  notes: '',
};

function formatHours(value: number | null | undefined) {
  if (value === null || value === undefined) return '—';
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 });
}

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [pin, setPin] = useState('');
  const [newEquip, setNewEquip] = useState(emptyForm);

  useEffect(() => {
    fetchEquipment();
  }, []);

  const fetchEquipment = async () => {
    const { data } = await supabase.from('equipment').select('*').order('name');
    setEquipment(data || []);
  };

  const saveEquipment = async () => {
    if (!newEquip.name) return alert('Name is required');
    if (!pin) return alert('Please enter the PIN to save');

    const initialHours = newEquip.initial_hours ? parseFloat(newEquip.initial_hours) : null;
    const separatorHours = newEquip.separator_hours ? parseFloat(newEquip.separator_hours) : null;

    const payload: Record<string, unknown> = {
      type: newEquip.type,
      name: newEquip.name,
      year: newEquip.year || null,
      make: newEquip.make || null,
      model: newEquip.model || null,
      serial_number: newEquip.serial_number || null,
      width: newEquip.width ? parseFloat(newEquip.width) : null,
      notes: newEquip.notes || null,
    };

    if (newEquip.type === 'motorized') {
      payload.initial_hours = initialHours;
      payload.separator_hours = separatorHours;
      // On create (or if current not set yet), seed current from initial.
      // Trigger + recompute keep current_hours as max(maintenance, initial).
      if (!editing) {
        payload.current_hours = initialHours;
        payload.hours = initialHours;
      } else if (editing.current_hours == null && editing.hours == null) {
        payload.current_hours = initialHours;
        payload.hours = initialHours;
      } else {
        // Do not clobber auto-updated current_hours when only editing metadata/initial
        payload.initial_hours = initialHours;
      }
    } else {
      payload.initial_hours = null;
      payload.current_hours = null;
      payload.hours = null;
      payload.separator_hours = null;
    }

    const { error } = await mutateWithPin({
      pin,
      table: 'equipment',
      action: editing ? 'update' : 'insert',
      id: editing?.id,
      data: payload,
    });

    if (error) alert('Error: ' + error.message);
    else {
      // Recompute after initial_hours change so current reflects MAX(logs, initial)
      if (editing && newEquip.type === 'motorized') {
        await supabase.rpc('recompute_equipment_hours', { p_equipment_id: editing.id });
      }
      resetForm();
      fetchEquipment();
    }
  };

  const resetForm = () => {
    setNewEquip(emptyForm);
    setEditing(null);
    setPin('');
  };

  const editEquipment = (item: Equipment) => {
    setEditing(item);
    setNewEquip({
      type: item.type,
      name: item.name,
      year: item.year || '',
      make: item.make || '',
      model: item.model || '',
      initial_hours: item.initial_hours?.toString() || item.hours?.toString() || '',
      separator_hours: item.separator_hours?.toString() || '',
      serial_number: item.serial_number || '',
      width: item.width?.toString() || '',
      notes: item.notes || '',
    });
    setPin('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteEquipment = async (id: string) => {
    const enteredPin = promptPinForDelete('this equipment');
    if (!enteredPin) return;

    const { error } = await mutateWithPin({
      pin: enteredPin,
      table: 'equipment',
      action: 'delete',
      id,
    });

    if (error) alert(error.message);
    else fetchEquipment();
  };

  const toggleExpand = (id: string) => {
    const newSet = new Set(expanded);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpanded(newSet);
  };

  const displayCurrentHours = (eq: Equipment) =>
    eq.current_hours ?? eq.hours ?? null;

  return (
    <div>
      <h3 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">Equipment</h3>

      <div className="card-panel">
        <h4 className="font-medium mb-4">{editing ? 'Edit Equipment' : 'Add New Equipment'}</h4>

        <select
          value={newEquip.type}
          onChange={(e) => setNewEquip({ ...newEquip, type: e.target.value as 'motorized' | 'implement' })}
          className="form-input mb-4"
        >
          <option value="motorized">Motorized Equipment</option>
          <option value="implement">Implement</option>
        </select>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <input type="text" placeholder="Name" value={newEquip.name} onChange={(e) => setNewEquip({ ...newEquip, name: e.target.value })} className="form-input" />
          <input type="text" placeholder="Year" value={newEquip.year} onChange={(e) => setNewEquip({ ...newEquip, year: e.target.value })} className="form-input" />
          <input type="text" placeholder="Make" value={newEquip.make} onChange={(e) => setNewEquip({ ...newEquip, make: e.target.value })} className="form-input" />
          <input type="text" placeholder="Model" value={newEquip.model} onChange={(e) => setNewEquip({ ...newEquip, model: e.target.value })} className="form-input" />

          {newEquip.type === 'motorized' && (
            <>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Initial hours</label>
                <input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  placeholder="Hours at purchase / first entry"
                  value={newEquip.initial_hours}
                  onChange={(e) => setNewEquip({ ...newEquip, initial_hours: e.target.value })}
                  className="form-input"
                />
                <p className="text-xs text-gray-500 mt-1">Set once when adding. Current hours update from maintenance logs.</p>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Separator hours (combines)</label>
                <input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  placeholder="Optional"
                  value={newEquip.separator_hours}
                  onChange={(e) => setNewEquip({ ...newEquip, separator_hours: e.target.value })}
                  className="form-input"
                />
              </div>
              <input type="text" placeholder="Serial Number" value={newEquip.serial_number} onChange={(e) => setNewEquip({ ...newEquip, serial_number: e.target.value })} className="form-input sm:col-span-2" />
            </>
          )}

          {newEquip.type === 'implement' && (
            <input type="number" step="0.1" inputMode="decimal" placeholder="Width (ft)" value={newEquip.width} onChange={(e) => setNewEquip({ ...newEquip, width: e.target.value })} className="form-input" />
          )}

          <textarea placeholder="Notes" value={newEquip.notes} onChange={(e) => setNewEquip({ ...newEquip, notes: e.target.value })} className="form-input sm:col-span-2" rows={2} />

          <div className="sm:col-span-2">
            <PinField value={pin} onChange={setPin} className="form-input" />
          </div>
        </div>

        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <button onClick={saveEquipment} className="btn-primary">
            {editing ? 'Update Equipment' : 'Add Equipment'}
          </button>
          {editing && (
            <button onClick={resetForm} className="btn-secondary">
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {equipment.map((eq) => {
          const isExpanded = expanded.has(eq.id);
          const current = displayCurrentHours(eq);
          return (
            <div key={eq.id} className="bg-white border rounded-xl shadow-sm">
              <button
                type="button"
                onClick={() => toggleExpand(eq.id)}
                className="w-full p-4 sm:p-6 flex justify-between items-center gap-3 text-left hover:bg-gray-50 min-h-[64px] rounded-xl"
              >
                <div className="min-w-0">
                  <h4 className="font-semibold text-base sm:text-lg truncate">{eq.name}</h4>
                  <p className="text-sm text-gray-600 truncate">
                    {[eq.year, eq.make, eq.model].filter(Boolean).join(' ') || 'No details'}
                  </p>
                  {eq.type === 'motorized' && (
                    <p className="text-xs text-emerald-700 mt-1">
                      Current: {formatHours(current)} hrs
                      {eq.initial_hours != null && ` · Initial: ${formatHours(eq.initial_hours)}`}
                    </p>
                  )}
                </div>
                <span className="capitalize text-emerald-600 text-sm shrink-0">{eq.type}</span>
              </button>

              {isExpanded && (
                <div className="border-t p-4 sm:p-6 bg-gray-50 rounded-b-xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                    {eq.year && (
                      <p>
                        <strong>Year:</strong> {eq.year}
                      </p>
                    )}
                    {eq.make && (
                      <p>
                        <strong>Make:</strong> {eq.make}
                      </p>
                    )}
                    {eq.model && (
                      <p>
                        <strong>Model:</strong> {eq.model}
                      </p>
                    )}
                    {eq.type === 'motorized' && (
                      <>
                        <p>
                          <strong>Initial hours:</strong> {formatHours(eq.initial_hours)}
                        </p>
                        <p>
                          <strong>Current hours:</strong> {formatHours(current)}
                        </p>
                        {eq.separator_hours != null && (
                          <p>
                            <strong>Separator hours:</strong> {formatHours(eq.separator_hours)}
                          </p>
                        )}
                      </>
                    )}
                    {eq.serial_number && (
                      <p>
                        <strong>Serial #:</strong> {eq.serial_number}
                      </p>
                    )}
                    {eq.width != null && (
                      <p>
                        <strong>Width:</strong> {eq.width} ft
                      </p>
                    )}
                    {eq.notes && (
                      <p className="sm:col-span-2">
                        <strong>Notes:</strong> {eq.notes}
                      </p>
                    )}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-4">
                    <button
                      type="button"
                      onClick={() => editEquipment(eq)}
                      className="text-blue-600 hover:underline min-h-[44px] px-1"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteEquipment(eq.id)}
                      className="text-red-600 hover:underline min-h-[44px] px-1"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {equipment.length === 0 && (
          <EmptyState
            title="No equipment yet"
            description="Add tractors, combines, and implements using the form above."
          />
        )}
      </div>
    </div>
  );
}
