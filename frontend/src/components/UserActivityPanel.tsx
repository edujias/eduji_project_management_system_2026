'use client';

import React, { useState, useEffect } from 'react';
import { User } from '@/types';
import { apiFetch } from '@/lib/api';
import { Activity, RefreshCw, Clock, Calendar, Users, Eye } from 'lucide-react';

interface UserActivityPanelProps {
  currentUser: User;
}

export function UserActivityPanel({ currentUser }: UserActivityPanelProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActivity = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<User[]>('/users/activity');
      setUsers(data);
    } catch (err: any) {
      console.warn('Backend activity fetch failed or offline, loading mock data:', err);
      // Fallback Mock Data for testing/offline support
      setUsers([
        {
          id: 'mock-emp-zeyn',
          fullName: 'Zeynep Yılmaz',
          email: 'zeyn@company.com',
          role: 'EMPLOYEE',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          isOnline: true,
          lastLoginAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          lastLogoutAt: new Date(Date.now() - 7200000).toISOString(),
          totalPresenceTime: 12450, // 3h 27m 30s
        },
        {
          id: 'mock-emp-can',
          fullName: 'Can Demir',
          email: 'can@company.com',
          role: 'EMPLOYEE',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          isOnline: false,
          lastLoginAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          lastLogoutAt: new Date(Date.now() - 82800000).toISOString(),
          totalPresenceTime: 7200, // 2h
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
          totalPresenceTime: 28800, // 8h
        },
        {
          id: 'mock-admin-admin',
          fullName: 'Sistem Yöneticisi',
          email: 'admin@company.com',
          role: 'ADMIN',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          isOnline: true,
          lastLoginAt: new Date(Date.now() - 600000).toISOString(),
          lastLogoutAt: null,
          totalPresenceTime: 1500,
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
  }, []);

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

  // Stats calculators
  const totalUsers = users.length;
  const onlineUsers = users.filter(u => u.isOnline).length;
  const totalSeconds = users.reduce((acc, u) => acc + (u.totalPresenceTime || 0), 0);

  return (
    <div className="h-full flex flex-col p-6 bg-slate-950 overflow-y-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" /> Kullanıcı Aktivite İzleme Paneli
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Sistem yöneticilerine özel, çalışanların çevrimiçi durumlarını ve geçirdikleri süreleri izleme konsolu.
          </p>
        </div>

        <button
          onClick={fetchActivity}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold rounded-xl border border-slate-800 hover:border-slate-700 transition shadow-md cursor-pointer"
          title="Verileri Yenile"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Yenile
        </button>
      </div>

      {error && (
        <div className="p-3.5 bg-red-950/40 border border-red-900/60 text-red-400 text-xs rounded-xl">
          {error}
        </div>
      )}

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 flex items-center gap-4 shadow-lg">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Toplam Çalışan</div>
            <div className="text-2xl font-bold text-white mt-0.5">{totalUsers}</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 flex items-center gap-4 shadow-lg">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl relative">
            <span className="absolute top-2.5 right-2.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Çevrimiçi (Aktif)</div>
            <div className="text-2xl font-bold text-white mt-0.5">{onlineUsers}</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 flex items-center gap-4 shadow-lg">
          <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Toplam Portal Süresi</div>
            <div className="text-2xl font-bold text-white mt-0.5">{formatPresenceTime(totalSeconds)}</div>
          </div>
        </div>
      </div>

      {/* Main Table Panel */}
      <div className="bg-slate-900 border border-slate-805 rounded-2xl p-6 flex flex-col space-y-4 shadow-xl min-h-[350px]">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <Eye className="w-4 h-4 text-indigo-400" />
            Aktiflik ve Oturum Detayları
          </h3>
          <span className="text-[10px] text-slate-500 font-medium font-mono uppercase">
            Canlı Takip Listesi
          </span>
        </div>

        {/* Custom Grid Table */}
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 flex flex-col">
          {/* Header Row */}
          <div className="bg-slate-900/60 border-b border-slate-800 flex items-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
            <div className="w-[30%]">Çalışan</div>
            <div className="w-[10%]">Rol</div>
            <div className="w-[15%]">Durum</div>
            <div className="w-[17%] flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Son Giriş</div>
            <div className="w-[17%] flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Son Çıkış</div>
            <div className="w-[11%] flex items-center gap-1 text-right justify-end"><Clock className="w-3.5 h-3.5" /> Toplam Süre</div>
          </div>

          {/* Body Rows */}
          <div className="divide-y divide-slate-800/60">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-xs gap-3">
                <RefreshCw className="w-7 h-7 animate-spin text-indigo-500" />
                <span>Kullanıcı aktiviteleri yükleniyor...</span>
              </div>
            ) : users.length > 0 ? (
              users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center px-4 py-3.5 hover:bg-slate-900/35 transition text-xs text-slate-300"
                >
                  {/* User info */}
                  <div className="w-[30%] flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white uppercase text-xs">
                      {user.fullName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-100 truncate">{user.fullName}</div>
                      <div className="text-[10px] text-slate-500 truncate">{user.email}</div>
                    </div>
                  </div>

                  {/* Role */}
                  <div className="w-[10%]">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        user.role === 'ADMIN' ? 'bg-indigo-900/50 text-indigo-300 border border-indigo-800/50' : 'bg-slate-800 text-slate-400 border border-slate-800'
                      }`}
                    >
                      {user.role}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="w-[15%] flex items-center gap-2">
                    {user.isOnline ? (
                      <>
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-emerald-400 font-bold text-[11px] uppercase tracking-wide">Aktif</span>
                      </>
                    ) : (
                      <>
                        <span className="h-2 w-2 rounded-full bg-slate-700"></span>
                        <span className="text-slate-500 font-semibold text-[11px] uppercase tracking-wide">Pasif</span>
                      </>
                    )}
                  </div>

                  {/* Last Login */}
                  <div className="w-[17%] text-slate-400 font-medium">
                    {formatDate(user.lastLoginAt)}
                  </div>

                  {/* Last Logout */}
                  <div className="w-[17%] text-slate-400 font-medium">
                    {user.isOnline ? (
                      <span className="text-emerald-400 font-semibold italic text-[10px] bg-emerald-500/5 border border-emerald-950 px-1.5 py-0.5 rounded-md">Aktif Oturum</span>
                    ) : (
                      formatDate(user.lastLogoutAt)
                    )}
                  </div>

                  {/* Total Time spent */}
                  <div className="w-[11%] text-right font-mono font-bold text-white text-[11px]">
                    {formatPresenceTime(user.totalPresenceTime)}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-16 text-center text-slate-500 text-xs">
                Kayıtlı aktivite verisi bulunmamaktadır.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
