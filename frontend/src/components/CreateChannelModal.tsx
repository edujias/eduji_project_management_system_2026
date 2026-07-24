'use client';

import React, { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { X, Hash } from 'lucide-react';
import { Project } from '@/types';

interface CreateChannelModalProps {
  project: Project;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateChannelModal({ project, onClose, onSuccess }: CreateChannelModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent, currentDesc?: string) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const finalDescription = currentDesc !== undefined ? currentDesc : description;
    const formattedName = name.trim().toLowerCase().replace(/\s+/g, '-');

    try {
      if (project.id && !project.id.startsWith('offline-') && project.id !== 'mock-proj-id') {
        await apiFetch('/channels', {
          method: 'POST',
          body: JSON.stringify({
            name: formattedName,
            description: finalDescription,
            projectId: project.id,
          }),
        });
      } else {
        throw new Error('Offline mode active.');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.warn('Saving channel locally:', err);
      
      // Fallback: Save channel locally inside the localStorage projects list
      const newChannel = {
        id: `offline-chan-${Math.random()}`,
        name: formattedName,
        projectId: project.id,
        description: finalDescription,
        type: 'PROJECT_PUBLIC' as const,
        createdById: 'mock-admin-id',
        createdAt: new Date().toISOString(),
      };

      const existingRaw = localStorage.getItem('offline_projects');
      if (existingRaw) {
        let existing: Project[] = JSON.parse(existingRaw);
        existing = existing.map(p => {
          if (p.id === project.id) {
            return {
              ...p,
              channels: [...(p.channels || []), newChannel],
            };
          }
          return p;
        });
        localStorage.setItem('offline_projects', JSON.stringify(existing));
      }

      onSuccess();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e, e.currentTarget.value);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/30">
            <Hash className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Yeni Kanal Oluştur</h2>
            <p className="text-xs text-slate-400">
              {project.name} projesi için yeni bir mesajlaşma kanalı açın.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Kanal Adı</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-semibold">#</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                placeholder="yazilim-ekibi"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Açıklama (Opsiyonel)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Bu kanalın amacı ve konusu..."
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm rounded-lg transition"
            >
              {loading ? 'Oluşturuluyor...' : 'Kanal Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
