'use client';

import React, { useState, useEffect } from 'react';
import { Project, User, ProjectPermissionLevel } from '@/types';
import { apiFetch } from '@/lib/api';
import { X, ShieldCheck, UserPlus, Trash2, CheckCircle2 } from 'lucide-react';

interface AdminAclModalProps {
  project: Project;
  onClose: () => void;
  onRefresh: () => void;
}

export function AdminAclModal({ project, onClose, onRefresh }: AdminAclModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedPermission, setSelectedPermission] = useState<ProjectPermissionLevel>('READ');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await apiFetch<User[]>('/users');
      setUsers(data.filter((u) => u.role !== 'ADMIN')); // Sadece Çalışanları göster
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAssignPermission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    setLoading(true);
    setError(null);

    try {
      await apiFetch(`/projects/${project.id}/permissions`, {
        method: 'POST',
        body: JSON.stringify({
          userId: selectedUserId,
          permission: selectedPermission,
        }),
      });
      setSelectedUserId('');
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePermission = async (userId: string) => {
    if (!confirm('Bu kullanıcının proje erişim yetkisini kaldırmak istediğinize emin misiniz?')) return;
    try {
      await apiFetch(`/projects/${project.id}/permissions/${userId}`, {
        method: 'DELETE',
      });
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
          <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Proje Yetkilendirme Yönetimi</h2>
            <p className="text-xs text-slate-400">
              <span className="font-semibold text-indigo-400">{project.name}</span> ({project.code}) için yetkileri yönetin.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg">
            {error}
          </div>
        )}

        {/* Yeni Kullanıcı İzni Ekle Formu */}
        <form onSubmit={handleAssignPermission} className="mb-6 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-indigo-400" /> Yeni İzin Atama
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              required
            >
              <option value="">Çalışan Seçin...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.email})
                </option>
              ))}
            </select>

            <select
              value={selectedPermission}
              onChange={(e) => setSelectedPermission(e.target.value as ProjectPermissionLevel)}
              className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="READ">READ (Okuma / Görüntüleme)</option>
              <option value="WRITE">WRITE (Yazma / Mesaj & Dosya Ekleme)</option>
            </select>

            <button
              type="submit"
              disabled={loading || !selectedUserId}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
            >
              {loading ? 'Kaydediliyor...' : 'İzin Ata'}
            </button>
          </div>
        </form>

        {/* Mevcut Yetkili Liste */}
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Mevcut Proje Yetkilileri</h3>
          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {project.permissions && project.permissions.length > 0 ? (
              project.permissions.map((perm) => (
                <div
                  key={perm.id}
                  className="flex items-center justify-between p-3 bg-slate-950/40 border border-slate-800/80 rounded-lg hover:border-slate-700 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 border border-slate-700">
                      {perm.user?.fullName?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-200">{perm.user?.fullName}</div>
                      <div className="text-xs text-slate-400">{perm.user?.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                        perm.permission === 'WRITE'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                      }`}
                    >
                      {perm.permission === 'WRITE' ? 'WRITE (Tam İzin)' : 'READ (Okuma)'}
                    </span>

                    <button
                      onClick={() => handleRemovePermission(perm.userId)}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                      title="Yetkiyi Kaldır"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-slate-500 text-sm">
                Henüz bu projeye özel atanmış çalışan izni bulunmuyor. (Yalnızca Admin erişebilir)
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
