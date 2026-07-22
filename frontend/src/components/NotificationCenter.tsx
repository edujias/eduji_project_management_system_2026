'use client';

import React, { useState } from 'react';
import { Bell, Check, Sparkles, FolderKanban, ShieldCheck, MessageSquare } from 'lucide-react';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'ai' | 'task' | 'acl' | 'message';
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: '1',
      title: '🤖 Gemini AI Yanıtı',
      message: 'Gemini AI Asistanı #genel kanalında mesajınıza yanıt verdi.',
      time: '2 dk önce',
      read: false,
      type: 'ai',
    },
    {
      id: '2',
      title: '📋 Yeni Kanban Görevi',
      message: '"Socket.io Canlı Odaları" görevi panoya eklendi.',
      time: '15 dk önce',
      read: false,
      type: 'task',
    },
    {
      id: '3',
      title: '🛡️ Yetki Güncellemesi',
      message: 'PRJ-DIGITAL projesinde WRITE yetkisi atandı.',
      time: '1 saat önce',
      read: true,
      type: 'acl',
    },
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'ai':
        return <Sparkles className="w-4 h-4 text-purple-400" />;
      case 'task':
        return <FolderKanban className="w-4 h-4 text-amber-400" />;
      case 'acl':
        return <ShieldCheck className="w-4 h-4 text-indigo-400" />;
      default:
        return <MessageSquare className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition border border-transparent hover:border-slate-700"
        title="Bildirimler"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-400" />
              <span className="font-bold text-sm text-white">Bildirim Merkezi</span>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Tümünü Okundu İşaretle
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
            {notifications.map((item) => (
              <div
                key={item.id}
                onClick={() =>
                  setNotifications((prev) =>
                    prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
                  )
                }
                className={`p-3.5 flex items-start gap-3 transition cursor-pointer ${
                  item.read ? 'bg-slate-900/40 opacity-70' : 'bg-slate-800/40 hover:bg-slate-800'
                }`}
              >
                <div className="p-2 bg-slate-950 rounded-xl border border-slate-800 flex-shrink-0 mt-0.5">
                  {getIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h4 className="font-bold text-xs text-slate-100 truncate">{item.title}</h4>
                    <span className="text-[10px] text-slate-500">{item.time}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">{item.message}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-2 bg-slate-950 border-t border-slate-800 text-center">
            <span className="text-[10px] text-slate-500">Gemini AI Canlı Bildirim Sistemi</span>
          </div>
        </div>
      )}
    </div>
  );
}
