'use client';

import React, { useState, useEffect, useRef } from 'react';
import { User, Project, Channel, Message, FileAsset } from '@/types';
import { apiFetch } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { AdminAclModal } from '@/components/AdminAclModal';
import { CreateProjectModal } from '@/components/CreateProjectModal';
import { CreateChannelModal } from '@/components/CreateChannelModal';
import { GeminiRoadmapModal } from '@/components/GeminiRoadmapModal';
import { KanbanBoard } from '@/components/KanbanBoard';
import { FileExplorer } from '@/components/FileExplorer';
import { GanttView } from '@/components/GanttView';
import { NotificationCenter } from '@/components/NotificationCenter';
import { PersonalNotes } from '@/components/PersonalNotes';
import { UserActivityPanel } from '@/components/UserActivityPanel';
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
  FileText,
  Settings,
  Activity,
  User as UserIcon,
  Trash2,
} from 'lucide-react';

const simpleHash = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(16);
};

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'admin'>('login');
  const [devOfflineUsers, setDevOfflineUsers] = useState<{email: string, fullName: string, role: string}[]>([]);

  // App Data
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');

  // Typing Indicator States & Refs
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const isSelfTypingRef = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Active Tab State: 'chat' | 'kanban' | 'files' | 'analytics' | 'gantt' | 'notes' | 'activity'
  const [activeTab, setActiveTab] = useState<'chat' | 'kanban' | 'files' | 'analytics' | 'gantt' | 'notes' | 'activity'>('chat');

  // Active channel ref for Socket listener closure fix
  const activeChannelRef = useRef<Channel | null>(null);
  activeChannelRef.current = activeChannel;

  // Modals
  const [showAdminAclModal, setShowAdminAclModal] = useState(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [showGeminiModal, setShowGeminiModal] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [kanbanRefreshKey, setKanbanRefreshKey] = useState(0);

  // Socket
  const { socket, isConnected, joinChannel, leaveChannel } = useSocket(token);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Populate default offline users list in localStorage if not already present or needs clean names
    const existing = localStorage.getItem('offline_users');
    let loadedUsers = [];
    if (!existing || existing.includes('ayse@company.com') || existing.includes('zeyn@company.com') || !existing.includes('mehmet@company.com')) {
      const defaultUsers = [
        {
          id: 'mock-admin-id',
          email: 'admin@company.com',
          fullName: 'Ahmet Yılmaz',
          role: 'ADMIN',
          passwordHash: simpleHash('admin123'),
          plainPassword: 'admin123',
        },
        {
          id: 'mock-emp-zeynep-id',
          email: 'zeynep@company.com',
          fullName: 'Zeynep Kaya',
          role: 'EMPLOYEE',
          passwordHash: simpleHash('admin123'),
          plainPassword: 'admin123',
        },
        {
          id: 'mock-emp-mehmet-id',
          email: 'mehmet@company.com',
          fullName: 'Mehmet Demir',
          role: 'EMPLOYEE',
          passwordHash: simpleHash('admin123'),
          plainPassword: 'admin123',
        }
      ];
      localStorage.setItem('offline_users', JSON.stringify(defaultUsers));
      loadedUsers = defaultUsers;
    } else {
      loadedUsers = JSON.parse(existing);
    }
    setDevOfflineUsers(loadedUsers);

    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken === 'mock-access-token') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setToken(null);
      setCurrentUser(null);
    } else if (savedToken && savedUser) {
      setToken(savedToken);
      let userObj = JSON.parse(savedUser);
      if (userObj.fullName && userObj.fullName.includes('Zeynep Yılmaz') && userObj.role === 'ADMIN') {
        userObj.role = 'EMPLOYEE';
        localStorage.setItem('user', JSON.stringify(userObj));
      }
      setCurrentUser(userObj);
    }
  }, []);

  useEffect(() => {
    if (token) {
      loadProjects();
      loadUsers();
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
  }, [activeChannel?.id, socket]);

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

  // Reset typing indicator when switching channels
  useEffect(() => {
    setTypingUsers({});
    isSelfTypingRef.current = false;
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [activeChannel?.id]);

  // Socket.io Canlı "Yazıyor..." Dinleyicisi
  useEffect(() => {
    if (!socket) return;

    const handleUserTyping = (data: { channelId: string; user: { id: string; fullName: string }; isTyping: boolean }) => {
      if (data.channelId === activeChannelRef.current?.id) {
        setTypingUsers((prev) => {
          const next = { ...prev };
          if (data.isTyping) {
            next[data.user.id] = data.user.fullName;
          } else {
            delete next[data.user.id];
          }
          return next;
        });
      }
    };

    socket.on('userTyping', handleUserTyping);
    return () => {
      socket.off('userTyping', handleUserTyping);
    };
  }, [socket, activeChannel?.id]);

  // Socket.io Canlı Sohbet Temizleme Dinleyicisi
  useEffect(() => {
    if (!socket) return;

    const handleChatCleared = (data: { channelId: string }) => {
      if (activeChannel && activeChannel.id === data.channelId) {
        setMessages([]);
      }
    };

    socket.on('chatCleared', handleChatCleared);
    return () => {
      socket.off('chatCleared', handleChatCleared);
    };
  }, [socket, activeChannel?.id]);

  // Socket.io Canlı Kullanıcı Durum Dinleyicisi (Yöneticinin pasife çekmesi durumunda otomatik çıkış yapar ve çevrim içi göstergelerini günceller)
  useEffect(() => {
    if (!socket || !currentUser) return;

    const handleUserStatusChanged = (updatedUser: any) => {
      if (updatedUser.id === currentUser.id) {
        if (updatedUser.status && updatedUser.status !== 'ACTIVE') {
          alert('Hesabınız yönetici tarafından pasif duruma getirildi. Sistemden çıkış yapılıyor.');
          handleLogout();
          return;
        } else {
          const newCurrentUser = { ...currentUser, ...updatedUser };
          setCurrentUser(newCurrentUser);
          localStorage.setItem('user', JSON.stringify(newCurrentUser));
        }
      }

      // Projeler listesindeki kullanıcının çevrimiçi durumunu güncelle
      setProjects((prevProjects) =>
        prevProjects.map((p) => {
          if (p.permissions) {
            return {
              ...p,
              permissions: p.permissions.map((perm) => {
                if (perm.user && perm.user.id === updatedUser.id) {
                  return {
                    ...perm,
                    user: {
                      ...perm.user,
                      isOnline: updatedUser.isOnline,
                    },
                  };
                }
                return perm;
              }),
            };
          }
          return p;
        })
      );

      // Aktif proje detaylarındaki kullanıcının çevrimiçi durumunu güncelle
      setActiveProject((prevActive) => {
        if (prevActive && prevActive.permissions) {
          return {
            ...prevActive,
            permissions: prevActive.permissions.map((perm) => {
              if (perm.user && perm.user.id === updatedUser.id) {
                return {
                  ...perm,
                  user: {
                    ...perm.user,
                    isOnline: updatedUser.isOnline,
                  },
                };
              }
              return perm;
            }),
          };
        }
        return prevActive;
      });
    };

    socket.on('userStatusChanged', handleUserStatusChanged);
    return () => {
      socket.off('userStatusChanged', handleUserStatusChanged);
    };
  }, [socket, currentUser]);

  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const loadProjects = async () => {
    // Correct the spelling/cut-off issue in localStorage dynamically if it exists
    try {
      const offlineProjectsRaw = localStorage.getItem('offline_projects');
      if (offlineProjectsRaw) {
        let offlineProjects: Project[] = JSON.parse(offlineProjectsRaw);
        let hasFixed = false;
        offlineProjects = offlineProjects.map(p => {
          if (p.description === 'proje iyileştirm') {
            hasFixed = true;
            return { ...p, description: 'proje iyileştirme' };
          }
          return p;
        });
        if (hasFixed) {
          localStorage.setItem('offline_projects', JSON.stringify(offlineProjects));
          if (activeProject && activeProject.description === 'proje iyileştirm') {
            setActiveProject(prev => prev ? { ...prev, description: 'proje iyileştirme' } : null);
          }
        }
      }
    } catch (e) {
      console.error('Offline verileri düzeltme hatası:', e);
    }

    try {
      const data = await apiFetch<Project[]>('/projects');
      
      // Load offline projects from localStorage
      const offlineProjectsRaw = localStorage.getItem('offline_projects');
      const offlineProjects: Project[] = offlineProjectsRaw ? JSON.parse(offlineProjectsRaw) : [];
      const mergedProjects = [...data, ...offlineProjects];

      setProjects(mergedProjects);
      if (mergedProjects.length > 0 && !activeProject) {
        setActiveProject(mergedProjects[0]);
        if (mergedProjects[0].channels && mergedProjects[0].channels.length > 0) {
          setActiveChannel(mergedProjects[0].channels[0]);
        }
      }
    } catch (err: any) {
      console.error('Proje yükleme hatası, offline moduna geçiliyor:', err);
      
      const offlineProjectsRaw = localStorage.getItem('offline_projects');
      const offlineProjects: Project[] = offlineProjectsRaw ? JSON.parse(offlineProjectsRaw) : [];

      // Fallback default project
      const defaultProj: Project = {
        id: 'mock-proj-id',
        name: 'Şirket İçi Proje',
        code: 'INT',
        description: 'Simülasyon Modu (Canlı bağlantı için lütfen Docker\'ı açın).',
        channels: [
          { id: '1', name: 'genel', projectId: 'mock-proj-id', type: 'PROJECT_PUBLIC', createdById: 'mock-admin-id', createdAt: '2026-07-22T12:00:00.000Z' },
          { id: '2', name: 'rastgele', projectId: 'mock-proj-id', type: 'PROJECT_PUBLIC', createdById: 'mock-admin-id', createdAt: '2026-07-22T12:00:00.000Z' },
          { id: '3', name: 'yazilim-ekibi', projectId: 'mock-proj-id', type: 'PROJECT_PUBLIC', createdById: 'mock-admin-id', createdAt: '2026-07-22T12:00:00.000Z' }
        ],
        permissions: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('offline_permissions_mock-proj-id') || '[]') : [],
        createdAt: '2026-07-22T12:00:00.000Z',
      };
      
      const allOffline = [defaultProj, ...offlineProjects];
      setProjects(allOffline);
      
      // If we don't have activeProject or it is not in the list, set to the newly created one (last in offline list)
      if (!activeProject || !allOffline.some(p => p.id === activeProject.id)) {
        const latestProj = allOffline[allOffline.length - 1];
        setActiveProject(latestProj);
        if (latestProj.channels && latestProj.channels.length > 0) {
          setActiveChannel(latestProj.channels[0]);
        }
      }
    }
  };

  const loadUsers = async () => {
    try {
      const data = await apiFetch<User[]>('/users');
      setUsers(data);
    } catch (err) {
      console.error('Kullanıcılar yüklenemedi, offline moduna geçiliyor:', err);
      const offlineUsersRaw = localStorage.getItem('offline_users');
      const offlineUsers = offlineUsersRaw ? JSON.parse(offlineUsersRaw) : [];
      setUsers(offlineUsers.map((u: any, i: number) => ({
        id: u.id || `mock-${i}`,
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        status: 'ACTIVE',
        isOnline: true,
        createdAt: new Date().toISOString(),
      })));
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

  const handleClearChat = async () => {
    if (!activeChannel) return;
    const confirmClear = window.confirm('Bu sohbet odasındaki tüm mesajları silmek istediğinize emin misiniz? Bu işlem geri alınamaz.');
    if (!confirmClear) return;

    try {
      await apiFetch(`/messages/channel/${activeChannel.id}`, {
        method: 'DELETE',
      });
      setMessages([]);
    } catch (err: any) {
      console.warn('Backend silme başarısız, lokal olarak temizleniyor:', err);
      setMessages([]);
    }
  };

  const handleAttachmentUpload = async (file: File | undefined, type: 'photo' | 'file') => {
    if (!file || !activeProject || !activeChannel) return;
    setShowAttachmentMenu(false);

    try {
      // 1. Get upload URL
      const { uploadUrl, s3Key } = await apiFetch<{ uploadUrl: string; s3Key: string }>('/storage/upload-url', {
        method: 'POST',
        body: JSON.stringify({
          fileName: file.name,
          projectId: activeProject.id,
        }),
      });

      // 2. PUT file content
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Dosya yüklenemedi.');
      }

      // 3. Register the file asset
      const newFile = await apiFetch<FileAsset>('/storage/register', {
        method: 'POST',
        body: JSON.stringify({
          projectId: activeProject.id,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || 'application/octet-stream',
          s3Key: s3Key,
        }),
      });

      // 4. Send the chat message containing this attachment
      const messageContent = type === 'photo' ? `🖼️ Fotoğraf: ${file.name}` : `📂 Dosya: ${file.name}`;
      await apiFetch<Message>('/messages', {
        method: 'POST',
        body: JSON.stringify({
          channelId: activeChannel.id,
          content: messageContent,
          attachmentIds: [newFile.id],
        }),
      });

      loadChannelMessages(activeChannel.id);
    } catch (err: any) {
      console.warn('Backend dosya gönderimi başarısız, çevrimdışı simülasyon moduna geçiliyor:', err);
      // Fallback local mock message
      const mockFileId = `offline-file-${Math.random()}`;
      const mockFile: FileAsset = {
        id: mockFileId,
        projectId: activeProject.id,
        uploadedById: currentUser?.id || 'mock-user-id',
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || (type === 'photo' ? 'image/png' : 'application/octet-stream'),
        s3Key: 'mock-s3-key',
        publicUrl: URL.createObjectURL(file),
        createdAt: new Date().toISOString(),
      };
      
      const mockMsg: Message = {
        id: Math.random().toString(),
        channelId: activeChannel.id,
        senderId: currentUser?.id || 'mock-user-id',
        content: type === 'photo' ? `🖼️ Fotoğraf: ${file.name}` : `📂 Dosya: ${file.name}`,
        createdAt: new Date().toISOString(),
        sender: currentUser || {
          id: 'mock-user-id',
          email: 'user@company.com',
          fullName: 'Ahmet Yılmaz (Offline)',
          role: 'ADMIN',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
        },
        attachments: [mockFile],
      };
      
      setMessages((prev) => [...prev, mockMsg]);
    }
  };

  const handleLoginOrRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const isRegister = authMode === 'register';

    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const body = isRegister
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
      if (err && !err.isNetworkError) {
        setAuthError(err.message || 'Giriş/Kayıt hatası oluştu.');
        return;
      }
      
      console.warn('Backend connection failed. Authenticating with mock user account:', err);
      
      const isPortalAdmin = authMode === 'admin';
      
      // Load offline users from localStorage
      const offlineUsersRaw = localStorage.getItem('offline_users');
      let offlineUsers = offlineUsersRaw ? JSON.parse(offlineUsersRaw) : [];
      
      if (isRegister) {
        // Registering a new employee offline
        const existingUser = offlineUsers.find((u: any) => u.email.toLowerCase() === email.trim().toLowerCase());
        if (existingUser) {
          setAuthError('Bu e-posta adresiyle kayıtlı kullanıcı zaten var.');
          return;
        }
        
        const newUser = {
          id: `offline-user-${Math.random()}`,
          email: email.trim(),
          fullName: fullName.trim() || 'Yeni Çalışan',
          role: 'EMPLOYEE',
          passwordHash: simpleHash(password),
          plainPassword: password,
        };
        
        offlineUsers.push(newUser);
        localStorage.setItem('offline_users', JSON.stringify(offlineUsers));
        setDevOfflineUsers(offlineUsers);
        
        const userSession: User = {
          id: newUser.id,
          email: newUser.email,
          fullName: newUser.fullName,
          role: 'EMPLOYEE',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
        };
        
        const mockToken = 'mock-access-token';
        setToken(mockToken);
        setCurrentUser(userSession);
        localStorage.setItem('token', mockToken);
        localStorage.setItem('user', JSON.stringify(userSession));
      } else {
        // Logging in offline
        const targetUser = offlineUsers.find((u: any) => u.email.toLowerCase() === email.trim().toLowerCase());
        if (!targetUser) {
          setAuthError('E-posta adresi veya şifre hatalı (Çevrimdışı mod).');
          return;
        }
        
        // Validate password hash
        if (targetUser.passwordHash !== simpleHash(password)) {
          setAuthError('E-posta adresi veya şifre hatalı (Şifre uyuşmuyor).');
          return;
        }

        // Validate user status
        if (targetUser.status && targetUser.status !== 'ACTIVE') {
          setAuthError('Şu an pasif durumdasınız, giriş yapamazsınız.');
          return;
        }
        
        // Validate role access
        if (isPortalAdmin && targetUser.role !== 'ADMIN') {
          setAuthError('Bu hesap ile Yönetici Girişi yapılamaz.');
          return;
        }
        if (!isPortalAdmin && targetUser.role === 'ADMIN') {
          setAuthError('Yöneticiler Çalışan Girişi kullanamaz, lütfen Yönetici Girişi sekmesini kullanın.');
          return;
        }
        
        const userSession: User = {
          id: targetUser.id,
          email: targetUser.email,
          fullName: targetUser.fullName,
          role: targetUser.role as any,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
        };
        
        const mockToken = 'mock-access-token';
        setToken(mockToken);
        setCurrentUser(userSession);
        localStorage.setItem('token', mockToken);
        localStorage.setItem('user', JSON.stringify(userSession));
      }
    }
  };

  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
    setEmail('');
    setPassword('');
    setFullName('');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const handleStartDm = async (targetUserId: string) => {
    try {
      const dmChannel = await apiFetch<Channel>('/channels/dm', {
        method: 'POST',
        body: JSON.stringify({ targetUserId }),
      });

      // Update the active channel
      setActiveChannel(dmChannel);
      setActiveTab('chat');
    } catch (err: any) {
      console.error('DM başlatılamadı:', err);
      alert('Doğrudan mesaj başlatılırken bir hata oluştu.');
    }
  };

  const handleInputChange = (val: string) => {
    setMessageInput(val);
    
    if (!socket || !activeChannel) return;

    if (!isSelfTypingRef.current) {
      isSelfTypingRef.current = true;
      socket.emit('typing', { channelId: activeChannel.id, isTyping: true });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isSelfTypingRef.current = false;
      socket.emit('typing', { channelId: activeChannel.id, isTyping: false });
    }, 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    const content = messageInput;
    setMessageInput('');

    if (socket && activeChannel) {
      isSelfTypingRef.current = false;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      socket.emit('typing', { channelId: activeChannel.id, isTyping: false });
    }

    // Offline / No Channel local fallback logic
    if (!activeChannel) {
      const mockMsg: Message = {
        id: Math.random().toString(),
        content,
        channelId: 'mock-channel-id',
        senderId: currentUser?.id || 'mock-user-id',
        createdAt: new Date().toISOString(),
        sender: currentUser || {
          id: 'mock-user-id',
          email: 'user@company.com',
          fullName: 'Ahmet Yılmaz (Offline)',
          role: 'ADMIN',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
        },
      };
      setMessages((prev) => [...prev, mockMsg]);

      // Trigger Gemini response for all messages in offline simulation mode
      setTimeout(() => {
        let aiResponse = `🤖 **Gemini AI Asistanı (Çevrimdışı Simülasyon):**\n\nMerhaba! "${content}" mesajınızı aldım. Şu anda veritabanı bağlantısı (Docker) olmadığı için çevrimdışı (offline) moddayım. 

Eğer benimle canlı konuşmak, kanal özetleri almak veya kod yazdırmak isterseniz, lütfen **Docker Desktop** uygulamasını başlatıp veritabanını çalıştırın. Böylece gerçek API bağlantısıyla sohbet edebiliriz!`;

        const normalizedContent = content.toLowerCase();
        if (normalizedContent.includes('selam') || normalizedContent.includes('merhaba') || normalizedContent.includes('sa')) {
          aiResponse = `🤖 **Gemini AI Asistanı (Çevrimdışı Simülasyon):**\n\nSelam! Size nasıl yardımcı olabilirim? (Şu an çevrimdışı simülasyon modundayım. Canlı Google Gemini API bağlantısı için lütfen Docker veritabanını başlatın.)`;
        } else if (normalizedContent.includes('/ozet')) {
          aiResponse = `🤖 **Gemini AI Asistanı (Çevrimdışı Simülasyon):**\n\nBu kanaldaki son konuşmaların özeti:\n- Ahmet Yılmaz veritabanı ve Docker entegrasyonu hakkında bilgi sordu.\n- Sistem veritabanı bağlantısı hatası bildirdi.`;
        } else if (normalizedContent.includes('/kod')) {
          aiResponse = `🤖 **Gemini AI Asistanı (Çevrimdışı Simülasyon):**\n\nİşte TypeScript ile örnek bir REST servis bileşeni:\n\`\`\`typescript\nconst getStatus = () => { return "Active"; };\n\`\`\``;
        }

        const aiMsg: Message = {
          id: Math.random().toString(),
          content: aiResponse,
          channelId: 'mock-channel-id',
          senderId: 'gemini-user-id',
          createdAt: new Date().toISOString(),
          sender: {
            id: 'gemini-user-id',
            email: 'gemini@company.com',
            fullName: 'Gemini AI',
            role: 'EMPLOYEE',
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
          },
        };
        setMessages((prev) => [...prev, aiMsg]);
      }, 1000);
      return;
    }

    const currentChanId = activeChannel.id;

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
      console.warn('Backend call failed, sending message locally:', err);
      const mockMsg: Message = {
        id: Math.random().toString(),
        content,
        channelId: currentChanId,
        senderId: currentUser?.id || 'mock-user-id',
        createdAt: new Date().toISOString(),
        sender: currentUser || {
          id: 'mock-user-id',
          email: 'user@company.com',
          fullName: 'Ahmet Yılmaz (Offline)',
          role: 'ADMIN',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
        },
      };
      setMessages((prev) => [...prev, mockMsg]);

      // Trigger Gemini response for all messages in offline mode even if channel exists
      setTimeout(() => {
        let aiResponse = `🤖 **Gemini AI Asistanı (Çevrimdışı Simülasyon):**\n\nMerhaba! "${content}" mesajınızı aldım. Şu anda veritabanı bağlantısı (Docker) olmadığı için çevrimdışı (offline) moddayım. 

Eğer benimle canlı konuşmak, kanal özetleri almak veya kod yazdırmak isterseniz, lütfen **Docker Desktop** uygulamasını başlatıp veritabanını çalıştırın. Böylece gerçek API bağlantısıyla sohbet edebiliriz!`;

        const normalizedContent = content.toLowerCase();
        if (normalizedContent.includes('selam') || normalizedContent.includes('merhaba') || normalizedContent.includes('sa')) {
          aiResponse = `🤖 **Gemini AI Asistanı (Çevrimdışı Simülasyon):**\n\nSelam! Size nasıl yardımcı olabilirim? (Şu an çevrimdışı simülasyon modundayım. Canlı Google Gemini API bağlantısı için lütfen Docker veritabanını başlatın.)`;
        } else if (normalizedContent.includes('/ozet')) {
          aiResponse = `🤖 **Gemini AI Asistanı (Çevrimdışı Simülasyon):**\n\nBu kanaldaki son konuşmaların özeti:\n- Ahmet Yılmaz veritabanı ve Docker entegrasyonu hakkında bilgi sordu.\n- Sistem veritabanı bağlantısı hatası bildirdi.`;
        } else if (normalizedContent.includes('/kod')) {
          aiResponse = `🤖 **Gemini AI Asistanı (Çevrimdışı Simülasyon):**\n\nİşte TypeScript ile örnek bir REST servis bileşeni:\n\`\`\`typescript\nconst getStatus = () => { return "Active"; };\n\`\`\``;
        }

        const aiMsg: Message = {
          id: Math.random().toString(),
          content: aiResponse,
          channelId: currentChanId,
          senderId: 'gemini-user-id',
          createdAt: new Date().toISOString(),
          sender: {
            id: 'gemini-user-id',
            email: 'gemini@company.com',
            fullName: 'Gemini AI',
            role: 'EMPLOYEE',
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
          },
        };
        setMessages((prev) => [...prev, aiMsg]);
      }, 1000);
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
            {authMode === 'login' && 'Enterprise Workspace'}
            {authMode === 'register' && 'Yeni Çalışan Kaydı'}
            {authMode === 'admin' && 'Yönetici Girişi'}
          </h1>
          <p className="text-xs text-center text-slate-400 mb-6">
            {authMode === 'login' && 'Dahili Proje Yönetimi & Anlık Mesajlaşma Platformu'}
            {authMode === 'register' && 'Workspace ekibine katılmak için bilgilerinizi doldurun'}
            {authMode === 'admin' && 'Proje yönetim yetkileri ve sistem paneli erişimi'}
          </p>

          {authError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg">
              {authError}
            </div>
          )}

          <form onSubmit={handleLoginOrRegister} className="space-y-4">
            {authMode === 'register' && (
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
              {authMode === 'login' && 'Giriş Yap'}
              {authMode === 'register' && 'Kayıt Ol'}
              {authMode === 'admin' && 'Yönetici Girişi'}
            </button>
          </form>

          {authMode === 'login' && (
            <div className="mt-6 flex flex-col items-center gap-2 text-xs text-slate-400">
              <div>
                Hesabınız yok mu?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setAuthError(null);
                  }}
                  className="text-indigo-400 font-semibold underline hover:text-indigo-300"
                >
                  Kayıt Ol
                </button>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('admin');
                    setAuthError(null);
                  }}
                  className="text-indigo-400 font-semibold underline hover:text-indigo-300 text-[11px]"
                >
                  Yönetici Girişi
                </button>
              </div>
            </div>
          )}

          {authMode === 'register' && (
            <div className="mt-6 text-center text-xs text-slate-400">
              Zaten hesabınız var mı?{' '}
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setAuthError(null);
                }}
                className="text-indigo-400 font-semibold underline hover:text-indigo-300"
              >
                Giriş Yap
              </button>
            </div>
          )}

          {authMode === 'admin' && (
            <div className="mt-6 flex flex-col items-center gap-3 text-xs text-slate-400">
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError(null);
                  }}
                  className="text-indigo-400 font-semibold underline hover:text-indigo-300"
                >
                  Çalışan Girişi
                </button>
              </div>
            </div>
          )}

          {/* Developer Mode Helper */}
          <div className="mt-8 pt-4 border-t border-slate-800/60 text-left">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-2">
              <Terminal className="w-3.5 h-3.5" />
              <span>Geliştirici Modu: Kayıtlı Hesaplar</span>
            </div>
            <p className="text-[10px] text-slate-500 mb-2 leading-relaxed">
              Tıklayarak e-posta ve şifre alanlarını otomatik doldurabilirsiniz:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {devOfflineUsers.length > 0 ? (
                devOfflineUsers.map((u) => (
                  <button
                    key={u.email}
                    type="button"
                    onClick={() => {
                      setEmail(u.email);
                      setPassword((u as any).plainPassword || (u.role === 'ADMIN' ? 'admin123' : 'employee123'));
                      if (u.role === 'ADMIN') {
                        setAuthMode('admin');
                      } else {
                        setAuthMode('login');
                      }
                    }}
                    className="text-[10px] bg-slate-950 hover:bg-slate-800 hover:text-white text-slate-300 px-2 py-1.5 rounded-lg border border-slate-800 transition font-medium flex flex-col items-start min-w-[120px] cursor-pointer"
                    title="Otomatik Doldur"
                  >
                    <span className="font-semibold text-slate-200 truncate max-w-[110px]">{u.fullName}</span>
                    <span className="text-[9px] text-slate-400 font-mono truncate max-w-[110px]">{u.email}</span>
                    <span className="text-[8px] mt-0.5 text-indigo-400 font-extrabold uppercase tracking-wider">{u.role}</span>
                  </button>
                ))
              ) : (
                <span className="text-[10px] text-slate-600">Kayıtlı hesap bulunamadı.</span>
              )}
            </div>
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

        {/* Settings Button */}
        {activeProject && (
          <div className="p-3 pb-0">
            <button
              onClick={() => setShowAdminAclModal(true)}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2.5 transition bg-indigo-600 text-white border border-indigo-500 shadow-sm cursor-pointer hover:bg-indigo-800 hover:border-indigo-600"
              title="Ayarlar"
            >
              <Settings className="w-5 h-5 text-indigo-200" />
              <span>Ayarlar</span>
            </button>
          </div>
        )}

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
            onClick={() => setActiveTab('notes')}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2.5 transition ${
              activeTab === 'notes'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4 text-indigo-400" /> Notlarım & Yapılacaklar
          </button>

          {currentUser.role === 'ADMIN' && (
            <button
              onClick={() => setActiveTab('activity')}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2.5 transition ${
                activeTab === 'activity'
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Activity className="w-4 h-4 text-indigo-400" /> Kullanıcı Aktiviteleri
            </button>
          )}
        </div>

        {/* Channels List under Active Project (Only shown when on Chat tab) */}
        {activeTab === 'chat' && (
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {activeProject && (
              <div>
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span className="text-[11px] font-semibold uppercase tracking-wider">
                      Kanallar
                    </span>
                    {currentUser.role === 'ADMIN' && (
                      <button
                        onClick={() => setShowCreateChannelModal(true)}
                        className="p-0.5 hover:bg-slate-800 hover:text-white rounded transition"
                        title="Yeni Kanal Oluştur"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                  </div>
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
                            ? 'bg-indigo-600 text-white font-bold border border-indigo-500 shadow-sm'
                            : 'text-slate-400 hover:text-white hover:bg-indigo-600'
                        }`}
                      >
                        <Hash className={`w-3.5 h-3.5 flex-shrink-0 ${isChanSelected ? 'text-indigo-200' : 'text-indigo-500'}`} />
                        <span className="truncate">{chan.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Ekip Üyeleri (Team Members) Section */}
                <div className="mt-6 border-t border-slate-800/40 pt-4">
                  <div className="flex items-center justify-between mb-2.5 px-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Ekip Üyeleri ({users.length > 0 ? users.length - 1 : 0})
                    </span>
                  </div>

                  <div className="space-y-0.5 animate-fadeIn">
                    {users.map((member) => {
                      if (!member) return null;

                      // Kendimizi ekip üyeleri (DM) listesinde göstermiyoruz
                      if (member.id === currentUser?.id) return null;
                      
                      // Check if this is the active DM channel
                      const isDmActive = activeChannel?.type === 'DIRECT_MESSAGE' && 
                        activeChannel.members?.some((m) => m.userId === member.id);

                      return (
                        <button
                          key={member.id}
                          onClick={() => handleStartDm(member.id)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition ${
                            isDmActive
                              ? 'bg-indigo-600 text-white font-bold border border-indigo-500 shadow-sm'
                              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="relative flex-shrink-0">
                              <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-[9px] text-slate-200 uppercase">
                                {member.fullName.charAt(0)}
                              </div>
                              <span className={`absolute -bottom-0.5 -right-0.5 flex h-2 w-2 rounded-full border border-slate-900 ${
                                member.status !== 'ACTIVE' ? 'bg-red-500 shadow-sm shadow-red-500/20' : member.isOnline ? 'bg-emerald-500' : 'bg-slate-500'
                              }`} />
                            </div>
                            <span className="truncate">
                              {member.fullName}
                              {member.status !== 'ACTIVE' && (
                                <span className="text-[10px] text-red-500 font-bold ml-1.5 font-mono">(Pasif)</span>
                              )}
                            </span>
                          </div>
                          
                          <span className="text-[8px] font-semibold text-slate-500 uppercase tracking-wider scale-90">
                            {member.role === 'ADMIN' ? 'Yönetici' : 'Çalışan'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </aside>

      {/* 2. MAIN VIEW: SWITCHED BASED ON TAB */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-950">
        {/* Top Header */}
        <header className="h-14 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-900/60 backdrop-blur relative z-30">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2 bg-slate-800 rounded-lg text-indigo-400 border border-slate-700">
              {activeTab === 'chat' && (
                activeChannel?.type === 'DIRECT_MESSAGE'
                  ? <UserIcon className="w-5 h-5" />
                  : <Hash className="w-5 h-5" />
              )}
              {activeTab === 'kanban' && <Kanban className="w-5 h-5" />}
              {activeTab === 'gantt' && <Calendar className="w-5 h-5" />}
              {activeTab === 'files' && <HardDrive className="w-5 h-5" />}
              {activeTab === 'analytics' && <BarChart3 className="w-5 h-5" />}
              {activeTab === 'notes' && <FileText className="w-5 h-5" />}
              {activeTab === 'activity' && <Activity className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-white text-sm flex items-baseline gap-2">
                {activeTab === 'chat' && (
                  activeChannel 
                    ? activeChannel.type === 'DIRECT_MESSAGE'
                      ? activeChannel.members?.find((m) => m.userId !== currentUser?.id)?.user?.fullName || 'Özel Mesaj'
                      : `#${activeChannel.name}`
                    : 'Kanal Seçilmedi'
                )}
                {activeTab === 'kanban' && 'Kanban Görev Panosu'}
                {activeTab === 'gantt' && 'Gantt Zaman Çizelgesi'}
                {activeTab === 'files' && 'Dosya Deposu'}
                {activeTab === 'analytics' && 'Proje Analitiği'}
                {activeTab === 'notes' && 'Notlarım & Yapılacaklar'}
                {activeTab === 'activity' && 'Kullanıcı Aktivite İzleme Paneli'}
                {activeTab === 'chat' && activeProject && activeChannel?.type !== 'DIRECT_MESSAGE' && (
                  <span className="text-sm font-bold text-slate-400">
                     - <span className="text-slate-200">{activeProject.name}</span>
                  </span>
                )}
              </h3>
              {activeTab === 'chat' && (
                <p className="text-[11px] text-slate-400 truncate">
                  {activeChannel?.type === 'DIRECT_MESSAGE'
                    ? 'Birebir özel canlı sohbet penceresi.'
                    : activeProject?.description || 'Dahili Proje Yönetimi & AI İletişim Platformu.'}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Center */}
            <NotificationCenter />

            {/* Clear Chat Button */}
            {activeTab === 'chat' && activeChannel && (
              <button
                onClick={handleClearChat}
                className="p-2 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 hover:border-rose-500/40 text-rose-400 rounded-xl transition flex items-center justify-center cursor-pointer"
                title="Sohbeti Temizle"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
              </button>
            )}

            {/* ✨ Gemini AI Roadmap Modal Trigger */}
            {activeProject && (
              <button
                onClick={() => setShowGeminiModal(true)}
                className="p-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl shadow-lg shadow-purple-500/20 transition flex items-center justify-center cursor-pointer"
                title="Gemini AI Yol Haritası"
              >
                <Sparkles className="w-4 h-4 animate-pulse" />
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
                        {/* Mesaj İçeriği veya Önizlemesi */}
                        {(!msg.attachments || msg.attachments.length === 0) ? (
                          <div
                            className={`border rounded-xl p-3 text-sm inline-block max-w-2xl leading-relaxed shadow-sm whitespace-pre-line ${
                              isAi
                                ? 'bg-purple-950/40 border-purple-800/50 text-purple-100'
                                : 'bg-slate-900 border-slate-800 text-slate-300'
                            }`}
                          >
                            {msg.content}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {msg.attachments.map((file) => {
                              const isImage = file.mimeType?.startsWith('image/') || 
                                file.fileName.toLowerCase().endsWith('.png') ||
                                file.fileName.toLowerCase().endsWith('.jpg') ||
                                file.fileName.toLowerCase().endsWith('.jpeg') ||
                                file.fileName.toLowerCase().endsWith('.gif') ||
                                file.fileName.toLowerCase().endsWith('.webp');
                              
                              const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api';
                              const fileUrl = file.publicUrl || `${backendUrl}/storage/file/${file.s3Key}`;
                              
                              return (
                                <div key={file.id} className="max-w-md">
                                  {isImage ? (
                                    <div className="flex flex-col gap-1.5">
                                      <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="block relative group overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-md">
                                        <img
                                          src={fileUrl}
                                          alt={file.fileName}
                                          className="max-h-72 object-contain hover:scale-[1.01] transition duration-350 rounded-2xl"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-xs text-white font-medium">
                                          Tıklayarak Yeni Sekmede Aç
                                        </div>
                                      </a>
                                      {msg.content && !msg.content.startsWith('🖼️ Fotoğraf:') && (
                                        <div className="text-xs text-slate-400 px-1">{msg.content}</div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex flex-col gap-1">
                                      <a
                                        href={fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        download={file.fileName}
                                        className="flex items-center gap-2.5 p-3 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 rounded-xl text-xs text-indigo-400 font-semibold transition"
                                      >
                                        <Paperclip className="w-4 h-4 text-indigo-500" />
                                        <span className="truncate flex-1 text-slate-300">{file.fileName}</span>
                                        <span className="text-[10px] text-slate-500 font-mono">({(file.fileSize / 1024).toFixed(1)} KB)</span>
                                      </a>
                                      {msg.content && !msg.content.startsWith('📂 Dosya:') && (
                                        <div className="text-xs text-slate-400 px-1">{msg.content}</div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

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

            {/* Typing Indicator Display */}
            {Object.keys(typingUsers).length > 0 && (
              <div className="px-4 py-1 text-slate-400 text-xs flex items-center gap-1.5 animate-pulse bg-slate-950/40 border-t border-slate-900">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                <span className="italic font-medium text-slate-300">
                  {Object.values(typingUsers).join(', ')} {Object.keys(typingUsers).length === 1 ? 'yazıyor...' : 'yazıyorlar...'}
                </span>
              </div>
            )}

            {/* Message Input Bar */}
            <footer className="p-4 border-t border-slate-800 bg-slate-900/40">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e as any);
                      }
                    }}
                    placeholder={`#${activeChannel?.name || 'kanalina'} mesaj gönder... (/ozet, /anket veya sesli mesaj kullanın)`}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-4 pr-12 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition shadow-inner"
                  />
                  {showAttachmentMenu && (
                    <div className="absolute right-3 bottom-12 bg-slate-900 border border-slate-800 rounded-xl p-1.5 shadow-xl flex flex-col gap-1 w-36 z-50 animate-fadeIn">
                      <button
                        type="button"
                        onClick={() => {
                          photoInputRef.current?.click();
                          setShowAttachmentMenu(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 hover:bg-slate-800 text-xs text-slate-300 hover:text-white rounded-lg transition flex items-center gap-2 cursor-pointer"
                      >
                        🖼️ Fotoğraflardan
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          fileInputRef.current?.click();
                          setShowAttachmentMenu(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 hover:bg-slate-800 text-xs text-slate-300 hover:text-white rounded-lg transition flex items-center gap-2 cursor-pointer"
                      >
                        📂 Dosyalardan
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-200 transition cursor-pointer"
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
        {activeTab === 'kanban' && (
          <KanbanBoard
            project={
              activeProject || {
                id: '',
                name: 'Seçili Proje Yok',
                code: 'NONE',
                description: 'Veritabanı bağlantısı yok.',
                channels: [],
                createdAt: '2026-07-22T12:00:00.000Z',
              }
            }
          />
        )}

        {/* TAB 3: GANTT TIMELINE */}
        {activeTab === 'gantt' && (
          <GanttView
            project={
              activeProject || {
                id: '',
                name: 'Seçili Proje Yok',
                code: 'NONE',
                description: 'Veritabanı bağlantısı yok.',
                channels: [],
                createdAt: '2026-07-22T12:00:00.000Z',
              }
            }
          />
        )}

        {/* TAB 4: FILE EXPLORER & AI ANALYZER */}
        {activeTab === 'files' && (
          <FileExplorer
            project={
              activeProject || {
                id: '',
                name: 'Seçili Proje Yok',
                code: 'NONE',
                description: 'Veritabanı bağlantısı yok.',
                channels: [],
                createdAt: '2026-07-22T12:00:00.000Z',
              }
            }
          />
        )}

        {/* TAB 6: PERSONAL PRIVATE NOTES & TO-DO */}
        {activeTab === 'notes' && currentUser && (
          <PersonalNotes currentUser={currentUser} />
        )}

        {/* TAB 7: USER ACTIVITY MONITORING */}
        {activeTab === 'activity' && currentUser && (
          <UserActivityPanel currentUser={currentUser} />
        )}
      </main>

      {/* MODALS */}
      {showAdminAclModal && activeProject && currentUser && (
        <AdminAclModal
          projects={projects}
          currentProject={activeProject}
          onClose={() => setShowAdminAclModal(false)}
          onRefresh={loadProjects}
          socket={socket}
          currentUser={currentUser}
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

      {showCreateChannelModal && activeProject && (
        <CreateChannelModal
          project={activeProject}
          onClose={() => setShowCreateChannelModal(false)}
          onSuccess={loadProjects}
        />
      )}
      <input
        type="file"
        ref={photoInputRef}
        onChange={(e) => handleAttachmentUpload(e.target.files?.[0], 'photo')}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleAttachmentUpload(e.target.files?.[0], 'file')}
        accept="*/*"
        className="hidden"
      />
    </div>
  );
}
