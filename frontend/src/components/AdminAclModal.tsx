'use client';

import React, { useState, useEffect } from 'react';
import { Project, User, ProjectPermissionLevel } from '@/types';
import { apiFetch } from '@/lib/api';
import { X, ShieldCheck, UserPlus, Users, Settings, User as UserIcon, Trash2, ArrowUpRight, Activity, RefreshCw, Clock, Calendar } from 'lucide-react';

interface AdminAclModalProps {
  projects: Project[];
  currentProject: Project;
  onClose: () => void;
  onRefresh: () => void;
}

type TabType = 'members' | 'settings' | 'profile' | 'activity';

export function AdminAclModal({ projects, currentProject, onClose, onRefresh }: AdminAclModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('members');
  const [selectedProjectId, setSelectedProjectId] = useState(currentProject.id);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedPermission, setSelectedPermission] = useState<ProjectPermissionLevel>('READ');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Activity tracking state
  const [activityUsers, setActivityUsers] = useState<User[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleString('tr-TR');
    } catch {
      return dateString;
    }
  };

  const formatPresenceTime = (seconds?: number) => {
    if (!seconds || seconds <= 0) return '0 sn';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts = [];
    if (hrs > 0) parts.push(`${hrs} sa`);
    if (mins > 0) parts.push(`${mins} dk`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs} sn`);

    return parts.join(' ');
  };

  const project = projects.find(p => p.id === selectedProjectId) || currentProject;
  const isAdmin = currentUser?.role === 'ADMIN';

  // Edit states for project settings
  const [editName, setEditName] = useState(project.name);
  const [editDesc, setEditDesc] = useState(project.description || '');
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  // Update edit fields when selected project changes
  useEffect(() => {
    setEditName(project.name);
    setEditDesc(project.description || '');
  }, [project.id]);

  const fetchUsers = async () => {
    try {
      const data = await apiFetch<User[]>('/users');
      setUsers(data.filter((u) => u.role !== 'ADMIN')); // Sadece Çalışanları göster
    } catch (err: any) {
      console.warn('Backend offline, loading mock employees:', err);
      // Fallback: Default mock employees list
      const mockEmployees: User[] = [
        { id: 'mock-emp-zeyn', fullName: 'Zeynep Yılmaz', email: 'zeyn@company.com', role: 'EMPLOYEE' },
        { id: 'mock-emp-can', fullName: 'Can Demir', email: 'can@company.com', role: 'EMPLOYEE' },
        { id: 'mock-emp-merve', fullName: 'Merve Kaya', email: 'merve@company.com', role: 'EMPLOYEE' },
        { id: 'mock-emp-ali', fullName: 'Ali Şahin', email: 'ali@company.com', role: 'EMPLOYEE' },
      ];
      setUsers(mockEmployees);
    }
  };

  const fetchActivity = async () => {
    setActivityLoading(true);
    setError(null);
    try {
      const data = await apiFetch<User[]>('/users/activity');
      setActivityUsers(data);
    } catch (err: any) {
      console.warn('Activity fetch failed, using fallback mock data:', err);
      // Fallback: Mock activity data matching the schema
      setActivityUsers([
        {
          id: 'mock-emp-zeyn',
          fullName: 'Zeynep Yılmaz',
          email: 'zeyn@company.com',
          role: 'EMPLOYEE',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          isOnline: true,
          lastLoginAt: new Date(Date.now() - 3600000).toISOString(),
          lastLogoutAt: new Date(Date.now() - 7200000).toISOString(),
          totalPresenceTime: 12450,
        },
        {
          id: 'mock-emp-can',
          fullName: 'Can Demir',
          email: 'can@company.com',
          role: 'EMPLOYEE',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          isOnline: false,
          lastLoginAt: new Date(Date.now() - 86400000).toISOString(),
          lastLogoutAt: new Date(Date.now() - 82800000).toISOString(),
          totalPresenceTime: 7200,
        },
        {
          id: 'mock-emp-merve',
          fullName: 'Merve Kaya',
          email: 'merve@company.com',
          role: 'EMPLOYEE',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          isOnline: false,
          lastLoginAt: new Date(Date.now() - 172800000).toISOString(),
          lastLogoutAt: new Date(Date.now() - 165600000).toISOString(),
          totalPresenceTime: 28800,
        }
      ]);
    } finally {
      setActivityLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'activity') {
      fetchActivity();
    }
  }, [activeTab]);

  const handleAssignPermission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    setLoading(true);
    setError(null);

    const selectedUser = users.find(u => u.id === selectedUserId);
    if (!selectedUser) return;

    try {
      if (project.id && !project.id.startsWith('offline-') && project.id !== 'mock-proj-id') {
        await apiFetch(`/projects/${project.id}/permissions`, {
          method: 'POST',
          body: JSON.stringify({
            userId: selectedUserId,
            permission: selectedPermission,
          }),
        });
      } else {
        throw new Error('Offline project active.');
      }
      setSelectedUserId('');
      onRefresh();
    } catch (err: any) {
      console.warn('Saving permission locally:', err);
      const newPermission = {
        id: `offline-perm-${Math.random()}`,
        projectId: project.id,
        userId: selectedUserId,
        permission: selectedPermission,
        user: selectedUser,
      };

      const existingProjectsRaw = localStorage.getItem('offline_projects');
      if (existingProjectsRaw) {
        let existing: Project[] = JSON.parse(existingProjectsRaw);
        existing = existing.map(p => {
          if (p.id === project.id) {
            const filteredPerms = (p.permissions || []).filter(perm => perm.userId !== selectedUserId);
            return {
              ...p,
              permissions: [...filteredPerms, newPermission],
            };
          }
          return p;
        });
        localStorage.setItem('offline_projects', JSON.stringify(existing));
      } else {
        const defaultProjPermissionsKey = `offline_permissions_${project.id}`;
        const existingPermsRaw = localStorage.getItem(defaultProjPermissionsKey);
        const existingPerms = existingPermsRaw ? JSON.parse(existingPermsRaw) : [];
        const filteredPerms = existingPerms.filter((p: any) => p.userId !== selectedUserId);
        localStorage.setItem(defaultProjPermissionsKey, JSON.stringify([...filteredPerms, newPermission]));
      }

      if (project.permissions) {
        const filteredPerms = project.permissions.filter(perm => perm.userId !== selectedUserId);
        project.permissions = [...filteredPerms, newPermission as any];
      } else {
        project.permissions = [newPermission as any];
      }

      setSelectedUserId('');
      onRefresh();
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePermission = async (userId: string, newPermission: ProjectPermissionLevel) => {
    setLoading(true);
    setError(null);
    try {
      if (project.id && !project.id.startsWith('offline-') && project.id !== 'mock-proj-id') {
        await apiFetch(`/projects/${project.id}/permissions`, {
          method: 'POST',
          body: JSON.stringify({
            userId,
            permission: newPermission,
          }),
        });
      } else {
        throw new Error('Offline project active.');
      }
      onRefresh();
    } catch (err: any) {
      console.warn('Updating permission locally:', err);
      const existingProjectsRaw = localStorage.getItem('offline_projects');
      if (existingProjectsRaw) {
        let existing: Project[] = JSON.parse(existingProjectsRaw);
        existing = existing.map(p => {
          if (p.id === project.id) {
            return {
              ...p,
              permissions: (p.permissions || []).map(perm => 
                perm.userId === userId ? { ...perm, permission: newPermission } : perm
              ),
            };
          }
          return p;
        });
        localStorage.setItem('offline_projects', JSON.stringify(existing));
      } else {
        const defaultProjPermissionsKey = `offline_permissions_${project.id}`;
        const existingPermsRaw = localStorage.getItem(defaultProjPermissionsKey);
        if (existingPermsRaw) {
          const existingPerms = JSON.parse(existingPermsRaw);
          const updated = existingPerms.map((p: any) => p.userId === userId ? { ...p, permission: newPermission } : p);
          localStorage.setItem(defaultProjPermissionsKey, JSON.stringify(updated));
        }
      }

      if (project.permissions) {
        project.permissions = project.permissions.map(perm => 
          perm.userId === userId ? { ...perm, permission: newPermission } : perm
        ) as any;
      }
      onRefresh();
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePermission = async (userId: string) => {
    if (!confirm('Bu kullanıcının proje erişim yetkisini kaldırmak istediğinize emin misiniz?')) return;
    try {
      if (project.id && !project.id.startsWith('offline-') && project.id !== 'mock-proj-id') {
        await apiFetch(`/projects/${project.id}/permissions/${userId}`, {
          method: 'DELETE',
        });
      } else {
        throw new Error('Offline project active.');
      }
      onRefresh();
    } catch (err: any) {
      console.warn('Removing permission locally:', err);
      const existingProjectsRaw = localStorage.getItem('offline_projects');
      if (existingProjectsRaw) {
        let existing: Project[] = JSON.parse(existingProjectsRaw);
        existing = existing.map(p => {
          if (p.id === project.id) {
            return {
              ...p,
              permissions: (p.permissions || []).filter(perm => perm.userId !== userId),
            };
          }
          return p;
        });
        localStorage.setItem('offline_projects', JSON.stringify(existing));
      } else {
        const defaultProjPermissionsKey = `offline_permissions_${project.id}`;
        const existingPermsRaw = localStorage.getItem(defaultProjPermissionsKey);
        if (existingPermsRaw) {
          const existingPerms = JSON.parse(existingPermsRaw);
          const updated = existingPerms.filter((p: any) => p.userId !== userId);
          localStorage.setItem(defaultProjPermissionsKey, JSON.stringify(updated));
        }
      }

      if (project.permissions) {
        project.permissions = project.permissions.filter(perm => perm.userId !== userId) as any;
      }
      onRefresh();
    }
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    setSaveLoading(true);
    setError(null);

    try {
      if (project.id && !project.id.startsWith('offline-') && project.id !== 'mock-proj-id') {
        await apiFetch(`/projects/${project.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: editName.trim(),
            description: editDesc.trim(),
          }),
        });
      } else {
        throw new Error('Offline project active.');
      }
      onRefresh();
      alert('Proje bilgileri başarıyla güncellendi!');
    } catch (err: any) {
      console.warn('Saving project settings locally:', err);
      // Fallback: Update localStorage offline_projects list
      const existingProjectsRaw = localStorage.getItem('offline_projects');
      if (existingProjectsRaw) {
        let existing: Project[] = JSON.parse(existingProjectsRaw);
        existing = existing.map(p => {
          if (p.id === project.id) {
            return {
              ...p,
              name: editName.trim(),
              description: editDesc.trim(),
            };
          }
          return p;
        });
        localStorage.setItem('offline_projects', JSON.stringify(existing));
      }

      // Update project ref in memory
      project.name = editName.trim();
      project.description = editDesc.trim();

      onRefresh();
      alert('Proje bilgileri yerel olarak güncellendi!');
    } finally {
      setSaveLoading(false);
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
                  {isAdmin && (
                    <>
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
                      <button
                        onClick={() => setActiveTab('activity')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                          activeTab === 'activity'
                            ? 'bg-white text-zinc-900 border border-white/60 shadow-sm'
                            : 'text-zinc-700 hover:bg-white/45'
                        }`}
                      >
                        <Activity className="w-4 h-4 text-zinc-600 stroke-[1.8]" />
                        <span>Kullanıcı Aktiviteleri</span>
                      </button>
                    </>
                  )}
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
            <span>{isAdmin ? 'Eduji Admin Panel' : 'Eduji Proje Paneli'}</span>
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
                  {isAdmin ? 'Yönetim / Çalışan Listesi' : 'Proje Yetki Listesi'}
                </div>
                <h2 className="text-2xl font-bold text-zinc-900 mt-1 mb-1.5">
                  {isAdmin ? 'Çalışan Yetkileri' : 'Proje Ekibi & Yetkiler'}
                </h2>
                <p className="text-xs text-zinc-500">
                  {isAdmin 
                    ? 'Proje seçerek o projenin çalışma alanına erişebilecek çalışanları ve yetki derecelerini yönetin.'
                    : 'Bu projede görevli tüm ekip üyelerini ve erişim yetkilerini görüntüleyin.'}
                </p>
              </div>

              {/* Project Selection Dropdown */}
              {isAdmin && (
                <div className="flex flex-col gap-1.5 bg-zinc-50 p-4 rounded-xl border border-zinc-200">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    Yönetilecek Projeyi Seçin
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="bg-white border border-zinc-200 text-zinc-800 rounded px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 max-w-sm transition cursor-pointer font-semibold"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Minimalist Inline Invite Form */}
              {isAdmin && (
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
              )}

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
                      {isAdmin && <div className="w-20 text-right">İşlem</div>}
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
                              {isAdmin ? (
                                <select
                                  value={perm.permission}
                                  onChange={(e) => handleUpdatePermission(perm.userId, e.target.value as ProjectPermissionLevel)}
                                  className="bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-800 rounded px-2.5 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition cursor-pointer font-medium"
                                >
                                  <option value="READ">Sadece Oku</option>
                                  <option value="WRITE">Düzenleyebilir</option>
                                </select>
                              ) : (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                                  perm.permission === 'WRITE' 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                    : 'bg-zinc-50 text-zinc-600 border border-zinc-200'
                                }`}>
                                  {perm.permission === 'WRITE' ? 'Düzenleyebilir' : 'Sadece Oku'}
                                </span>
                              )}
                            </div>

                            {/* Actions */}
                            {isAdmin && (
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
                            )}
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
                  Bu projenin temel bilgilerini ve meta verilerini düzenleyin.
                </p>
              </div>

              <form onSubmit={handleUpdateProject} className="space-y-4 max-w-xl">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                    Proje Adı
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-white border border-zinc-200 text-zinc-800 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                      Proje Kodu (Değiştirilemez)
                    </label>
                    <input
                      type="text"
                      value={project.code}
                      readOnly
                      disabled
                      className="w-full bg-zinc-50 border border-zinc-200 text-zinc-500 rounded px-3 py-2 text-xs font-mono font-semibold focus:outline-none cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                      Oluşturulma Tarihi
                    </label>
                    <input
                      type="text"
                      value={project.createdAt ? new Date(project.createdAt).toLocaleDateString('tr-TR') : new Date().toLocaleDateString('tr-TR')}
                      readOnly
                      disabled
                      className="w-full bg-zinc-50 border border-zinc-200 text-zinc-500 rounded px-3 py-2 text-xs focus:outline-none cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                    Proje Açıklaması
                  </label>
                  <textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    rows={4}
                    placeholder="Proje amacı ve kapsamını yazın..."
                    className="w-full bg-white border border-zinc-200 text-zinc-800 rounded px-3 py-2 text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 resize-none"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={saveLoading || !editName.trim()}
                    className="bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white font-semibold text-xs px-4 py-2 rounded transition shadow-sm flex items-center justify-center gap-1"
                  >
                    {saveLoading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                  </button>
                </div>
              </form>
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

          {/* TAB 4: ACTIVITY MONITORING */}
          {activeTab === 'activity' && (
            <div className="space-y-6 flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Sistem İzleme / Güvenlik
                  </div>
                  <h2 className="text-2xl font-bold text-zinc-900 mt-1 mb-1.5 flex items-center gap-2">
                    <Activity className="w-6 h-6 text-indigo-500" /> Kullanıcı Aktiviteleri
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Çalışanların portalda kalma sürelerini, anlık çevrimiçi durumlarını ve giriş-çıkış zamanlarını izleyin.
                  </p>
                </div>

                <button
                  onClick={fetchActivity}
                  disabled={activityLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-50 text-zinc-700 text-xs font-bold rounded-lg border border-zinc-200 transition shadow-sm cursor-pointer"
                  title="Yenile"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${activityLoading ? 'animate-spin' : ''}`} />
                  Yenile
                </button>
              </div>

              <div className="border border-zinc-200 rounded-xl overflow-hidden flex-1 overflow-y-auto bg-white flex flex-col min-h-[300px]">
                <div className="min-w-full divide-y divide-zinc-200 flex flex-col flex-1">
                  {/* Table Header */}
                  <div className="bg-zinc-50 flex items-center justify-between px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    <div className="w-[30%]">Çalışan</div>
                    <div className="w-[10%]">Rol</div>
                    <div className="w-[15%]">Aktiflik</div>
                    <div className="w-[15%] flex items-center gap-1"><Calendar className="w-3 h-3 text-zinc-400" /> Son Giriş</div>
                    <div className="w-[15%] flex items-center gap-1"><Calendar className="w-3 h-3 text-zinc-400" /> Son Çıkış</div>
                    <div className="w-[15%] flex items-center gap-1 text-right justify-end"><Clock className="w-3 h-3 text-zinc-400" /> Toplam Süre</div>
                  </div>

                  {/* Table Body */}
                  <div className="divide-y divide-zinc-100 bg-white flex-1 overflow-y-auto">
                    {activityLoading ? (
                      <div className="flex flex-col items-center justify-center py-12 text-zinc-500 text-xs gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-zinc-400" />
                        <span>Aktivite bilgileri yükleniyor...</span>
                      </div>
                    ) : activityUsers.length > 0 ? (
                      activityUsers.map((user) => (
                        <div key={user.id} className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50/50 transition text-xs">
                          {/* Employee Info */}
                          <div className="w-[30%] flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#caf5f7] flex items-center justify-center font-bold text-zinc-900 border border-zinc-200">
                              {user.fullName.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-zinc-900 truncate">{user.fullName}</div>
                              <div className="text-[10px] text-zinc-500 truncate">{user.email}</div>
                            </div>
                          </div>

                          {/* Role */}
                          <div className="w-[10%]">
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase ${
                              user.role === 'ADMIN' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600'
                            }`}>
                              {user.role}
                            </span>
                          </div>

                          {/* Status */}
                          <div className="w-[15%] flex items-center gap-1.5">
                            {user.isOnline ? (
                              <>
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <span className="text-emerald-600 font-bold text-[11px]">Çevrimiçi</span>
                              </>
                            ) : (
                              <>
                                <span className="h-2 w-2 rounded-full bg-zinc-300"></span>
                                <span className="text-zinc-400 font-semibold text-[11px]">Çevrimdışı</span>
                              </>
                            )}
                          </div>

                          {/* Last Login */}
                          <div className="w-[15%] text-zinc-600 font-semibold">
                            {formatDate(user.lastLoginAt)}
                          </div>

                          {/* Last Logout */}
                          <div className="w-[15%] text-zinc-600 font-semibold">
                            {user.isOnline ? (
                              <span className="text-emerald-600 font-bold italic text-[10px]">Mevcut Oturum</span>
                            ) : (
                              formatDate(user.lastLogoutAt)
                            )}
                          </div>

                          {/* Total Time spent */}
                          <div className="w-[15%] text-right font-mono font-extrabold text-zinc-800 text-[11px]">
                            {formatPresenceTime(user.totalPresenceTime)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-12 text-center text-zinc-500 text-xs">
                        Kayıtlı kullanıcı aktivite bilgisi bulunmamaktadır.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
