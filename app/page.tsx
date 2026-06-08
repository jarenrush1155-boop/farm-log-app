'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Link from 'next/link';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalAcres: 0,
    totalFields: 0,
    totalOperations: 0,
    totalSprays: 0,
    openTasks: 0,
  });

  const [recentOperations, setRecentOperations] = useState<any[]>([]);
  const [recentSprays, setRecentSprays] = useState<any[]>([]);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    // Stats
    const { data: fields } = await supabase.from('fields').select('acres');
    const { data: operations } = await supabase.from('operations').select('id');
    const { data: sprays } = await supabase.from('spray_logs').select('id');
    const { data: tasks } = await supabase.from('tasks').select('id, completed');

    setStats({
      totalAcres: fields?.reduce((sum, f) => sum + (f.acres || 0), 0) || 0,
      totalFields: fields?.length || 0,
      totalOperations: operations?.length || 0,
      totalSprays: sprays?.length || 0,
      openTasks: tasks?.filter(t => !t.completed).length || 0,
    });

    // Recent Operations
    const { data: recentOps } = await supabase
      .from('operations')
      .select('*')
      .order('date', { ascending: false })
      .limit(5);
    setRecentOperations(recentOps || []);

    // Recent Sprays
    const { data: recentS } = await supabase
      .from('spray_logs')
      .select('*')
      .order('date', { ascending: false })
      .limit(5);
    setRecentSprays(recentS || []);

    // Open Tasks
    const { data: openT } = await supabase
      .from('tasks')
      .select('*')
      .eq('completed', false)
      .order('created_at', { ascending: false })
      .limit(5);
    setRecentTasks(openT || []);
  };

  return (
    <div>
      <h2 className="text-3xl font-bold mb-8">Farm Dashboard</h2>

      {/* Key Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-12">
        <div className="bg-white p-6 rounded-2xl shadow text-center">
          <p className="text-gray-500 text-sm">Total Acres</p>
          <p className="text-4xl font-bold text-emerald-700 mt-2">{stats.totalAcres.toFixed(1)}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow text-center">
          <p className="text-gray-500 text-sm">Fields</p>
          <p className="text-4xl font-bold text-emerald-700 mt-2">{stats.totalFields}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow text-center">
          <p className="text-gray-500 text-sm">Operations</p>
          <p className="text-4xl font-bold text-emerald-700 mt-2">{stats.totalOperations}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow text-center">
          <p className="text-gray-500 text-sm">Spray Logs</p>
          <p className="text-4xl font-bold text-emerald-700 mt-2">{stats.totalSprays}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow text-center">
          <p className="text-gray-500 text-sm">Open Tasks</p>
          <p className="text-4xl font-bold text-orange-600 mt-2">{stats.openTasks}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Operations */}
        <div>
          <div className="flex justify-between mb-4">
            <h3 className="font-semibold">Recent Operations</h3>
            <Link href="/operations" className="text-emerald-600 text-sm hover:underline">View All →</Link>
          </div>
          <div className="bg-white rounded-2xl shadow divide-y">
            {recentOperations.length > 0 ? recentOperations.map(op => (
              <div key={op.id} className="p-5">
                <div className="flex justify-between">
                  <span className="capitalize font-medium">{op.operation_type}</span>
                  <span className="text-sm text-gray-500">{op.date}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{op.notes || 'No notes'}</p>
              </div>
            )) : <p className="p-8 text-gray-500 text-center">No operations yet.</p>}
          </div>
        </div>

        {/* Recent Spray Logs */}
        <div>
          <div className="flex justify-between mb-4">
            <h3 className="font-semibold">Recent Spray Logs</h3>
            <Link href="/spray" className="text-emerald-600 text-sm hover:underline">View All →</Link>
          </div>
          <div className="bg-white rounded-2xl shadow divide-y">
            {recentSprays.length > 0 ? recentSprays.map(s => (
              <div key={s.id} className="p-5">
                <div className="flex justify-between">
                  <span className="font-medium">{s.chemical_mix}</span>
                  <span className="text-sm text-gray-500">{s.date}</span>
                </div>
                <p className="text-sm text-gray-600">Wind: {s.wind_direction}</p>
              </div>
            )) : <p className="p-8 text-gray-500 text-center">No spray logs yet.</p>}
          </div>
        </div>
      </div>

      {/* Open Tasks */}
      <div className="mt-10">
        <div className="flex justify-between mb-4">
          <h3 className="font-semibold">Open Tasks</h3>
          <Link href="/tasks" className="text-emerald-600 text-sm hover:underline">All Tasks →</Link>
        </div>
        <div className="bg-white rounded-2xl shadow divide-y">
          {recentTasks.length > 0 ? recentTasks.map(task => (
            <div key={task.id} className="p-5 flex items-center gap-4">
              <input type="checkbox" className="w-5 h-5 accent-emerald-600" />
              <div>
                <p className="font-medium">{task.title}</p>
                {task.description && <p className="text-sm text-gray-600">{task.description}</p>}
              </div>
            </div>
          )) : <p className="p-8 text-gray-500 text-center">No open tasks — great job!</p>}
        </div>
      </div>
    </div>
  );
}