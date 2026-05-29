import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Activity as ActivityIcon, Send, ChevronRight, ChevronLeft, Calendar } from 'lucide-react';
import { ChatMessage, Activity, Member } from '../types';

interface ChatPanelProps {
  chat: ChatMessage[];
  activity: Activity[];
  members: Record<string, Member>;
  currentUserId: string;
  onSendMessage: (text: string) => void;
}

export default function ChatPanel({
  chat,
  activity,
  members,
  currentUserId,
  onSendMessage,
}: ChatPanelProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'activity'>('chat');
  const [isOpen, setIsOpen] = useState(true);
  const [msgInput, setMsgInput] = useState('');
  
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const activityEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll utility
  const scrollToBottom = () => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      activityEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat, activity, activeTab, isOpen]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgInput.trim()) return;
    onSendMessage(msgInput.trim());
    setMsgInput('');
  };

  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div
      className={`relative h-[calc(100vh-140px)] flex bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs transition-all duration-300 select-none ${
        isOpen ? 'w-full md:w-80' : 'w-12'
      }`}
    >
      {/* Absolute Toggle tab ribbon */}
      <button
        id="btn-toggle-chat-panel"
        onClick={() => setIsOpen(!isOpen)}
        className="absolute -left-3 top-1/2 -translate-y-1/2 h-10 w-6 cursor-pointer bg-white border border-slate-200 flex items-center justify-center rounded-lg hover:bg-slate-50 hover:text-slate-800 text-slate-400 focus:outline-none shadow-xs z-30"
      >
        {isOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Collapsed view banner */}
      {!isOpen ? (
        <div className="w-full flex flex-col items-center py-4 gap-6 text-slate-400 bg-slate-50/50">
          <button
            onClick={() => {
              setIsOpen(true);
              setActiveTab('chat');
            }}
            className="p-1.5 cursor-pointer hover:bg-slate-100 rounded-lg hover:text-indigo-600 transition"
            title="Open Chat"
          >
            <MessageSquare size={16} />
          </button>
          <button
            onClick={() => {
              setIsOpen(true);
              setActiveTab('activity');
            }}
            className="p-1.5 cursor-pointer hover:bg-slate-100 rounded-lg hover:text-emerald-600 transition"
            title="Open Activity Logs"
          >
            <ActivityIcon size={16} />
          </button>
        </div>
      ) : (
        /* Full Deck Layout */
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Tabs Selector */}
          <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50 p-1">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-display font-semibold cursor-pointer rounded-lg transition ${
                activeTab === 'chat'
                  ? 'bg-white text-indigo-600 border border-slate-200 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
              }`}
            >
              <MessageSquare size={14} />
              <span>Room Chat</span>
              {chat.length > 0 && (
                <span className="bg-indigo-50 text-indigo-600 text-[10px] px-1.5 py-0.5 rounded-full font-mono font-medium">
                  {chat.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('activity')}
              className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-display font-semibold cursor-pointer rounded-lg transition ${
                activeTab === 'activity'
                  ? 'bg-white text-emerald-600 border border-slate-200 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
              }`}
            >
              <ActivityIcon size={14} />
              <span>Activity Log</span>
              {activity.length > 0 && (
                <span className="bg-emerald-50 text-emerald-700 text-[10px] px-1.5 py-0.5 rounded-full font-mono font-medium">
                  {activity.length}
                </span>
              )}
            </button>
          </div>

          {/* Tab content areas */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0 bg-slate-50/20">
            {activeTab === 'chat' ? (
              /* Chat Message list */
              chat.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-450 text-slate-500 text-xs py-8">
                  <p className="font-mono">No messages yet.</p>
                  <p className="mt-1 text-[10px] text-slate-400">Send an action log or chat comments!</p>
                </div>
              ) : (
                chat.map((msg) => {
                  const isMe = msg.userId === currentUserId;
                  const memberColor = msg.userColor || '#475569';
                  
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col max-w-[85%] ${
                        isMe ? 'self-end items-end' : 'self-start items-start'
                      } animate-fade-in`}
                    >
                      {/* Name header */}
                      <span
                        className="text-[10px] font-mono font-bold mb-0.5 flex items-center gap-1"
                        style={{ color: memberColor }}
                      >
                        {msg.userName} {isMe && <span className="text-slate-400 text-[9px]">(You)</span>}
                      </span>
                      
                      {/* Chat text box */}
                      <div
                        className={`px-3 py-2 text-xs rounded-xl ${
                          isMe
                            ? 'bg-indigo-600 text-white rounded-tr-none'
                            : 'bg-slate-100 text-slate-850 rounded-tl-none border border-slate-200/50 shadow-2xs'
                        }`}
                      >
                        <p className="break-all whitespace-pre-wrap">{msg.text}</p>
                      </div>

                      {/* Timestamp */}
                      <span className="text-[8px] text-slate-400 mt-1 font-mono">
                        {formatTimestamp(msg.timestamp)}
                      </span>
                    </div>
                  );
                })
              )
            ) : (
              /* Activity Logs */
              activity.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs py-8">
                  <p className="font-mono">No board activities yet.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {activity.map((act) => (
                    <div
                      key={act.id}
                      className="text-[11px] leading-snug bg-white border border-slate-200 p-2.5 rounded-lg flex gap-2 items-start animate-fade-in shadow-2xs"
                    >
                      <span
                        className="h-2 w-2 rounded-full mt-1 shrink-0"
                        style={{ backgroundColor: act.userColor || '#64748b' }}
                      />
                      <div className="flex-1">
                        <span className="font-semibold text-slate-850 font-display">
                          {act.userName}
                        </span>{' '}
                        <span className="text-slate-500 font-sans">{act.text}</span>
                        <div className="text-[9px] text-slate-400 mt-1 flex items-center gap-1 font-mono">
                          <Calendar size={10} />
                          <span>{formatTimestamp(act.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
            <div ref={chatEndRef} />
            <div ref={activityEndRef} />
          </div>

          {/* Chat Form Footer */}
          {activeTab === 'chat' && (
            <form onSubmit={handleSend} className="p-3 border-t border-slate-200 bg-slate-50 flex gap-2 items-center">
              <input
                type="text"
                value={msgInput}
                onChange={(e) => setMsgInput(e.target.value)}
                placeholder="Type a group message..."
                maxLength={120}
                className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-450 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="p-1.5 cursor-pointer bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-lg transition-all shadow-sm shadow-indigo-150"
                title="Send Chat"
              >
                <Send size={14} />
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
