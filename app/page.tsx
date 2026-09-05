'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Link from 'next/link';
import EmptyState from '../components/EmptyState';

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
    const { data: fields } = await supabase.from('fields').select('acres');
    const { data: operations } = await supabase.from('operations').select('id');
    const { data: sprays } = await supabase.from('spray_logs').select('id');
    const { data: tasks } = await supabase.from('tasks').select('id, completed');

    setStats({
      totalAcres: fields?.reduce((sum, f) => sum + (f.acres || 0), 0) || 0,
      totalFields: fields?.length || 0,
      totalOperations: operations?.length || 0,
      totalSprays: sprays?.length || 0,
      openTasks: tasks?.filter((t) => !t.completed).length || 0,
    });

    const { data: recentOps } = await supabase.from('operations').select('*').order('date', { ascending: false }).limit(5);
    setRecentOperations(recentOps || []);

    const { data: recentS } = await supabase.from('spray_logs').select('*').order('date', { ascending: false }).limit(5);
    setRecentSprays(recentS || []);

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
      <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Farm Dashboard</h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 mb-8 sm:mb-12">
        {[
          { label: 'Total Acres', value: stats.totalAcres.toFixed(1), color: 'text-emerald-700' },
          { label: 'Fields', value: stats.totalFields, color: 'text-emerald-700' },
          { label: 'Operations', value: stats.totalOperations, color: 'text-emerald-700' },
          { label: 'Spray Logs', value: stats.totalSprays, color: 'text-emerald-700' },
          { label: 'Open Tasks', value: stats.openTasks, color: 'text-orange-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm text-center">
            <p className="text-gray-500 text-xs sm:text-sm">{stat.label}</p>
            <p className={`text-2xl sm:text-4xl font-bold ${stat.color} mt-1 sm:mt-2`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        <div>
          <div className="flex justify-between items-center mb-3 sm:mb-4 gap-2">
            <h3 className="font-semibold">Recent Operations</h3>
            <Link href="/operations" className="text-emerald-600 text-sm hover:underline min-h-[44px] inline-flex items-center">
              View All →
            </Link>
          </div>
          <div className="bg-white rounded-2xl shadow-sm divide-y">
            {recentOperations.length > 0 ? (
              recentOperations.map((op) => (
                <div key={op.id} className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="capitalize font-medium">{op.operation_type?.replaceAll?.('_', ' ') ?? op.operation_type}</span>
                    <span className="text-sm text-gray-500">{op.date}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 break-words">{op.notes || 'No notes'}</p>
                </div>
              ))
            ) : (
              <div className="p-4">
                <EmptyState title="No operations yet" description="Field operations will show up here once logged." />
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-3 sm:mb-4 gap-2">
            <h3 className="font-semibold">Recent Spray Logs</h3>
            <Link href="/spray" className="text-emerald-600 text-sm hover:underline min-h-[44px] inline-flex items-center">
              View All →
            </Link>
          </div>
          <div className="bg-white rounded-2xl shadow-sm divide-y">
            {recentSprays.length > 0 ? (
              recentSprays.map((s) => (
                <div key={s.id} className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="font-medium break-words">{s.chemical_mix}</span>
                    <span className="text-sm text-gray-500 shrink-0">{s.date}</span>
                  </div>
                  <p className="text-sm text-gray-600">Wind: {s.wind_direction}</p>
                </div>
              ))
            ) : (
              <div className="p-4">
                <EmptyState title="No spray logs yet" description="Recent sprays will appear here after you log them." />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 sm:mt-10">
        <div className="flex justify-between items-center mb-3 sm:mb-4 gap-2">
          <h3 className="font-semibold">Open Tasks</h3>
          <Link href="/tasks" className="text-emerald-600 text-sm hover:underline min-h-[44px] inline-flex items-center">
            All Tasks →
          </Link>
        </div>
        <div className="bg-white rounded-2xl shadow-sm divide-y">
          {recentTasks.length > 0 ? (
            recentTasks.map((task) => (
              <div key={task.id} className="p-4 sm:p-5">
                <p className="font-medium">{task.title}</p>
                {task.description && <p className="text-sm text-gray-600 mt-1">{task.description}</p>}
              </div>
            ))
          ) : (
            <div className="p-4">
              <EmptyState title="No open tasks" description="You're all caught up — great job!" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
