'use client';

import React, { useState, useEffect } from 'react';
import { Mic, Square, Send, Sparkles } from 'lucide-react';

interface VoiceRecorderProps {
  onSendVoiceNote: (audioTranscript: string) => void;
}

export function VoiceRecorder({ onSendVoiceNote }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    } else {
      setTimer(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleStopAndSend = () => {
    setIsRecording(false);
    const mockTranscripts = [
      '🎙️ **Sesli Mesaj Transkripti (Gemini AI Speech-to-Text):**\n"Merhaba ekip! S3 dosya depolama ve canlı Socket.io bağlantısı tamamlandı. Güncellemeleri kontrol edelim."',
      '🎙️ **Sesli Mesaj Transkripti (Gemini AI Speech-to-Text):**\n"Selamlar, bugünkü standup toplantısında yetkilendirme modülü ve Gemini AI entegrasyonu tamamlandı."',
    ];
    const selected = mockTranscripts[Math.floor(Math.random() * mockTranscripts.length)];
    onSendVoiceNote(selected);
  };

  return (
    <div className="flex items-center gap-2">
      {isRecording ? (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 px-3 py-1.5 rounded-xl text-red-400 text-xs animate-pulse">
          <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
          <span className="font-mono font-bold">00:0{timer}</span>
          <span className="text-[10px] text-slate-400">Ses Kaydediliyor...</span>
          <button
            onClick={handleStopAndSend}
            className="p-1 bg-red-600 hover:bg-red-500 text-white rounded-lg transition"
            title="Kaydı Bitir & Gönder"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsRecording(true)}
          className="p-2 text-slate-400 hover:text-purple-400 hover:bg-slate-800 rounded-xl transition"
          title="Sesli Mesaj Kaydet (AI Transcribe)"
        >
          <Mic className="w-4 h-4 text-purple-400" />
        </button>
      )}
    </div>
  );
}
