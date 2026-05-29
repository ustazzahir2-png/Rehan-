import React, { useState } from 'react';
import { Users, Copy, Check, Edit2, RotateCw, Sparkles, User, Mail, Palette } from 'lucide-react';
import { Member } from '../types';

interface MemberAvatarsProps {
  currentMember: Member;
  activeRoomId: string;
  members: Record<string, Member>;
  onUpdateProfile: (name: string, email: string, color: string) => void;
  onChangeRoom: (roomId: string) => void;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
}

const PALETTE_COLORS = [
  '#EC4899', '#f43f5e', '#8B5CF6', '#6366F1', 
  '#3B82F6', '#0EA5E9', '#10B981', '#F59E0B', 
  '#EAB308', '#D946EF', '#FF6B6B', '#4D96FF'
];

export default function MemberAvatars({
  currentMember,
  activeRoomId,
  members,
  onUpdateProfile,
  onChangeRoom,
  connectionStatus,
}: MemberAvatarsProps) {
  const [copied, setCopied] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(currentMember.name);
  const [editEmail, setEditEmail] = useState(currentMember.email);
  const [editColor, setEditColor] = useState(currentMember.color);
  const [newRoomId, setNewRoomId] = useState('');
  const [isChangingRoom, setIsChangingRoom] = useState(false);

  const activeMembersList = Object.values(members);

  const handleCopyLink = () => {
    const shareableUrl = `${window.location.origin}${window.location.pathname}?room=${activeRoomId}`;
    navigator.clipboard.writeText(shareableUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    onUpdateProfile(editName.trim(), editEmail.trim(), editColor);
    setIsEditingProfile(false);
  };

  const handleJoinOrCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomId.trim()) return;
    onChangeRoom(newRoomId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-'));
    setNewRoomId('');
    setIsChangingRoom(false);
  };

  const statusColors = {
    connected: 'bg-emerald-500 shadow-[0_0_8px_#10B981]',
    connecting: 'bg-amber-500 animate-pulse shadow-[0_0_8px_#F59E0B]',
    disconnected: 'bg-rose-500 shadow-[0_0_8px_#F43F5E]'
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Left Side: Room details & connection state */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-display font-semibold border border-indigo-100">
              <Users size={20} />
            </div>
            <span className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white ${statusColors[connectionStatus]}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-mono text-slate-400 uppercase tracking-widest">Active Workspace</h2>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${
                connectionStatus === 'connected' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                connectionStatus === 'connecting' ? 'bg-amber-50 text-amber-700 border border-amber-100 animate-pulse' :
                'bg-rose-50 text-rose-700 border border-rose-100'
              }`}>
                {connectionStatus}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-display font-extrabold text-lg text-slate-800 uppercase tracking-wide">
                #{activeRoomId}
              </span>
              <button
                id="btn-copy-room-link"
                onClick={handleCopyLink}
                className="p-1 cursor-pointer hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition-colors duration-200 flex items-center gap-1.5"
                title="Copy collaborative share link"
              >
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={13} />}
                <span className="text-xs font-semibold font-mono">{copied ? 'Copied' : 'Share'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Middle Side: Avatars of live members */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 mr-1 font-mono hidden lg:inline">Active Collaborators:</span>
          <div className="flex -space-x-2 overflow-hidden mr-3">
            {activeMembersList.slice(0, 6).map((member) => (
              <div
                key={member.id}
                className="h-8 w-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white cursor-help group relative shadow-sm"
                style={{ backgroundColor: member.color }}
                title={`${member.name} (${member.email || 'No email'})`}
              >
                {member.name.substring(0, 2).toUpperCase()}
                
                {/* Popover Bubble */}
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 text-[10px] font-sans font-medium text-slate-100 bg-slate-900 border border-slate-950 rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 shadow-xl">
                  {member.name} {member.id === currentMember.id && <span className="text-indigo-400">(You)</span>}
                  {member.email && <div className="text-[9px] text-slate-400">{member.email}</div>}
                </span>
              </div>
            ))}
            {activeMembersList.length > 6 && (
              <div className="h-8 w-8 rounded-full border-2 border-white bg-slate-100 text-xs font-bold text-slate-600 flex items-center justify-center shadow-sm">
                +{activeMembersList.length - 6}
              </div>
            )}
          </div>

          {/* Quick profile editor & board switcher */}
          <div className="flex items-center gap-2">
            <button
              id="btn-trigger-profile-edit"
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="px-3 py-1.5 cursor-pointer bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition"
            >
              <Edit2 size={13} className="inline mr-1 text-slate-500" />
              <span>My Profile</span>
            </button>
            
            <button
              id="btn-trigger-room-change"
              onClick={() => setIsChangingRoom(!isChangingRoom)}
              className="px-3 py-1.5 cursor-pointer bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition"
            >
              <RotateCw size={13} className="inline mr-1 text-slate-500" />
              <span>Switch Room</span>
            </button>
          </div>
        </div>
      </div>

      {/* Slide down: Edit Profile Panel */}
      {isEditingProfile && (
        <form onSubmit={handleSaveProfile} className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-3 max-w-xl animate-fade-in">
          <h3 className="text-xs font-bold font-display text-indigo-600 tracking-wider uppercase flex items-center gap-1.5">
            <Sparkles size={14} /> Customize Identity Card
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-slate-500 mb-1">Your Alias/Name</label>
              <div className="relative">
                <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={20}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                  placeholder="Enter name"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-500 mb-1">Collaboration Email</label>
              <div className="relative">
                <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  maxLength={50}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                  placeholder="name@company.com"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-500 mb-1 flex items-center gap-1">
              <Palette size={12} /> Live Avatar Color Accent
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {PALETTE_COLORS.map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => setEditColor(col)}
                  style={{ backgroundColor: col }}
                  className={`h-6 w-6 rounded-full cursor-pointer border-2 transition-transform duration-150 transform hover:scale-110 ${
                    editColor === col ? 'border-indigo-600 scale-125 shadow-sm shadow-indigo-600/10' : 'border-transparent'
                  }`}
                />
              ))}
              <input
                type="color"
                value={editColor}
                onChange={(e) => setEditColor(e.target.value)}
                className="h-6 w-6 rounded-full bg-transparent border-0 ring-1 ring-slate-200 cursor-pointer overflow-hidden p-0"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-1">
            <button
              type="button"
              onClick={() => setIsEditingProfile(false)}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-md text-xs font-semibold text-slate-600 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-md text-xs font-semibold text-white shadow-sm shadow-indigo-600/10 transition"
            >
              Save Identity
            </button>
          </div>
        </form>
      )}

      {/* Slide down: Switch Room Panel */}
      {isChangingRoom && (
        <form onSubmit={handleJoinOrCreateRoom} className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-3 max-w-md animate-fade-in">
          <h3 className="text-xs font-bold font-display text-emerald-600 tracking-wider uppercase">
            🚀 Access Another Shared Channel
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={newRoomId}
              onChange={(e) => setNewRoomId(e.target.value)}
              placeholder="e.g. mobile-revamp, project-beta"
              maxLength={25}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white"
              required
            />
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-semibold text-white transition-all shadow-md shadow-emerald-600/10 cursor-pointer"
            >
              Connect Board
            </button>
            <button
              type="button"
              onClick={() => setIsChangingRoom(false)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-600 transition"
            >
              Cancel
            </button>
          </div>
          <p className="text-[10px] text-slate-400 font-mono">
            * Joining will leave the current slate, releasing all locks held. Room channels are unique and created on demand.
          </p>
        </form>
      )}
    </div>
  );
}
