'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Image, Mic, MicOff, Video, Paperclip, Play, Pause, X } from 'lucide-react';
import { getStoredUser } from '@/lib/auth';

interface Message {
  id: string; sender: 'farmer' | 'doctor'; senderId: string; senderName: string;
  type: 'text' | 'image' | 'voice' | 'video'; text: string;
  fileUrl?: string | null; fileName?: string; fileMimeType?: string; duration?: number;
  createdAt: string;
}
interface Thread {
  threadId: string; otherId: string; otherName: string; otherAvatar?: string;
  lastMessage: string; lastMessageTime: string; unreadCount: number;
}

interface ChatProps {
  role: 'farmer' | 'doctor';
}

export default function Chat({ role }: ChatProps) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const user = getStoredUser();

  // Load threads
  const loadThreads = useCallback(() => {
    if (!user?.id) return;
    fetch(`/api/chat?userId=${user.id}`)
      .then(r => r.json())
      .then(d => setThreads(d.threads || []))
      .catch(console.error);
  }, [user?.id]);

  useEffect(() => { loadThreads(); }, [loadThreads]);

  // Load & poll messages
  useEffect(() => {
    if (!activeThread || !user?.id) return;
    const load = () => {
      fetch(`/api/chat?userId=${user.id}&threadId=${activeThread.threadId}`)
        .then(r => r.json())
        .then(d => setMessages(d.messages || []))
        .catch(console.error);
    };
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, [activeThread?.threadId, user?.id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  async function sendMessage(formData: FormData) {
    setSending(true);
    try {
      const res = await fetch('/api/chat', { method: 'POST', body: formData });
      if (!res.ok) return;
      const data = await res.json();
      setMessages(prev => [...prev, data.message]);
      loadThreads();
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  }

  async function handleSendText(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || !activeThread || !user) return;
    const fd = new FormData();
    fd.append('senderId', user.id);
    fd.append('receiverId', activeThread.otherId);
    fd.append('senderName', user.name);
    fd.append('senderRole', role);
    fd.append('type', 'text');
    fd.append('text', draft.trim());
    setDraft('');
    await sendMessage(fd);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') {
    const file = e.target.files?.[0];
    if (!file || !activeThread || !user) return;
    const fd = new FormData();
    fd.append('senderId', user.id);
    fd.append('receiverId', activeThread.otherId);
    fd.append('senderName', user.name);
    fd.append('senderRole', role);
    fd.append('type', type);
    fd.append('text', '');
    fd.append('file', file);
    await sendMessage(fd);
    e.target.value = '';
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];
      mr.ondataavailable = e => audioChunksRef.current.push(e.data);
      mr.start();
      setRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch { alert('Microphone access denied.'); }
  }

  async function stopRecording() {
    if (!mediaRecorderRef.current || !activeThread || !user) return;
    const duration = recordingTime;
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);

    await new Promise<void>(resolve => {
      mediaRecorderRef.current!.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], 'voice.webm', { type: 'audio/webm' });
        const fd = new FormData();
        fd.append('senderId', user.id);
        fd.append('receiverId', activeThread.otherId);
        fd.append('senderName', user.name);
        fd.append('senderRole', role);
        fd.append('type', 'voice');
        fd.append('text', '');
        fd.append('file', file);
        fd.append('duration', String(duration));
        await sendMessage(fd);
        resolve();
      };
    });
  }

  function toggleAudio(id: string, url: string) {
    if (playingId === id) {
      audioRefs.current.get(id)?.pause();
      setPlayingId(null);
    } else {
      audioRefs.current.forEach(a => a.pause());
      let audio = audioRefs.current.get(id);
      if (!audio) { audio = new Audio(url); audioRefs.current.set(id, audio); }
      audio.play();
      audio.onended = () => setPlayingId(null);
      setPlayingId(id);
    }
  }

  function formatTime(s: number) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }

  const myRole = role;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-paper border border-hairline rounded-2xl flex h-[600px] overflow-hidden">

        {/* Thread sidebar */}
        <div className="w-64 shrink-0 border-r border-hairline flex flex-col">
          <div className="px-4 py-3.5 border-b border-hairline">
            <p className="text-xs font-bold text-subink uppercase tracking-wider">Conversations</p>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-hairline">
            {threads.length === 0 && (
              <p className="text-xs text-subink text-center py-8">No conversations yet</p>
            )}
            {threads.map(t => (
              <button key={t.threadId} onClick={() => setActiveThread(t)}
                className={`w-full text-left px-4 py-3 hover:bg-canvas transition-colors ${
                  activeThread?.threadId === t.threadId ? 'bg-accent-50 border-l-2 border-accent-500' : ''
                }`}>
                <div className="flex items-center gap-2 mb-0.5">
                  {t.otherAvatar
                    ? <img src={t.otherAvatar} className="w-7 h-7 rounded-full object-cover shrink-0" alt="" />
                    : <div className="w-7 h-7 rounded-full bg-accent-100 flex items-center justify-center text-xs font-bold text-accent-600 shrink-0">
                        {t.otherName[0]}
                      </div>
                  }
                  <p className="text-sm font-semibold text-ink truncate flex-1">{t.otherName}</p>
                  {t.unreadCount > 0 && (
                    <span className="text-[10px] bg-accent-500 text-white rounded-full px-1.5 py-0.5 shrink-0">{t.unreadCount}</span>
                  )}
                </div>
                <p className="text-[11px] text-subink truncate pl-9">{t.lastMessage || '...'}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-hairline flex items-center gap-3 shrink-0">
            {activeThread ? (
              <>
                <div className="w-9 h-9 rounded-full bg-accent-100 flex items-center justify-center text-sm font-bold text-accent-600">
                  {activeThread.otherName[0]}
                </div>
                <div>
                  <p className="text-sm font-bold text-ink">{activeThread.otherName}</p>
                  <p className="text-[10px] text-ok">Active</p>
                </div>
              </>
            ) : (
              <p className="text-sm text-subink">Select a conversation</p>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-canvas/30">
            {!activeThread && (
              <p className="text-center text-sm text-subink py-10">Select a conversation to start chatting</p>
            )}
            {messages.map(m => {
              const isMine = m.senderId === user?.id;
              return (
                <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[72%] flex flex-col gap-1 ${isMine ? 'items-end' : 'items-start'}`}>
                    {m.type === 'text' && (
                      <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                        isMine ? 'bg-accent-500 text-white rounded-br-sm' : 'bg-paper border border-hairline text-ink rounded-bl-sm'
                      }`}>{m.text}</div>
                    )}
                    {m.type === 'image' && m.fileUrl && (
                      <img src={m.fileUrl} alt="img" className="max-w-[200px] rounded-xl border border-hairline cursor-pointer hover:opacity-90"
                        onClick={() => window.open(m.fileUrl!, '_blank')} />
                    )}
                    {m.type === 'voice' && m.fileUrl && (
                      <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl ${isMine ? 'bg-accent-500 text-white' : 'bg-paper border border-hairline'}`}>
                        <button onClick={() => toggleAudio(m.id, m.fileUrl!)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${isMine ? 'bg-white/20 hover:bg-white/30' : 'bg-accent-100 hover:bg-accent-200'}`}>
                          {playingId === m.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                        <div>
                          <p className="text-xs font-semibold">Voice message</p>
                          {m.duration && <p className="text-[10px] opacity-70">{formatTime(m.duration)}</p>}
                        </div>
                        <Mic className="w-4 h-4 opacity-50" />
                      </div>
                    )}
                    {m.type === 'video' && m.fileUrl && (
                      <video src={m.fileUrl} controls className="max-w-[240px] rounded-xl border border-hairline" />
                    )}
                    <span className="text-[10px] text-gray-400">
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>

          {/* Input bar */}
          {activeThread && (
            <div className="px-4 py-3 border-t border-hairline shrink-0 bg-paper">
              {recording && (
                <div className="flex items-center gap-3 mb-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-sm text-red-600 font-semibold">Recording {formatTime(recordingTime)}</span>
                  <button onClick={stopRecording} className="ml-auto text-red-600 hover:text-red-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <form onSubmit={handleSendText} className="flex items-center gap-2">
                {/* Image upload */}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'image')} />
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="w-9 h-9 rounded-xl bg-canvas hover:bg-accent-50 flex items-center justify-center text-subink hover:text-accent-500 transition-colors shrink-0">
                  <Image className="w-4 h-4" />
                </button>

                {/* Video upload */}
                <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={e => handleFileUpload(e, 'video')} />
                <button type="button" onClick={() => videoRef.current?.click()}
                  className="w-9 h-9 rounded-xl bg-canvas hover:bg-accent-50 flex items-center justify-center text-subink hover:text-accent-500 transition-colors shrink-0">
                  <Video className="w-4 h-4" />
                </button>

                {/* Voice recording */}
                <button type="button" onClick={recording ? stopRecording : startRecording}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                    recording ? 'bg-red-500 text-white animate-pulse' : 'bg-canvas hover:bg-accent-50 text-subink hover:text-accent-500'
                  }`}>
                  {recording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                {/* Text input */}
                <input value={draft} onChange={e => setDraft(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-canvas border border-hairline rounded-xl px-4 py-2.5 text-sm text-ink placeholder:text-gray-400 focus:outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100" />

                {/* Send */}
                <button type="submit" disabled={!draft.trim() || sending}
                  className="w-9 h-9 rounded-xl bg-accent-500 hover:bg-accent-600 disabled:opacity-40 text-white flex items-center justify-center transition-colors shrink-0">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
