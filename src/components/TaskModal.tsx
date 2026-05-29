import React, { useState, useEffect } from 'react';
import { X, Calendar, User, Tag, AlertCircle, Plus, Trash2, Lock } from 'lucide-react';
import { Task } from '../types';

interface TaskModalProps {
  isOpen: boolean;
  task?: Task | null;
  columnId?: 'todo' | 'in_progress' | 'review' | 'done';
  onClose: () => void;
  onSave: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  currentUserId: string;
  currentUserName: string;
  onLock: (taskId: string) => void;
  onUnlock: (taskId: string) => void;
}

const COMMON_TAGS = ['Frontend', 'Backend', 'UI', 'DevOps', 'Aesthetic', 'QA', 'Bug', 'Feature', 'Spec'];

export default function TaskModal({
  isOpen,
  task,
  columnId = 'todo',
  onClose,
  onSave,
  onDelete,
  currentUserId,
  currentUserName,
  onLock,
  onUnlock,
}: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'todo' | 'in_progress' | 'review' | 'done'>('todo');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [assignee, setAssignee] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // 1. Synchronize form state on load
  useEffect(() => {
    if (isOpen) {
      if (task) {
        // Edit mode
        setTitle(task.title);
        setDescription(task.description);
        setStatus(task.status);
        setPriority(task.priority);
        setAssignee(task.assignee);
        setDueDate(task.dueDate || '');
        setTags(task.tags || []);
        
        // Broadcast client-side lock state to prevent mid-air collision
        onLock(task.id);
      } else {
        // Create mode
        setTitle('');
        setDescription('');
        setStatus(columnId);
        setPriority('medium');
        setAssignee('Unassigned');
        setDueDate(new Date(Date.now() + 86400000).toISOString().split('T')[0]); // tomorrow default
        setTags([]);
      }
    }

    return () => {
      // Release lock on unmount/close
      if (task && isOpen) {
        onUnlock(task.id);
      }
    };
  }, [isOpen, task, columnId]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const savedTask: Task = {
      id: task ? task.id : `task-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      assignee: assignee.trim() || 'Unassigned',
      tags,
      dueDate,
      createdAt: task ? task.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(savedTask);
    onClose();
  };

  const handleDelete = () => {
    if (task && onDelete) {
      if (window.confirm(`Are you sure you want to delete "${task.title}"?`)) {
        onDelete(task.id);
        onClose();
      }
    }
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleToggleTag = (t: string) => {
    if (tags.includes(t)) {
      setTags(tags.filter(item => item !== t));
    } else {
      setTags([...tags, t]);
    }
  };

  const handleRemoveTag = (indexToRemove: number) => {
    setTags(tags.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in select-none">
      {/* Container box */}
      <div 
        className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl overflow-hidden shadow-xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Block */}
        <div className="border-b border-slate-150 p-4 bg-slate-50 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-display font-extrabold text-slate-850 uppercase tracking-widest">
              {task ? '🔩 Modify Task Card' : '➕ Create New Card'}
            </h2>
            {task && (
              <p className="text-[10px] text-indigo-600 font-mono mt-0.5 flex items-center gap-1.5">
                <Lock size={12} /> Live holding editing lock on #{task.id}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 cursor-pointer bg-white border border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-slate-700 rounded-lg transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Card Title */}
          <div>
            <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">Task Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-sans focus:bg-white"
              placeholder="e.g. Architect REST WebSockets"
              required
              maxLength={80}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-sans resize-none focus:bg-white"
              placeholder="Detailed task brief..."
              maxLength={400}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Status Section */}
            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">Status Column</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 font-semibold focus:bg-white"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
            </div>

            {/* Set Priority */}
            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-705 focus:outline-none focus:border-indigo-500 font-semibold focus:bg-white"
              >
                <option value="low">🟡 Low</option>
                <option value="medium">🟠 Medium</option>
                <option value="high">🔴 High</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Owner Email / Name */}
            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <User size={12} /> Assignee
              </label>
              <input
                type="text"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
                placeholder="Assignee name"
                maxLength={30}
              />
            </div>

            {/* Target Due Date */}
            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Calendar size={12} /> Target Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Tags manager */}
          <div className="space-y-2">
            <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Tag size={12} /> Task Labels & Tags
            </label>
            
            {/* Custom Input tag */}
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Add custom tag..."
                maxLength={15}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-1.5 cursor-pointer bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-semibold text-slate-650 flex items-center gap-1.5"
              >
                <Plus size={12} />
                <span>Add</span>
              </button>
            </div>

            {/* Interactive presets */}
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              {COMMON_TAGS.map((t) => {
                const active = tags.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleToggleTag(t)}
                    className={`px-2.5 py-0.5 rounded text-[10px] font-mono transition font-semibold cursor-pointer border ${
                      active
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-550 border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>

            {/* Selected active tags pocket */}
            {tags.length > 0 && (
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 flex flex-wrap gap-1.5">
                {tags.map((t, idx) => (
                  <span
                    key={`${t}-${idx}`}
                    className="px-2 py-0.5 rounded bg-white text-[10px] font-semibold text-slate-600 border border-slate-200 flex items-center gap-1.5 shrink-0 shadow-3xs"
                  >
                    <span>{t}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(idx)}
                      className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-0.5 rounded cursor-pointer"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </form>

        {/* Footer controls */}
        <div className="border-t border-slate-150 p-4 bg-slate-50 flex items-center justify-between">
          <div>
            {task && onDelete && (
              <button
                type="button"
                id="btn-delete-task"
                onClick={handleDelete}
                className="px-3.5 py-1.5 cursor-pointer bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Trash2 size={13} />
                <span>Delete Task</span>
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 cursor-pointer bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSave}
              className="px-4 py-1.5 cursor-pointer bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 transition-all"
            >
              Save Board Card
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
