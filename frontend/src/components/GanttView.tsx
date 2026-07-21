'use client';

import React from 'react';
import { Project, Task } from '@/types';
import { Calendar, Clock, AlertTriangle, CheckCircle2, Flame } from 'lucide-react';

interface GanttViewProps {
  project: Project;
}

export function GanttView({ project }: GanttViewProps) {
  const tasks: Task[] = project.tasks || [
    {
      id: '1',
      projectId: project.id,
      title: '🔒 ACL Yetkilendirme & Güvenlik Testi',
      status: 'DONE',
      priority: 'URGENT',
      createdById: 'admin',
      createdAt: '2026-07-01',
    },
    {
      id: '2',
      projectId: project.id,
      title: '🌐 Socket.io Canlı Mesajlaşma Odası',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      createdById: 'admin',
      createdAt: '2026-07-05',
    },
    {
      id: '3',
      projectId: project.id,
      title: '📂 S3 / R2 Nesne Depolama Testi',
      status: 'TODO',
      priority: 'MEDIUM',
      createdById: 'admin',
      createdAt: '2026-07-10',
    },
  ];

  const weeks = ['Hafta 1 (Analiz)', 'Hafta 2 (Geliştirme)', 'Hafta 3 (Test & UAT)', 'Hafta 4 (Yayın)'];

  return (
    <div className="h-full flex flex-col p-6 bg-slate-950 overflow-y-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          📅 Proje Zaman Çizelgesi (Gantt Chart & Timeline)
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          {project.name} projesi görevlerinin haftalık takvim üzerindeki süresi ve bağımlılıkları.
        </p>
      </div>

      {/* Gantt Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 overflow-x-auto space-y-4">
        {/* Table Header */}
        <div className="grid grid-cols-5 gap-4 border-b border-slate-800 pb-3 text-xs font-bold text-slate-400">
          <div className="col-span-1">Görev Adı</div>
          {weeks.map((w, idx) => (
            <div key={idx} className="text-center font-mono text-[11px] text-slate-300">
              {w}
            </div>
          ))}
        </div>

        {/* Task Timeline Rows */}
        <div className="space-y-4">
          {tasks.map((t, idx) => (
            <div key={t.id} className="grid grid-cols-5 gap-4 items-center">
              <div className="col-span-1">
                <div className="font-semibold text-xs text-slate-200 truncate">{t.title}</div>
                <div className="text-[10px] text-slate-500 font-mono">Öncelik: {t.priority}</div>
              </div>

              {/* Timeline Bar Span */}
              <div className="col-span-4 relative h-8 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                <div
                  className={`absolute top-1 bottom-1 rounded-lg transition-all flex items-center px-3 text-[10px] font-bold text-white shadow-md ${
                    idx === 0
                      ? 'left-[5%] w-[35%] bg-emerald-600 border border-emerald-400'
                      : idx === 1
                      ? 'left-[30%] w-[45%] bg-amber-600 border border-amber-400 animate-pulse'
                      : 'left-[60%] w-[35%] bg-indigo-600 border border-indigo-400'
                  }`}
                >
                  <span className="truncate">{t.status === 'DONE' ? '✅ Tamamlandı' : '⚡ İşlemde'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
