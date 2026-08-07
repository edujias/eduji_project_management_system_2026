'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FileAsset, Project } from '@/types';
import { apiFetch } from '@/lib/api';
import {
  FileText,
  Upload,
  Sparkles,
  Download,
  Trash2,
  FileCode,
  Image as ImageIcon,
  HardDrive,
  Bot,
} from 'lucide-react';

interface FileExplorerProps {
  project: Project;
}

export function FileExplorer({ project }: FileExplorerProps) {
  const [files, setFiles] = useState<FileAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiAnalyzing, setAiAnalyzing] = useState<string | null>(null);
  const [selectedFileSummary, setSelectedFileSummary] = useState<{
    fileName: string;
    summary: string;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFiles();
  }, [project.id]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<FileAsset[]>(`/storage/project/${project.id}`);
      setFiles(data);
    } catch (err: any) {
      console.error('Dosya çekme hatası:', err);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file: File) => {
    try {
      if (!project.id) {
        throw new Error('Veritabanı bağlantısı yok.');
      }

      // 1. Get mock upload URL from backend
      const { uploadUrl, s3Key } = await apiFetch<{ uploadUrl: string; s3Key: string }>('/storage/upload-url', {
        method: 'POST',
        body: JSON.stringify({
          fileName: file.name,
          projectId: project.id,
        }),
      });

      // 2. Upload file content to backend
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Dosya sunucuya yüklenemedi.');
      }

      // 3. Register the file asset
      const newFile = await apiFetch<FileAsset>('/storage/register', {
        method: 'POST',
        body: JSON.stringify({
          projectId: project.id,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || 'application/octet-stream',
          s3Key: s3Key,
        }),
      });

      setFiles((prev) => [newFile, ...prev]);
    } catch (err: any) {
      console.error('Dosya yükleme hatası:', err);
      alert(err?.message || 'Dosya yüklenemedi. Lütfen tekrar deneyin.');
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      await uploadFile(file);
    }
  };

  const handleAiAnalyzeFile = async (file: FileAsset) => {
    setAiAnalyzing(file.id);
    setSelectedFileSummary(null);

    try {
      const data = await apiFetch<{ summary: string }>(`/ai/analyze-file/${file.id}`, {
        method: 'POST',
      });
      setSelectedFileSummary({
        fileName: file.fileName,
        summary: data.summary,
      });
    } catch (err: any) {
      console.error('AI analiz hatası:', err);
      setSelectedFileSummary({
        fileName: file.fileName,
        summary: `⚠️ **AI Analiz Hatası**: Dosya analizi yapılırken bir sorun oluştu.\n\nHata detayı: ${err.message || 'Bilinmeyen Hata'}`
      });
    } finally {
      setAiAnalyzing(null);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Bu dosyayı silmek istediğinize emin misiniz?')) return;
    try {
      if (project.id) {
        await apiFetch(`/storage/${fileId}`, {
          method: 'DELETE',
        });
      }
    } catch (err: any) {
      console.warn('Backend offline, deleting file locally:', err);
    }
    
    // Always remove from local UI state
    const fileToDelete = files.find((f) => f.id === fileId);
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    if (selectedFileSummary && fileToDelete && selectedFileSummary.fileName === fileToDelete.fileName) {
      setSelectedFileSummary(null);
    }
  };

  return (
    <div className="h-full flex flex-col p-6 bg-slate-950 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            📁 Dosya Deposu
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {project.name} projesine ait teknik dökümanlar, tasarımlar ve dosya varlıkları.
          </p>
        </div>

      </div>

      <div className="flex-1 grid grid-cols-3 gap-6 overflow-hidden min-h-0">
        {/* File Stream List */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`col-span-2 bg-slate-900 border rounded-2xl p-4 overflow-y-auto space-y-3 relative transition-all duration-200 ${
            isDragging ? 'border-indigo-500 bg-indigo-950/20 border-dashed scale-[1.01]' : 'border-slate-800'
          }`}
        >
          {isDragging && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center text-indigo-400 border border-dashed border-indigo-500 z-10 pointer-events-none">
              <Upload className="w-12 h-12 mb-2 animate-bounce" />
              <p className="text-sm font-semibold">Dosyayı buraya bırakarak yükleyin</p>
            </div>
          )}

          <div className="grid grid-cols-12 gap-4 px-4 pb-2 border-b border-slate-800 text-xs font-semibold text-slate-400">
            <span className="col-span-6">Dosya Adı</span>
            <span className="col-span-3 text-right">Boyut & Tarih</span>
            <span className="col-span-3"></span>
          </div>

          {files.length > 0 ? (
            files.map((file) => (
              <div
                key={file.id}
                className="bg-slate-950 border border-slate-800/80 hover:border-slate-700 p-4 rounded-xl grid grid-cols-12 gap-4 items-center transition group"
              >
                <div className="col-span-6 flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-indigo-600/20 text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-500/30 flex-shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-xs text-slate-100 truncate max-w-[160px] md:max-w-[220px]" title={file.fileName}>
                      {file.fileName}
                    </h4>
                    <span className="text-[10px] text-slate-500 truncate block">
                      Yükleyen: {file.uploadedBy?.fullName || 'Sistem'}
                    </span>
                  </div>
                </div>

                <div className="col-span-3 text-right text-[11px] text-slate-400 font-mono hidden sm:block">
                  <div>{(file.fileSize / 1024).toFixed(1)} KB</div>
                  <div className="text-[9px] text-slate-500">
                    {new Date(file.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="col-span-3 flex items-center justify-end gap-2">
                  <a
                    href={file.publicUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs rounded-xl transition flex items-center justify-center"
                    title="Dosyayı İndir / Görüntüle"
                  >
                    <Download className="w-4 h-4 text-slate-400" />
                  </a>

                  <button
                    onClick={() => handleAiAnalyzeFile(file)}
                    disabled={aiAnalyzing === file.id}
                    className="px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-800 border border-purple-200 text-xs rounded-xl font-semibold transition flex items-center gap-1.5"
                    title="AI Analiz Raporu Oluştur"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    {aiAnalyzing === file.id ? 'Analiz...' : 'AI Analiz'}
                  </button>

                  <button
                    onClick={() => handleDeleteFile(file.id)}
                    className="p-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/20 rounded-xl transition flex items-center justify-center"
                    title="Dosyayı Sil"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div
              onClick={handleUploadClick}
              className="h-48 border border-dashed border-slate-800 hover:border-indigo-500/40 bg-slate-950/20 hover:bg-indigo-950/5 rounded-2xl flex flex-col items-center justify-center text-slate-500 hover:text-slate-350 space-y-2.5 cursor-pointer transition-all duration-200 group"
              title="Dosya Yüklemek İçin Tıklayın"
            >
              <HardDrive className="w-10 h-10 stroke-[1.5] text-slate-400 group-hover:text-indigo-400 transition-colors" />
              <div className="text-center">
                <p className="text-xs font-semibold">Henüz proje dosyası yüklenmemiş.</p>
                <p className="text-[10px] text-slate-600 mt-1">Dosya seçmek için tıklayın veya dosyayı buraya sürükleyin</p>
              </div>
            </div>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* AI File Inspector Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 overflow-y-auto flex flex-col">
          <h3 className="font-bold text-sm text-purple-300 mb-3 flex items-center gap-2">
            <Bot className="w-4 h-4 text-purple-400" /> Gemini AI Doküman İnceleyici
          </h3>

          {selectedFileSummary ? (
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-xs leading-relaxed text-slate-300 whitespace-pre-line space-y-2">
              {selectedFileSummary.summary}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2 border border-dashed border-slate-800 rounded-xl">
              <Sparkles className="w-8 h-8 text-purple-400/50" />
              <p className="text-xs">
                Yandaki listeden bir dosyaya tıklayıp **"AI Analiz"** butonuna basarak doküman özetini çıkarabilirsiniz.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
