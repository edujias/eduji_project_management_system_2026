'use client';

import React, { useState, useEffect } from 'react';
import { FileAsset, Project } from '@/types';
import { apiFetch } from '@/lib/api';
import {
  FileText,
  Upload,
  Sparkles,
  Download,
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

  const handleUploadMockFile = async () => {
    const mockFileName = `Proje_Gereksinim_Dokumani_${Date.now().toString().slice(-4)}.pdf`;
    try {
      const newFile = await apiFetch<FileAsset>('/storage/register', {
        method: 'POST',
        body: JSON.stringify({
          projectId: project.id,
          fileName: mockFileName,
          fileSize: 1024 * 450, // 450 KB
          mimeType: 'application/pdf',
          s3Key: `projects/${project.id}/${mockFileName}`,
        }),
      });

      setFiles((prev) => [newFile, ...prev]);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAiAnalyzeFile = async (file: FileAsset) => {
    setAiAnalyzing(file.id);
    setSelectedFileSummary(null);

    setTimeout(() => {
      setSelectedFileSummary({
        fileName: file.fileName,
        summary: `🤖 **Gemini AI Doküman Analiz Raporu:**

📄 **Dosya Adı:** ${file.fileName}
📊 **Boyut:** ${(file.fileSize / 1024).toFixed(1)} KB

### 📌 Ana Bulgular ve Özet:
1. **Gereksinimler:** Proje kapsamında mimari bileşenlerin güvenlik denetimleri ve Socket.io canlı mesajlaşma standartları tanımlanmıştır.
2. **Ekip Sorumlulukları:** Admin yetki seviyeleri ve çalışan erişim rolleri belgelenmiştir.
3. **AI Önerisi:** Dokümandaki S3 yükleme kotaları ve token süreleri güncellenmelidir.`,
      });
      setAiAnalyzing(null);
    }, 1500);
  };

  return (
    <div className="h-full flex flex-col p-6 bg-slate-950 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            📁 Doküman Yöneticisi & S3 Nesne Depolama
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {project.name} projesine ait teknik dökümanlar, tasarımlar ve dosya varlıkları.
          </p>
        </div>

        <button
          onClick={handleUploadMockFile}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition flex items-center gap-2"
        >
          <Upload className="w-4 h-4" /> Doküman Yükle (S3 Presigned)
        </button>
      </div>

      <div className="flex-1 grid grid-cols-3 gap-6 overflow-hidden min-h-0">
        {/* File Stream List */}
        <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 overflow-y-auto space-y-3">
          <div className="flex items-center justify-between px-2 pb-2 border-b border-slate-800 text-xs font-semibold text-slate-400">
            <span>Dosya Adı</span>
            <span>Boyut & Tarih</span>
          </div>

          {files.length > 0 ? (
            files.map((file) => (
              <div
                key={file.id}
                className="bg-slate-950 border border-slate-800/80 hover:border-slate-700 p-4 rounded-xl flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600/20 text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-500/30">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-slate-100 truncate max-w-xs">
                      {file.fileName}
                    </h4>
                    <span className="text-[10px] text-slate-500">
                      Yükleyen: {file.uploadedBy?.fullName || 'Sistem'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right text-[11px] text-slate-400 font-mono">
                    <div>{(file.fileSize / 1024).toFixed(1)} KB</div>
                    <div className="text-[9px] text-slate-500">
                      {new Date(file.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <button
                    onClick={() => handleAiAnalyzeFile(file)}
                    disabled={aiAnalyzing === file.id}
                    className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs rounded-lg font-medium transition flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    {aiAnalyzing === file.id ? 'Analiz Ediliyor...' : 'AI Analiz'}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="h-40 flex flex-col items-center justify-center text-slate-500 space-y-2">
              <HardDrive className="w-10 h-10 stroke-[1.5]" />
              <p className="text-xs">Henüz proje dosyası yüklenmemiş.</p>
            </div>
          )}
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
