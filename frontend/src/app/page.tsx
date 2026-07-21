'use client';

import React, { useState, useEffect, useRef } from 'react';
import { User, Project, Channel, Message } from '@/types';
import { apiFetch } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { AdminAclModal } from '@/components/AdminAclModal';
import { CreateProjectModal } from '@/components/CreateProjectModal';
import { GeminiRoadmapModal } from '@/components/GeminiRoadmapModal';
import { KanbanBoard } from '@/components/KanbanBoard';
import { FileExplorer } from '@/components/FileExplorer';
import { ProjectAnalytics } from '@/components/ProjectAnalytics';
import { GanttView } from '@/components/GanttView';
import { NotificationCenter } from '@/components/NotificationCenter';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import {
  Hash,
  MessageSquare,
  Plus,
  Send,
  ShieldCheck,
  Paperclip,
  LogOut,
  FolderKanban,
  Building2,
  Sparkles,
  Bot,
  Kanban,
  HardDrive,
  BarChart3,
  Calendar,
  Globe,
  Palette,
  Terminal,
} from 'lucide-react';

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Auth State
  const [email, setEmail] = useState('admin@company.com');
  const [password, setPassword] = useState('admin123');
  const [fullName, setFullName] = useState('Ahmet Yılmaz');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // App Data
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');

  // Active Tab State: 'chat' | 'kanban' | 'files' | 'analytics' | 'gantt'
  const [activeTab, setActiveTab] = useState<'chat' | 'kanban' | 'files' | 'analytics' | 'gantt'>('chat');

  // Active channel ref for Socket listener closure fix
  const activeChannelRef = useRef<Channel | null>(null);
  activeChannelRef.current = activeChannel;

  // Modals
  const [showAdminAclModal, setShowAdminAclModal] = useState(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [showGeminiModal, setShowGeminiModal] = useState(false);

  // Language & Theme State
  const [lang, setLang] = useState<'TR' | 'EN'>('TR');

  // Socket
  const { socket, isConnected, joinChannel, leaveChannel } = useSocket(token);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    if (token) {
      loadProjects();
    }
  }, [token]);

  useEffect(() => {
    if (activeChannel) {
      loadChannelMessages(activeChannel.id);
      joinChannel(activeChannel.id);
    }
    return () => {
      if (activeChannel) {
        leaveChannel(activeChannel.id);
      }
    };
  }, [activeChannel?.id]);

  // Socket.io Canlı Mesaj Dinleyicisi
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg: Message) => {
      if (msg.channelId === activeChannelRef.current?.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    };

    socket.on('newMessage', handleNewMessage);
    return () => {
      socket.off('newMessage', handleNewMessage);
    };
  }, [socket]);

  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const loadProjects = async () => {
    try {
      const data = await apiFetch<Project[]>('/projects');
      setProjects(data);
      if (data.length > 0 && !activeProject) {
        setActiveProject(data[0]);
        if (data[0].channels && data[0].channels.length > 0) {
          setActiveChannel(data[0].channels[0]);
        }
      }
    } catch (err: any) {
      console.error('Proje yükleme hatası:', err);
    }
  };

  const loadChannelMessages = async (channelId: string) => {
    try {
      const data = await apiFetch<Message[]>(`/messages/channel/${channelId}`);
      setMessages(data);
    } catch (err: any) {
      console.error('Mesaj çekme hatası:', err);
    }
  };

  const handleLoginOrRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    try {
      const endpoint = isRegisterMode ? '/auth/register' : '/auth/login';
      const body = isRegisterMode
        ? { email, password, fullName }
        : { email, password };

      const res = await apiFetch<{ user: User; accessToken: string }>(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      setToken(res.accessToken);
      setCurrentUser(res.user);
      localStorage.setItem('token', res.accessToken);
      localStorage.setItem('user', JSON.stringify(res.user));
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeChannel) return;

    const content = messageInput;
    const currentChanId = activeChannel.id;
    setMessageInput('');

    try {
      const newMsg = await apiFetch<Message>('/messages', {
        method: 'POST',
        body: JSON.stringify({
          channelId: currentChanId,
          content,
        }),
      });

      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });

      // Gemini AI mesajının ekranda gösterilmesi için otomatik tazeleme
      setTimeout(() => {
        loadChannelMessages(currentChanId);
      }, 1200);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSlashCommand = (cmd: string) => {
    switch (cmd) {
      case '/ozet':
        setMessageInput('🤖 Gemini AI, lütfen bu kanaldaki son mesajlaşmaların özetini çıkarır mısın?');
        break;
      case '/anket':
        setMessageInput('📊 **ANKET:** Yeni projede hangi veritabanı mimarisini tercih edersiniz? (A: PostgreSQL / B: SQLite)');
        break;
      case '/standup':
        setMessageInput('📌 **GÜNLÜK STANDUP RAPORU:**\n- Dün Ne Yaptım: Socket.io entegrasyonu\n- Bugün Ne Yapacağım: Kanban görev panosu\n- Engeller: Yok');
        break;
      case '/kod':
        setMessageInput('💻 Gemini AI, bana TypeScript ile örnek bir REST servis bileşeni yazar mısın?');
        break;
    }
  };

  // --- UNAUTHENTICATED LOGIN / REGISTER SCREEN ---
  if (!token || !currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 bg-indigo-600/20 text-indigo-400 rounded-2xl flex items-center justify-center border border-indigo-500/30">
              <Building2 className="w-8 h-8" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center text-white mb-1">
            Enterprise Workspace
          </h1>
          <p className="text-xs text-center text-slate-400 mb-6">
            Dahili Proje Yönetimi & Anlık Mesajlaşma Platformu
          </p>

          {authError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg">
              {authError}
            </div>
          )}

          <form onSubmit={handleLoginOrRegister} className="space-y-4">
            {isRegisterMode && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Ad Soyad
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                E-posta Adresi
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Şifre
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-lg transition shadow-lg shadow-indigo-600/20"
            >
              {isRegisterMode ? 'Kayıt Ol' : 'Giriş Yap'}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            {isRegisterMode ? 'Zaten hesabınız var mı?' : 'Hesabınız yok mu?'}{' '}
            <button
              onClick={() => setIsRegisterMode(!isRegisterMode)}
              className="text-indigo-400 font-semibold underline hover:text-indigo-300"
            >
              {isRegisterMode ? 'Giriş Yap' : 'Kayıt Ol'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN WORKSPACE UI ---
  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* 1. LEFT SIDEBAR: PROJECTS & CHANNELS */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0">
        {/* Workspace Title & User Badge */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-white text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-400" /> Şirket Platformu
            </h2>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="text-[11px] text-slate-400 font-medium truncate max-w-[130px]">
                {currentUser.fullName} ({currentUser.role})
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
            title="Çıkış Yap"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Project Selector & Actions */}
        <div className="p-3 border-b border-slate-800/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <FolderKanban className="w-3.5 h-3.5" /> Projeleriniz
            </span>
            {currentUser.role === 'ADMIN' && (
              <button
                onClick={() => setShowCreateProjectModal(true)}
                className="p-1 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded transition"
                title="Yeni Proje Ekle"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="space-y-1">
            {projects.map((proj) => {
              const isSelected = activeProject?.id === proj.id;
              return (
                <button
                  key={proj.id}
                  onClick={() => {
                    setActiveProject(proj);
                    if (proj.channels && proj.channels.length > 0) {
                      setActiveChannel(proj.channels[0]);
                    }
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="truncate">{proj.name}</span>
                  <span className="text-[10px] font-mono opacity-70 px-1.5 py-0.5 bg-black/20 rounded">
                    {proj.code}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation Tabs Bar for Project */}
        <div className="p-3 border-b border-slate-800/60 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5 px-1">
            Modüller
          </span>

          <button
            onClick={() => setActiveTab('chat')}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2.5 transition ${
              activeTab === 'chat'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-indigo-400" /> Mesajlaşma Kanalları
          </button>

          <button
            onClick={() => setActiveTab('kanban')}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2.5 transition ${
              activeTab === 'kanban'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Kanban className="w-4 h-4 text-indigo-400" /> Kanban Görev Panosu
          </button>

          <button
            onClick={() => setActiveTab('gantt')}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2.5 transition ${
              activeTab === 'gantt'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4 text-indigo-400" /> Gantt Zaman Çizelgesi
          </button>

          <button
            onClick={() => setActiveTab('files')}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2.5 transition ${
              activeTab === 'files'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <HardDrive className="w-4 h-4 text-indigo-400" /> Dosya Deposu & AI
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2.5 transition ${
              activeTab === 'analytics'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-indigo-400" /> Proje Analitiği
          </button>
        </div>

        {/* Channels List under Active Project (Only shown when on Chat tab) */}
        {activeTab === 'chat' && (
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {activeProject && (
              <div>
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Kanallar
                  </span>
                  {currentUser.role === 'ADMIN' && (
                    <button
                      onClick={() => setShowAdminAclModal(true)}
                      className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      <ShieldCheck className="w-3 h-3" /> Çalışan Ata
                    </button>
                  )}
                </div>

                <div className="space-y-0.5">
                  {activeProject.channels?.map((chan) => {
                    const isChanSelected = activeChannel?.id === chan.id;
                    return (
                      <button
                        key={chan.id}
                        onClick={() => setActiveChannel(chan)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition ${
                          isChanSelected
                            ? 'bg-slate-800 text-indigo-300 font-bold border border-slate-700'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                        }`}
                      >
                        <Hash className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                        <span className="truncate">{chan.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </aside>

      {/* 2. MAIN VIEW: SWITCHED BASED ON TAB */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-950">
        {/* Top Header */}
        <header className="h-14 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-900/60 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800 rounded-lg text-indigo-400 border border-slate-700">
              {activeTab === 'chat' && <Hash className="w-5 h-5" />}
              {activeTab === 'kanban' && <Kanban className="w-5 h-5" />}
              {activeTab === 'gantt' && <Calendar className="w-5 h-5" />}
              {activeTab === 'files' && <HardDrive className="w-5 h-5" />}
              {activeTab === 'analytics' && <BarChart3 className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                {activeTab === 'chat' && (activeChannel ? `#${activeChannel.name}` : 'Kanal Seçilmedi')}
                {activeTab === 'kanban' && 'Kanban Görev Panosu'}
                {activeTab === 'gantt' && 'Gantt Zaman Çizelgesi'}
                {activeTab === 'files' && 'Dosya Deposu & AI Doküman İnceleme'}
                {activeTab === 'analytics' && 'Proje Analitiği ve Ekip Raporu'}
                {activeProject && (
                  <span className="text-xs font-normal text-slate-400">
                    in <strong className="text-slate-200">{activeProject.name}</strong>
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                {activeProject?.description || 'Dahili Proje Yönetimi & AI İletişim Platformu.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Center */}
            <NotificationCenter />

            {/* Language Switcher */}
            <button
              onClick={() => setLang(lang === 'TR' ? 'EN' : 'TR')}
              className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
              title="Dil Değiştir / Change Language"
            >
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              <span>{lang === 'TR' ? '🇹🇷 TR' : '🇬🇧 EN'}</span>
            </button>

            {/* ✨ Gemini AI Roadmap Modal Trigger */}
            {activeProject && (
              <button
                onClick={() => setShowGeminiModal(true)}
                className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-purple-500/20 transition flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4 animate-pulse" /> Gemini AI Yol Haritası
              </button>
            )}

            {/* Admin ACL Permission Button */}
            {currentUser.role === 'ADMIN' && activeProject && (
              <button
                onClick={() => setShowAdminAclModal(true)}
                className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs rounded-lg font-medium transition flex items-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4 text-indigo-400" /> Çalışan Yetkileri
              </button>
            )}
          </div>
        </header>

        {/* TAB 1: CHAT STREAM */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length > 0 ? (
                messages.map((msg) => {
                  const isAi = msg.sender?.email === 'gemini@company.com';
                  return (
                    <div key={msg.id} className="flex gap-3 group">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 border ${
                          isAi
                            ? 'bg-purple-600/20 text-purple-300 border-purple-500/40 shadow-lg shadow-purple-500/20'
                            : 'bg-slate-800 text-indigo-300 border-slate-700'
                        }`}
                      >
                        {isAi ? <Bot className="w-5 h-5 text-purple-400" /> : (msg.sender?.fullName?.charAt(0) || 'U')}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className={`font-bold text-xs ${isAi ? 'text-purple-300' : 'text-slate-200'}`}>
                            {msg.sender?.fullName}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <div
                          className={`border rounded-xl p-3 text-sm inline-block max-w-2xl leading-relaxed shadow-sm whitespace-pre-line ${
                            isAi
                              ? 'bg-purple-950/40 border-purple-800/50 text-purple-100'
                              : 'bg-slate-900 border-slate-800 text-slate-300'
                          }`}
                        >
                          {msg.content}
                        </div>

                        {/* Emoji Reactions Bar */}
                        <div className="flex items-center gap-1.5 mt-1.5 opacity-70 group-hover:opacity-100 transition">
                          {['👍', '🚀', '❤️', '💡', '🔥'].map((emoji) => (
                            <button
                              key={emoji}
                              className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-full text-xs transition"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
                  <MessageSquare className="w-12 h-12 stroke-[1.5]" />
                  <p className="text-sm">Henüz bu kanalda mesaj yok. İlk mesajı siz yazın!</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Slash Commands Quick Toolbar */}
            <div className="px-4 py-1.5 bg-slate-900/80 border-t border-slate-800 flex items-center gap-2 overflow-x-auto text-[11px] text-slate-400">
              <span className="font-semibold text-slate-300 flex items-center gap-1">
                <Terminal className="w-3.5 h-3.5 text-indigo-400" /> Slash Komutlar:
              </span>
              <button
                onClick={() => handleSlashCommand('/ozet')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg border border-slate-700 transition"
              >
                /ozet (Kanalı Özetle)
              </button>
              <button
                onClick={() => handleSlashCommand('/anket')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg border border-slate-700 transition"
              >
                /anket (Anket Başlat)
              </button>
              <button
                onClick={() => handleSlashCommand('/standup')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded-lg border border-slate-700 transition"
              >
                /standup (Günlük Rapor)
              </button>
              <button
                onClick={() => handleSlashCommand('/kod')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-lg border border-slate-700 transition"
              >
                /kod (Kod İste)
              </button>
            </div>

            {/* Message Input Bar */}
            <footer className="p-4 border-t border-slate-800 bg-slate-900/40">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                {/* Voice Recorder Button */}
                <VoiceRecorder
                  onSendVoiceNote={(transcript) => setMessageInput(transcript)}
                />

                <div className="relative flex-1">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder={`#${activeChannel?.name || 'kanalina'} mesaj gönder... (/ozet, /anket veya sesli mesaj kullanın)`}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-4 pr-12 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition shadow-inner"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-200 transition"
                    title="Dosya Ekle"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={!messageInput.trim()}
                  className="p-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl transition shadow-lg shadow-indigo-600/20"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </footer>
          </div>
        )}

        {/* TAB 2: KANBAN TASK BOARD */}
        {activeTab === 'kanban' && activeProject && (
          <KanbanBoard project={activeProject} />
        )}

        {/* TAB 3: GANTT TIMELINE */}
        {activeTab === 'gantt' && activeProject && (
          <GanttView project={activeProject} />
        )}

        {/* TAB 4: FILE EXPLORER & AI ANALYZER */}
        {activeTab === 'files' && activeProject && (
          <FileExplorer project={activeProject} />
        )}

        {/* TAB 5: PROJECT ANALYTICS DASHBOARD */}
        {activeTab === 'analytics' && activeProject && (
          <ProjectAnalytics project={activeProject} />
        )}
      </main>

      {/* MODALS */}
      {showAdminAclModal && activeProject && (
        <AdminAclModal
          project={activeProject}
          onClose={() => setShowAdminAclModal(false)}
          onRefresh={loadProjects}
        />
      )}

      {showCreateProjectModal && (
        <CreateProjectModal
          onClose={() => setShowCreateProjectModal(false)}
          onSuccess={loadProjects}
        />
      )}

      {showGeminiModal && activeProject && (
        <GeminiRoadmapModal
          project={activeProject}
          onClose={() => setShowGeminiModal(false)}
        />
      )}
    </div>
  );
}
