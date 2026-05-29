import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { BoardState, Task, Member, ChatMessage, Activity } from './src/types';

const app = express();
const server = http.createServer(app);
const PORT = 3000;

// Shared in-memory data store for collaborative boards
// roomId -> BoardState
const roomStates = new Map<string, BoardState>();

// Active WebSocket connections mapped per room ID
interface ClientConnection {
  userId: string;
  ws: WebSocket;
}
const roomClients = new Map<string, ClientConnection[]>();

// Activity helper
function createActivity(roomId: string, userId: string, userName: string, userColor: string, text: string, taskId?: string): Activity {
  const log: Activity = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    userId,
    userName,
    userColor,
    text,
    taskId,
  };
  
  const state = roomStates.get(roomId);
  if (state) {
    state.activity.push(log);
    // Limit log history to keep payload size optimal
    if (state.activity.length > 100) {
      state.activity.shift();
    }
  }
  return log;
}

// Initial Board States generator
function initializeRoom(roomId: string): BoardState {
  const initialTasks: Task[] = [
    {
      id: 'task-1',
      title: '🚀 Configure Multi-User Server',
      description: 'Establish WebSocket connections and HTTP proxies on Port 3000 for local real-time sync.',
      status: 'done',
      priority: 'high',
      assignee: 'Alice (Server)',
      tags: ['DevOps', 'Infrag'],
      dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'task-2',
      title: '⚡ Code Live Presence Indicators',
      description: 'Show active board participants in real-time, matching avatar colors and active editor highlight rings.',
      status: 'in_progress',
      priority: 'high',
      assignee: 'Unassigned',
      tags: ['Frontend', 'UI'],
      dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'task-3',
      title: '🎨 Polish Spring Motion Effects',
      description: 'Implement seamless drag-and-drop feedback and staggered entrance animations for columns and cards.',
      status: 'todo',
      priority: 'medium',
      assignee: 'Unassigned',
      tags: ['Aesthetic', 'Motion'],
      dueDate: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'task-4',
      title: '🛡️ Test Relational Lockouts',
      description: 'Verify fields are temporarily locked for editing while another active board member has the task modal open.',
      status: 'todo',
      priority: 'low',
      assignee: 'Unassigned',
      tags: ['Spec', 'Locking'],
      dueDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const state: BoardState = {
    roomId,
    tasks: initialTasks,
    members: {},
    chat: [
      {
        id: 'welcome-msg',
        timestamp: new Date().toISOString(),
        userId: 'system',
        userName: 'Collaborator Bot',
        userColor: '#10B981',
        text: 'Welcome to your real-time whiteboard channel! Invite collaborators by sharing this room URL or join code.',
      },
    ],
    activity: [
      {
        id: 'welcome-log',
        timestamp: new Date().toISOString(),
        userId: 'system',
        userName: 'System',
        userColor: '#6B7280',
        text: 'Room environment initialized with starter blueprints.',
      },
    ],
  };

  roomStates.set(roomId, state);
  return state;
}

// REST endpoints
app.use(express.json());

// API check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', onlineMembers: Array.from(roomClients.values()).reduce((sum, list) => sum + list.length, 0) });
});

// Broadcast changes to active peers inside a specific room
function broadcastToRoom(roomId: string, messagePayload: any, excludeUserId?: string) {
  const clients = roomClients.get(roomId) || [];
  const payloadStr = JSON.stringify(messagePayload);
  
  clients.forEach(({ userId, ws }) => {
    if (userId !== excludeUserId && ws.readyState === WebSocket.OPEN) {
      ws.send(payloadStr);
    }
  });
}

// Setup WebSocket Server bound to our single HTTP Server
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const parsedUrl = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  if (pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (ws: WebSocket, request: http.IncomingMessage) => {
  const parsedUrl = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
  
  const roomId = parsedUrl.searchParams.get('room') || 'default-project';
  const userId = parsedUrl.searchParams.get('userId') || `user-${Math.random().toString(36).substr(2, 6)}`;
  const userName = parsedUrl.searchParams.get('name') || 'Anonymous';
  const userEmail = parsedUrl.searchParams.get('email') || '';
  const userColor = parsedUrl.searchParams.get('color') || `#${Math.floor(Math.random() * 16777215).toString(16)}`;

  // 1. Fetch or initialize Board State
  let state = roomStates.get(roomId);
  if (!state) {
    state = initializeRoom(roomId);
  }

  // 2. Add current user as member
  const newMember: Member = {
    id: userId,
    name: userName,
    email: userEmail,
    color: userColor,
    cursor: null,
    currentEditingTaskId: null,
    lastActive: new Date().toISOString(),
  };
  state.members[userId] = newMember;

  // Track live client connection
  if (!roomClients.has(roomId)) {
    roomClients.set(roomId, []);
  }
  roomClients.get(roomId)!.push({ userId, ws });

  // 3. Log user arrival
  const activityLog = createActivity(roomId, userId, userName, userColor, `${userName} joined the room.`);
  
  // 4. Send INITIAL full Board state to newly connected client
  ws.send(JSON.stringify({
    type: 'init',
    roomId,
    state,
  }));

  // 5. Notify everyone else of member join & log it
  broadcastToRoom(roomId, {
    type: 'member:join',
    roomId,
    member: newMember,
  }, userId);

  broadcastToRoom(roomId, {
    type: 'activity:log',
    roomId,
    activity: activityLog,
  }, userId);

  // 6. Monitor incoming real-time transactions
  ws.on('message', (data: string) => {
    try {
      const message = JSON.parse(data);
      if (message.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
        return;
      }

      const activeState = roomStates.get(roomId);
      if (!activeState) return;

      switch (message.type) {
        case 'task:upsert': {
          const incomingTask = message.task as Task;
          const isNew = !activeState.tasks.some(t => t.id === incomingTask.id);
          
          if (isNew) {
            activeState.tasks.push(incomingTask);
          } else {
            activeState.tasks = activeState.tasks.map(t => t.id === incomingTask.id ? incomingTask : t);
          }
          
          const textLog = isNew 
            ? `created task "${incomingTask.title}"` 
            : `updated task "${incomingTask.title}"`;
            
          const act = createActivity(roomId, userId, userName, userColor, textLog, incomingTask.id);
          
          // Broadcast to all peers (including self to synchronize update timestamps)
          broadcastToRoom(roomId, {
            type: 'task:upsert',
            roomId,
            task: incomingTask,
            actorId: userId,
          });
          
          broadcastToRoom(roomId, {
            type: 'activity:log',
            roomId,
            activity: act,
          });
          break;
        }

        case 'task:delete': {
          const targetId = message.taskId as string;
          const taskObj = activeState.tasks.find(t => t.id === targetId);
          if (taskObj) {
            activeState.tasks = activeState.tasks.filter(t => t.id !== targetId);
            const act = createActivity(roomId, userId, userName, userColor, `deleted task "${taskObj.title}"`);
            
            broadcastToRoom(roomId, {
              type: 'task:delete',
              roomId,
              taskId: targetId,
              actorId: userId,
            });
            
            broadcastToRoom(roomId, {
              type: 'activity:log',
              roomId,
              activity: act,
            });
          }
          break;
        }

        case 'task:lock': {
          const tId = message.taskId as string;
          activeState.tasks = activeState.tasks.map(t => {
            if (t.id === tId) {
              return { ...t, lockedBy: userId, lockedByName: userName };
            }
            return t;
          });
          activeState.members[userId].currentEditingTaskId = tId;

          broadcastToRoom(roomId, {
            type: 'task:lock',
            roomId,
            taskId: tId,
            actorId: userId,
            actorName: userName,
          });
          break;
        }

        case 'task:unlock': {
          const tId = message.taskId as string;
          activeState.tasks = activeState.tasks.map(t => {
            if (t.id === tId) {
              return { ...t, lockedBy: null, lockedByName: null };
            }
            return t;
          });
          activeState.members[userId].currentEditingTaskId = null;

          broadcastToRoom(roomId, {
            type: 'task:unlock',
            roomId,
            taskId: tId,
            actorId: userId,
          });
          break;
        }

        case 'cursor:move': {
          const coord = message.cursor as { x: number; y: number };
          if (activeState.members[userId]) {
            activeState.members[userId].cursor = coord;
            activeState.members[userId].lastActive = new Date().toISOString();
          }

          broadcastToRoom(roomId, {
            type: 'cursor:move',
            roomId,
            userId,
            cursor: coord,
          }, userId); // exclude sender for performance
          break;
        }

        case 'chat:message': {
          const clientMsg = message.message as ChatMessage;
          const formattedMsg: ChatMessage = {
            ...clientMsg,
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            timestamp: new Date().toISOString(),
            userId,
            userName,
            userColor,
          };
          
          activeState.chat.push(formattedMsg);
          if (activeState.chat.length > 100) {
            activeState.chat.shift();
          }

          const act = createActivity(roomId, userId, userName, userColor, `sent chat message: "${formattedMsg.text.substring(0, 30)}${formattedMsg.text.length > 30 ? '...' : ''}"`);

          broadcastToRoom(roomId, {
            type: 'chat:message',
            roomId,
            message: formattedMsg,
          });
          
          broadcastToRoom(roomId, {
            type: 'activity:log',
            roomId,
            activity: act,
          });
          break;
        }
      }
    } catch (e) {
      console.error('Error handling WebSocket message', e);
    }
  });

  // Handle client unexpected loss or standard socket closing
  ws.on('close', () => {
    const clients = roomClients.get(roomId) || [];
    const remaining = clients.filter(c => c.ws !== ws);
    roomClients.set(roomId, remaining);

    const activeState = roomStates.get(roomId);
    if (activeState) {
      // Release any locks held by the disconnected user
      activeState.tasks = activeState.tasks.map(t => {
        if (t.lockedBy === userId) {
          return { ...t, lockedBy: null, lockedByName: null };
        }
        return t;
      });

      // Remove from members
      delete activeState.members[userId];

      // Broadcast removal
      broadcastToRoom(roomId, {
        type: 'member:leave',
        roomId,
        memberId: userId,
      });

      // Log departure
      const act = createActivity(roomId, userId, userName, userColor, `${userName} left the room.`);
      broadcastToRoom(roomId, {
        type: 'activity:log',
        roomId,
        activity: act,
      });
    }
  });

  ws.on('error', (err) => {
    console.error(`Socket error from user ${userId} in room ${roomId}:`, err);
  });
});

// Boot Full-stack Assets Integration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Collaborative Multi-User Server listening on http://localhost:${PORT}`);
  });
}

startServer();
