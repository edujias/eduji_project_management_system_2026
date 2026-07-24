'use client';

import React, { useState, useEffect } from 'react';
import { Project, Task } from '@/types';
import { apiFetch } from '@/lib/api';
import { Calendar, Clock, AlertTriangle, CheckCircle2, Flame, RefreshCw, BarChart2, TrendingUp, Award } from 'lucide-react';

interface GanttViewProps {
  project: Project;
}

export function GanttView({ project }: GanttViewProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (project.id) {
      loadTasks();
    }
  }, [project.id]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Task[]>(`/tasks/project/${project.id}`);
      setTasks(data);
      localStorage.setItem(`offline_tasks_${project.id}`, JSON.stringify(data));
    } catch (err) {
      console.warn('Gantt tasks load offline fallback:', err);
      const offline = localStorage.getItem(`offline_tasks_${project.id}`);
      setTasks(offline ? JSON.parse(offline) : []);
    } finally {
      setLoading(false);
    }
  };

  const getTaskWeeks = (task: Task) => {
    const start = new Date(task.createdAt || new Date());
    const end = task.dueDate ? new Date(task.dueDate) : new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    const projStart = new Date(project.createdAt || new Date());
    
    const diffStartMs = start.getTime() - projStart.getTime();
    const diffEndMs = end.getTime() - projStart.getTime();
    
    const startWeek = Math.max(0, Math.floor(diffStartMs / (7 * 24 * 60 * 60 * 1000)));
    const endWeek = Math.max(startWeek, Math.min(3, Math.floor(diffEndMs / (7 * 24 * 60 * 60 * 1000))));
    
    return { startWeek, endWeek };
  };

  // Group completed tasks by day of the week
  const completedTasks = tasks.filter((t) => t.status === 'DONE');
  const dayNames = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];

  completedTasks.forEach((t) => {
    if (!t.updatedAt) return;
    const date = new Date(t.updatedAt);
    const day = date.getDay(); // 0: Sunday, 1: Monday...
    const index = day === 0 ? 6 : day - 1; // map Sun -> 6, Mon -> 0...
    if (index >= 0 && index < 7) {
      dayCounts[index]++;
    }
  });

  // Calculate metrics
  const completionRate = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;
  
  let maxDayIdx = -1;
  let maxCount = 0;
  dayCounts.forEach((count, idx) => {
    if (count > maxCount) {
      maxCount = count;
      maxDayIdx = idx;
    }
  });
  const mostProductiveDay = maxDayIdx !== -1 ? dayNames[maxDayIdx] : 'Veri Yok';

  let totalDays = 0;
  let completedCountWithDates = 0;
  completedTasks.forEach((task) => {
    if (task.createdAt && task.updatedAt) {
      const diffTime = Math.abs(new Date(task.updatedAt).getTime() - new Date(task.createdAt).getTime());
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      totalDays += diffDays;
      completedCountWithDates++;
    }
  });
  const averageCompletionTime = completedCountWithDates > 0 
    ? (totalDays / completedCountWithDates).toFixed(1)
    : '0.0';

  const weeks = ['Hafta 1 (Analiz)', 'Hafta 2 (Geliştirme)', 'Hafta 3 (Test & UAT)', 'Hafta 4 (Yayın)'];

  // SVG Chart Dimensions & Computations
  const chartWidth = 500;
  const chartHeight = 180;
  const maxBarHeight = 120;
  const maxCountVal = Math.max(...dayCounts, 1);

  return (
    <div className="h-full flex flex-col p-6 bg-slate-950 overflow-y-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2 select-none">
            📅 Proje Zaman Çizelgesi & Verimlilik
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 font-medium">
            Kanban panosunda tamamlanan işlere göre otomatik güncellenen verimlilik analizleri.
          </p>
        </div>
        <button
          onClick={loadTasks}
          className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-lg transition"
          title="Yenile"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Yenile
        </button>
      </div>

      {/* Grid: Gantt Chart and Productivity Graph */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* Left: Gantt Chart (col-span-7) */}
        <div className="xl:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 overflow-x-auto space-y-4">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 select-none">
            <Flame className="w-4 h-4 text-orange-500" /> Aktif Görev Zaman Çizelgesi
          </h3>

          {/* Table Header */}
          <div className="grid grid-cols-6 gap-4 border-b border-slate-800/60 pb-3 text-xs font-bold text-slate-500">
            <div className="col-span-2">Görev Adı</div>
            {weeks.map((w, idx) => (
              <div key={idx} className="text-center font-mono text-[10px] text-slate-400">
                {w}
              </div>
            ))}
          </div>

          {/* Task Timeline Rows */}
          <div className="space-y-3.5 min-w-[550px]">
            {loading ? (
              <div className="flex justify-center items-center py-12 text-xs text-slate-500 gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                Zaman çizelgeleri çiziliyor...
              </div>
            ) : tasks.length > 0 ? (
              tasks.map((t) => {
                const { startWeek, endWeek } = getTaskWeeks(t);
                const isDone = t.status === 'DONE';
                
                return (
                  <div key={t.id} className="grid grid-cols-6 gap-4 items-center hover:bg-slate-800/10 py-1 px-0.5 rounded-lg transition relative">
                    <div className="col-span-2 min-w-0 pr-2">
                      <div className="font-semibold text-xs text-slate-200 truncate">{t.title}</div>
                      <div className="text-[9px] text-slate-500 font-mono mt-0.5 flex items-center gap-1.5">
                        <span>Öncelik: {t.priority}</span>
                        {t.assignedTo && <span className="text-indigo-400 font-bold">👤 {t.assignedTo.fullName}</span>}
                      </div>
                    </div>

                    <div className="col-span-4 relative h-7 bg-slate-950/70 rounded-lg border border-slate-800/40 overflow-hidden">
                      <div
                        className={`absolute top-1 bottom-1 rounded-md transition-all flex items-center px-2.5 text-[9px] font-bold text-white shadow ${
                          isDone
                            ? 'bg-emerald-600 border border-emerald-400/40'
                            : 'bg-indigo-600 border border-indigo-400/40 animate-pulse'
                        }`}
                        style={{
                          left: `${startWeek * 25}%`,
                          width: `${(endWeek - startWeek + 1) * 25}%`,
                        }}
                      >
                        <span className="truncate">{isDone ? '✅ Tamamlandı' : '⚡ İşlemde'}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-slate-500 text-xs font-semibold">
                Henüz görev eklenmemiş. Lütfen Kanban panosundan görev ekleyin.
              </div>
            )}
          </div>
        </div>

        {/* Right: Custom SVG Productivity Chart (col-span-5) */}
        <div className="xl:col-span-5 bg-white border border-slate-200 shadow-sm rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 select-none">
              <BarChart2 className="w-4 h-4 text-indigo-600" /> Haftalık Verimlilik Dağılımı
            </h3>
            <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
              Gerçek Zamanlı
            </span>
          </div>

          {/* SVG Custom Premium Bar Chart */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-center">
            {loading ? (
              <div className="h-44 flex items-center justify-center text-xs text-slate-400 gap-1.5">
                <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                Grafik oluşturuluyor...
              </div>
            ) : (
              <svg className="w-full max-w-[480px] h-48" viewBox="0 0 500 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="barGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#818cf8" stopOpacity="1" />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.85" />
                  </linearGradient>
                  <filter id="shadowFilter" x="-10%" y="-10%" width="120%" height="120%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#6366f1" floodOpacity="0.2" />
                  </filter>
                </defs>

                {/* Horizontal Dashed Gridlines */}
                {[0, 1, 2, 3].map((gridIdx) => {
                  const y = 30 + gridIdx * 40;
                  return (
                    <line
                      key={gridIdx}
                      x1="30"
                      y1={y}
                      x2="470"
                      y2={y}
                      stroke="#e2e8f0"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                  );
                })}

                {/* Vertical Bars and Count Labels */}
                {dayCounts.map((count, i) => {
                  const barWidth = 26;
                  const gap = 60;
                  const x = 45 + i * gap;
                  
                  // Compute bar height proportionally
                  const barHeight = count > 0 ? (count / maxCountVal) * maxBarHeight : 2; // min height 2px for visual accent
                  const y = 150 - barHeight;

                  return (
                    <g key={i} className="group transition-all duration-300">
                      {/* Interactive hover background overlay */}
                      <rect
                        x={x - 8}
                        y="15"
                        width={barWidth + 16}
                        height="145"
                        rx="8"
                        fill="transparent"
                        className="group-hover:fill-slate-200/40 cursor-pointer transition-colors"
                      />

                      {/* Actual Filled Bar */}
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={barHeight}
                        rx={count > 0 ? "5" : "1"}
                        fill="url(#barGlow)"
                        filter="url(#shadowFilter)"
                        className="transition-all duration-500 ease-out cursor-pointer hover:brightness-110"
                      />

                      {/* Task Count Badge text (show on top of bar if count > 0) */}
                      {count > 0 && (
                        <text
                          x={x + barWidth / 2}
                          y={y - 8}
                          fill="#4f46e5"
                          fontSize="10"
                          fontWeight="bold"
                          textAnchor="middle"
                          className="font-mono animate-fadeIn"
                        >
                          {count}
                        </text>
                      )}

                      {/* Day Label Text at bottom */}
                      <text
                        x={x + barWidth / 2}
                        y="166"
                        fill={count > 0 ? "#0f172a" : "#94a3b8"}
                        fontSize="9"
                        fontWeight="semibold"
                        textAnchor="middle"
                      >
                        {dayNames[i].substring(0, 3)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* 3. PROJECT HEALTH ANALYTIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Completion Rate Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between hover:border-slate-700/60 transition group select-none">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Tamamlanma Oranı</span>
            <span className="text-2xl font-extrabold text-white block font-mono tracking-tight">
              %{completionRate}
            </span>
            <span className="text-[9px] text-slate-400 block font-medium">Toplam {tasks.length} görev arasından.</span>
          </div>
          <div className="p-3.5 bg-indigo-500/10 rounded-2xl text-indigo-400 border border-indigo-500/15 group-hover:scale-105 transition-transform duration-300">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Most Productive Day Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between hover:border-slate-700/60 transition group select-none">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">En Verimli Gün</span>
            <span className="text-2xl font-extrabold text-white block tracking-tight">
              {mostProductiveDay}
            </span>
            <span className="text-[9px] text-slate-400 block font-medium">En çok bitirilen görev hacmine göre.</span>
          </div>
          <div className="p-3.5 bg-amber-500/10 rounded-2xl text-amber-400 border border-amber-500/15 group-hover:scale-105 transition-transform duration-300">
            <Award className="w-5 h-5" />
          </div>
        </div>

        {/* Avg Completion Time Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between hover:border-slate-700/60 transition group select-none">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Ort. İş Kapatma Süresi</span>
            <span className="text-2xl font-extrabold text-white block font-mono tracking-tight">
              {averageCompletionTime} Gün
            </span>
            <span className="text-[9px] text-slate-400 block font-medium">Görevin oluşturulma-bitiş süresi.</span>
          </div>
          <div className="p-3.5 bg-emerald-500/10 rounded-2xl text-emerald-400 border border-emerald-500/15 group-hover:scale-105 transition-transform duration-300">
            <Clock className="w-5 h-5" />
          </div>
        </div>

      </div>
    </div>
  );
}
