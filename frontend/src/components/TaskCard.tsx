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
}

interface TaskCardProps {
  task: Task;
  index: number;
  onDelete: (taskId: string) => void;
  onProgressChange: (taskId: string, newProgress: number) => void;
}

export function TaskCard({ task, index, onDelete, onProgressChange }: TaskCardProps) {
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
          className={`bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-3 hover:shadow-md transition-shadow relative overflow-hidden group ${
            snapshot.isDragging ? 'rotate-2 scale-105 shadow-xl ring-2 ring-blue-500/50 z-50' : ''
          }`}
        >
          {task.department && (
            <div 
              className="absolute top-0 left-0 w-1 h-full" 
              style={{ backgroundColor: task.department.color }}
            />
          )}
          
          <div className="flex justify-between items-start mb-3">
            <h4 className="font-semibold text-slate-800 text-sm leading-tight pl-2">{task.title}</h4>
            <button 
              onClick={() => onDelete(task.id)}
              className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              title="Delete Task"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
          </div>

          {/* TRU Score Badges */}
          <div className="flex gap-2 mb-4 pl-2">
            <div className="flex items-center gap-1 bg-purple-50 text-purple-700 font-mono text-[10px] px-1.5 py-0.5 rounded-full border border-purple-100 shadow-sm" title="Technicality">
               T<span className="font-bold">{task.technicality}</span>
            </div>
            <div className="flex items-center gap-1 bg-cyan-50 text-cyan-700 font-mono text-[10px] px-1.5 py-0.5 rounded-full border border-cyan-100 shadow-sm" title="Regularity">
               R<span className="font-bold">{task.regularity}</span>
            </div>
            <div className="flex items-center gap-1 bg-orange-50 text-orange-700 font-mono text-[10px] px-1.5 py-0.5 rounded-full border border-orange-100 shadow-sm" title="Urgency">
               U<span className="font-bold">{task.urgency}</span>
            </div>
            <div className="ml-auto flex items-center font-bold text-[10px] bg-slate-800 text-white shadow-sm px-1.5 py-0.5 rounded">
               {task.truScore.toFixed(1)}
            </div>
          </div>

          {/* Progress Slider */}
          <div className="pl-2 relative z-10">
            <div className="flex justify-between text-[10px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">
              <span>Progress</span>
              <span className="font-mono">{localProgress}%</span>
            </div>
            <input 
              type="range" 
              min="0" max="100" 
              value={localProgress} 
              onChange={(e) => setLocalProgress(parseInt(e.target.value))}
              onPointerUp={handlePointerUp}
              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
        </div>
      )}
    </Draggable>
  );
}
