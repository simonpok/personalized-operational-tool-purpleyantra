import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import { TaskCard } from './TaskCard';

function BoardSkeleton() {
  return (
    <div className="flex gap-6 flex-1 overflow-x-auto pb-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="w-[320px] flex-shrink-0 bg-slate-100 rounded-2xl p-4 flex flex-col gap-4">
          <div className="h-6 w-24 skeleton mb-2" />
          <div className="h-32 skeleton" />
          <div className="h-32 skeleton" />
          <div className="h-32 skeleton" />
        </div>
      ))}
    </div>
  );
}

interface Task {
  id: string;
  title: string;
  listId: string;
  projectId: string;
  departmentId: string;
  technicality: number;
  regularity: number;
  urgency: number;
  truScore: number;
  progress: number;
  order: number;
  department?: { color: string, name: string };
}

interface List {
  id: string;
  title: string;
  order: number;
  tasks: Task[];
}

export function Board() {
  const { goalId } = useParams();
  const [lists, setLists] = useState<List[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [goalTitle, setGoalTitle] = useState('');
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [addingTaskToListId, setAddingTaskToListId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDeptId, setNewTaskDeptId] = useState('');
  const [newTaskTRU, setNewTaskTRU] = useState({ T: 3, R: 3, U: 3 });
  const [isLoading, setIsLoading] = useState(true);
  const [departments, setDepartments] = useState<{id: string, name: string, color: string}[]>([]);

  const { isConnected, emit, on } = useSocket();

  const fetchLists = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/lists?goalId=${goalId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setLists(data);
      }
    } catch (e) {
      console.error('Failed to fetch lists', e);
    }
  };

  const fetchGoalData = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/stats/${goalId}`);
      const data = await res.json();
      if (data && !data.error) {
        setGoalTitle(data.goalTitle);
        setDepartments(data.departments);
        if (data.departments.length > 0 && !newTaskDeptId) {
          setNewTaskDeptId(data.departments[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to fetch goal data', e);
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([fetchLists(), fetchGoalData()]);
      setIsLoading(false);
    };
    init();

    const offProgress = on('progress:updated', (data) => {
      setLists(prev => prev.map(list => ({
        ...list,
        tasks: list.tasks.map(t => t.id === data.taskId ? { ...t, progress: data.progress } : t)
      })));
    });

    const offBoard = on('board:updated', () => {
      fetchLists();
    });

    return () => {
      offProgress();
      offBoard();
    };
  }, [on, goalId]);

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    // Optimistic update
    const sourceList = lists.find(l => l.id === source.droppableId);
    const destList = lists.find(l => l.id === destination.droppableId);
    if (!sourceList || !destList) return;

    const newLists = Array.from(lists);
    const sourceTasks = Array.from(sourceList.tasks);
    const [movedTask] = sourceTasks.splice(source.index, 1);
    
    if (source.droppableId === destination.droppableId) {
      sourceTasks.splice(destination.index, 0, movedTask);
      const newList = { ...sourceList, tasks: sourceTasks };
      setLists(newLists.map(l => l.id === newList.id ? newList : l));
    } else {
      const destTasks = Array.from(destList.tasks);
      destTasks.splice(destination.index, 0, { ...movedTask, listId: destination.droppableId });
      setLists(newLists.map(l => {
        if (l.id === source.droppableId) return { ...l, tasks: sourceTasks };
        if (l.id === destination.droppableId) return { ...l, tasks: destTasks };
        return l;
      }));
    }

    // Emit to backend
    emit('task:drag', {
      taskId: draggableId,
      newListId: destination.droppableId,
      newOrder: destination.index
    });
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await fetch(`http://localhost:3001/api/tasks/${taskId}`, { method: 'DELETE' });
      fetchLists();
    } catch (e) {
      console.error(e);
    }
  };

  const handleProgressChange = (taskId: string, newProgress: number) => {
    emit('task:progress:update', { taskId, progress: newProgress });
  };

  const handleAddList = async () => {
    if (!newListTitle.trim() || !goalId) {
      setIsAddingList(false);
      return;
    }
    // Note: In refined backend, lists are created per goal
    // We'll update the API call to use goalId
    // ...
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !addingTaskToListId || !goalId || !newTaskDeptId) return;
    
    // Simple TRU calculation: (T + R + U) / 3
    const truScore = (newTaskTRU.T + newTaskTRU.R + newTaskTRU.U) / 3;

    try {
      const res = await fetch('http://localhost:3001/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTaskTitle,
          listId: addingTaskToListId,
          goalId,
          departmentId: newTaskDeptId,
          technicality: newTaskTRU.T,
          regularity: newTaskTRU.R,
          urgency: newTaskTRU.U,
          truScore
        })
      });
      if (res.ok) {
        setNewTaskTitle('');
        setAddingTaskToListId(null);
        fetchLists();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-8 h-screen bg-slate-50 flex flex-col font-sans overflow-hidden">
      <div className="flex justify-between items-center mb-8 bg-white shadow-sm border border-slate-200 p-4 rounded-xl flex-shrink-0">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold font-mono tracking-tight text-slate-800 uppercase">Operational Board</h2>
            <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">{goalTitle}</p>
          </div>
          <div className="text-xs text-slate-500 font-mono flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`}></span>
            {isConnected ? 'LIVE SYNC' : 'OFFLINE'}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link to={`/goal/${goalId}/dashboard`} className="text-blue-600 hover:text-blue-700 bg-blue-50 px-4 py-2 rounded-lg font-semibold text-sm transition-colors">
            Mission Control
          </Link>
        </div>
      </div>

      {isLoading ? (
        <BoardSkeleton />
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-6 flex-1 overflow-x-auto overflow-y-hidden pb-4 select-none">
            {lists.map(list => (
              <div key={list.id} className="w-[320px] flex-shrink-0 bg-slate-200/50 rounded-2xl border border-slate-200/60 flex flex-col max-h-full snap-start shadow-sm">
                <div className="p-4 flex justify-between items-center bg-white/40 border-b border-slate-200/50 rounded-t-2xl">
                  <h3 className="font-bold text-slate-700 text-xs tracking-widest uppercase">{list.title}</h3>
                  <span className="bg-white/80 text-slate-600 text-[10px] py-1 px-2 rounded-full font-mono shadow-sm border border-slate-100">
                    {list.tasks.length}
                  </span>
                </div>
                
                <Droppable droppableId={list.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`px-3 pt-3 pb-1 flex-1 overflow-y-auto space-y-3 transition-colors ${
                        snapshot.isDraggingOver ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      {list.tasks.map((task, index) => (
                        <TaskCard 
                          key={task.id} 
                          task={task} 
                          index={index}
                          onDelete={handleDeleteTask}
                          onProgressChange={handleProgressChange}
                        />
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
                
                <div className="p-3 border-t border-slate-200/50">
                  <button 
                    onClick={() => setAddingTaskToListId(list.id)}
                    className="w-full py-2 border border-dashed border-slate-300 rounded-lg text-slate-400 text-xs font-semibold hover:bg-white/50 hover:border-slate-400 hover:text-slate-500 transition-all"
                  >
                    + Add Card
                  </button>
                </div>
              </div>
            ))}

            <div className="w-[280px] flex-shrink-0">
              {isAddingList ? (
                <div className="bg-slate-200/50 p-4 rounded-2xl border border-slate-200/60 shadow-sm transition-all duration-200 scale-100">
                  <input
                    autoFocus
                    className="w-full p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3 text-sm font-medium text-slate-700 shadow-inner"
                    placeholder="Enter list title..."
                    value={newListTitle}
                    onChange={(e) => setNewListTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddList();
                      if (e.key === 'Escape') setIsAddingList(false);
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddList}
                      className="flex-1 bg-blue-600 text-white text-xs font-bold py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20"
                    >
                      Add List
                    </button>
                    <button
                      onClick={() => setIsAddingList(false)}
                      className="bg-white text-slate-500 text-xs font-bold px-3 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setIsAddingList(true)}
                  className="w-full p-4 bg-slate-200/40 border-2 border-dashed border-slate-300 rounded-2xl text-slate-400 font-bold hover:bg-slate-200/60 hover:border-slate-400 hover:text-slate-500 transition-all flex items-center justify-center gap-2 group"
                >
                  <div className="bg-white/50 p-1 rounded-lg group-hover:bg-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </div>
                  Add List
                </button>
              )}
            </div>
          </div>
        </DragDropContext>
      )}

      {/* Add Task Modal */}
      {addingTaskToListId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-white/20 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-bold text-slate-800">New Task Card</h3>
              <button onClick={() => setAddingTaskToListId(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Task Title</label>
                <input 
                  autoFocus
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium transition-all"
                  placeholder="What needs to be done?"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Department</label>
                <select 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium appearance-none"
                  value={newTaskDeptId}
                  onChange={(e) => setNewTaskDeptId(e.target.value)}
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-4 pt-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">TRU Estimation (1-5)</label>
                
                {[
                  { label: 'Technicality', key: 'T', color: 'purple' },
                  { label: 'Regularity', key: 'R', color: 'cyan' },
                  { label: 'Urgency', key: 'U', color: 'orange' }
                ].map((tru) => (
                  <div key={tru.key} className="flex items-center gap-4">
                    <div className={`w-28 text-[10px] font-bold text-${tru.color}-600 bg-${tru.color}-50 px-2 py-1 rounded-full uppercase tracking-tighter`}>
                      {tru.label}
                    </div>
                    <input 
                      type="range" min="1" max="5" step="1"
                      className="flex-1 accent-blue-600"
                      value={newTaskTRU[tru.key as keyof typeof newTaskTRU]}
                      onChange={(e) => setNewTaskTRU({...newTaskTRU, [tru.key]: parseInt(e.target.value)})}
                    />
                    <span className="font-mono font-bold text-slate-700 w-4">{newTaskTRU[tru.key as keyof typeof newTaskTRU]}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex gap-3">
              <button 
                onClick={handleAddTask}
                className="flex-1 bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98]"
              >
                Create Task Card
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
