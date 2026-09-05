'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { mutateWithPin } from '../../lib/pin';
import EmptyState from '../../components/EmptyState';
import { useToast } from '../../components/ToastProvider';
import { usePin } from '../../components/PinProvider';

type EquipmentOption = {
  id: string;
  name: string;
  type?: string;
  current_hours?: number | null;
  hours?: number | null;
  separator_hours?: number | null;
};

export default function MaintenancePage() {
  const { success, error } = useToast();
  const { requestPin, requestPinForDelete } = usePin();
  const [equipment, setEquipment] = useState<EquipmentOption[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingLog, setEditingLog] = useState<any>(null);

  const [newLog, setNewLog] = useState({
    equipment_id: '',
    hours: '',
    separator_hours: '',
    work_done: '',
    cost: '',
    notes: '',
  });

  useEffect(() => {
    fetchEquipment();
    fetchMaintenance();
  }, []);

  const fetchEquipment = async () => {
    const { data } = await supabase.from('equipment').select('*').order('name');
    setEquipment(data || []);
  };

  const fetchMaintenance = async () => {
    const { data } = await supabase
      .from('maintenance_logs')
      .select(
        `
        *,
        equipment (name, type)
      `
      )
      .order('date', { ascending: false });
    setMaintenance(data || []);
  };

  const selectedEquipment = useMemo(
    () => equipment.find((eq) => eq.id === newLog.equipment_id),
    [equipment, newLog.equipment_id]
  );

  const isMotorized = selectedEquipment?.type === 'motorized';

  const saveMaintenance = async () => {
    if (!newLog.equipment_id || !newLog.work_done) {
      error('Please select equipment and describe the work');
      return;
    }
    const pin = await requestPin({
      title: editingLog ? 'Enter PIN to update' : 'Enter PIN to save',
      message: editingLog ? 'Confirm PIN to update this maintenance log.' : 'Confirm PIN to save this maintenance log.',
    });
    if (!pin) return;

    const hours = newLog.hours ? parseFloat(newLog.hours) : null;
    const separatorHours = newLog.separator_hours ? parseFloat(newLog.separator_hours) : null;

    const payload = {
      equipment_id: newLog.equipment_id,
      date: editingLog?.date || new Date().toISOString().split('T')[0],
      hours: hours,
      separator_hours: separatorHours,
      work_done: newLog.work_done,
      cost: newLog.cost ? parseFloat(newLog.cost) : null,
      notes: newLog.notes || null,
    };

    const { error: mutateError } = await mutateWithPin({
      pin,
      table: 'maintenance_logs',
      action: editingLog ? 'update' : 'insert',
      id: editingLog?.id,
      data: payload,
    });

    if (mutateError) {
      error('Error: ' + mutateError.message);
      return;
    }

    // DB trigger recomputes equipment.current_hours = MAX(log hours).
    // Explicit recompute is a safe fallback if the trigger is not installed yet.
    if (newLog.equipment_id) {
      await supabase.rpc('recompute_equipment_hours', {
        p_equipment_id: newLog.equipment_id,
      });
    }

    success(editingLog ? 'Maintenance updated!' : 'Maintenance log saved!');
    resetForm();
    fetchMaintenance();
    fetchEquipment();
  };

  const resetForm = () => {
    setNewLog({ equipment_id: '', hours: '', separator_hours: '', work_done: '', cost: '', notes: '' });
    setEditingLog(null);
  };

  const editLog = (log: any) => {
    setEditingLog(log);
    setNewLog({
      equipment_id: log.equipment_id,
      hours: log.hours?.toString() || '',
      separator_hours: log.separator_hours?.toString() || '',
      work_done: log.work_done || '',
      cost: log.cost?.toString() || '',
      notes: log.notes || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteLog = async (id: string, equipmentId?: string) => {
    const enteredPin = await requestPinForDelete('this maintenance log');
    if (!enteredPin) return;

    const { error: mutateError } = await mutateWithPin({
      pin: enteredPin,
      table: 'maintenance_logs',
      action: 'delete',
      id,
    });

    if (mutateError) {
      error(mutateError.message);
      return;
    }

    success('Maintenance log deleted');
    if (equipmentId) {
      await supabase.rpc('recompute_equipment_hours', { p_equipment_id: equipmentId });
    }

    fetchMaintenance();
    fetchEquipment();
  };

  const toggleExpand = (id: string) => {
    const newSet = new Set(expanded);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpanded(newSet);
  };

  const onEquipmentChange = (equipmentId: string) => {
    const eq = equipment.find((e) => e.id === equipmentId);
    const knownHours = eq?.current_hours ?? eq?.hours;
    setNewLog({
      ...newLog,
      equipment_id: equipmentId,
      // Prefill with known meter reading so the next log starts from current
      hours: !editingLog && knownHours != null ? String(knownHours) : newLog.hours,
      separator_hours:
        !editingLog && eq?.separator_hours != null ? String(eq.separator_hours) : newLog.separator_hours,
    });
  };

  return (
    <div>
      <h3 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">Equipment Maintenance</h3>

      <div className="card-panel">
        <h4 className="font-medium mb-4">{editingLog ? 'Edit Maintenance Log' : 'Log New Maintenance'}</h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <select
            value={newLog.equipment_id}
            onChange={(e) => onEquipmentChange(e.target.value)}
            className="form-input sm:col-span-2"
          >
            <option value="">Select Equipment</option>
            {equipment.map((eq) => (
              <option key={eq.id} value={eq.id}>
                {eq.name}
                {eq.type === 'motorized' && (eq.current_hours ?? eq.hours) != null
                  ? ` (${eq.current_hours ?? eq.hours} hrs)`
                  : ''}
              </option>
            ))}
          </select>

          {(isMotorized || !selectedEquipment) && (
            <>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Hour meter reading</label>
                <input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  placeholder="Current hours"
                  value={newLog.hours}
                  onChange={(e) => setNewLog({ ...newLog, hours: e.target.value })}
                  className="form-input"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Equipment current hours become the highest value from all logs.
                </p>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Separator hours (combines)</label>
                <input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  placeholder="Optional"
                  value={newLog.separator_hours}
                  onChange={(e) => setNewLog({ ...newLog, separator_hours: e.target.value })}
                  className="form-input"
                />
              </div>
            </>
          )}

          <input
            type="text"
            placeholder="Work Done"
            value={newLog.work_done}
            onChange={(e) => setNewLog({ ...newLog, work_done: e.target.value })}
            className="form-input sm:col-span-2"
          />

          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            placeholder="Cost ($)"
            value={newLog.cost}
            onChange={(e) => setNewLog({ ...newLog, cost: e.target.value })}
            className="form-input"
          />

          <textarea
            placeholder="Notes"
            value={newLog.notes}
            onChange={(e) => setNewLog({ ...newLog, notes: e.target.value })}
            className="form-input sm:col-span-2"
            rows={2}
          />
        </div>

        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <button onClick={saveMaintenance} className="btn-primary">
            {editingLog ? 'Update Log' : 'Save Maintenance Log'}
          </button>
          {editingLog && (
            <button onClick={resetForm} className="btn-secondary">
              Cancel
            </button>
          )}
        </div>
      </div>

      <h4 className="font-medium mb-3 sm:mb-4">Maintenance History</h4>
      <div className="space-y-3">
        {maintenance.map((log) => {
          const isExpanded = expanded.has(log.id);
          const workDoneShort =
            log.work_done?.length > 60 ? log.work_done.substring(0, 57) + '...' : log.work_done;

          return (
            <div key={log.id} className="bg-white border rounded-xl shadow-sm">
              <button
                type="button"
                onClick={() => toggleExpand(log.id)}
                className="w-full p-4 sm:p-5 text-left hover:bg-gray-50 min-h-[64px] rounded-xl"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
                  <div className="min-w-0">
                    <span className="font-medium">{log.equipment?.name}</span>
                    <span className="ml-3 text-gray-500 text-sm">{log.date}</span>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4 text-sm">
                    <span className="text-gray-700 truncate max-w-[14rem] sm:max-w-xs">{workDoneShort}</span>
                    {log.hours != null && <span className="font-medium shrink-0">{log.hours} hrs</span>}
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t p-4 sm:p-6 bg-gray-50 rounded-b-xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {log.hours != null && (
                      <p>
                        <strong>Hours:</strong> {log.hours}
                      </p>
                    )}
                    {log.separator_hours != null && (
                      <p>
                        <strong>Separator Hours:</strong> {log.separator_hours}
                      </p>
                    )}
                    {log.cost != null && (
                      <p>
                        <strong>Cost:</strong> ${log.cost}
                      </p>
                    )}
                    {log.work_done && (
                      <p className="sm:col-span-2">
                        <strong>Work Done:</strong> {log.work_done}
                      </p>
                    )}
                    {log.notes && (
                      <p className="sm:col-span-2">
                        <strong>Notes:</strong> {log.notes}
                      </p>
                    )}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-4">
                    <button type="button" onClick={() => editLog(log)} className="text-blue-600 hover:underline min-h-[44px] px-1">
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteLog(log.id, log.equipment_id)}
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

        {maintenance.length === 0 && (
          <EmptyState
            title="No maintenance logs yet"
            description="Log service work above to track hours and repairs."
          />
        )}
      </div>
    </div>
  );
}
