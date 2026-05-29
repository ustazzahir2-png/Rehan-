import { MousePointer2 } from 'lucide-react';
import { Member } from '../types';

interface LiveCursorsProps {
  members: Record<string, Member>;
  currentUserId: string;
}

export default function LiveCursors({ members, currentUserId }: LiveCursorsProps) {
  const activeMembersList = Object.values(members).filter(
    (member) => member.id !== currentUserId && member.cursor
  );

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      {activeMembersList.map((m) => {
        const cursor = m.cursor!;
        // Safety lockouts for percentages
        const x = Math.max(0, Math.min(100, cursor.x));
        const y = Math.max(0, Math.min(100, cursor.y));

        return (
          <div
            key={m.id}
            className="absolute transition-all duration-100 ease-out flex items-center gap-1"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: 'translate(-2px, -2px)', // shift pointer hot point
            }}
          >
            {/* SVG custom mouse cursor tinted to user color preference */}
            <MousePointer2
              size={18}
              style={{
                color: m.color,
                fill: m.color,
              }}
              className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] transform -rotate-[15deg]"
            />
            
            {/* Hover custom user banner badge */}
            <div
              className="px-2 py-0.5 rounded text-[10px] font-mono font-medium text-white shadow-lg border flex items-center gap-1"
              style={{
                backgroundColor: m.color,
                borderColor: `${m.color}88`,
                textShadow: '0 1px 1px rgba(0,0,0,0.3)',
              }}
            >
              <span>{m.name}</span>
              {m.currentEditingTaskId && (
                <span className="bg-slate-900/40 text-[8px] px-1 rounded uppercase tracking-wider scale-90">
                  Editing
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
