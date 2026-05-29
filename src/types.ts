export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high';
  assignee: string;
  tags: string[];
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  lockedBy?: string | null;      // ID of user presently modifying this task
  lockedByName?: string | null;  // Name of user presently modifying this task
}

export interface Member {
  id: string;
  name: string;
  email: string;
  color: string;
  cursor?: { x: number; y: number } | null;
  currentEditingTaskId?: string | null;
  lastActive: string;
}

export interface ChatMessage {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userColor: string;
  text: string;
}

export interface Activity {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userColor: string;
  text: string;
  taskId?: string;
}

export interface BoardState {
  roomId: string;
  tasks: Task[];
  members: Record<string, Member>;
  chat: ChatMessage[];
  activity: Activity[];
}

export type SocketMessage =
  | { type: 'init'; roomId: string; state: BoardState }
  | { type: 'task:upsert'; roomId: string; task: Task; actorId: string }
  | { type: 'task:delete'; roomId: string; taskId: string; actorId: string }
  | { type: 'task:lock'; roomId: string; taskId: string; actorId: string; actorName: string }
  | { type: 'task:unlock'; roomId: string; taskId: string; actorId: string }
  | { type: 'member:join'; roomId: string; member: Member }
  | { type: 'member:leave'; roomId: string; memberId: string }
  | { type: 'cursor:move'; roomId: string; userId: string; cursor: { x: number; y: number } }
  | { type: 'chat:message'; roomId: string; message: ChatMessage }
  | { type: 'activity:log'; roomId: string; activity: Activity }
  | { type: 'ping' };
