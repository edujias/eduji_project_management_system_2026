'use client';

import React, { useState } from 'react';
import { Bell, Check, FolderKanban, MessageSquare } from 'lucide-react';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  type: 'MESSAGE_GROUP' | 'MESSAGE_DM' | 'TASK_CREATED';
  entityType?: 'channel' | 'project' | null;
  entityId?: string | null;
}

interface NotificationCenterProps {
  notifications: NotificationItem[];
  onMarkAllRead: () => void;
  onItemClick: (item: NotificationItem) => void;
}

function timeAgo(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'az önce';
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.floor(hours / 24);
  return `${days} gün önce`;
}

export function NotificationCenter({ notifications, onMarkAllRead, onItemClick }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'TASK_CREATED':
        return <FolderKanban className="w-4 h-4 text-amber-400" />;
      case 'MESSAGE_DM':
      case 'MESSAGE_GROUP':
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
                onClick={onMarkAllRead}
                className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Tümünü Okundu İşaretle
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
            {notifications.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-500">Henüz bildirim yok.</div>
            )}
            {notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onItemClick(item);
                  setIsOpen(false);
                }}
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
                    <span className="text-[10px] text-slate-500">{timeAgo(item.createdAt)}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug truncate">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
