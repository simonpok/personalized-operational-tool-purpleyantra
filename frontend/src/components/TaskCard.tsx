import React, { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';

interface Task {
  id: string;
  title: string;
  description?: string;
  technicality: number;
  regularity: number;
  urgency: number;
  truScore: number;
  progress: number;
  department?: { color: string, name: string };
  order: number;
  dueDate?: string;

  checklists?: { id: string, title: string, items: { isCompleted: boolean }[] }[];
  attachments?: any[];
  avgT?: number;
  avgR?: number;
  avgU?: number;
  truOverall?: number;
  labels?: string;
}

interface TaskCardProps {
  task: Task;
  index: number;
  onDelete: (taskId: string) => void;
  onProgressChange: (taskId: string, newProgress: number) => void;
  onClick: () => void;
}

export function TaskCard({ task, index, onDelete, onProgressChange, onClick }: TaskCardProps) {
  const [localProgress, setLocalProgress] = useState(task.progress);

  const handlePointerUp = () => {
    if (localProgress !== task.progress) {
      onProgressChange(task.id, localProgress);
    }
  };

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={`bg-white rounded-lg shadow-[0_1px_1px_rgba(9,30,66,0.25)] hover:bg-slate-50 cursor-pointer p-3 mb-2 relative group flex flex-col gap-2 ${
            snapshot.isDragging ? 'rotate-2 scale-105 shadow-xl ring-2 ring-blue-500/50 z-50' : ''
          }`}
        >


          {task.labels && JSON.parse(task.labels).length > 0 && (
             <div className="flex flex-wrap gap-1 mb-1">
                {JSON.parse(task.labels).map((c: string) => (
                   <div key={c} className="h-2 w-10 rounded-full" style={{ backgroundColor: c }}></div>
                ))}
             </div>
          )}
          
          <div className="flex justify-between items-start">
            <h4 className="text-[#172b4d] text-sm leading-snug">{task.title}</h4>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
              className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 bg-white p-1 rounded-md"
              title="Delete Task"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
          </div>

          {/* Computed TRU Score Badges */}
          {task.truOverall !== null && task.truOverall !== undefined ? (
            <div className="flex gap-2 mb-3 pl-2">
              <span className="bg-slate-800 text-white text-[11px] font-bold px-2 py-1 rounded shadow-sm">
                T{task.avgT != null ? task.avgT.toFixed(1).replace(/\.0$/, '') : '-'}, R{task.avgR != null ? task.avgR.toFixed(1).replace(/\.0$/, '') : '-'}, U{task.avgU != null ? task.avgU.toFixed(1).replace(/\.0$/, '') : '-'}
              </span>
            </div>
          ) : (
            <div className="flex gap-2 mb-3 pl-2 opacity-50 grayscale">
              <span className="text-[10px] font-bold text-slate-400">No TRU Score Items</span>
            </div>
          )}

          {/* Badges Row */}
          <div className="flex flex-wrap gap-2 text-slate-500 items-center pl-2">
            
            {task.dueDate && (() => {
               const due = new Date(task.dueDate);
               const now = new Date();
               const diffH = (due.getTime() - now.getTime()) / (1000 * 3600);
               const isOverdue = diffH < 0;
               const isDueSoon = diffH >= 0 && diffH <= 24;
               
               let style = 'bg-slate-100 text-slate-600';
               let icon = '📅';
               if (isOverdue) { style = 'bg-red-500 text-white font-bold'; icon = '🔴'; }
               else if (isDueSoon) { style = 'bg-amber-400 text-amber-900 font-bold'; icon = '🟡'; }
               
               return (
                 <div className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded shadow-sm ${style}`}>
                    {icon} {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                 </div>
               );
            })()}

            {task.description && (
               <div title="This card has a description" className="flex items-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h16M4 18h7"/></svg>
               </div>
            )}

            {task.checklists && task.checklists.length > 0 && (() => {
              let totalItems = 0;
              let checkedItems = 0;
              task.checklists.forEach(c => {
                totalItems += c.items.length;
                checkedItems += c.items.filter(i => i.isCompleted).length;
              });
              if (totalItems === 0) return null;
              const isAllChecked = checkedItems === totalItems;
              return (
                <div className={`flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded ${isAllChecked ? 'bg-green-500 text-white font-bold' : ''}`}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  {checkedItems}/{totalItems}
                </div>
              );
            })()}

            {task.attachments && task.attachments.length > 0 && (
               <div className="flex items-center gap-1 text-[11px]">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                  {task.attachments.length}
               </div>
            )}

            {/* Stacked avatars Mockup right aligned */}
            <div className="ml-auto flex -space-x-1.5">
               <div className="w-5 h-5 rounded-full bg-blue-500 border border-white flex items-center justify-center text-[8px] font-bold text-white shadow-sm">U</div>
               <div className="w-5 h-5 rounded-full bg-indigo-500 border border-white flex items-center justify-center text-[8px] font-bold text-white shadow-sm">P</div>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
