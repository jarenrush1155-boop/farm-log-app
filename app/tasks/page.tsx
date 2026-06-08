'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'open' | 'completed'>('all');
  const [newTask, setNewTask] = useState({ title: '', description: '' });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
    setTasks(data || []);
  };

  const addTask = async () => {
    if (!newTask.title) return alert("Task title required");

    await supabase.from('tasks').insert({
      title: newTask.title,
      description: newTask.description,
      // created_at is automatically handled by Supabase
    });

    setNewTask({ title: '', description: '' });
    fetchTasks();
  };

  const toggleComplete = async (id: string, completed: boolean) => {
    await supabase.from('tasks').update({ completed }).eq('id', id);
    fetchTasks();
  };

  const deleteTask = async (id: string) => {
    if (!confirm("Delete this task?")) return;
    await supabase.from('tasks').delete().eq('id', id);
    fetchTasks();
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'open') return !task.completed;
    if (filter === 'completed') return task.completed;
    return true;
  });

  return (
    <div>
      <h3 className="text-xl font-semibold mb-6">Task Manager</h3>

      {/* Add New Task */}
      <div className="bg-gray-100 p-6 rounded-xl mb-8">
        <h4 className="font-medium mb-4">New Task</h4>
        <input 
          type="text" 
          placeholder="What needs to be done?" 
          value={newTask.title}
          onChange={(e) => setNewTask({...newTask, title: e.target.value})}
          className="w-full p-3 border rounded-lg mb-4"
        />
        <textarea 
          placeholder="Additional details (optional)" 
          value={newTask.description}
          onChange={(e) => setNewTask({...newTask, description: e.target.value})}
          className="w-full p-3 border rounded-lg mb-4 h-20"
        />
        <button onClick={addTask} className="bg-emerald-700 text-white px-8 py-3 rounded-lg hover:bg-emerald-600">
          Add Task
        </button>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-4 mb-6">
        <button onClick={() => setFilter('all')} className={`px-5 py-2 rounded-lg ${filter === 'all' ? 'bg-emerald-700 text-white' : 'bg-white border'}`}>All</button>
        <button onClick={() => setFilter('open')} className={`px-5 py-2 rounded-lg ${filter === 'open' ? 'bg-emerald-700 text-white' : 'bg-white border'}`}>Open</button>
        <button onClick={() => setFilter('completed')} className={`px-5 py-2 rounded-lg ${filter === 'completed' ? 'bg-emerald-700 text-white' : 'bg-white border'}`}>Completed</button>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
       {filteredTasks.map(task => (
  <div key={task.id} className="bg-white border rounded-xl p-5 flex items-center gap-4">
    <input 
      type="checkbox" 
      checked={task.completed} 
      onChange={() => toggleComplete(task.id, !task.completed)}
      className="w-6 h-6 accent-emerald-600"
    />
    <div className="flex-1">
      <p className={`font-medium ${task.completed ? 'line-through text-gray-500' : ''}`}>{task.title}</p>
      {task.description && <p className="text-sm text-gray-600 mt-1">{task.description}</p>}
      {task.created_at && (
        <p className="text-xs text-gray-500 mt-1">
          Added: {new Date(task.created_at).toLocaleDateString()} at{' '}
          {new Date(task.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      )}
    </div>
    <button onClick={() => deleteTask(task.id)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
  </div>
))}
      </div>

      {filteredTasks.length === 0 && <p className="text-gray-500 text-center py-12">No tasks found.</p>}
    </div>
  );
}