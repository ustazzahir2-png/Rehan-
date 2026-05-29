import React, { useState } from 'react';
import { 
  Users, Plus, Search, Filter, AlertCircle, Calendar, Tag, Lock, CheckCircle2, List, FileText, LayoutGrid
} from 'lucide-react';
import { Task, Member } from '../types';

interface TaskBoardProps {
  tasks: Task[];
  members: Record<string, Member>;
  currentUserId: string;
  onAddTask: (columnId: 'todo' | 'in_progress' | 'review' | 'done') => void;
  onEditTask: (task: Task) => void;
  onMoveTask: (taskId: string, newStatus: 'todo' | 'in_progress' | 'review' | 'done') => void;
}

const COLUMN_SPECS = [
  { id: 'todo', title: 'To Do', color: 'border-t-2 border-t-slate-400 bg-slate-100/40 text-slate-600', badge: 'bg-slate-200/60 text-slate-600' },
  { id: 'in_progress', title: 'In Progress', color: 'border-t-2 border-t-indigo-500 bg-slate-100/40 text-indigo-700', badge: 'bg-indigo-100 text-indigo-700' },
  { id: 'review', title: 'In Review', color: 'border-t-2 border-t-amber-500 bg-slate-100/40 text-amber-700', badge: 'bg-amber-100 text-amber-700' },
  { id: 'done', title: 'Completed', color: 'border-t-2 border-t-emerald-500 bg-slate-100/40 text-emerald-700', badge: 'bg-emerald-100 text-emerald-700' },
] as const;

export default function TaskBoard({
  tasks,
  members,
  currentUserId,
  onAddTask,
  onEditTask,
  onMoveTask,
}: TaskBoardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  
  // Drag-and-drop state helpers
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

  // Collect all unique tags in task set for filter list
  const allUniqueTags = Array.from(
    new Set(tasks.flatMap((t) => t.tags || []))
  ).filter((tag) => tag.trim() !== '');

  // Master filtering workflow
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch = 
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.assignee.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    const matchesTag = !tagFilter || (t.tags && t.tags.includes(tagFilter));

    return matchesSearch && matchesPriority && matchesTag;
  });

  const handleDragStart = (e: React.DragEvent, taskId: string, isLockedByOther: boolean) => {
    if (isLockedByOther) {
      e.preventDefault();
      return;
    }
    setDraggingTaskId(taskId);
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggingTaskId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // enable drop trigger
  };

  const handleDrop = (e: React.DragEvent, targetColumn: 'todo' | 'in_progress' | 'review' | 'done') => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggingTaskId;
    
    if (taskId) {
      const task = tasks.find((t) => t.id === taskId);
      // Double check active locks to secure Board State safety
      if (task && (!task.lockedBy || task.lockedBy === currentUserId)) {
        if (task.status !== targetColumn) {
          onMoveTask(taskId, targetColumn);
        }
      }
    }
    setDraggingTaskId(null);
  };

  const getPriorityLabel = (p: Task['priority']) => {
    switch (p) {
      case 'high': return { bg: 'bg-rose-50 text-rose-600 border border-rose-100', text: '🔴 High' };
      case 'medium': return { bg: 'bg-amber-50 text-amber-600 border border-amber-100', text: '🟠 Medium' };
      case 'low': return { bg: 'bg-emerald-50 text-emerald-600 border border-emerald-100', text: '🟡 Low' };
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-4 relative select-none">
      
      {/* Search & Statistics Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row flex-wrap sm:items-center justify-between gap-3 shadow-sm">
        
        {/* Search Input Box */}
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search keywords, assignees, or details..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
          />
        </div>

        {/* Priority Filter Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Priority selector */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-1">
            {(['all', 'low', 'medium', 'high'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-3 py-1 text-[10px] font-mono font-semibold cursor-pointer rounded-md uppercase transition-all ${
                  priorityFilter === p
                    ? 'bg-white text-indigo-600 border border-slate-200 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Quick Clear label */}
          {tagFilter && (
            <button
              onClick={() => setTagFilter(null)}
              className="text-[10px] bg-indigo-55 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-mono px-2 py-1 rounded-md border border-indigo-200 cursor-pointer"
            >
              Clear Tag: {tagFilter} ×
            </button>
          )}
        </div>
      </div>

      {/* Tags Filter Ribbon, visible if tags exist */}
      {allUniqueTags.length > 0 && (
        <div className="bg-slate-100/60 border border-slate-250/50 p-2 rounded-lg flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[10px] font-mono text-slate-500 mr-1.5 uppercase flex items-center gap-1">
            <Filter size={11} className="text-slate-400" /> Filter tags:
          </span>
          {allUniqueTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
              className={`px-2.5 py-0.5 rounded text-[10px] cursor-pointer font-mono border transition ${
                tagFilter === tag
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:text-slate-950 hover:bg-slate-50 shadow-xs'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Main Kanban board stage */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full min-h-[460px]">
        {COLUMN_SPECS.map(({ id: colId, title, color, badge }) => {
          const colTasks = filteredTasks.filter((t) => t.status === colId);
          
          return (
            <div
              key={colId}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, colId)}
              className="bg-slate-100/50 border border-slate-200/80 rounded-xl flex flex-col max-h-[calc(100vh-210px)] shadow-xs"
            >
              {/* Column header */}
              <div className="p-3.5 border-b border-slate-200/60 flex items-center justify-between mb-1 bg-white/40 rounded-t-xl">
                <div className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    colId === 'todo' ? 'bg-slate-400' :
                    colId === 'in_progress' ? 'bg-indigo-500' :
                    colId === 'review' ? 'bg-amber-500' :
                    'bg-emerald-500'
                  }`} />
                  <h3 className="font-display font-bold text-xs text-slate-600 uppercase tracking-widest">
                    {title}
                  </h3>
                </div>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${badge}`}>
                  {colTasks.length}
                </span>
              </div>

              {/* Column card listing container */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2 select-none min-h-[140px] transition-colors duration-150">
                {colTasks.map((task) => {
                  const isLockedByOther = !!task.lockedBy && task.lockedBy !== currentUserId;
                  const lockedName = task.lockedByName || 'Collaborator';
                  
                  // Lookup member details for locks
                  const editingMemberColor = task.lockedBy ? (members[task.lockedBy]?.color || '#cbd5e1') : '';

                  const priorityLabel = getPriorityLabel(task.priority);

                  return (
                    <div
                      key={task.id}
                      draggable={!isLockedByOther}
                      onDragStart={(e) => handleDragStart(e, task.id, isLockedByOther)}
                      onDragEnd={handleDragEnd}
                      onClick={() => !isLockedByOther && onEditTask(task)}
                      className={`group bg-white border text-left p-3.5 rounded-xl cursor-grab transition-all duration-200 relative select-none ${
                        isLockedByOther
                          ? 'opacity-70 border-rose-100 bg-slate-50/80 cursor-not-allowed filter saturate-60'
                          : draggingTaskId === task.id
                          ? 'opacity-30 border-dashed border-indigo-400 bg-indigo-50/50 cursor-grabbing'
                          : 'border-slate-205 border-slate-200 hover:border-slate-350 hover:shadow-xs active:cursor-grabbing shadow-2xs hover:-translate-y-0.5'
                      }`}
                      style={{
                        boxShadow: task.lockedBy ? `0 0 10px ${editingMemberColor}33` : undefined,
                        borderColor: task.lockedBy ? editingMemberColor : undefined,
                      }}
                    >
                      {/* Top ribbon: priority + editing indicators */}
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold ${priorityLabel.bg}`}>
                          {priorityLabel.text}
                        </span>

                        {/* Interactive Edit Lock Badge */}
                        {task.lockedBy && (
                          <div
                            className="text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1 font-mono text-white animate-pulse"
                            style={{ backgroundColor: editingMemberColor }}
                          >
                            <Lock size={9} />
                            <span>{isLockedByOther ? lockedName : 'You are editing'}</span>
                          </div>
                        )}
                      </div>

                      {/* Title & Description details */}
                      <h4 className="font-display font-semibold text-xs leading-snug text-slate-800 group-hover:text-slate-950 transition-colors">
                        {task.title}
                      </h4>
                      {task.description && (
                        <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                          {task.description}
                        </p>
                      )}

                      {/* Card Bottom: Assignee/Dates/Tags */}
                      <div className="border-t border-slate-100 mt-3 pt-2.5 flex items-center justify-between gap-1 text-[10px]">
                        <div className="flex items-center gap-1 text-slate-500 font-medium">
                          <div className="h-4 w-4 bg-slate-100 rounded-full flex items-center justify-center font-bold text-[9px] text-indigo-600 border border-slate-200">
                            {task.assignee.substring(0, 1).toUpperCase()}
                          </div>
                          <span className="truncate max-w-[90px]">{task.assignee}</span>
                        </div>

                        {task.dueDate && (
                          <div className="text-slate-400 font-mono flex items-center gap-1 text-[9px]">
                            <Calendar size={10} />
                            <span>{task.dueDate}</span>
                          </div>
                        )}
                      </div>

                      {/* Card Labels / tags footer drawer */}
                      {task.tags && task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {task.tags.map((t) => (
                            <span
                              key={t}
                              className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-50 text-slate-500 border border-slate-150"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredTasks.filter((t) => t.status === colId).length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-[11px] font-mono border border-dashed border-slate-200 rounded-xl">
                    No items here
                  </div>
                )}
              </div>

              {/* Column Footer Drawer */}
              <div className="p-2 border-t border-slate-200/50 bg-white/20 rounded-b-xl">
                <button
                  id={`btn-add-task-${colId}`}
                  onClick={() => onAddTask(colId)}
                  className="w-full cursor-pointer bg-white hover:bg-slate-50 text-slate-500 hover:text-indigo-600 transition py-1.5 text-[11px] font-semibold flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-200 shadow-xs hover:border-indigo-200"
                >
                  <Plus size={12} />
                  <span>Add Task</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
