import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import { TaskCard } from './TaskCard';
import { TaskDetailModal } from './TaskDetailModal';

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
  dueDate?: string;
  description?: string;
  checklists?: any[];
  attachments?: any[];
}

interface List {
  id: string;
  title: string;
  order: number;
  color?: string;
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
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // List Management State
  const [activeListMenuId, setActiveListMenuId] = useState<string | null>(null);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListTitle, setEditingListTitle] = useState('');

  const { isConnected, emit, on } = useSocket();

  const fetchLists = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/lists?goalId=${goalId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        const defaultSorted = data.map(list => {
          const sortedTasks = [...list.tasks].sort((a: any, b: any) => {
            if (!a.dueDate && !b.dueDate) return a.order - b.order;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            const diff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            if (diff === 0) return a.order - b.order;
            return diff;
          });
          return { ...list, tasks: sortedTasks };
        });
        setLists(defaultSorted);
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

  const handleUpdateList = async (listId: string, updates: any) => {
    try {
      const res = await fetch(`http://localhost:3001/api/lists/${listId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        fetchLists();
        setEditingListId(null);
      }
    } catch (error) {
      console.error('Failed to update list:', error);
    }
  };

  const handleDeleteList = async (listId: string) => {
    if (!window.confirm("Delete this list and all its cards?")) return;
    try {
      await fetch(`http://localhost:3001/api/lists/${listId}`, { method: 'DELETE' });
      fetchLists();
    } catch (error) {
      console.error('Failed to delete list:', error);
    }
  };

  const handleSortList = async (listId: string, sortType: 'date' | 'alpha') => {
    setActiveListMenuId(null);
    const list = lists.find(l => l.id === listId);
    if (!list) return;

    const sortedTasks = [...list.tasks].sort((a, b) => {
      if (sortType === 'date') {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      } else {
        return a.title.localeCompare(b.title);
      }
    });

    // Update locally
    const newLists = lists.map(l => l.id === listId ? { ...l, tasks: sortedTasks } : l);
    setLists(newLists);

    try {
      await Promise.all(sortedTasks.map((t, index) =>
        fetch(`http://localhost:3001/api/tasks/${t.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: index })
        })
      ));
      fetchLists();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddList = async () => {
    if (!newListTitle.trim() || !goalId) {
      setIsAddingList(false);
      return;
    }
    try {
      const res = await fetch('http://localhost:3001/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newListTitle, goalId })
      });
      if (res.ok) {
        setNewListTitle('');
        setIsAddingList(false);
        fetchLists();
      }
    } catch (error) {
      console.error('Failed to create list:', error);
    }
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

      </div>

      {isLoading ? (
        <BoardSkeleton />
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 flex-1 overflow-x-auto overflow-y-hidden pb-4 select-none px-2 items-start" style={{ scrollSnapType: 'x mandatory' }}>
            {lists.map(list => (
              <div 
                key={list.id} 
                className="w-[300px] sm:w-[320px] flex-shrink-0 bg-[#f1f2f4] rounded-xl flex flex-col max-h-full snap-start shadow-sm relative transition-all"
                style={{ borderLeft: list.color ? `4px solid ${list.color}` : '4px solid transparent' }}
              >
                <div className="p-3 pl-4 pr-2 flex justify-between items-center rounded-t-xl group">
                  {editingListId === list.id ? (
                    <input 
                       autoFocus
                       className="font-bold text-slate-800 text-sm bg-white border border-blue-500 rounded px-2 py-1 w-full mr-2"
                       value={editingListTitle}
                       onChange={e => setEditingListTitle(e.target.value)}
                       onBlur={() => handleUpdateList(list.id, { title: editingListTitle })}
                       onKeyDown={e => { if (e.key === 'Enter') handleUpdateList(list.id, { title: editingListTitle }); }}
                    />
                  ) : (
                    <h3 
                      className="font-bold text-slate-800 text-sm cursor-pointer hover:bg-slate-300/30 px-2 py-1 rounded -ml-2 transition-colors flex-1"
                      onDoubleClick={() => { setEditingListId(list.id); setEditingListTitle(list.title); }}
                    >
                      {list.title}
                    </h3>
                  )}
                  
                  <div className="flex items-center">
                    <span className="text-slate-500 text-xs py-1 px-2 font-mono">
                      {list.tasks.length}
                    </span>
                    <button 
                      onClick={() => setActiveListMenuId(activeListMenuId === list.id ? null : list.id)}
                      className="p-1.5 rounded hover:bg-slate-300/50 text-slate-500 transition-colors ml-1"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                    </button>
                  </div>
                </div>

                {/* List Dropdown Menu */}
                {activeListMenuId === list.id && (
                  <div className="absolute top-12 right-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 z-50 py-1 overflow-hidden">
                    <div className="px-3 py-2 border-b border-slate-100 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500">List actions</span>
                      <button onClick={() => setActiveListMenuId(null)} className="text-slate-400 hover:text-slate-600">
                         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                    <button 
                      onClick={() => { setEditingListId(list.id); setEditingListTitle(list.title); setActiveListMenuId(null); }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                    >
                      ✏️ Rename List
                    </button>
                    <div className="px-4 py-2 text-sm text-slate-700 flex items-center gap-2 border-b border-slate-100">
                      🎨 Color: 
                      {['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', 'transparent'].map(color => (
                        <div 
                           key={color} 
                           onClick={() => { handleUpdateList(list.id, { color: color === 'transparent' ? null : color }); setActiveListMenuId(null); }}
                           className="w-4 h-4 rounded-full cursor-pointer hover:scale-110 shadow-sm border border-slate-200"
                           style={{ background: color === 'transparent' ? '#fff' : color }}
                        />
                      ))}
                    </div>
                    <button 
                       onClick={() => handleSortList(list.id, 'date')}
                       className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2 border-t border-slate-100"
                     >
                       📅 Sort by Date
                     </button>
                     <button 
                       onClick={() => handleSortList(list.id, 'alpha')}
                       className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2 border-b border-slate-100"
                     >
                       🔤 Sort Alphabetically
                     </button>
                    <button 
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                    >
                      📦 Archive List
                    </button>
                    <button 
                      onClick={() => { handleDeleteList(list.id); setActiveListMenuId(null); }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      🗑️ Delete List
                    </button>
                  </div>
                )}
                
                <Droppable droppableId={list.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`px-3 py-1 flex-1 overflow-y-auto space-y-2 min-h-[50px] transition-colors rounded-b-xl ${
                        snapshot.isDraggingOver ? 'bg-slate-300/30' : ''
                      }`}
                    >
                      {list.tasks.map((task, index) => (
                        <TaskCard 
                          key={task.id} 
                          task={task} 
                          index={index}
                          onDelete={handleDeleteTask}
                          onProgressChange={handleProgressChange}
                          onClick={() => setSelectedTask(task)}
                        />
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
                
                <div className="p-2 pb-3 mx-2 mt-1 rounded-b-xl text-slate-500">
                  <button 
                    onClick={() => setAddingTaskToListId(list.id)}
                    className="w-full py-2 px-3 text-left rounded-lg text-sm font-medium hover:bg-slate-300/50 hover:text-slate-700 transition-all flex items-center gap-2"
                  >
                    <span>+</span> Add a card
                  </button>
                </div>
              </div>
            ))}

            <div className="w-[300px] sm:w-[320px] flex-shrink-0">
              {isAddingList ? (
                <div className="bg-[#f1f2f4] p-3 rounded-xl shadow-sm transition-all duration-200">
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
                  className="w-full p-3 bg-white/50 backdrop-blur-sm border border-transparent rounded-xl text-slate-800 font-bold hover:bg-white hover:shadow-sm transition-all flex items-center justify-start gap-2 group text-sm"
                >
                  <span className="text-xl leading-none px-1">+</span> Add another list
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

      {selectedTask && (
        <TaskDetailModal 
          task={selectedTask} 
          onClose={() => setSelectedTask(null)} 
          onTaskUpdated={(updatedTask) => {
            // Update the task in the board lists without full refetch if we want, or just re-fetch lists.
            fetchLists();
            setSelectedTask(updatedTask);
          }}
        />
      )}
    </div>
  );
}
