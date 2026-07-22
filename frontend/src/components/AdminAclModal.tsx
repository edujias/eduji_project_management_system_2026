'use client';

import React, { useState, useEffect } from 'react';
import { Project, User, ProjectPermissionLevel } from '@/types';
import { apiFetch } from '@/lib/api';
import { X, ShieldCheck, UserPlus, Users, Settings, User as UserIcon, Trash2, ArrowUpRight } from 'lucide-react';

interface AdminAclModalProps {
  project: Project;
  onClose: () => void;
  onRefresh: () => void;
}

type TabType = 'members' | 'settings' | 'profile';

export function AdminAclModal({ project, onClose, onRefresh }: AdminAclModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('members');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedPermission, setSelectedPermission] = useState<ProjectPermissionLevel>('READ');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUsers();
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
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

  const handleUpdatePermission = async (userId: string, newPermission: ProjectPermissionLevel) => {
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/projects/${project.id}/permissions`, {
        method: 'POST',
        body: JSON.stringify({
          userId,
          permission: newPermission,
        }),
      });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4">
      {/* Notion-style Modal container: Flat White, 2 columns */}
      <div className="bg-white rounded-xl max-w-4xl w-full h-[600px] flex overflow-hidden shadow-2xl relative border border-zinc-200 text-zinc-800 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button at top-right */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 p-1.5 rounded-lg transition z-10"
          title="Kapat"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 1. LEFT SIDEBAR: Custom Light Blue (#caf5f7) background */}
        <aside className="w-64 flex-shrink-0 bg-[#caf5f7] border-r border-zinc-200/80 p-5 flex flex-col justify-between">
          <div className="space-y-6">
            {/* Top Workspace Header */}
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-0.5 select-none">🏢</span>
              <div className="min-w-0">
                <h3 className="font-bold text-zinc-900 text-sm truncate leading-tight">
                  {project.name}
                </h3>
                <span className="inline-block mt-1 font-mono text-[10px] text-zinc-600 bg-white/50 border border-white/80 px-1.5 py-0.5 rounded">
                  {project.code}
                </span>
              </div>
            </div>

            {/* Sidebar Navigation */}
            <div className="space-y-4">
              {/* Workspace Section */}
              <div>
                <span className="block px-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                  Yönetim
                </span>
                <nav className="space-y-0.5">
                  <button
                    onClick={() => setActiveTab('members')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                      activeTab === 'members'
                        ? 'bg-white text-zinc-900 border border-white/60 shadow-sm'
                        : 'text-zinc-700 hover:bg-white/45'
                    }`}
                  >
                    <Users className="w-4 h-4 text-zinc-600 stroke-[1.8]" />
                    <span>Çalışan Listesi</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('settings')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                      activeTab === 'settings'
                        ? 'bg-white text-zinc-900 border border-white/60 shadow-sm'
                        : 'text-zinc-700 hover:bg-white/45'
                    }`}
                  >
                    <Settings className="w-4 h-4 text-zinc-600 stroke-[1.8]" />
                    <span>Proje Ayarları</span>
                  </button>
                </nav>
              </div>

              {/* Personal Section */}
              <div>
                <span className="block px-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                  Hesabım
                </span>
                <nav className="space-y-0.5">
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                      activeTab === 'profile'
                        ? 'bg-white text-zinc-900 border border-white/60 shadow-sm'
                        : 'text-zinc-700 hover:bg-white/45'
                    }`}
                  >
                    <UserIcon className="w-4 h-4 text-zinc-600 stroke-[1.8]" />
                    <span>Profilim</span>
                  </button>
                </nav>
              </div>
            </div>
          </div>

          {/* Footer branding */}
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-semibold px-2">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-600" />
            <span>Eduji Admin Panel</span>
          </div>
        </aside>

        {/* 2. RIGHT CONTENT AREA: Flat White background */}
        <main className="flex-1 bg-white p-8 flex flex-col min-h-0 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg animate-fade-in">
              {error}
            </div>
          )}

          {/* TAB 1: MEMBERS */}
          {activeTab === 'members' && (
            <div className="flex flex-col flex-1 min-h-0 space-y-6">
              <div>
                <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Yönetim / Çalışan Listesi
                </div>
                <h2 className="text-2xl font-bold text-zinc-900 mt-1 mb-1.5">Çalışan Yetkileri</h2>
                <p className="text-xs text-zinc-500">
                  Bu projenin çalışma alanına erişebilecek çalışanları ve yetki derecelerini yönetin.
                </p>
              </div>

              {/* Minimalist Inline Invite Form */}
              <form onSubmit={handleAssignPermission} className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 space-y-3">
                <span className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                  Yeni Çalışan Ekle
                </span>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="flex-1 bg-white border border-zinc-200 text-zinc-800 rounded px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
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
                    className="bg-white border border-zinc-200 text-zinc-800 rounded px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 sm:w-48"
                  >
                    <option value="READ">Sadece Oku (READ)</option>
                    <option value="WRITE">Yazabilir/Düzenleyebilir (WRITE)</option>
                  </select>

                  <button
                    type="submit"
                    disabled={loading || !selectedUserId}
                    className="bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white font-semibold text-xs px-4 py-1.5 rounded transition shadow-sm flex items-center justify-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Ekle
                  </button>
                </div>
              </form>

              {/* Members List Table */}
              <div className="flex-1 overflow-hidden flex flex-col">
                <span className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-2.5">
                  Proje Çalışanları ({project.permissions?.length || 0})
                </span>
                <div className="border border-zinc-200 rounded-xl overflow-hidden flex-1 overflow-y-auto bg-white">
                  <div className="min-w-full divide-y divide-zinc-200">
                    <div className="bg-zinc-50 flex items-center justify-between px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      <div className="w-1/2">Çalışan</div>
                      <div className="w-1/3">Yetki Seviyesi</div>
                      <div className="w-20 text-right">İşlem</div>
                    </div>

                    <div className="divide-y divide-zinc-100 bg-white">
                      {project.permissions && project.permissions.length > 0 ? (
                        project.permissions.map((perm) => (
                          <div key={perm.id} className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50/50 transition">
                            {/* Employee info */}
                            <div className="w-1/2 flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-[#caf5f7] flex items-center justify-center text-xs font-bold text-zinc-900 border border-zinc-200/50 flex-shrink-0">
                                {perm.user?.fullName?.charAt(0) || 'U'}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-zinc-900 truncate">
                                  {perm.user?.fullName}
                                </div>
                                <div className="text-[10px] text-zinc-500 truncate">
                                  {perm.user?.email}
                                </div>
                              </div>
                            </div>

                            {/* Inline Access dropdown */}
                            <div className="w-1/3">
                              <select
                                value={perm.permission}
                                onChange={(e) => handleUpdatePermission(perm.userId, e.target.value as ProjectPermissionLevel)}
                                className="bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-800 rounded px-2.5 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition cursor-pointer font-medium"
                              >
                                <option value="READ">Sadece Oku</option>
                                <option value="WRITE">Düzenleyebilir</option>
                              </select>
                            </div>

                            {/* Actions */}
                            <div className="w-20 text-right">
                              <button
                                onClick={() => handleRemovePermission(perm.userId)}
                                className="inline-flex items-center gap-1 text-[11px] text-red-500 hover:text-red-700 font-semibold px-2 py-1 rounded hover:bg-red-50 transition"
                                title="Yetkiyi Kaldır"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Kaldır
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12 text-zinc-400 text-xs">
                          Bu projeye özel atanmış çalışan bulunmamaktadır.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Yönetim / Proje Ayarları
                </div>
                <h2 className="text-2xl font-bold text-zinc-900 mt-1 mb-1.5">Proje Ayarları</h2>
                <p className="text-xs text-zinc-500">
                  Bu projenin temel bilgilerini ve meta verilerini görüntüleyin.
                </p>
              </div>

              <div className="space-y-4 max-w-xl">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                    Proje Adı
                  </label>
                  <input
                    type="text"
                    value={project.name}
                    readOnly
                    className="w-full bg-zinc-50 border border-zinc-200 text-zinc-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none select-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                      Proje Kodu
                    </label>
                    <input
                      type="text"
                      value={project.code}
                      readOnly
                      className="w-full bg-zinc-50 border border-zinc-200 text-zinc-800 rounded px-3 py-2 text-xs font-mono font-semibold focus:outline-none select-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                      Oluşturulma Tarihi
                    </label>
                    <input
                      type="text"
                      value={new Date(project.createdAt).toLocaleDateString('tr-TR')}
                      readOnly
                      className="w-full bg-zinc-50 border border-zinc-200 text-zinc-800 rounded px-3 py-2 text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                    Proje Açıklaması
                  </label>
                  <textarea
                    value={project.description || 'Açıklama belirtilmemiş.'}
                    readOnly
                    rows={4}
                    className="w-full bg-zinc-50 border border-zinc-200 text-zinc-800 rounded px-3 py-2 text-xs leading-relaxed focus:outline-none resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PROFILE */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Hesabım / Profilim
                </div>
                <h2 className="text-2xl font-bold text-zinc-900 mt-1 mb-1.5">Yönetici Profili</h2>
                <p className="text-xs text-zinc-500">
                  Giriş yaptığınız yönetici hesabına ait bilgiler.
                </p>
              </div>

              {currentUser ? (
                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6 max-w-md space-y-4">
                  <div className="flex items-center gap-4 border-b border-zinc-200/60 pb-4">
                    <div className="w-12 h-12 rounded-full bg-[#caf5f7] flex items-center justify-center text-base font-bold text-zinc-900 border border-zinc-200">
                      {currentUser.fullName.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-900 text-sm">{currentUser.fullName}</h4>
                      <span className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 bg-zinc-900 text-white text-[9px] font-extrabold tracking-wider uppercase rounded-full">
                        {currentUser.role}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-zinc-500 font-semibold">E-posta Adresi:</span>
                      <span className="text-zinc-800 font-bold">{currentUser.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500 font-semibold">Hesap Durumu:</span>
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        Aktif
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-zinc-500 text-xs">Kullanıcı bilgileri yükleniyor...</div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
