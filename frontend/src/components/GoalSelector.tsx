import React from 'react';
import { useNavigate } from 'react-router-dom';

interface Goal {
  id: string;
  title: string;
  s1: string;
  s2: string;
  progress: number;
  order: number;
}

interface GoalSelectorProps {
  goals: Goal[];
  currentGoalId?: string;
  onDeleteGoal?: (id: string) => void;
  onAddGoal?: (goal: { title: string, s1: string, s2: string }) => void;
}

export function GoalSelector({ goals, currentGoalId, onDeleteGoal, onAddGoal }: GoalSelectorProps) {
  const navigate = useNavigate();
  const [isAdding, setIsAdding] = React.useState(false);
  const [newGoal, setNewGoal] = React.useState({ title: '', s1: '', s2: '' });
  const [confirmGoal, setConfirmGoal] = React.useState<Goal | null>(null);

  const handleDeleteClick = (e: React.MouseEvent, goal: Goal) => {
    e.stopPropagation();
    e.preventDefault();
    setConfirmGoal(goal);
  };

  const handleConfirmDelete = () => {
    if (confirmGoal) {
      onDeleteGoal?.(confirmGoal.id);
      setConfirmGoal(null);
    }
  };

  const startAdding = () => {
    const lastGoal = goals[goals.length - 1];
    setNewGoal({
      title: `Status ${goals.length + 1}`,
      s1: lastGoal ? lastGoal.s2 : 'Initial State',
      s2: ''
    });
    setIsAdding(true);
  };

  const handleCreate = () => {
    if (newGoal.title && newGoal.s1 && newGoal.s2) {
      onAddGoal?.(newGoal);
      setIsAdding(false);
    }
  };

  return (
    <>
      {/* In-App Confirm Delete Modal */}
      {confirmGoal && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[500] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setConfirmGoal(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-white/20 animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-8 pb-4">
              <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-5">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                </svg>
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2 tracking-tight">Move to Trash?</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                <span className="font-bold text-slate-700">"{confirmGoal.title}"</span> will be moved to the Archive Chamber. You can restore it any time from the Trash Bin.
              </p>
            </div>

            {/* Goal Preview */}
            <div className="mx-8 my-4 bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full">Phase</span>
                <span className="text-sm font-bold text-slate-700">{confirmGoal.title}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                <span className="truncate">{confirmGoal.s1}</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                <span className="text-blue-500 truncate">{confirmGoal.s2}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="p-8 pt-4 flex gap-3">
              <button
                onClick={() => setConfirmGoal(null)}
                className="flex-1 bg-slate-100 text-slate-600 font-bold py-3.5 rounded-2xl hover:bg-slate-200 transition-all text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 bg-red-500 text-white font-black py-3.5 rounded-2xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/25 active:scale-[0.98] text-sm"
              >
                Move to Trash
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 p-4">
        <div className="max-w-6xl mx-auto flex items-center gap-8 overflow-x-auto no-scrollbar py-2">
          <div className="flex-shrink-0 font-mono font-black text-slate-400 text-xs tracking-widest uppercase">
            Mission Map
          </div>
          
          <div className="flex items-center gap-4">
            {goals.map((goal, index) => (
              <React.Fragment key={goal.id}>
                {/* Goal Item */}
                <div
                  className={`flex items-start p-3 rounded-xl transition-all border-2 min-w-[200px] cursor-pointer relative group/item ${
                    currentGoalId === goal.id
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-slate-100 bg-white hover:border-slate-300 hover:shadow-sm'
                  }`}
                  onClick={() => navigate(`/goal/${goal.id}/dashboard`)}
                >
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                        currentGoalId === goal.id ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
                      }`}>
                        G{index + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-700 truncate">{goal.title}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
                      <span className="truncate max-w-[70px]">{goal.s1}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                      <span className="text-blue-500 truncate max-w-[70px]">{goal.s2}</span>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-2 w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-700"
                        style={{ width: `${goal.progress ?? 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Delete button — only for non-first goals */}
                  {index > 0 && (
                    <button
                      type="button"
                      onPointerDown={e => e.stopPropagation()}
                      onClick={(e) => handleDeleteClick(e, goal)}
                      className="absolute top-2 right-2 bg-red-50 text-red-400 p-1.5 rounded-lg opacity-0 group-hover/item:opacity-100 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center z-10"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  )}
                </div>

                {/* Connector line */}
                <div className="h-[2px] w-8 bg-slate-200 rounded-full flex-shrink-0" />
              </React.Fragment>
            ))}

            {/* Add Goal / Form */}
            {isAdding ? (
              <div className="flex items-center gap-3 bg-white border-2 border-blue-200 p-3 rounded-2xl shadow-lg ring-4 ring-blue-50 animate-in zoom-in-95 duration-200">
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Goal Title"
                    className="text-xs font-bold bg-slate-50 p-2 rounded-lg border-none focus:ring-2 focus:ring-blue-500"
                    value={newGoal.title}
                    onChange={e => setNewGoal({...newGoal, title: e.target.value})}
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="S1 (Start)"
                      className="text-[10px] w-24 p-1.5 bg-slate-50 rounded-md border-none"
                      value={newGoal.s1}
                      onChange={e => setNewGoal({...newGoal, s1: e.target.value})}
                    />
                    <span className="text-slate-300">→</span>
                    <input
                      type="text"
                      placeholder="S2 (Goal)"
                      className="text-[10px] w-24 p-1.5 bg-blue-50 rounded-md border-none text-blue-600 font-bold"
                      value={newGoal.s2}
                      onChange={e => setNewGoal({...newGoal, s2: e.target.value})}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={handleCreate}
                    className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </button>
                  <button
                    onClick={() => setIsAdding(false)}
                    className="bg-slate-100 text-slate-400 p-2 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={startAdding}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-slate-400 hover:text-slate-500 transition-all text-xs font-bold group"
              >
                <span className="bg-slate-100 p-0.5 rounded group-hover:bg-slate-200">+</span>
                Add Goal
              </button>
            )}

            {/* Trash Bin */}
            <div className="flex items-center gap-4 ml-4 pl-4 border-l border-slate-200">
              <button
                onClick={() => navigate(`/goal/${currentGoalId || goals[0]?.id}/trash`)}
                className="p-3 rounded-xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all border border-transparent hover:border-red-100"
                title="Archive Chamber"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                  <line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
