"use client";

import { useState, useRef, useEffect } from "react";

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  onClear: () => void;
  hasRecording: boolean;
}

export function VoiceRecorder({ onRecordingComplete, onClear, hasRecording }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4",
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        onRecordingComplete(blob);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("No se pudo acceder al micrófono. Verifica los permisos.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleClear = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setDuration(0);
    onClear();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  // Show recorded audio
  if (hasRecording && audioUrl) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-[#0FED9D]/30 bg-[#0FED9D]/5 px-3 py-2">
        <span className="text-sm">🎙️</span>
        <audio src={audioUrl} controls className="h-8 flex-1" />
        <span className="text-xs text-white/40">{formatTime(duration)}</span>
        <button
          onClick={handleClear}
          className="text-xs text-white/40 hover:text-white"
        >
          ✕
        </button>
      </div>
    );
  }

  // Recording state
  if (isRecording) {
    return (
      <button
        onClick={stopRecording}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-red-500/50 bg-red-500/10 py-3 text-sm transition hover:bg-red-500/20"
      >
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500"></span>
        </span>
        <span className="text-red-400">Grabando... {formatTime(duration)}</span>
        <span className="text-xs text-white/40">(click para detener)</span>
      </button>
    );
  }

  // Default state - ready to record
  return (
    <button
      onClick={startRecording}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 bg-white/5 py-3 text-sm text-white/60 transition hover:border-[#0FED9D]/50 hover:bg-[#0FED9D]/5 hover:text-[#0FED9D]"
    >
      <span className="text-lg">🎙️</span>
      <span>Grabar nota de voz</span>
      <span className="text-xs text-white/30">(describe el video)</span>
    </button>
  );
}
