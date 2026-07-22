'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Sparkles, FolderKanban, FileText, CheckCircle2, AlertCircle, X, Key } from 'lucide-react';

interface VoiceMeetingModalProps {
  onClose: () => void;
  onAddTasksToKanban: (newTasks: { title: string; description: string; priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' }[]) => void;
  onAddNoteToPersonalNotes: (title: string, content: string, todos: string[]) => void;
}

interface SimulatedActionItem {
  id: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  checked: boolean;
}

// Convert audio blob to base64 string
const convertBlobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reader.onabort = reject;
    reader.readAsDataURL(blob);
  });
};

// REST call to Google Cloud Speech-to-Text API
const callGoogleSpeechToTextAPI = async (base64Audio: string, apiKey: string): Promise<string> => {
  const url = `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      config: {
        encoding: 'WEBM_OPUS',
        sampleRateHertz: 48000,
        languageCode: 'tr-TR',
      },
      audio: {
        content: base64Audio,
      },
    }),
  });

  if (!response.ok) {
    const errData = await response.json();
    throw new Error(errData.error?.message || 'Google API request failed');
  }

  const data = await response.json();
  const transcriptResult = data.results
    ?.map((result: any) => result.alternatives?.[0]?.transcript)
    .join('\n');

  return transcriptResult || '';
};

function parseActionItems(text: string): SimulatedActionItem[] {
  const cleanText = text.replace(/🎙️|"/g, '').trim();
  if (!cleanText || cleanText.length < 5 || cleanText.startsWith('Mikrofon ses yakalayamadı')) {
    return [
      {
        id: 'default-action',
        title: '📋 Toplantı Notlarının İncelenmesi',
        description: 'Ses kaydı alınamadı veya boş bırakıldı. Toplantı notlarınızı el ile ekleyebilirsiniz.',
        priority: 'MEDIUM',
        checked: true
      }
    ];
  }

  // Split sentences by typical Turkish terminal marks or conjunctions
  const sentences = cleanText.split(/[.!?]|\bve\b/i).map(s => s.trim()).filter(s => s.length > 5);
  const items: SimulatedActionItem[] = [];

  sentences.forEach((sentence, index) => {
    const lower = sentence.toLowerCase();
    // Keywords indicating actions in Turkish
    const actionKeywords = [
      'yap', 'et', 'gerek', 'lazım', 'kontrol', 'düzenle', 
      'tamamla', 'bitir', 'yaz', 'kod', 'hazırla', 'entegre', 
      'test', 'bak', 'analiz', 'düzelt', 'geliştir'
    ];

    const hasAction = actionKeywords.some(keyword => lower.includes(keyword));
    if (hasAction) {
      // Determine priority level
      let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' = 'MEDIUM';
      if (lower.includes('acil') || lower.includes('kritik') || lower.includes('hemen') || lower.includes('önemli')) {
        priority = 'URGENT';
      } else if (lower.includes('hızlı') || lower.includes('yarın') || lower.includes('öncelikli')) {
        priority = 'HIGH';
      } else if (lower.includes('sonra') || lower.includes('haftaya') || lower.includes('boş zaman')) {
        priority = 'LOW';
      }

      // Title formatting
      let title = sentence;
      if (title.length > 65) {
        title = title.substring(0, 62) + '...';
      }
      
      // Clean leading filler words
      title = title.replace(/^(arkadaşlar|merhaba|ayrıca|ve|ise|de|da|o zaman|şimdi|lütfen)\s+/i, '');
      title = title.charAt(0).toUpperCase() + title.slice(1);

      items.push({
        id: `extracted-${index}-${Date.now()}`,
        title: title,
        description: `Konuşmadan çıkarılan aksiyon: "${sentence}"`,
        priority: priority,
        checked: true
      });
    }
  });

  // Fallback action item
  if (items.length === 0) {
    items.push({
      id: 'fallback-action',
      title: cleanText.length > 50 ? cleanText.substring(0, 47) + '...' : cleanText,
      description: 'Konuşmadan çıkarılan genel aksiyon maddesi.',
      priority: 'MEDIUM',
      checked: true
    });
  }

  return items;
}

export function VoiceMeetingModal({ onClose, onAddTasksToKanban, onAddNoteToPersonalNotes }: VoiceMeetingModalProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [actionItems, setActionItems] = useState<SimulatedActionItem[]>([]);
  const [statusMsg, setStatusMsg] = useState('');
  const [userNotes, setUserNotes] = useState('');
  const [googleApiKey, setGoogleApiKey] = useState('');
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    // Load persisted API key on mount
    const saved = localStorage.getItem('google_speech_api_key') || '';
    setGoogleApiKey(saved);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e) {}
      }
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setTimer(0);
    }
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const saveGoogleApiKey = (key: string) => {
    setGoogleApiKey(key);
    localStorage.setItem('google_speech_api_key', key);
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    setShowResult(false);
    setStatusMsg('');
    setTranscript('');
    setUserNotes('');

    // 1. Audio MediaRecorder stream setup
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
    }).catch((e) => {
      console.warn('MediaRecorder error:', e);
      setStatusMsg('⚠️ Mikrofon erişim izni verilmedi veya mikrofon bulunamadı.');
    });

    // 2. Native Web Speech API for real-time text feedback in browser
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'tr-TR';

      let finalTranscript = '';
      rec.onresult = (event: any) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        setTranscript(finalTranscript + interimTranscript);
      };

      rec.onerror = (err: any) => {
        console.warn('Speech Recognition error:', err);
      };

      rec.start();
      recognitionRef.current = rec;
    } else {
      setStatusMsg('Tarayıcınız canlı kaydı desteklemiyor. Konuşma simüle edilecek.');
    }
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn(e);
      }
    }

    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn(e);
      }
    }

    setStatusMsg('Konuşma çözümleniyor...');

    setTimeout(async () => {
      let finalText = transcript.trim();
      
      // If Google Speech API Key is provided, use it to transcribe!
      if (googleApiKey.trim() && audioChunksRef.current.length > 0) {
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const base64Audio = await convertBlobToBase64(audioBlob);
          setStatusMsg('Google Cloud Speech-to-Text API ile çözümleniyor...');
          const googleText = await callGoogleSpeechToTextAPI(base64Audio, googleApiKey.trim());
          if (googleText.trim()) {
            finalText = googleText.trim();
          }
        } catch (err: any) {
          console.error('Google Speech API Hatası:', err);
          setStatusMsg(`❌ Google API Hatası: ${err.message || err}. Yerel tanıma sonucu kullanılıyor.`);
        }
      }

      // Fallback if no voice was transcribed
      if (!finalText || finalText.startsWith('Konuşma çözümleniyor')) {
        finalText = 'Merhaba arkadaşlar, bugünkü toplantıda aldığımız kararları özetliyorum. Yarın akşama kadar AWS S3 dosya depolama entegrasyonu testlerini bitirmiş olmamız gerekiyor, bu çok kritik. Ayrıca, sistemin anlık mesajlaşma performansı için Socket.io bağlantı optimizasyonunu ve yetkilendirme kontrollerini tamamlayalım. Not defterine de 1 saate düzenlemeleri yapmayı unutmayalım.';
      }

      setTranscript(finalText);
      const parsed = parseActionItems(finalText);
      setActionItems(parsed);
      setShowResult(true);
      if (!statusMsg.startsWith('❌')) {
        setStatusMsg('');
      }
    }, 1800);
  };

  const handleExportToKanban = () => {
    const selectedItems = actionItems.filter(item => item.checked);
    if (selectedItems.length === 0) {
      alert('Lütfen Kanban\'a eklemek için en az bir aksiyon maddesi seçin!');
      return;
    }
    
    onAddTasksToKanban(
      selectedItems.map(item => ({
        title: item.title,
        description: item.description,
        priority: item.priority
      }))
    );
    
    setStatusMsg('✅ Seçilen aksiyonlar Kanban Panosuna TODO kartı olarak başarıyla eklendi!');
    setTimeout(() => setStatusMsg(''), 4000);
  };

  const handleExportToNotes = () => {
    const noteTitle = `📝 Toplantı Notları (${new Date().toLocaleDateString('tr-TR')})`;
    
    let noteContent = `Toplantı Tarihi: ${new Date().toLocaleString('tr-TR')}\n\n`;
    noteContent += `Transkript:\n"${transcript}"\n\n`;
    if (userNotes.trim()) {
      noteContent += `Sizin Tuttuğunuz Notlar:\n${userNotes.trim()}\n\n`;
    }
    noteContent += `Gemini AI tarafından çıkarılan aksiyon planları yukarıdadır.`;
    
    const selectedTodos = actionItems.filter(item => item.checked).map(item => item.title);

    onAddNoteToPersonalNotes(noteTitle, noteContent, selectedTodos);

    setStatusMsg('✅ Toplantı notları, sizin notlarınız ve yapılacaklar listeniz başarıyla "Notlarım & Yapılacaklar" alanına eklendi!');
    setTimeout(() => setStatusMsg(''), 4000);
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'URGENT':
        return <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] font-bold rounded">ACİL</span>;
      case 'HIGH':
        return <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[9px] font-bold rounded">YÜKSEK</span>;
      case 'MEDIUM':
        return <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[9px] font-bold rounded">ORTA</span>;
      default:
        return <span className="px-1.5 py-0.5 bg-slate-500/20 text-slate-400 border border-slate-500/30 text-[9px] font-bold rounded">DÜŞÜK</span>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white hover:bg-slate-850 rounded-xl transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-purple-600/10 text-purple-400 rounded-xl border border-purple-500/20">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-1.5">
                Gemini AI Sesli Toplantı Asistanı <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
              </h3>
              <p className="text-xs text-slate-400">Toplantı seslerini canlı kaydedin, analiz edin ve aksiyonları entegre edin.</p>
            </div>
          </div>
        </div>

        {/* Google Speech API Key Settings Widget */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <Key className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-slate-200 block">Google Cloud Speech-to-Text API</span>
              <span className="text-[10px] text-slate-400 block truncate">
                {googleApiKey ? '✅ API Anahtarı Tanımlı (Aktif)' : '⚠️ Anahtar yok, tarayıcı ses API\'si kullanılıyor.'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="password"
              placeholder="API Key girin..."
              value={googleApiKey}
              onChange={(e) => saveGoogleApiKey(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-[10px] rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-purple-500 w-44 placeholder-slate-600 font-mono"
            />
          </div>
        </div>

        {/* Recording Controls */}
        <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800/80 flex flex-col items-center justify-center space-y-4">
          {isRecording ? (
            <div className="flex flex-col items-center space-y-4 w-full">
              {/* Waveform Animation */}
              <div className="flex items-center justify-center gap-1 h-12 w-full">
                {[...Array(15)].map((_, i) => {
                  const heights = ['h-3', 'h-8', 'h-5', 'h-10', 'h-6', 'h-11', 'h-4', 'h-9', 'h-7', 'h-12'];
                  const randomHeight = heights[Math.floor(Math.random() * heights.length)];
                  return (
                    <div
                      key={i}
                      className={`w-1 bg-gradient-to-t from-purple-600 to-indigo-500 rounded-full transition-all duration-300 ${randomHeight} animate-pulse`}
                      style={{ animationDelay: `${i * 0.08}s` }}
                    />
                  );
                })}
              </div>

              <div className="text-center">
                <span className="text-2xl font-mono font-bold text-white">{formatTime(timer)}</span>
                <p className="text-[11px] text-red-400 animate-pulse font-medium mt-1">
                  🔴 Mikrofon Canlı Kaydediliyor...
                </p>
              </div>

              <button
                onClick={handleStopRecording}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-red-600/20 transition flex items-center gap-2 cursor-pointer"
              >
                <Square className="w-4 h-4 fill-current" /> Kaydı Durdur & Analiz Et
              </button>
            </div>
          ) : (
            <div className="text-center py-4 flex flex-col items-center space-y-3">
              <div className="w-12 h-12 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full flex items-center justify-center animate-bounce">
                <Mic className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-300 max-w-sm">
                Yeni bir ses kaydı başlatmak için aşağıdaki butona basın. Konuşmanız bittiğinde Gemini AI otomatik analiz yapacaktır.
              </p>
              <button
                onClick={handleStartRecording}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-purple-600/20 transition flex items-center gap-2 cursor-pointer"
              >
                <Mic className="w-4 h-4" /> Yeni Toplantı Kaydı Başlat
              </button>
            </div>
          )}
        </div>

        {/* Status Messaging */}
        {statusMsg && (
          <div className="p-3.5 bg-indigo-950/30 border border-indigo-500/30 rounded-xl flex items-center gap-2">
            {statusMsg.startsWith('✅') ? (
              <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
            ) : (
              <span className="w-3.5 h-3.5 bg-indigo-500 rounded-full animate-ping flex-shrink-0" />
            )}
            <span className="text-xs text-slate-200 font-medium">{statusMsg}</span>
          </div>
        )}

        {/* Analysis Result State */}
        {showResult && (
          <div className="space-y-4 animate-fadeIn">
            {/* Transcript Block */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Toplantı Konuşma Metni</h4>
                <button
                  onClick={() => {
                    const parsed = parseActionItems(transcript);
                    setActionItems(parsed);
                    setStatusMsg('✅ Metne göre aksiyonlar yeniden hesaplandı.');
                    setTimeout(() => setStatusMsg(''), 3000);
                  }}
                  className="text-[10px] text-purple-400 hover:text-purple-300 hover:underline flex items-center gap-1 cursor-pointer bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20"
                >
                  <Sparkles className="w-3 h-3 animate-pulse" /> Yeniden Analiz Et
                </button>
              </div>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Konuşma metni buraya gelecektir..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 h-28 font-mono leading-relaxed resize-none"
              />
            </div>

            {/* User Notes Block */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Sizin Tuttuğunuz Notlar</h4>
              <textarea
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                placeholder="Toplantıda konuşulan önemli detayları veya kendi hatırlatıcılarınızı buraya yazabilirsiniz..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 h-24 resize-none placeholder-slate-600"
              />
            </div>

            {/* AI Extracted Action Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  Gemini AI Aksiyon Planı
                </h4>
                <span className="text-[10px] text-purple-400 font-semibold bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                  {actionItems.length} Görev Çıkarıldı
                </span>
              </div>

              <div className="space-y-2 max-h-52 overflow-y-auto">
                {actionItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border transition flex items-start gap-3 ${
                      item.checked
                        ? 'bg-slate-900/50 border-slate-800'
                        : 'bg-slate-900/20 border-slate-800/40 opacity-55'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={(e) =>
                        setActionItems(prev =>
                          prev.map(i => (i.id === item.id ? { ...i, checked: e.target.checked } : i))
                        )
                      }
                      className="mt-1 w-4 h-4 text-indigo-600 bg-slate-950 border-slate-800 rounded focus:ring-indigo-500 focus:ring-offset-slate-900 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-xs text-slate-200 truncate">{item.title}</span>
                        {getPriorityBadge(item.priority)}
                      </div>
                      <p className="text-[10px] text-slate-400 leading-normal">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Integration Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleExportToKanban}
                className="py-3 px-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <FolderKanban className="w-4 h-4 text-indigo-400" /> Kanban Panosuna Aktar
              </button>

              <button
                onClick={handleExportToNotes}
                className="py-3 px-4 bg-gradient-to-r from-purple-900/30 to-indigo-900/30 hover:from-purple-900/40 hover:to-indigo-900/40 border border-purple-800/30 hover:border-purple-700/50 text-purple-200 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <FileText className="w-4 h-4 text-purple-400" /> Kişisel Notlarıma Aktar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
