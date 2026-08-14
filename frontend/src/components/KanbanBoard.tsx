'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Task, Project, User } from '@/types';
import { apiFetch } from '@/lib/api';
import {
  Plus,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
  Flame,
  Trash2,
  UserCheck,
  Pencil,
  Check,
  X,
  ArrowRightLeft,
} from 'lucide-react';

interface KanbanBoardProps {
  project: Project;
  currentUser: User;
}

export function KanbanBoard({ project, currentUser }: KanbanBoardProps) {
  const canWrite =
    currentUser.role === 'ADMIN' ||
    project.permissions?.some((p) => p.userId === currentUser.id && p.permission === 'WRITE');

  // Göreve atanabilecek kullanıcılar: proje üyeleri + (listede yoksa) mevcut kullanıcı
  const assignableUsers = useMemo(() => {
    const fromPermissions = (project.permissions || [])
      .map((p) => p.user)
      .filter((u): u is User => !!u);
    const map = new Map(fromPermissions.map((u) => [u.id, u]));
    if (!map.has(currentUser.id)) {
      map.set(currentUser.id, currentUser);
    }
    return Array.from(map.values());
  }, [project.permissions, currentUser]);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [draggedOverColId, setDraggedOverColId] = useState<string | null>(null);

  // Edit task form state
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskDesc, setEditTaskDesc] = useState('');
  const [editTaskPriority, setEditTaskPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [editTaskDueDate, setEditTaskDueDate] = useState('');
  const [editTaskAssigneeId, setEditTaskAssigneeId] = useState('');

  // New task form state
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskAssigneeId, setTaskAssigneeId] = useState('');

  // Devretme (delegate) seçici
  const [delegatingTaskId, setDelegatingTaskId] = useState<string | null>(null);
  const [delegateToUserId, setDelegateToUserId] = useState('');

  useEffect(() => {
    loadTasks();
  }, [project.id]);

  const saveTasksLocally = (taskList: Task[]) => {
    localStorage.setItem(`offline_tasks_${project.id}`, JSON.stringify(taskList));
  };

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Task[]>(`/tasks/project/${project.id}`);
      setTasks(data);
      saveTasksLocally(data);
    } catch (err: any) {
      if (err?.statusCode === 401 || err?.statusCode === 403) {
        setTasks([]);
        return;
      }
      console.error('Görev çekme hatası, yerel veriler yükleniyor:', err);
      const offlineTasksRaw = localStorage.getItem(`offline_tasks_${project.id}`);
      if (offlineTasksRaw) {
        setTasks(JSON.parse(offlineTasksRaw));
      } else {
        setTasks([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    if (taskDueDate) {
      const selected = new Date(taskDueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected < today) {
        alert('Bitiş tarihi geçmiş bir tarih olamaz!');
        return;
      }
    }

    try {
      const newTask = await apiFetch<Task>(`/tasks/project/${project.id}`, {
        method: 'POST',
        body: JSON.stringify({
          title: taskTitle,
          description: taskDesc,
          priority: taskPriority,
          status: 'TODO',
          dueDate: taskDueDate || null,
          assignedToId: taskAssigneeId || null,
        }),
      });

      const updatedList = [newTask, ...tasks];
      setTasks(updatedList);
      saveTasksLocally(updatedList);

      setTaskTitle('');
      setTaskDesc('');
      setTaskDueDate('');
      setTaskAssigneeId('');
      setShowNewTaskModal(false);
    } catch (err: any) {
      if (err?.statusCode === 401 || err?.statusCode === 403) {
        alert(err.message || 'Bu projede görev ekleme yetkiniz yok.');
        return;
      }
      console.warn('Backend çevrimdışı, görev yerel hafızaya kaydediliyor:', err);
      const mockTask: Task = {
        id: `offline-task-${Math.random()}`,
        title: taskTitle.trim(),
        description: taskDesc.trim(),
        priority: taskPriority,
        status: 'TODO',
        dueDate: taskDueDate ? new Date(taskDueDate).toISOString() : null,
        projectId: project.id,
        createdAt: new Date().toISOString(),
        createdById: 'mock-admin-id',
      };
      
      const updatedList = [mockTask, ...tasks];
      setTasks(updatedList);
      saveTasksLocally(updatedList);

      setTaskTitle('');
      setTaskDesc('');
      setTaskDueDate('');
      setShowNewTaskModal(false);
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editTaskTitle.trim()) return;

    if (editTaskDueDate) {
      const selected = new Date(editTaskDueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected < today) {
        alert('Bitiş tarihi geçmiş bir tarih olamaz!');
        return;
      }
    }

    try {
      const updated = await apiFetch<Task>(`/tasks/${editingTask.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: editTaskTitle,
          description: editTaskDesc,
          priority: editTaskPriority,
          dueDate: editTaskDueDate || null,
          assignedToId: editTaskAssigneeId || null,
        }),
      });

      const updatedList = tasks.map((t) => (t.id === editingTask.id ? updated : t));
      setTasks(updatedList);
      saveTasksLocally(updatedList);
      setShowEditTaskModal(false);
    } catch (err: any) {
      if (err?.statusCode === 401 || err?.statusCode === 403) {
        alert(err.message || 'Bu görevi düzenleme yetkiniz yok.');
        return;
      }
      console.warn('Backend çevrimdışı, görev yerel olarak güncelleniyor:', err);
      const updatedList = tasks.map((t) => (t.id === editingTask.id ? {
        ...t,
        title: editTaskTitle.trim(),
        description: editTaskDesc.trim(),
        priority: editTaskPriority,
        dueDate: editTaskDueDate ? new Date(editTaskDueDate).toISOString() : null,
      } : t));
      
      setTasks(updatedList);
      saveTasksLocally(updatedList);
      setShowEditTaskModal(false);
    }
  };

  const handleMoveStatus = async (taskId: string, newStatus: string) => {
    try {
      const updated = await apiFetch<Task>(`/tasks/${taskId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });

      const updatedList = tasks.map((t) => (t.id === taskId ? updated : t));
      setTasks(updatedList);
      saveTasksLocally(updatedList);
    } catch (err: any) {
      if (err?.statusCode === 401 || err?.statusCode === 403) {
        alert(err.message || 'Bu görevin durumunu değiştirme yetkiniz yok.');
        return;
      }
      console.warn('Backend çevrimdışı, durum güncellemesi yerel olarak yapılıyor:', err);
      const updatedList = tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } as Task : t));
      setTasks(updatedList);
      saveTasksLocally(updatedList);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const updated = await apiFetch<Task>(`/tasks/${taskId}/complete`, { method: 'PATCH' });
      const updatedList = tasks.map((t) => (t.id === taskId ? updated : t));
      setTasks(updatedList);
      saveTasksLocally(updatedList);
    } catch (err: any) {
      alert(err?.message || 'Görev tamamlandı olarak işaretlenemedi.');
    }
  };

  const handleApproveTask = async (taskId: string) => {
    try {
      const updated = await apiFetch<Task>(`/tasks/${taskId}/approve`, { method: 'PATCH' });
      const updatedList = tasks.map((t) => (t.id === taskId ? updated : t));
      setTasks(updatedList);
      saveTasksLocally(updatedList);
    } catch (err: any) {
      alert(err?.message || 'Görev onaylanamadı.');
    }
  };

  const handleRejectTask = async (taskId: string) => {
    try {
      const updated = await apiFetch<Task>(`/tasks/${taskId}/reject`, { method: 'PATCH' });
      const updatedList = tasks.map((t) => (t.id === taskId ? updated : t));
      setTasks(updatedList);
      saveTasksLocally(updatedList);
    } catch (err: any) {
      alert(err?.message || 'Görev reddedilemedi.');
    }
  };

  const handleDelegateTask = async () => {
    if (!delegatingTaskId || !delegateToUserId) return;
    try {
      const updated = await apiFetch<Task>(`/tasks/${delegatingTaskId}/delegate`, {
        method: 'PATCH',
        body: JSON.stringify({ toUserId: delegateToUserId }),
      });
      const updatedList = tasks.map((t) => (t.id === delegatingTaskId ? updated : t));
      setTasks(updatedList);
      saveTasksLocally(updatedList);
      setDelegatingTaskId(null);
      setDelegateToUserId('');
    } catch (err: any) {
      alert(err?.message || 'Görev devredilemedi.');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await apiFetch(`/tasks/${taskId}`, { method: 'DELETE' });
      const updatedList = tasks.filter((t) => t.id !== taskId);
      setTasks(updatedList);
      saveTasksLocally(updatedList);
    } catch (err: any) {
      if (err?.statusCode === 401 || err?.statusCode === 403) {
        alert(err.message || 'Bu görevi silme yetkiniz yok.');
        return;
      }
      console.warn('Backend çevrimdışı, görev yerel olarak siliniyor:', err);
      const updatedList = tasks.filter((t) => t.id !== taskId);
      setTasks(updatedList);
      saveTasksLocally(updatedList);
    }
  };

  const handleAiGenerateTasks = async () => {
    setGeneratingAi(true);
    try {
      const newTasks = await apiFetch<Task[]>(`/tasks/project/${project.id}/ai-generate`, {
        method: 'POST',
      });

      const updatedList = [...newTasks, ...tasks];
      setTasks(updatedList);
      saveTasksLocally(updatedList);
    } catch (err: any) {
      if (err?.statusCode === 401 || err?.statusCode === 403) {
        alert(err.message || 'Bu projede AI ile görev üretme yetkiniz yok.');
        return;
      }
      console.warn('Backend çevrimdışı, Gemini yapay zeka görevleri yerel olarak üretiliyor:', err);
      const mockAiTasks: Task[] = [
        {
          id: `offline-ai-${Math.random()}`,
          title: 'Presigned S3 Yükleme API Testi',
          description: 'S3 dosya sunucusunun imzasız istekleri reddettiğini ve geçici linklerin doğru üretildiğini test et.',
          priority: 'HIGH',
          status: 'TODO',
          projectId: project.id,
          createdAt: new Date().toISOString(),
          createdById: 'mock-admin-id',
        },
        {
          id: `offline-ai-${Math.random()}`,
          title: 'Docker Çevrimdışı Güvenlik Duvarı Kontrolü',
          description: 'Veritabanı bağlantısı koptuğunda uygulamanın kilitlenmeden offline moda geçtiğini ve hata blokları göstermediğini doğrula.',
          priority: 'URGENT',
          status: 'IN_PROGRESS',
          projectId: project.id,
          createdAt: new Date().toISOString(),
          createdById: 'mock-admin-id',
        },
        {
          id: `offline-ai-${Math.random()}`,
          title: 'Performans Metrikleri & Loglama Entegrasyonu',
          description: 'Gantt ve Kanban panolarının yüklenme sürelerini takip eden web performans izleyicisini devreye al.',
          priority: 'LOW',
          status: 'TODO',
          projectId: project.id,
          createdAt: new Date().toISOString(),
          createdById: 'mock-admin-id',
        }
      ];

      const updatedList = [...mockAiTasks, ...tasks];
      setTasks(updatedList);
      saveTasksLocally(updatedList);
    } finally {
      setGeneratingAi(false);
    }
  };

  const columns = [
    { id: 'TODO', title: '🎯 Yapılacaklar', bg: 'bg-slate-900/40 border-slate-800' },
    { id: 'IN_PROGRESS', title: '⚡ Devam Edenler', bg: 'bg-amber-950/20 border-amber-800/40' },
    { id: 'REVIEW', title: '🔍 İncelemede', bg: 'bg-blue-950/20 border-blue-800/40' },
    { id: 'DONE', title: '✅ Tamamlandı', bg: 'bg-emerald-950/20 border-emerald-800/40' },
  ];

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return <span className="px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-[10px] font-bold flex items-center gap-1"><Flame className="w-3 h-3" /> Acil</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-[10px] font-semibold flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Yüksek</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-[10px] font-medium">Orta</span>;
      default:
        return <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-[10px]">Düşük</span>;
    }
  };

  return (
    <div className="h-full flex flex-col p-6 bg-slate-950 overflow-hidden">
      {/* Header Actions */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            📋 Kanban Görev Panosu
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {project.name} projesi için sürükle-bırak görev takibi ve AI görev ataması.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {canWrite && (
          <button
            onClick={handleAiGenerateTasks}
            disabled={generatingAi}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-purple-500/20 transition flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 animate-spin" />
            {generatingAi ? 'Gemini AI Görevleri Üretiyor...' : '🤖 Gemini AI ile Görev Üret'}
          </button>
          )}

          {canWrite && (
          <button
            onClick={() => setShowNewTaskModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-indigo-600/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Yeni Görev Ekle
          </button>
          )}
        </div>
      </div>

      {/* Kanban Columns Stream */}
      <div className="flex-1 overflow-x-auto flex gap-4 min-w-0 pr-2 pb-2">
        {columns.map((col) => {
          const colTasks = tasks.filter(
            (t) => t.status === col.id || (col.id === 'IN_PROGRESS' && t.status === 'PENDING_APPROVAL')
          );
          return (
            <div
              key={col.id}
              onDragOver={(e) => e.preventDefault()}
              onDragEnter={() => setDraggedOverColId(col.id)}
              onDragLeave={() => setDraggedOverColId(null)}
              onDrop={(e) => {
                if (!canWrite) {
                  setDraggedOverColId(null);
                  return;
                }
                const taskId = e.dataTransfer.getData('text/plain');
                if (taskId) {
                  handleMoveStatus(taskId, col.id);
                }
                setDraggedOverColId(null);
              }}
              className={`rounded-2xl border p-4 flex flex-col ${col.bg} backdrop-blur min-h-0 transition-all duration-200 w-72 md:w-auto md:flex-1 flex-shrink-0 ${
                draggedOverColId === col.id ? 'ring-2 ring-indigo-500/40 bg-indigo-950/20 scale-[1.01]' : ''
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800/60">
                <span className="font-bold text-xs text-slate-200">
                  {col.title}
                </span>
                <span className="text-xs font-mono px-2 py-0.5 bg-slate-900 text-slate-400 rounded-full border border-slate-800">
                  {colTasks.length}
                </span>
              </div>

              {/* Tasks List */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {colTasks.map((task) => {
                  const isMovable = canWrite && (task.status === 'TODO' || task.status === 'IN_PROGRESS');
                  const isCurrentAssignee = task.assignedToId === currentUser.id;
                  const canComplete =
                    isCurrentAssignee && (task.status === 'TODO' || task.status === 'IN_PROGRESS');
                  const isPeerApprover =
                    task.status === 'PENDING_APPROVAL' && task.assignedById === currentUser.id;
                  const isAdminReviewer = task.status === 'REVIEW' && currentUser.role === 'ADMIN';
                  const canReview = isPeerApprover || isAdminReviewer;

                  return (
                  <div
                    key={task.id}
                    draggable={isMovable}
                    onDragStart={(e) => {
                      if (!isMovable) return;
                      e.dataTransfer.setData('text/plain', task.id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    className={`bg-slate-900 border p-4 rounded-xl shadow-md transition group space-y-2.5 hover:shadow-lg hover:shadow-slate-950/50 ${
                      task.status === 'PENDING_APPROVAL'
                        ? 'border-amber-700/60'
                        : 'border-slate-800 hover:border-slate-700'
                    } ${isMovable ? 'cursor-grab active:cursor-grabbing' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-xs text-slate-100 leading-snug">
                        {task.title}
                      </h4>
                      {canWrite && (
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                        <button
                          onClick={() => {
                            setEditingTask(task);
                            setEditTaskTitle(task.title);
                            setEditTaskDesc(task.description || '');
                            setEditTaskPriority(task.priority);
                            setEditTaskDueDate(task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-CA') : '');
                            setEditTaskAssigneeId(task.assignedToId || '');
                            setShowEditTaskModal(true);
                          }}
                          className="text-slate-500 hover:text-indigo-400 transition cursor-pointer"
                          title="Düzenle"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="text-slate-500 hover:text-red-400 transition cursor-pointer"
                          title="Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      )}
                    </div>

                    {task.description && (
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {task.description}
                      </p>
                    )}

                    {task.dueDate && (
                      <div className="flex items-center gap-1 text-[10px] text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded w-fit">
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        <span>Bitiş: {new Date(task.dueDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/50">
                      {getPriorityBadge(task.priority)}

                      {task.assignedTo && (
                        <div className="flex items-center gap-1 text-[10px] text-purple-300 bg-purple-950/50 border border-purple-800/40 px-2 py-0.5 rounded-full">
                          <UserCheck className="w-3 h-3 text-purple-400" />
                          <span className="truncate max-w-[80px]">
                            {task.assignedTo.fullName}
                          </span>
                        </div>
                      )}
                    </div>

                    {task.status === 'PENDING_APPROVAL' && (
                      <div className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded">
                        {isPeerApprover
                          ? 'Onayınız bekleniyor'
                          : `${task.assignedBy?.fullName || 'Atayan'} onayı bekleniyor`}
                      </div>
                    )}
                    {task.status === 'REVIEW' && (
                      <div className="text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded">
                        Yönetici incelemesi bekleniyor
                      </div>
                    )}

                    {/* Tamamla / Devret */}
                    {(canComplete) && (
                      <div className="flex items-center gap-1.5 pt-1">
                        <button
                          onClick={() => handleCompleteTask(task.id)}
                          className="flex-1 flex items-center justify-center gap-1 text-[10px] px-2 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-600/40 text-emerald-400 rounded-lg font-semibold transition"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Tamamlandı
                        </button>
                        <button
                          onClick={() => {
                            setDelegatingTaskId(task.id);
                            setDelegateToUserId('');
                          }}
                          className="flex items-center justify-center gap-1 text-[10px] px-2 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg font-medium transition"
                          title="Başka birine devret"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" /> Devret
                        </button>
                      </div>
                    )}

                    {/* Onayla / Reddet */}
                    {canReview && (
                      <div className="flex items-center gap-1.5 pt-1">
                        <button
                          onClick={() => handleApproveTask(task.id)}
                          className="flex-1 flex items-center justify-center gap-1 text-[10px] px-2 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-600/40 text-emerald-400 rounded-lg font-semibold transition"
                        >
                          <Check className="w-3.5 h-3.5" /> Onayla
                        </button>
                        <button
                          onClick={() => handleRejectTask(task.id)}
                          className="flex-1 flex items-center justify-center gap-1 text-[10px] px-2 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-600/40 text-rose-400 rounded-lg font-semibold transition"
                        >
                          <X className="w-3.5 h-3.5" /> Reddet
                        </button>
                      </div>
                    )}

                    {/* Move Status Action Bar: sadece TODO <-> IN_PROGRESS */}
                    {canWrite && (task.status === 'TODO' || task.status === 'IN_PROGRESS') && (
                    <div className="flex items-center gap-1 pt-1 opacity-80 group-hover:opacity-100 transition">
                      <span className="text-[10px] text-slate-500 mr-1">Taşı:</span>
                      {columns
                        .filter((c) => c.id !== col.id && (c.id === 'TODO' || c.id === 'IN_PROGRESS'))
                        .map((c) => (
                          <button
                            key={c.id}
                            onClick={() => handleMoveStatus(task.id, c.id)}
                            className="text-[9px] px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
                          >
                            {c.title.split(' ')[0]}
                          </button>
                        ))}
                    </div>
                    )}
                  </div>
                  );
                })}

                {colTasks.length === 0 && (
                  <div className="h-24 border border-dashed border-slate-800/80 rounded-xl flex items-center justify-center text-[11px] text-slate-500">
                    Görev yok
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE NEW TASK MODAL */}
      {showNewTaskModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Yeni Görev Oluştur</h3>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Görev Başlığı
                </label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Örn: S3 Presigned URL Testi"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Açıklama (Opsiyonel)
                </label>
                <textarea
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Görev detayları ve kabul kriterleri..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 h-24"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Bitiş Tarihi (Due Date)
                </label>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  min={new Date().toLocaleDateString('en-CA')}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Öncelik Derecesi
                </label>
                <select
                  value={taskPriority}
                  onChange={(e: any) => setTaskPriority(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="LOW">Düşük</option>
                  <option value="MEDIUM">Orta</option>
                  <option value="HIGH">Yüksek</option>
                  <option value="URGENT">Acil ⚡</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Ata (Opsiyonel)
                </label>
                <select
                  value={taskAssigneeId}
                  onChange={(e) => setTaskAssigneeId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Kimseye atama (Genel görev)</option>
                  {assignableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName}{u.id === currentUser.id ? ' (Ben)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewTaskModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-medium rounded-lg hover:bg-slate-700"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-indigo-600/20"
                >
                  Görev Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* EDIT TASK MODAL */}
      {showEditTaskModal && editingTask && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Görevi Düzenle</h3>

            <form onSubmit={handleUpdateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Görev Başlığı
                </label>
                <input
                  type="text"
                  value={editTaskTitle}
                  onChange={(e) => setEditTaskTitle(e.target.value)}
                  placeholder="Örn: S3 Presigned URL Testi"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Açıklama (Opsiyonel)
                </label>
                <textarea
                  value={editTaskDesc}
                  onChange={(e) => setEditTaskDesc(e.target.value)}
                  placeholder="Görev detayları ve kabul kriterleri..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 h-24"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Bitiş Tarihi (Due Date)
                </label>
                <input
                  type="date"
                  value={editTaskDueDate}
                  onChange={(e) => setEditTaskDueDate(e.target.value)}
                  min={new Date().toLocaleDateString('en-CA')}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Öncelik Derecesi
                </label>
                <select
                  value={editTaskPriority}
                  onChange={(e: any) => setEditTaskPriority(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="LOW">Düşük</option>
                  <option value="MEDIUM">Orta</option>
                  <option value="HIGH">Yüksek</option>
                  <option value="URGENT">Acil ⚡</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Ata (Opsiyonel)
                </label>
                <select
                  value={editTaskAssigneeId}
                  onChange={(e) => setEditTaskAssigneeId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Kimseye atama (Genel görev)</option>
                  {assignableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName}{u.id === currentUser.id ? ' (Ben)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditTaskModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-medium rounded-lg hover:bg-slate-700"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-indigo-600/20"
                >
                  Değişiklikleri Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEVRET (DELEGATE) MODAL */}
      {delegatingTaskId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Görevi Devret</h3>
            <p className="text-xs text-slate-400">
              Bu görevi seçtiğin kişiye devredersin; o kişi tamamladığında onay sırası sana gelir.
            </p>
            <select
              value={delegateToUserId}
              onChange={(e) => setDelegateToUserId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">Kullanıcı seç...</option>
              {assignableUsers
                .filter((u) => u.id !== currentUser.id)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName}
                  </option>
                ))}
            </select>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDelegatingTaskId(null);
                  setDelegateToUserId('');
                }}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-medium rounded-lg hover:bg-slate-700"
              >
                İptal
              </button>
              <button
                type="button"
                disabled={!delegateToUserId}
                onClick={handleDelegateTask}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg shadow-lg shadow-indigo-600/20"
              >
                Devret
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
