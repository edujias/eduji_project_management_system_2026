'use client';

import React, { useState, useEffect } from 'react';
import { Project } from '@/types';
import { apiFetch } from '@/lib/api';
import { X, Sparkles, Bot, RefreshCw } from 'lucide-react';

interface GeminiRoadmapModalProps {
  project: Project;
  onClose: () => void;
}

export function GeminiRoadmapModal({ project, onClose }: GeminiRoadmapModalProps) {
  const [roadmap, setRoadmap] = useState<string | null>(null);
  const [source, setSource] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRoadmap();
  }, [project.id]);

  const fetchRoadmap = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ roadmap: string; source: string }>(
        `/ai/roadmap/${project.id}`,
        { method: 'POST' },
      );
      setRoadmap(res.roadmap);
      setSource(res.source);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl relative max-h-[85vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-purple-600 to-indigo-600 text-white rounded-xl shadow-lg shadow-purple-500/20">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Gemini AI Proje Yol Haritası
              </h2>
              <p className="text-xs text-slate-400">
                <span className="font-semibold text-purple-400">{project.name}</span> için akıllı aksiyon planı ve risk analizi
              </p>
            </div>
          </div>

          <button
            onClick={fetchRoadmap}
            disabled={loading}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-xs rounded-lg transition flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Yeniden Üret
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 pr-2">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
              <p className="text-sm font-medium text-purple-300 animate-pulse">
                Gemini AI projenizi analiz ediyor ve yol haritası çıkarıyor...
              </p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl">
              {error}
            </div>
          ) : (
            <div className="prose prose-invert max-w-none text-slate-200 text-sm space-y-4 whitespace-pre-line leading-relaxed bg-slate-950/60 p-6 rounded-xl border border-slate-800/80">
              {roadmap}
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Bot className="w-4 h-4 text-purple-400" />
            Motor: <strong className="text-slate-200">{source || 'Gemini AI'}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition font-medium"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
