'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Image, Mic, MicOff, Video, Play, Pause, X, Stethoscope, Search } from 'lucide-react';
import { getStoredUser } from '@/lib/auth';

interface Message {
  id: string; sender: 'farmer' | 'doctor'; senderId: string; senderName: string;
  type: 'text' | 'image' | 'voice' | 'video'; text: string;
  fileUrl?: string | null; duration?: number; createdAt: string;
}
interface Thread {
  threadId: string; otherId: string; otherName: string; otherAvatar?: string;
  lastMessage: string; lastMessageTime?: string; unreadCount: number;
}

function groupByDate(msgs: Message[]) {
  const groups: { date: string; messages: Message[] }[] = [];
  msgs.forEach(m => {
    const date = new Date(m.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const last = groups[groups.length - 1];
    if (last && last.date === date) last.messages.push(m);
    else groups.push({ date, messages: [m] });
  });
  return groups;
}
function fmt(s: number) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }

export default function DoctorChat() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recTime, setRecTime] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Lock: prevent auto-selection overwriting user's manual pick
  const userHasSelectedRef = useRef(false);
  const activeThreadIdRef = useRef<string | null>(null);
  useEffect(() => { activeThreadIdRef.current = activeThreadId; }, [activeThreadId]);

  const user = getStoredUser();

  const loadThreads = useCallback(() => {
    if (!user?.id) return;
    fetch(`/api/chat?userId=${user.id}`)
      .then(r => r.json())
      .then(d => {
        const list: Thread[] = d.threads || [];
        setThreads(list);
        // Only auto-select first thread if user hasn't picked one yet
        if (!userHasSelectedRef.current && !activeThreadIdRef.current && list.length > 0) {
          setActiveThreadId(list[0].threadId);
        }
      }).catch(console.error);
  }, [user?.id]);

  useEffect(() => { loadThreads(); }, []);
  useEffect(() => { const iv = setInterval(loadThreads, 5000); return () => clearInterval(iv); }, [user?.id]);

  useEffect(() => {
    if (!activeThreadId || !user?.id) return;
    const load = () => fetch(`/api/chat?userId=${user.id}&threadId=${activeThreadId}`)
      .then(r => r.json()).then(d => setMessages(d.messages || [])).catch(console.error);
    load();
    const iv = setInterval(load, 3000);
    return () => clearInterval(iv);
  }, [activeThreadId, user?.id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  function selectThread(threadId: string) {
    userHasSelectedRef.current = true;
    setActiveThreadId(threadId);
    setMessages([]);
  }

  const activeThread = threads.find(t => t.threadId === activeThreadId) || null;

  async function sendMsg(fd: FormData) {
    setSending(true);
    try {
      const res = await fetch('/api/chat', { method: 'POST', body: fd });
      if (!res.ok) return;
      const data = await res.json();
      setMessages(prev => [...prev, data.message]);
      loadThreads();
    } finally { setSending(false); }
  }

  async function handleText(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || !activeThread || !user) return;
    const fd = new FormData();
    fd.append('senderId', user.id); fd.append('receiverId', activeThread.otherId);
    fd.append('senderName', user.name); fd.append('senderRole', 'farmer');
    fd.append('type', 'text'); fd.append('text', draft.trim());
    setDraft(''); await sendMsg(fd);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') {
    const file = e.target.files?.[0]; if (!file || !activeThread || !user) return;
    const fd = new FormData();
    fd.append('senderId', user.id); fd.append('receiverId', activeThread.otherId);
    fd.append('senderName', user.name); fd.append('senderRole', 'farmer');
    fd.append('type', type); fd.append('text', ''); fd.append('file', file);
    await sendMsg(fd); e.target.value = '';
  }

  async function startRec() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mrRef.current = mr; chunksRef.current = [];
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.start(); setRecording(true); setRecTime(0);
      timerRef.current = setInterval(() => setRecTime(t => t + 1), 1000);
    } catch { alert('Microphone access denied.'); }
  }

  async function stopRec() {
    if (!mrRef.current || !activeThread || !user) return;
    const dur = recTime;
    mrRef.current.stop(); mrRef.current.stream.getTracks().forEach(t => t.stop());
    setRecording(false); if (timerRef.current) clearInterval(timerRef.current);
    await new Promise<void>(resolve => {
      mrRef.current!.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const fd = new FormData();
        fd.append('senderId', user!.id); fd.append('receiverId', activeThread!.otherId);
        fd.append('senderName', user!.name); fd.append('senderRole', 'farmer');
        fd.append('type', 'voice'); fd.append('text', '');
        fd.append('file', new File([blob], 'voice.webm', { type: 'audio/webm' }));
        fd.append('duration', String(dur));
        await sendMsg(fd); resolve();
      };
    });
  }

  function toggleAudio(id: string, url: string) {
    if (playingId === id) { audioRefs.current.get(id)?.pause(); setPlayingId(null); return; }
    audioRefs.current.forEach(a => a.pause());
    let audio = audioRefs.current.get(id);
    if (!audio) { audio = new Audio(url); audioRefs.current.set(id, audio); }
    audio.play(); audio.onended = () => setPlayingId(null); setPlayingId(id);
  }

  const filteredThreads = threads.filter(t => !search || t.otherName.toLowerCase().includes(search.toLowerCase()));
  const grouped = groupByDate(messages);

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-12rem)] flex rounded-2xl overflow-hidden border border-hairline shadow-card">

      {/* Doctor list sidebar */}
      <div className="w-72 shrink-0 flex flex-col border-r border-gray-200 bg-white">
        <div className="px-4 py-3 bg-[#075E54]">
          <p className="text-white font-bold text-base">Vet Conversations</p>
          <p className="text-white/70 text-xs">
            {threads.length > 0 ? `${threads.length} doctor${threads.length !== 1 ? 's' : ''}` : 'Opens after case review'}
          </p>
        </div>
        {/* Search */}
        <div className="px-3 py-2 bg-[#F0F2F5]">
          <div className="flex items-center gap-2 bg-white rounded-full px-3 py-1.5 shadow-sm">
            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search doctors"
              className="flex-1 text-xs text-gray-700 bg-transparent outline-none" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {filteredThreads.length === 0 && (
            <div className="px-4 py-10 text-center">
              <div className="w-14 h-14 rounded-full bg-[#075E54]/10 flex items-center justify-center mx-auto mb-3">
                <Stethoscope className="w-7 h-7 text-[#075E54]/40" />
              </div>
              <p className="text-xs font-semibold text-gray-500">No conversations yet</p>
              <p className="text-xs text-gray-400 mt-1">Chat opens automatically after a vet reviews your case.</p>
            </div>
          )}
          {filteredThreads.map(t => (
            <button
              key={t.threadId}
              onClick={() => selectThread(t.threadId)}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left ${
                activeThreadId === t.threadId ? 'bg-[#F0F2F5]' : ''
              }`}>
              {t.otherAvatar
                ? <img src={t.otherAvatar} className="w-12 h-12 rounded-full object-cover shrink-0" alt="" />
                : <div className="w-12 h-12 rounded-full bg-[#075E54]/20 flex items-center justify-center text-[#075E54] font-bold text-lg shrink-0">
                    {t.otherName[0]?.toUpperCase() || 'D'}
                  </div>
              }
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-800 truncate">Dr. {t.otherName}</p>
                  {t.lastMessageTime && (
                    <p className="text-[10px] text-gray-400 shrink-0 ml-1">
                      {new Date(t.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs text-gray-400 truncate">{t.lastMessage || '...'}</p>
                  {t.unreadCount > 0 && (
                    <span className="text-[10px] bg-[#25D366] text-white rounded-full w-5 h-5 flex items-center justify-center font-bold shrink-0 ml-1">
                      {t.unreadCount > 9 ? '9+' : t.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {!activeThread ? (
          <div className="flex-1 flex items-center justify-center" style={{ background: '#F0F2F5' }}>
            <div className="text-center">
              <div className="w-24 h-24 rounded-full bg-[#075E54]/10 flex items-center justify-center mx-auto mb-4">
                <Stethoscope className="w-12 h-12 text-[#075E54]/30" />
              </div>
              <p className="text-gray-500 font-semibold">Select a veterinarian</p>
              <p className="text-gray-400 text-sm mt-1 max-w-xs px-4">
                Conversations open automatically when a vet reviews your case.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-[#075E54] text-white shrink-0">
              {activeThread.otherAvatar
                ? <img src={activeThread.otherAvatar} className="w-10 h-10 rounded-full object-cover" alt="" />
                : <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">
                    {activeThread.otherName[0]?.toUpperCase() || 'D'}
                  </div>
              }
              <div>
                <p className="font-semibold text-sm">Dr. {activeThread.otherName}</p>
                <p className="text-xs text-white/70">Veterinarian · Online</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-0.5" style={{ background: '#ECE5DD' }}>
              {messages.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-16">No messages yet. Send the first one!</p>
              )}
              {grouped.map(group => (
                <div key={group.date}>
                  <div className="flex justify-center my-3">
                    <span className="bg-white/80 text-gray-500 text-[10px] font-medium px-3 py-1 rounded-full shadow-sm">{group.date}</span>
                  </div>
                  {group.messages.map(m => {
                    const isMine = m.senderId === user?.id;
                    return (
                      <div key={m.id} className={`flex mb-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-2xl px-3 py-2 shadow-sm ${
                          isMine ? 'bg-[#DCF8C6] rounded-tr-sm' : 'bg-white rounded-tl-sm'
                        }`}>
                          {!isMine && <p className="text-[10px] font-bold text-[#075E54] mb-0.5">Dr. {m.senderName}</p>}
                          {m.type === 'text' && <p className="text-sm text-gray-800 leading-relaxed break-words">{m.text}</p>}
                          {m.type === 'image' && m.fileUrl && (
                            <img src={m.fileUrl} alt="img"
                              className="max-w-[200px] rounded-xl cursor-pointer hover:opacity-90 mb-1"
                              onClick={() => window.open(m.fileUrl!, '_blank')} />
                          )}
                          {m.type === 'voice' && m.fileUrl && (
                            <div className="flex items-center gap-2 min-w-[180px]">
                              <button onClick={() => toggleAudio(m.id, m.fileUrl!)}
                                className="w-8 h-8 rounded-full bg-[#075E54] flex items-center justify-center text-white shrink-0">
                                {playingId === m.id ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                              </button>
                              <div className="flex-1 h-1 bg-gray-300 rounded-full">
                                <div className="h-1 bg-[#075E54] rounded-full w-1/3" />
                              </div>
                              <span className="text-[10px] text-gray-500">{m.duration ? fmt(m.duration) : '0:00'}</span>
                              <Mic className="w-3.5 h-3.5 text-gray-400" />
                            </div>
                          )}
                          {m.type === 'video' && m.fileUrl && (
                            <video src={m.fileUrl} controls className="max-w-[220px] rounded-xl" />
                          )}
                          <div className={`flex items-center mt-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                            <span className="text-[10px] text-gray-400">
                              {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div ref={endRef} />
            </div>

            {/* Input bar */}
            <div className="px-3 py-2 bg-[#F0F2F5] shrink-0">
              {recording && (
                <div className="flex items-center gap-3 mb-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-sm text-red-600 font-medium">Recording {fmt(recTime)}</span>
                  <button onClick={stopRec} className="ml-auto"><X className="w-4 h-4 text-red-600" /></button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e, 'image')} />
                <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={e => handleFile(e, 'video')} />
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-500 hover:bg-gray-100 shadow-sm shrink-0">
                  <Image className="w-5 h-5" />
                </button>
                <button type="button" onClick={() => videoRef.current?.click()}
                  className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-500 hover:bg-gray-100 shadow-sm shrink-0">
                  <Video className="w-5 h-5" />
                </button>
                <form onSubmit={handleText} className="flex-1 flex items-center gap-2">
                  <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Message your vet..."
                    className="flex-1 bg-white border-0 rounded-full px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none shadow-sm" />
                  {draft.trim() ? (
                    <button type="submit" disabled={sending}
                      className="w-10 h-10 rounded-full bg-[#075E54] hover:bg-[#064e45] text-white flex items-center justify-center shadow-sm shrink-0">
                      <Send className="w-4 h-4" />
                    </button>
                  ) : (
                    <button type="button" onClick={recording ? stopRec : startRec}
                      className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm shrink-0 ${
                        recording ? 'bg-red-500 text-white animate-pulse' : 'bg-[#075E54] text-white'
                      }`}>
                      {recording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                  )}
                </form>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
