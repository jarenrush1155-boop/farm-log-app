'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { mutateWithPin, promptForPin, promptPinForDelete } from '../../lib/pin';
import PinField from '../../components/PinField';

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'open' | 'completed'>('all');
  const [pin, setPin] = useState('');
  const [newTask, setNewTask] = useState({ title: '', description: '' });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
    setTasks(data || []);
  };

  const addTask = async () => {
    if (!newTask.title) return alert('Task title required');
    if (!pin) return alert('Please enter the PIN to save');

    const { error } = await mutateWithPin({
      pin,
      table: 'tasks',
      action: 'insert',
      data: {
        title: newTask.title,
        description: newTask.description || null,
        completed: false,
      },
    });

    if (error) alert(error.message);
    else {
      setNewTask({ title: '', description: '' });
      setPin('');
      fetchTasks();
    }
  };

  const toggleComplete = async (id: string, completed: boolean) => {
    const enteredPin = promptForPin(completed ? 'Enter PIN to mark complete:' : 'Enter PIN to reopen task:');
    if (!enteredPin) return;

    const { error } = await mutateWithPin({
      pin: enteredPin,
      table: 'tasks',
      action: 'update',
      id,
      data: { completed },
    });

    if (error) alert(error.message);
    else fetchTasks();
  };

  const deleteTask = async (id: string) => {
    const enteredPin = promptPinForDelete('this task');
    if (!enteredPin) return;

    const { error } = await mutateWithPin({
      pin: enteredPin,
      table: 'tasks',
      action: 'delete',
      id,
    });

    if (error) alert(error.message);
    else fetchTasks();
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
        <h4 className="font-medium mb-4">New Task</h4>
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
        <button onClick={addTask} className="btn-primary">
          Add Task
        </button>
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
            <button onClick={() => deleteTask(task.id)} className="text-red-600 hover:text-red-800 text-sm min-h-[44px] shrink-0">
              Delete
            </button>
          </div>
        ))}
      </div>

      {filteredTasks.length === 0 && <p className="text-gray-500 text-center py-12">No tasks found.</p>}
    </div>
  );
}
