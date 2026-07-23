'use client';

import React, { useState, useEffect } from 'react';
import { Project, Task, User } from '@/types';
import { apiFetch } from '@/lib/api';
import { Calendar, Clock, AlertTriangle, CheckCircle2, Flame, Star, Save, User as UserIcon, Award, RefreshCw, Sparkles, MessageSquare } from 'lucide-react';

interface GanttViewProps {
  project: Project;
  currentUser: User;
}

export function GanttView({ project, currentUser }: GanttViewProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  // Daily Evaluation States
  const [evalDate, setEvalDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loadingEval, setLoadingEval] = useState(false);
  const [saveLoadingId, setSaveLoadingId] = useState<string | null>(null);

  // Form states for Admin evaluation entries
  const [scores, setScores] = useState<Record<string, number>>({});
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({});

  const isAdmin = currentUser?.role === 'ADMIN';

  useEffect(() => {
    if (project.id) {
      loadTasks();
      loadEvaluations();
    }
  }, [project.id]);

  useEffect(() => {
    if (project.id) {
      loadEvaluations();
    }
  }, [evalDate]);

  // Load evaluations once they are retrieved to populate state
  useEffect(() => {
    const newScores: Record<string, number> = {};
    const newFeedbacks: Record<string, string> = {};
    
    project.permissions?.forEach(perm => {
      const existing = evaluations.find(e => e.userId === perm.userId);
      newScores[perm.userId] = existing ? existing.score : 0;
      newFeedbacks[perm.userId] = existing ? (existing.feedback || '') : '';
    });
    
    setScores(newScores);
    setFeedbacks(newFeedbacks);
  }, [evaluations, project.permissions]);

  const loadTasks = async () => {
    setLoadingTasks(true);
    try {
      const data = await apiFetch<Task[]>(`/tasks/project/${project.id}`);
      setTasks(data);
      localStorage.setItem(`offline_tasks_${project.id}`, JSON.stringify(data));
    } catch (err) {
      console.warn('Gantt tasks load offline fallback:', err);
      const offline = localStorage.getItem(`offline_tasks_${project.id}`);
      setTasks(offline ? JSON.parse(offline) : []);
    } finally {
      setLoadingTasks(false);
    }
  };

  const loadEvaluations = async () => {
    setLoadingEval(true);
    try {
      const data = await apiFetch<any[]>(`/projects/${project.id}/evaluations?date=${evalDate}`);
      setEvaluations(data);
      localStorage.setItem(`offline_eval_${project.id}_${evalDate}`, JSON.stringify(data));
    } catch (err) {
      console.warn('Evaluation load offline fallback:', err);
      const offline = localStorage.getItem(`offline_eval_${project.id}_${evalDate}`);
      setEvaluations(offline ? JSON.parse(offline) : []);
    } finally {
      setLoadingEval(false);
    }
  };

  const handleSaveEvaluation = async (userId: string) => {
    const score = scores[userId] || 0;
    const feedback = feedbacks[userId] || '';

    if (score < 1 || score > 5) {
      alert('Lütfen 1 ile 5 arasında bir değerlendirme puanı seçin.');
      return;
    }

    setSaveLoadingId(userId);
    try {
      await apiFetch(`/projects/${project.id}/evaluations`, {
        method: 'POST',
        body: JSON.stringify({
          userId,
          score,
          feedback,
          date: evalDate,
        }),
      });
      await loadEvaluations();
      alert('Değerlendirme kaydedildi!');
    } catch (err) {
      console.warn('Saving evaluation offline/locally:', err);
      
      const key = `offline_eval_${project.id}_${evalDate}`;
      const existing = localStorage.getItem(key);
      let list = existing ? JSON.parse(existing) : [];
      
      const newEval = {
        id: `offline-eval-${Date.now()}`,
        projectId: project.id,
        userId,
        score,
        feedback,
        date: evalDate,
        user: project.permissions?.find(p => p.userId === userId)?.user || { id: userId, fullName: 'Çalışan' },
        evaluator: currentUser,
        createdAt: new Date().toISOString(),
      };

      const idx = list.findIndex((e: any) => e.userId === userId);
      if (idx > -1) {
        list[idx] = newEval;
      } else {
        list.push(newEval);
      }
      localStorage.setItem(key, JSON.stringify(list));
      setEvaluations(list);
      alert('Değerlendirme yerel olarak kaydedildi!');
    } finally {
      setSaveLoadingId(null);
    }
  };

  // Helper to compute start & end weeks for Gantt display
  const getTaskWeeks = (task: Task) => {
    const start = new Date(task.createdAt || new Date());
    const end = task.dueDate ? new Date(task.dueDate) : new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    const projStart = new Date(project.createdAt || new Date());
    
    const diffStartMs = start.getTime() - projStart.getTime();
    const diffEndMs = end.getTime() - projStart.getTime();
    
    // Convert differences to weeks
    const startWeek = Math.max(0, Math.floor(diffStartMs / (7 * 24 * 60 * 60 * 1000)));
    const endWeek = Math.max(startWeek, Math.min(3, Math.floor(diffEndMs / (7 * 24 * 60 * 60 * 1000))));
    
    return { startWeek, endWeek };
  };

  const weeks = ['Hafta 1 (Analiz)', 'Hafta 2 (Geliştirme)', 'Hafta 3 (Test & UAT)', 'Hafta 4 (Yayın)'];

  // Calculations for summary card
  const averageScore = evaluations.length > 0 
    ? (evaluations.reduce((acc, curr) => acc + curr.score, 0) / evaluations.length).toFixed(1)
    : '-';

  return (
    <div className="h-full flex flex-col p-6 bg-slate-950 overflow-y-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            📅 Proje Zaman Çizelgesi & Günlük Değerlendirme
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 font-medium">
            {project.name} projesinin gerçek zamanlı görev ilerlemesi ve günlük üye performans raporu.
          </p>
        </div>
        <button
          onClick={() => { loadTasks(); loadEvaluations(); }}
          className="self-start sm:self-center flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-lg transition"
          title="Yenile"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Verileri Yenile
        </button>
      </div>

      {/* 1. GANTT TIMELINE MATRIX */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 overflow-x-auto space-y-4">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 select-none">
          <Flame className="w-4 h-4 text-orange-500" /> Gerçek Zamanlı Görev Çizelgesi
        </h3>
        
        {/* Table Header */}
        <div className="grid grid-cols-6 gap-4 border-b border-slate-800/60 pb-3 text-xs font-bold text-slate-500">
          <div className="col-span-2">Görev ve Sorumlu</div>
          {weeks.map((w, idx) => (
            <div key={idx} className="text-center font-mono text-[10px] text-slate-400">
              {w}
            </div>
          ))}
        </div>

        {/* Task Timeline Rows */}
        <div className="space-y-3.5 min-w-[700px]">
          {loadingTasks ? (
            <div className="flex justify-center items-center py-8 text-xs text-slate-500 gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
              Görev zaman çizgileri hesaplanıyor...
            </div>
          ) : tasks.length > 0 ? (
            tasks.map((t) => {
              const { startWeek, endWeek } = getTaskWeeks(t);
              const isDone = t.status === 'DONE';
              
              // Map starWeek/endWeek to percentages to render the visual bar span
              const leftPercent = 33.33 + startWeek * 16.66; // offset past task details column
              const widthPercent = (endWeek - startWeek + 1) * 16.66;
              
              return (
                <div key={t.id} className="grid grid-cols-6 gap-4 items-center hover:bg-slate-800/20 py-1.5 px-1 rounded-lg transition relative">
                  {/* Task details (col-span-2) */}
                  <div className="col-span-2 min-w-0 pr-2">
                    <span className="font-semibold text-xs text-slate-200 truncate block">{t.title}</span>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 font-semibold font-mono">
                      <span>Öncelik:</span>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase ${
                        t.priority === 'URGENT' 
                          ? 'bg-red-500/10 text-red-400 border border-red-500/25'
                          : t.priority === 'HIGH'
                          ? 'bg-orange-500/10 text-orange-400 border border-orange-500/25'
                          : 'bg-slate-800 text-slate-400'
                      }`}>{t.priority}</span>
                      {t.assignedTo && (
                        <span className="truncate max-w-[100px] text-indigo-400">👤 {t.assignedTo.fullName}</span>
                      )}
                    </div>
                  </div>

                  {/* Visual timeline bar overlapping columns */}
                  <div className="col-span-4 relative h-7 bg-slate-950/80 rounded-lg border border-slate-800/40 overflow-hidden">
                    <div
                      className={`absolute top-1 bottom-1 rounded-md transition-all flex items-center px-2.5 text-[9px] font-bold text-white shadow-md ${
                        isDone
                          ? 'bg-emerald-600 border border-emerald-400/50 shadow-emerald-600/10'
                          : 'bg-indigo-600 border border-indigo-400/50 shadow-indigo-600/10'
                      }`}
                      style={{
                        left: `${startWeek * 25}%`,
                        width: `${(endWeek - startWeek + 1) * 25}%`,
                      }}
                    >
                      <span className="truncate font-mono">
                        {isDone ? '✅ Tamamlandı' : '⚡ Sürüyor'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-10 text-slate-500 text-xs font-semibold">
              Bu projede henüz bir görev oluşturulmamış. Gantt görünümü için görev ekleyin.
            </div>
          )}
        </div>
      </div>

      {/* 2. DAILY EVALUATION SYSTEM MODULE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Datepicker & Summary Sidebar (col-span-4) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 select-none">
                <Calendar className="w-4 h-4 text-indigo-400" /> Gün Seçimi
              </h3>
              <p className="text-[10px] text-slate-500 leading-relaxed mt-1">
                Değerlendirme verilerini listelemek veya yeni puan girişi yapmak istediğiniz günü seçin.
              </p>
            </div>

            <div className="relative">
              <input
                type="date"
                value={evalDate}
                onChange={(e) => setEvalDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition cursor-pointer"
              />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 select-none">
              <Award className="w-4 h-4 text-amber-500" /> Günlük Özet Raporu
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-950 border border-slate-800/60 rounded-xl p-3.5 text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Günlük Ort. Puan</span>
                <span className="text-2xl font-extrabold text-white mt-1 block font-mono">
                  {averageScore}
                </span>
              </div>
              <div className="bg-slate-950 border border-slate-800/60 rounded-xl p-3.5 text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Değerlendirilen</span>
                <span className="text-2xl font-extrabold text-white mt-1 block font-mono">
                  {evaluations.length}
                </span>
              </div>
            </div>

            <div className="text-[10px] text-slate-500 leading-normal flex items-start gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
              <span>Günün değerlendirmeleri yöneticinin girdiği verilere göre otomatik güncellenir.</span>
            </div>
          </div>
        </div>

        {/* Evaluation Details Container (col-span-8) */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800/80 rounded-2xl p-5 flex flex-col min-h-[300px]">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3 mb-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 select-none">
              <MessageSquare className="w-4 h-4 text-indigo-400" /> Günlük Değerlendirme Verileri
            </h3>
            <span className="text-[10px] font-mono font-bold text-indigo-400 px-2 py-0.5 bg-indigo-600/10 rounded-md border border-indigo-500/20">
              Tarih: {evalDate}
            </span>
          </div>

          <div className="flex-1">
            {loadingEval ? (
              <div className="flex flex-col justify-center items-center h-full py-16 text-xs text-slate-500 gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
                Günlük veriler çekiliyor...
              </div>
            ) : isAdmin ? (
              /* ADMIN PANEL VIEW: Input forms for each project member */
              <div className="space-y-4">
                {project.permissions && project.permissions.length > 0 ? (
                  project.permissions.map((perm) => {
                    const member = perm.user;
                    if (!member) return null;
                    const evalObj = evaluations.find(e => e.userId === member.id);
                    const hasSaved = !!evalObj;
                    const isSaving = saveLoadingId === member.id;

                    return (
                      <div key={member.id} className="bg-slate-950 border border-slate-800/50 rounded-xl p-4 space-y-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#caf5f7] flex items-center justify-center font-bold text-slate-950 border border-slate-200">
                              {member.fullName.charAt(0)}
                            </div>
                            <div>
                              <span className="font-bold text-xs text-slate-200 block">{member.fullName}</span>
                              <span className="text-[10px] text-slate-500 block">{member.email}</span>
                            </div>
                          </div>

                          {/* Saved Tag */}
                          {hasSaved && (
                            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                              Kaydedildi
                            </span>
                          )}
                        </div>

                        {/* Evaluation Form Fields */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-center">
                          {/* Score Star rating selector (col-span-4) */}
                          <div className="sm:col-span-4 flex items-center gap-1 bg-slate-900 border border-slate-800/60 px-3 py-2 rounded-lg h-9">
                            <span className="text-[10px] text-slate-400 font-bold uppercase mr-1 select-none">Skor:</span>
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-4 h-4 cursor-pointer transition ${
                                    star <= (scores[member.id] || 0)
                                      ? 'text-amber-500 fill-amber-500'
                                      : 'text-slate-700 hover:text-amber-400'
                                  }`}
                                  onClick={() => {
                                    setScores(prev => ({ ...prev, [member.id]: star }));
                                  }}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Feedback Input (col-span-6) */}
                          <div className="sm:col-span-6">
                            <input
                              type="text"
                              value={feedbacks[member.id] || ''}
                              onChange={(e) => setFeedbacks(prev => ({ ...prev, [member.id]: e.target.value }))}
                              placeholder="Günlük performans notu veya geri bildirim yazın..."
                              className="w-full h-9 bg-slate-900 border border-slate-800 text-slate-200 rounded-lg px-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>

                          {/* Save Button (col-span-2) */}
                          <div className="sm:col-span-2">
                            <button
                              onClick={() => handleSaveEvaluation(member.id)}
                              disabled={isSaving}
                              className="w-full h-9 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Save className="w-3.5 h-3.5" />
                              {isSaving ? '...' : 'Kaydet'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    Bu projeye özel yetkilendirilmiş çalışan bulunmamaktadır.
                  </div>
                )}
              </div>
            ) : (
              /* EMPLOYEE PERSONAL CARD VIEW: Displays their score and feedback if entered */
              <div className="h-full flex items-center justify-center py-8">
                {(() => {
                  const personalEval = evaluations.find(e => e.userId === currentUser.id);
                  if (personalEval) {
                    return (
                      <div className="w-full max-w-md bg-slate-950 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800/40 pb-2">
                          <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5 select-none">
                            <Award className="w-4 h-4 text-amber-500" /> Günlük Değerlendirmeniz
                          </span>
                          <span className="text-[10px] text-slate-500">Değerlendiren: {personalEval.evaluator?.fullName || 'Yönetici'}</span>
                        </div>

                        {/* Score Indicator */}
                        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800/40 rounded-xl p-3.5">
                          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wide block">Günlük Puanınız:</span>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-5 h-5 ${
                                  star <= personalEval.score
                                    ? 'text-amber-500 fill-amber-500'
                                    : 'text-slate-700'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-bold text-amber-500 ml-1">({personalEval.score}/5)</span>
                        </div>

                        {/* Feedback Text */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wide block">Yönetici Geri Bildirimi:</span>
                          <p className="text-xs text-slate-200 bg-slate-900 border border-slate-800/40 rounded-xl p-4 leading-relaxed font-semibold italic">
                            {personalEval.feedback || 'Yöneticiniz herhangi bir açıklama notu bırakmadı.'}
                          </p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="text-center py-16 space-y-2">
                      <div className="text-2xl select-none">📝</div>
                      <h4 className="text-xs font-bold text-slate-300">Henüz Değerlendirme Yok</h4>
                      <p className="text-[11px] text-slate-500 max-w-sm mx-auto leading-relaxed">
                        Yöneticiniz {evalDate} tarihi için henüz bir performans puanı veya geri bildirim girişi yapmadı.
                      </p>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
