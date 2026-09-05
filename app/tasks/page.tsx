'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { mutateWithPin, promptForPin, promptPinForDelete } from '../../lib/pin';
import PinField from '../../components/PinField';
import EmptyState from '../../components/EmptyState';
import { useToast } from '../../components/ToastProvider';

export default function TasksPage() {
  const { success, error } = useToast();
  const [tasks, setTasks] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'open' | 'completed'>('all');
  const [pin, setPin] = useState('');
  const [editingTask, setEditingTask] = useState<any>(null);
  const [newTask, setNewTask] = useState({ title: '', description: '' });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
    setTasks(data || []);
  };

  const resetForm = () => {
    setNewTask({ title: '', description: '' });
    setEditingTask(null);
    setPin('');
  };

  const saveTask = async () => {
    if (!newTask.title) {
      error('Task title required');
      return;
    }
    if (!pin) {
      error('Please enter the PIN to save');
      return;
    }

    const { error: mutateError } = await mutateWithPin({
      pin,
      table: 'tasks',
      action: editingTask ? 'update' : 'insert',
      id: editingTask?.id,
      data: editingTask
        ? {
            title: newTask.title,
            description: newTask.description || null,
          }
        : {
            title: newTask.title,
            description: newTask.description || null,
            completed: false,
          },
    });

    if (mutateError) error(mutateError.message);
    else {
      success(editingTask ? 'Task updated!' : 'Task added!');
      resetForm();
      fetchTasks();
    }
  };

  const editTask = (task: any) => {
    setEditingTask(task);
    setNewTask({
      title: task.title || '',
      description: task.description || '',
    });
    setPin('');
  };

  const toggleComplete = async (id: string, completed: boolean) => {
    const enteredPin = promptForPin(completed ? 'Enter PIN to mark complete:' : 'Enter PIN to reopen task:');
    if (!enteredPin) return;

    const { error: mutateError } = await mutateWithPin({
      pin: enteredPin,
      table: 'tasks',
      action: 'update',
      id,
      data: { completed },
    });

    if (mutateError) error(mutateError.message);
    else {
      success(completed ? 'Task marked complete' : 'Task reopened');
      fetchTasks();
    }
  };

  const deleteTask = async (id: string) => {
    const enteredPin = promptPinForDelete('this task');
    if (!enteredPin) return;

    const { error: mutateError } = await mutateWithPin({
      pin: enteredPin,
      table: 'tasks',
      action: 'delete',
      id,
    });

    if (mutateError) error(mutateError.message);
    else {
      success('Task deleted');
      if (editingTask?.id === id) resetForm();
      fetchTasks();
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'open') return !task.completed;
    if (filter === 'completed') return task.completed;
    return true;
  });

  return (
    <div>
      <h3 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">Task Manager</h3>

      <div className="card-panel">
        <h4 className="font-medium mb-4">{editingTask ? 'Edit Task' : 'New Task'}</h4>
        <input
          type="text"
          placeholder="What needs to be done?"
          value={newTask.title}
          onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
          className="form-input mb-3"
        />
        <textarea
          placeholder="Additional details (optional)"
          value={newTask.description}
          onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
          className="form-input mb-3 h-20"
        />
        <div className="mb-3">
          <PinField value={pin} onChange={setPin} className="form-input" />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={saveTask} className="btn-primary">
            {editingTask ? 'Update Task' : 'Add Task'}
          </button>
          {editingTask && (
            <button onClick={resetForm} className="btn-secondary">
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 sm:gap-3 mb-5">
        <button onClick={() => setFilter('all')} className={`px-5 py-2.5 rounded-lg min-h-[44px] ${filter === 'all' ? 'bg-emerald-700 text-white' : 'bg-white border'}`}>
          All
        </button>
        <button onClick={() => setFilter('open')} className={`px-5 py-2.5 rounded-lg min-h-[44px] ${filter === 'open' ? 'bg-emerald-700 text-white' : 'bg-white border'}`}>
          Open
        </button>
        <button onClick={() => setFilter('completed')} className={`px-5 py-2.5 rounded-lg min-h-[44px] ${filter === 'completed' ? 'bg-emerald-700 text-white' : 'bg-white border'}`}>
          Completed
        </button>
      </div>

      {filteredTasks.length === 0 ? (
        <EmptyState
          title={filter === 'all' ? 'No tasks yet' : filter === 'open' ? 'No open tasks' : 'No completed tasks'}
          description={
            filter === 'all'
              ? 'Add a task above to keep track of farm to-dos.'
              : filter === 'open'
                ? 'All caught up — or switch the filter to see completed tasks.'
                : 'Completed tasks will show up here.'
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <div key={task.id} className="bg-white border rounded-xl p-4 sm:p-5 flex items-start sm:items-center gap-3 sm:gap-4 shadow-sm">
              <input type="checkbox" checked={task.completed} onChange={() => toggleComplete(task.id, !task.completed)} className="w-6 h-6 mt-0.5 accent-emerald-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className={`font-medium break-words ${task.completed ? 'line-through text-gray-500' : ''}`}>{task.title}</p>
                {task.description && <p className="text-sm text-gray-600 mt-1 break-words">{task.description}</p>}
                {task.created_at && (
                  <p className="text-xs text-gray-500 mt-1">
                    Added: {new Date(task.created_at).toLocaleDateString()} at{' '}
                    {new Date(task.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                <button onClick={() => editTask(task)} className="text-blue-600 hover:text-blue-800 text-sm min-h-[44px]">
                  Edit
                </button>
                <button onClick={() => deleteTask(task.id)} className="text-red-600 hover:text-red-800 text-sm min-h-[44px]">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
