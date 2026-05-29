import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, KanbanSquare, GitPullRequest, HelpCircle, Activity } from 'lucide-react';
import { BoardState, Task, Member, ChatMessage, SocketMessage } from './types';
import MemberAvatars from './components/MemberAvatars';
import TaskBoard from './components/TaskBoard';
import LiveCursors from './components/LiveCursors';
import ChatPanel from './components/ChatPanel';
import TaskModal from './components/TaskModal';

// Retrieve or generate unique client-side identity coordinates
function getStoredIdentity() {
  const storedId = localStorage.getItem('collab_userId');
  const storedName = localStorage.getItem('collab_name');
  const storedEmail = localStorage.getItem('collab_email');
  const storedColor = localStorage.getItem('collab_color');

  const userId = storedId || `user-${Math.random().toString(36).substr(2, 6)}`;
  const name = storedName || `Developer #${Math.floor(Math.random() * 900 + 100)}`;
  const email = storedEmail || '';
  const color = storedColor || `#${Math.floor(Math.random() * 16777215).toString(16)}`;

  localStorage.setItem('collab_userId', userId);
  localStorage.setItem('collab_name', name);
  localStorage.setItem('collab_email', email);
  localStorage.setItem('collab_color', color);

  return { userId, name, email, color };
}

export default function App() {
  const [identity, setIdentity] = useState(getStoredIdentity);
  
  // Deriving room ID from query string, or defaulting to "main-board"
  const [roomId, setRoomId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room') || 'main-board';
  });

  // Master board states
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Record<string, Member>>({});
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  // Modal control states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [targetColumnId, setTargetColumnId] = useState<'todo' | 'in_progress' | 'review' | 'done'>('todo');

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const boardContainerRef = useRef<HTMLDivElement | null>(null);
  const lastEmitTimeRef = useRef<number>(0);

  // Synchronize URI search param when room state changes
  useEffect(() => {
    const newUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    window.history.replaceState({ path: newUrl }, '', newUrl);
  }, [roomId]);

  // Handle active socket loops
  useEffect(() => {
    setConnectionStatus('connecting');
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws?room=${roomId}&userId=${identity.userId}&name=${encodeURIComponent(identity.name)}&email=${encodeURIComponent(identity.email)}&color=${encodeURIComponent(identity.color)}`;

    console.log('Connecting to WebSocket channel: ', wsUrl);
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      console.log('Handshake established with collaborative server.');
      setConnectionStatus('connected');
    };

    socket.onmessage = (event) => {
      try {
        const payload: SocketMessage = JSON.parse(event.data);
        
        switch (payload.type) {
          case 'init':
            setTasks(payload.state.tasks);
            setMembers(payload.state.members);
            setChat(payload.state.chat);
            setActivity(payload.state.activity);
            break;

          case 'task:upsert':
            setTasks((prev) => {
              const exists = prev.some((t) => t.id === payload.task.id);
              if (exists) {
                return prev.map((t) => t.id === payload.task.id ? payload.task : t);
              }
              return [...prev, payload.task];
            });
            break;

          case 'task:delete':
            setTasks((prev) => prev.filter((t) => t.id !== payload.taskId));
            break;

          case 'task:lock':
            setTasks((prev) =>
              prev.map((t) =>
                t.id === payload.taskId
                  ? { ...t, lockedBy: payload.actorId, lockedByName: payload.actorName }
                  : t
              )
            );
            setMembers((prev) => {
              if (prev[payload.actorId]) {
                return {
                  ...prev,
                  [payload.actorId]: {
                    ...prev[payload.actorId],
                    currentEditingTaskId: payload.taskId,
                  },
                };
              }
              return prev;
            });
            break;

          case 'task:unlock':
            setTasks((prev) =>
              prev.map((t) =>
                t.id === payload.taskId ? { ...t, lockedBy: null, lockedByName: null } : t
              )
            );
            setMembers((prev) => {
              if (prev[payload.actorId]) {
                return {
                  ...prev,
                  [payload.actorId]: {
                    ...prev[payload.actorId],
                    currentEditingTaskId: null,
                  },
                };
              }
              return prev;
            });
            break;

          case 'member:join':
            setMembers((prev) => ({
              ...prev,
              [payload.member.id]: payload.member,
            }));
            break;

          case 'member:leave':
            setMembers((prev) => {
              const updated = { ...prev };
              delete updated[payload.memberId];
              return updated;
            });
            break;

          case 'cursor:move':
            setMembers((prev) => {
              if (prev[payload.userId]) {
                return {
                  ...prev,
                  [payload.userId]: {
                    ...prev[payload.userId],
                    cursor: payload.cursor,
                  },
                };
              }
              return prev;
            });
            break;

          case 'chat:message':
            setChat((prev) => [...prev, payload.message]);
            break;

          case 'activity:log':
            setActivity((prev) => [...prev, payload.activity]);
            break;
        }
      } catch (err) {
        console.error('Error receiving websocket frames', err);
      }
    };

    socket.onclose = () => {
      console.warn('Real-time channel closed. Scheduling retry.');
      setConnectionStatus('disconnected');
      // Auto-reconnect polling loops
      reconnectTimeoutRef.current = window.setTimeout(() => {
        setConnectionStatus('connecting');
        // trigger reload loop
        setRoomId((prev) => prev);
      }, 4000);
    };

    socket.onerror = (e) => {
      console.error('Channel error occurred:', e);
      setConnectionStatus('disconnected');
    };

    // Heartbeat ping loops
    const keepalive = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, 20000);

    return () => {
      clearInterval(keepalive);
      socket.close();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [roomId, identity.userId]);

  // Identity changes handler
  const handleUpdateIdentity = (newName: string, newEmail: string, newColor: string) => {
    const updated = { ...identity, name: newName, email: newEmail, color: newColor };
    setIdentity(updated);
    localStorage.setItem('collab_name', newName);
    localStorage.setItem('collab_email', newEmail);
    localStorage.setItem('collab_color', newColor);

    // Notify peers that my values changed by joining the room with new details
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close(); // closing socket will trigger reconnect with updated credentials
    }
  };

  // Switch workspace channels
  const handleChangeRoom = (targetRoomId: string) => {
    setRoomId(targetRoomId);
  };

  // General payload sender
  const sendWsMessage = (payload: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  };

  // Locks management signals
  const handleTaskLock = (taskId: string) => {
    sendWsMessage({
      type: 'task:lock',
      roomId,
      taskId,
      actorId: identity.userId,
      actorName: identity.name,
    });
  };

  const handleTaskUnlock = (taskId: string) => {
    sendWsMessage({
      type: 'task:unlock',
      roomId,
      taskId,
      actorId: identity.userId,
    });
  };

  // Actions transitions
  const handleAddTask = (colId: 'todo' | 'in_progress' | 'review' | 'done') => {
    setActiveTask(null);
    setTargetColumnId(colId);
    setIsModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setActiveTask(task);
    setIsModalOpen(true);
  };

  const handleSaveTask = (task: Task) => {
    sendWsMessage({
      type: 'task:upsert',
      roomId,
      task,
      actorId: identity.userId,
    });
  };

  const handleDeleteTask = (taskId: string) => {
    sendWsMessage({
      type: 'task:delete',
      roomId,
      taskId,
      actorId: identity.userId,
    });
  };

  const handleMoveTask = (taskId: string, newStatus: 'todo' | 'in_progress' | 'review' | 'done') => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      const updated: Task = {
        ...task,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };
      
      handleSaveTask(updated);
    }
  };

  // Pointer position tracker
  const handleMouseMoveThrottled = (e: React.MouseEvent) => {
    if (!boardContainerRef.current) return;
    
    const now = Date.now();
    if (now - lastEmitTimeRef.current > 65) { // 15Hz frequency
      const boardRect = boardContainerRef.current.getBoundingClientRect();
      const x = ((e.clientX - boardRect.left) / boardRect.width) * 100;
      const y = ((e.clientY - boardRect.top) / boardRect.height) * 100;

      sendWsMessage({
        type: 'cursor:move',
        roomId,
        userId: identity.userId,
        cursor: { x, y },
      });
      
      lastEmitTimeRef.current = now;
    }
  };

  // Group chat submission
  const handleSendChatMessage = (text: string) => {
    const message: ChatMessage = {
      id: '', // server handles ids
      timestamp: new Date().toISOString(),
      userId: identity.userId,
      userName: identity.name,
      userColor: identity.color,
      text,
    };

    sendWsMessage({
      type: 'chat:message',
      roomId,
      message,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col p-4 md:p-6 select-none font-sans">
      {/* Upper Navigation deck */}
      <header className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-100 text-white font-extrabold text-lg">
            <KanbanSquare size={22} />
          </div>
          <div>
            <h1 className="font-display font-extrabold text-xl tracking-tight text-slate-900 flex items-center gap-2">
              Collaborative Task Manager <Sparkles size={16} className="text-indigo-500 animate-pulse" />
            </h1>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
              Live multi-user boards on top of isolated sandbox WebSockets
            </p>
          </div>
        </div>

        {/* Tip note */}
        <div className="hidden lg:flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs text-slate-500 shadow-sm">
          <span className="text-indigo-600 font-bold uppercase tracking-wider text-[10px] bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 animate-pulse">💡 Shared Whiteboard</span>
          <span>Open this page in a <b>new tab</b> or share the URL to simulate real-time colleagues!</span>
        </div>
      </header>

      {/* Connection & Presence Management indicators */}
      <div className="mb-4">
        <MemberAvatars
          currentMember={{
            id: identity.userId,
            name: identity.name,
            email: identity.email,
            color: identity.color,
            lastActive: new Date().toISOString()
          }}
          activeRoomId={roomId}
          members={members}
          onUpdateProfile={handleUpdateIdentity}
          onChangeRoom={handleChangeRoom}
          connectionStatus={connectionStatus}
        />
      </div>

      {/* Primary collaborative deck */}
      <div 
        ref={boardContainerRef}
        onMouseMove={handleMouseMoveThrottled}
        className="flex-1 flex flex-col lg:flex-row gap-4 relative mt-2 min-h-[480px]"
      >
        {/* Render live gliding custom pointers from friends */}
        <LiveCursors members={members} currentUserId={identity.userId} />

        {/* Kanban Board Area */}
        <TaskBoard
          tasks={tasks}
          members={members}
          currentUserId={identity.userId}
          onAddTask={handleAddTask}
          onEditTask={handleEditTask}
          onMoveTask={handleMoveTask}
        />

        {/* Chat Panel Area */}
        <ChatPanel
          chat={chat}
          activity={activity}
          members={members}
          currentUserId={identity.userId}
          onSendMessage={handleSendChatMessage}
        />
      </div>

      {/* Full Task Dialog Management */}
      <TaskModal
        isOpen={isModalOpen}
        task={activeTask}
        columnId={targetColumnId}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        currentUserId={identity.userId}
        currentUserName={identity.name}
        onLock={handleTaskLock}
        onUnlock={handleTaskUnlock}
      />
    </div>
  );
}
