import React, { useState, useEffect, useRef } from 'react';

interface TaskDetailModalProps {
  task: any;
  onClose: () => void;
  onTaskUpdated: (updatedTask: any) => void;
}

export function TaskDetailModal({ task, onClose, onTaskUpdated }: TaskDetailModalProps) {
  const [localTask, setLocalTask] = useState(task);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descInput, setDescInput] = useState(task.description || '');
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [isAddingChecklist, setIsAddingChecklist] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  
  const [isLabelsOpen, setIsLabelsOpen] = useState(false);
  const [isDatesOpen, setIsDatesOpen] = useState(false);
  const [tempDate, setTempDate] = useState('');
  
  const AVAILABLE_COLORS = ['#4bce97', '#e2b203', '#faa53d', '#f87462', '#9f8fef', '#579dff'];

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Re-sync local state if prop updates
  useEffect(() => {
    setLocalTask(task);
  }, [task]);

  // General field update
  const updateTaskField = async (field: string, value: any) => {
    try {
      const res = await fetch(`http://localhost:3001/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
      if (res.ok) {
        const updated = await res.json();
        setLocalTask(updated);
        onTaskUpdated(updated);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDescSave = () => {
    setIsEditingDesc(false);
    updateTaskField('description', descInput);
  };

  // Checklists
  const handleCreateChecklist = async () => {
    if (!newChecklistTitle.trim()) return;
    try {
      const res = await fetch(`http://localhost:3001/api/tasks/${task.id}/checklists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newChecklistTitle })
      });
      if (res.ok) {
        const cl = await res.json();
        const updatedChecklists = [...(localTask.checklists || []), cl];
        const newTask = { ...localTask, checklists: updatedChecklists };
        setLocalTask(newTask);
        onTaskUpdated(newTask);
        setNewChecklistTitle('');
        setIsAddingChecklist(false);
      }
    } catch (e) { console.error(e); }
  };

  const handleCreateChecklistItem = async (checklistId: string, title: string) => {
    try {
      const res = await fetch(`http://localhost:3001/api/checklists/${checklistId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      });
      if (res.ok) {
        const item = await res.json();
        const updatedChecklists = localTask.checklists.map((cl: any) => {
          if (cl.id === checklistId) return { ...cl, items: [...cl.items, item] };
          return cl;
        });
        const newTask = { ...localTask, checklists: updatedChecklists };
        setLocalTask(newTask);
        onTaskUpdated(newTask);
      }
    } catch (e) { console.error(e); }
  };

  const toggleChecklistItem = async (itemId: string, isCompleted: boolean, checklistId: string) => {
    updateChecklistItemDirect(itemId, checklistId, { isCompleted });
  };

  const updateChecklistItemDirect = async (itemId: string, checklistId: string, payload: any) => {
    try {
      const res = await fetch(`http://localhost:3001/api/checklist-items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const updatedItem = await res.json();
        
        // Update local state
        const updatedChecklists = localTask.checklists.map((cl: any) => {
          if (cl.id === checklistId) {
            return {
              ...cl,
              items: cl.items.map((i: any) => i.id === itemId ? updatedItem : i)
            };
          }
          return cl;
        });
        const newTask = { ...localTask, checklists: updatedChecklists };
        setLocalTask(newTask);
        onTaskUpdated(newTask);
      }
    } catch (e) { console.error(e); }
  };

  const deleteChecklistItem = async (itemId: string) => {
    try {
      await fetch(`http://localhost:3001/api/checklist-items/${itemId}`, { method: 'DELETE' });
      
      // Update local state
      const updatedChecklists = localTask.checklists.map((cl: any) => ({
        ...cl,
        items: cl.items.filter((i: any) => i.id !== itemId)
      }));
      const newTask = { ...localTask, checklists: updatedChecklists };
      setLocalTask(newTask);
      onTaskUpdated(newTask);
    } catch (e) { console.error(e); }
  };

  // Attachments
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`http://localhost:3001/api/tasks/${task.id}/attachments`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const attachment = await res.json();
        const newTask = { ...localTask, attachments: [...(localTask.attachments || []), attachment] };
        setLocalTask(newTask);
        onTaskUpdated(newTask);
      }
    } catch (e) { console.error(e); }
  };

  const deleteAttachment = async (id: string) => {
    try {
      await fetch(`http://localhost:3001/api/attachments/${id}`, { method: 'DELETE' });
      const newTask = { ...localTask, attachments: localTask.attachments.filter((a: any) => a.id !== id) };
      setLocalTask(newTask);
      onTaskUpdated(newTask);
    } catch (e) { console.error(e); }
  };

  // Theme Constants
  const bgMain = "bg-[#f4f5f7] dark:bg-[#22272b]";
  const textHeading = "text-[#172b4d] dark:text-[#9fadbc]";
  const textBody = "text-slate-600 dark:text-[#b6c2cf]";
  const textMuted = "text-slate-500 dark:text-[#8c9bab]";
  const bgBtn = "bg-[#eaecf0] hover:bg-[#dfe1e6] dark:bg-[#a6c5e229] dark:hover:bg-[#a6c5e23d] transition-colors";

  return (
    <div className="fixed inset-0 z-[200] bg-black/70 flex justify-center items-start overflow-y-auto p-4 md:p-12 animate-in fade-in duration-200" onPointerDown={onClose}>
      <div 
        className={`${bgMain} w-full max-w-4xl rounded-xl shadow-2xl relative min-h-[600px] overflow-hidden flex flex-col`} 
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className={`absolute top-4 right-4 p-2 rounded-full ${bgBtn} ${textMuted} hover:text-white transition-colors z-50`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        {/* Header Layout */}
        <div className="px-6 pt-8 pb-4 flex items-start gap-4">
           <svg className={`${textHeading} mt-1 flex-shrink-0`} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
           <div>
             <h2 className={`text-2xl font-bold ${textHeading} leading-tight`}>{localTask.title}</h2>
             <p className={`text-sm ${textMuted} mt-1`}>in list <span className="underline">{localTask.list?.title || 'List'}</span></p>
           </div>
        </div>

        {/* Main Content Split */}
        <div className="flex flex-col lg:flex-row px-6 pb-8 gap-8">
          
          {/* Left Panel - Main Content */}
          <div className="flex-[3] space-y-8 min-w-0">
            
            {/* Labels display on modal */}
            {localTask.labels && JSON.parse(localTask.labels).length > 0 && (
              <div className="flex items-start gap-4 mb-2">
                 <div className="w-6 hidden md:block"></div>
                 <div className="flex-1">
                    <h3 className={`text-xs font-bold text-slate-500 uppercase mb-2`}>Labels</h3>
                    <div className="flex flex-wrap gap-2">
                       {JSON.parse(localTask.labels).map((c: string) => (
                          <div key={c} className="h-8 w-12 rounded flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity" style={{ backgroundColor: c }} onClick={() => setIsLabelsOpen(true)}></div>
                       ))}
                       <button onClick={() => setIsLabelsOpen(true)} className="h-8 w-8 flex items-center justify-center rounded bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                       </button>
                    </div>
                 </div>
              </div>
            )}

            {/* Description */}
            <div className="flex items-start gap-4">
              <svg className={`${textHeading} mt-1`} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h7"/></svg>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`text-lg font-bold ${textHeading}`}>Description</h3>
                  {localTask.description && !isEditingDesc && (
                    <button onClick={() => setIsEditingDesc(true)} className={`${bgBtn} px-3 py-1.5 rounded-md text-sm font-medium ${textHeading}`}>Edit</button>
                  )}
                </div>
                {isEditingDesc || !localTask.description ? (
                  <div className="space-y-2">
                    <textarea 
                      className={`w-full min-h-[120px] p-4 rounded-xl bg-white dark:bg-[#1d2125] border border-slate-300 dark:border-[#a6c5e229] focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm text-sm ${textHeading}`}
                      placeholder="Add a more detailed description..."
                      value={descInput}
                      onChange={e => setDescInput(e.target.value)}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button onClick={handleDescSave} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-md font-medium text-sm">Save</button>
                      <button onClick={() => {setIsEditingDesc(false); setDescInput(localTask.description || '')}} className={`${textHeading} hover:bg-slate-200 dark:hover:bg-[#a6c5e229] px-3 py-1.5 rounded-md text-sm font-medium`}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div onClick={() => setIsEditingDesc(true)} className={`cursor-pointer text-sm ${textBody} whitespace-pre-wrap leading-relaxed`}>
                     {localTask.description}
                  </div>
                )}
              </div>
            </div>

            {/* Attachments Area */}
            {localTask.attachments && localTask.attachments.length > 0 && (
              <div className="flex items-start gap-4 w-full">
                <svg className={`${textHeading} mt-1`} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                <div className="flex-1 w-full min-w-0">
                  <h3 className={`text-lg font-bold ${textHeading} mb-4`}>Attachments</h3>
                  <div className="flex flex-col gap-3 min-w-0">
                    {localTask.attachments.map((att: any) => {
                      const isImage = att.filename.match(/\.(jpeg|jpg|gif|png|webp)$/i);
                      return (
                        <div key={att.id} className={`flex min-w-0 items-center gap-4 hover:${bgBtn} p-3 rounded-lg relative group border border-transparent transition-colors`}>
                          {isImage ? (
                            <div className="w-[120px] h-[80px] flex-shrink-0 bg-[#eaecf0] dark:bg-[#1d2125] rounded shadow-sm overflow-hidden flex items-center justify-center">
                              <img src={`http://localhost:3001${att.url}`} className="max-w-full max-h-full object-contain" alt={att.filename} />
                            </div>
                          ) : (
                            <div className={`w-[120px] h-[80px] flex-shrink-0 bg-white dark:bg-[#1d2125] rounded shadow-sm flex items-center justify-center font-bold ${textMuted} uppercase text-xs border border-slate-200 dark:border-slate-700`}>
                               FILE
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold ${textHeading} truncate block`} title={att.filename}>{att.filename}</p>
                            <p className={`text-[11px] ${textMuted} mt-1`}>Added recently</p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className={`text-xs ${textMuted} cursor-pointer hover:underline`} onClick={() => deleteAttachment(att.id)}>Delete</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Checklists Core Area */}
            {localTask.checklists && localTask.checklists.map((checklist: any) => {
              const totalItems = checklist.items.length;
              const completedItems = checklist.items.filter((i: any) => i.isCompleted).length;
              const progressPercentage = totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);

              const remT = checklist.items.filter((i: any) => !i.isCompleted && i.T).reduce((acc: number, i: any) => acc + i.T, 0);
              const remR = checklist.items.filter((i: any) => !i.isCompleted && i.R).reduce((acc: number, i: any) => acc + i.R, 0);
              const remU = checklist.items.filter((i: any) => !i.isCompleted && i.U).reduce((acc: number, i: any) => acc + i.U, 0);
              const hasScoredItems = checklist.items.some((i: any) => i.T && i.R && i.U);

              return (
                <div key={checklist.id} className="flex items-start gap-4">
                  <svg className={`${textHeading} mt-1`} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-4">
                       <div className="flex items-center gap-3">
                         <h3 className={`text-lg font-bold ${textHeading}`}>{checklist.title}</h3>
                         {hasScoredItems && (
                           <span className="bg-slate-800 text-white text-[11px] font-bold px-2 py-1 rounded shadow-sm transition-all duration-300">
                             T{remT}, R{remR}, U{remU}
                           </span>
                         )}
                       </div>
                       <button className={`${bgBtn} px-3 py-1.5 rounded-md text-sm font-medium ${textHeading}`}>Delete</button>
                    </div>
                    
                    <div className="flex items-center gap-3 mb-4">
                      <span className={`text-xs ${textMuted} w-9 text-right`}>{progressPercentage}%</span>
                      <div className={`flex-1 h-2 rounded-full overflow-hidden ${progressPercentage === 100 ? 'bg-green-500/20' : bgBtn}`}>
                        <div className={`h-full transition-all duration-300 ${progressPercentage === 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{width: `${progressPercentage}%`}}></div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4 ml-12">
                      {checklist.items.map((item: any) => (
                        <div key={item.id}>
                          {/* Item Display Row */}
                          <div className={`flex items-start gap-3 p-2 rounded-md group transition-colors relative ${item.isCompleted ? 'bg-green-100 dark:bg-green-900/30' : `hover:${bgBtn}`}`}>
                            <input 
                              type="checkbox" 
                              checked={item.isCompleted} 
                              onChange={(e) => toggleChecklistItem(item.id, e.target.checked, checklist.id)}
                              className="w-4 h-4 mt-1 cursor-pointer appearance-none border-2 border-slate-400 dark:border-slate-500 rounded-sm checked:bg-transparent checked:border-green-600 dark:checked:border-green-400 relative after:content-[''] after:absolute after:hidden checked:after:block after:left-[4px] after:top-[1px] after:w-[4px] after:h-[8px] after:border-solid after:border-green-600 dark:after:border-green-400 after:border-r-2 after:border-b-2 after:rotate-45"
                            />
                            <div className="flex-1 min-w-0 flex flex-wrap items-center gap-3">
                              <span className={`text-sm ${item.isCompleted ? 'text-green-800 dark:text-green-400 font-medium' : textHeading}`}>{item.title}</span>
                              <div className="flex items-center gap-2 flex-wrap ml-auto pr-8">
                                 {/* TRU Summary Pills horizontally inline! */}
                                 {(item.T !== null && item.R !== null && item.U !== null && item.T !== undefined && item.R !== undefined && item.U !== undefined) && (
                                   <div className="flex items-center opacity-80 group-hover:opacity-100 transition-opacity">
                                     <span className="bg-slate-800 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                                       T{item.T}, R{item.R}, U{item.U}
                                     </span>
                                   </div>
                                 )}
                                 {item.dueDate && (
                                   <span className="text-[10px] bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1">
                                      📅 {new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                   </span>
                                 )}
                              </div>
                            </div>
                            
                            <button onClick={() => setEditingItemId(editingItemId === item.id ? null : item.id)} className={`absolute top-1/2 -translate-y-1/2 right-2 p-1.5 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 opacity-0 group-hover:opacity-100 ${textMuted}`}>
                               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                            </button>
                          </div>

                          {/* Expanded Item Editor */}
                          {editingItemId === item.id && (
                            <ExpandedItemEditor 
                               item={item} 
                               onSave={(payload) => { updateChecklistItemDirect(item.id, checklist.id, payload); setEditingItemId(null); }}
                               onCancel={() => setEditingItemId(null)}
                               onDelete={() => deleteChecklistItem(item.id)}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                    
                    <div className="ml-12">
                      <ChecklistItemAdder checklistId={checklist.id} onAdd={handleCreateChecklistItem} />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Comments block */}
            <div className="flex items-start gap-4">
               <svg className={`${textHeading} mt-1`} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
               <div className="flex-1">
                 <div className="flex items-center justify-between mb-4">
                   <h3 className={`text-lg font-bold ${textHeading}`}>Activity</h3>
                   <button className={`${bgBtn} px-3 py-1.5 rounded-md text-sm font-medium ${textHeading}`}>Show details</button>
                 </div>

                 {/* Comment Box */}
                 <div className="flex items-start gap-3 mb-6">
                   <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">U</div>
                   <div className={`flex-1 rounded-lg bg-white dark:bg-[#1d2125] border border-slate-300 dark:border-[#a6c5e229] p-3 cursor-text shadow-sm`}>
                     <span className={`${textMuted} text-sm`}>Write a comment...</span>
                   </div>
                 </div>

                 {/* Activity Feed (drawn from task.comments populated from API) */}
                 <div className="space-y-4">
                   {localTask.comments && localTask.comments.map((comment: any) => (
                     <div key={comment.id} className="flex items-start gap-3">
                       <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                          {comment.isSystem ? '⚙️' : 'U'}
                       </div>
                       <div>
                          <p className={`text-sm ${textHeading}`}><span className="font-bold">{comment.isSystem ? 'System' : 'User'}</span> {comment.text}</p>
                          <p className={`text-[11px] ${textMuted} mt-0.5`}>{new Date(comment.createdAt).toLocaleString()}</p>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
            </div>

          </div>

          {/* Right Panel - Sidebar */}
          <div className="flex-[1] flex flex-col gap-6 pl-0 lg:pl-4">
             <div>
               <h4 className={`text-[11px] font-bold ${textMuted} uppercase mb-2 tracking-wider`}>Add to card</h4>
               <div className="space-y-2">
                 <SidebarAction icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>} label="Members" />
                 <div className="relative">
                   <SidebarAction icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>} label="Labels" onClick={() => setIsLabelsOpen(!isLabelsOpen)} />
                   {isLabelsOpen && (
                     <div className={`absolute top-full right-0 mt-1 w-64 bg-white dark:bg-[#22272b] shadow-xl border border-slate-300 dark:border-[#a6c5e229] rounded-lg p-3 z-50`}>
                        <h4 className="text-xs font-bold text-slate-500 mb-2 uppercase text-center">Labels</h4>
                        <div className="grid grid-cols-3 gap-2">
                           {AVAILABLE_COLORS.map(c => {
                              const isActive = (localTask.labels ? JSON.parse(localTask.labels) : []).includes(c);
                              return (
                                <button 
                                  key={c}
                                  onClick={() => {
                                     let current = localTask.labels ? JSON.parse(localTask.labels) : [];
                                     if (current.includes(c)) current = current.filter((l: string) => l !== c);
                                     else current.push(c);
                                     updateTaskField('labels', JSON.stringify(current));
                                  }}
                                  className="h-8 rounded relative overflow-hidden transition-all hover:opacity-80"
                                  style={{ backgroundColor: c }}
                                >
                                  {isActive && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg></div>}
                                </button>
                              )
                           })}
                        </div>
                     </div>
                   )}
                 </div>
                 <div className="relative">
                   <SidebarAction icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>} label="Checklist" onClick={() => setIsAddingChecklist(!isAddingChecklist)} />
                   {isAddingChecklist && (
                     <div className={`absolute top-full right-0 mt-1 w-64 bg-white dark:bg-[#22272b] shadow-xl border border-slate-300 dark:border-[#a6c5e229] rounded-lg p-3 z-50`}>
                       <input 
                         autoFocus
                         className={`w-full border-2 border-blue-500 rounded px-2 py-1.5 focus:outline-none mb-2 text-sm ${textHeading} bg-transparent`} 
                         placeholder="Checklist title" 
                         value={newChecklistTitle} 
                         onChange={e => setNewChecklistTitle(e.target.value)}
                       />
                       <button onClick={handleCreateChecklist} className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium">Add</button>
                     </div>
                   )}
                 </div>
                 <div className="relative">
                   <SidebarAction icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>} label="Dates" onClick={() => setIsDatesOpen(!isDatesOpen)} />
                   {isDatesOpen && (
                     <div className={`absolute top-full right-0 mt-1 w-64 bg-white dark:bg-[#22272b] shadow-xl border border-slate-300 dark:border-[#a6c5e229] rounded-lg p-3 z-50`}>
                       <h4 className="text-xs font-bold text-slate-500 mb-2 uppercase text-center">Due Date</h4>
                       <input 
                          type="datetime-local" 
                          className={`w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 focus:outline-none mb-3 text-sm ${textHeading} bg-transparent`} 
                          value={tempDate || (localTask.dueDate ? new Date(localTask.dueDate).toISOString().slice(0, 16) : '')}
                          onChange={e => setTempDate(e.target.value)}
                       />
                       <div className="flex gap-2">
                          <button onClick={() => { updateTaskField('dueDate', new Date(tempDate).toISOString()); setIsDatesOpen(false); }} className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium">Save</button>
                          <button onClick={() => { updateTaskField('dueDate', null); setTempDate(''); setIsDatesOpen(false); }} className="flex-1 py-1.5 bg-[#eaecf0] hover:bg-[#dfe1e6] dark:bg-[#a6c5e229] text-slate-700 dark:text-[#b6c2cf] rounded text-sm font-medium">Remove</button>
                       </div>
                     </div>
                   )}
                 </div>
                 <SidebarAction icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>} label="Attachment" onClick={() => fileInputRef.current?.click()} />
                  <SidebarAction 
                    icon={<svg width="14" height="14" viewBox="0 0 24 24" fill={localTask.isFixed ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>} 
                    label={localTask.isFixed ? "Unfix this card" : "Fix this card"} 
                    onClick={() => updateTaskField('isFixed', !localTask.isFixed)} 
                  />
                 <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
               </div>
             </div>

             <div>
               <h4 className={`text-[11px] font-bold ${textMuted} uppercase mb-2 tracking-wider`}>Actions</h4>
               <div className="space-y-2">

                 <button onClick={() => {
                   fetch(`http://localhost:3001/api/tasks/${task.id}`, {method: 'DELETE'}).then(()=> { onClose(); window.location.reload(); });
                 }} className={`w-full flex items-center gap-3 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 active:scale-95 px-3 py-1.5 rounded-md transition-all text-sm font-bold text-red-600 dark:text-red-400`}>
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                   Delete Card
                 </button>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarAction({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick?: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 bg-[#eaecf0] hover:bg-[#dfe1e6] dark:bg-[#a6c5e229] dark:hover:bg-[#a6c5e23d] active:scale-95 px-3 py-1.5 rounded-md transition-all text-sm font-bold text-[#172b4d] dark:text-[#b6c2cf]">
      {icon} {label}
    </button>
  );
}

// Subcomponent: ChecklistItemAdder
function ChecklistItemAdder({ checklistId, onAdd }: { checklistId: string, onAdd: (id: string, title: string) => void }) {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');

  if (!isAdding) {
    return (
      <button onClick={() => setIsAdding(true)} className="bg-[#eaecf0] hover:bg-[#dfe1e6] dark:bg-[#a6c5e229] dark:hover:bg-[#a6c5e23d] px-3 py-1.5 rounded-md text-sm font-medium text-[#172b4d] dark:text-[#b6c2cf] transition-colors mt-2">Add an item</button>
    );
  }

  return (
    <div className="space-y-2 mt-2">
      <textarea 
        className="w-full min-h-[40px] p-2 rounded-md bg-white dark:bg-[#22272b] border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm text-sm text-[#172b4d] dark:text-[#b6c2cf]"
        placeholder="Add an item"
        value={title}
        onChange={e => setTitle(e.target.value)}
        autoFocus
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (title.trim()) { onAdd(checklistId, title); setTitle(''); }
          }
        }}
      />
      <div className="flex gap-2">
        <button onClick={() => { if(title.trim()) onAdd(checklistId, title); setTitle(''); setIsAdding(false); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded font-medium text-sm transition-colors">Add</button>
        <button onClick={() => {setIsAdding(false); setTitle('')}} className="text-slate-600 dark:text-[#b6c2cf] hover:bg-[#eaecf0] dark:hover:bg-[#a6c5e23d] px-3 py-1.5 rounded text-sm font-medium transition-colors">Cancel</button>
      </div>
    </div>
  );
}

// Subcomponent: Expanded Item Editor (Handles TRU scoring per item)
function ExpandedItemEditor({ item, onSave, onCancel, onDelete }: { item: any, onSave: (p: any) => void, onCancel: () => void, onDelete: () => void }) {
  const [title, setTitle] = useState(item.title);
  const [date, setDate] = useState(item.dueDate ? item.dueDate.split('T')[0] : '');
  const [t, setT] = useState<number | null>(item.T || null);
  const [r, setR] = useState<number | null>(item.R || null);
  const [u, setU] = useState<number | null>(item.U || null);

  const calculateLocalAvg = () => {
    if (t && r && u) return ((t + r + u) / 3).toFixed(1);
    return null;
  };

  return (
    <div className="mt-2 mb-4 ml-6 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1d2125] shadow-lg animate-in fade-in zoom-in-95 duration-200">
      <input 
         className="w-full font-bold text-[#172b4d] dark:text-[#b6c2cf] bg-transparent border border-slate-300 dark:border-slate-600 rounded px-2 py-1 mb-4 focus:outline-none focus:border-blue-500"
         value={title}
         onChange={e => setTitle(e.target.value)}
      />
      
      <div className="flex flex-wrap gap-6 mb-6">
        <div>
           <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Assign Member</label>
           <button className="bg-[#eaecf0] hover:bg-[#dfe1e6] dark:bg-[#a6c5e229] dark:hover:bg-[#a6c5e23d] text-slate-700 dark:text-[#b6c2cf] px-3 py-1.5 text-xs font-semibold rounded transition-colors flex items-center gap-1">
             <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>
             Select member ▾
           </button>
        </div>
        <div>
           <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Due Date</label>
           <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-[#eaecf0] dark:bg-[#a6c5e229] text-slate-700 dark:text-[#b6c2cf] px-3 py-1 text-xs font-semibold rounded border-none outline-none" />
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-black/20 rounded p-3 mb-6 border border-slate-100 dark:border-white/5">
        <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-3">TRU Scoring</h4>
        
        <div className="space-y-4">
          <TruRow label="T (Technicality)" hint="How complex?" val={t} setVal={setT} />
          <TruRow label="R (Regularity)" hint="How frequent?" val={r} setVal={setR} />
          <TruRow label="U (Urgency)" hint="How critical?" val={u} setVal={setU} />
        </div>

        {(t !== null && r !== null && u !== null) && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center gap-3">
             <span className="bg-slate-800 text-white rounded px-3 py-1 text-sm font-bold shadow-inner">
               T{t}, R{r}, U{u}
             </span>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
         <div className="flex gap-2">
            <button onClick={() => onSave({ title, dueDate: date ? new Date(date).toISOString() : null, T: t, R: r, U: u })} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded font-medium text-sm transition-colors shadow-sm">Save</button>
            <button onClick={onCancel} className="text-slate-600 dark:text-[#b6c2cf] hover:bg-[#eaecf0] dark:hover:bg-[#a6c5e23d] px-4 py-1.5 rounded font-medium text-sm transition-colors">Cancel</button>
         </div>
         <button onClick={onDelete} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 px-3 py-1.5 rounded font-medium text-sm transition-colors">Delete Item</button>
      </div>
    </div>
  );
}

function TruRow({label, hint, val, setVal}: {label:string, hint:string, val:number|null, setVal:(v:number)=>void}) {
   return (
      <div className="flex items-center gap-4">
         <div className="flex-1 min-w-[120px]">
           <span className="block text-xs font-bold text-[#172b4d] dark:text-[#9fadbc]">{label}</span>
           <span className="block text-[10px] text-slate-500">{hint}</span>
         </div>
         <div className="flex gap-1">
           {[1, 2, 3].map(n => (
             <button 
               key={n} 
               onClick={() => setVal(n)}
               className={`w-10 h-8 rounded text-xs font-bold transition-all border ${val === n ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105' : 'bg-white dark:bg-[#22272b] text-slate-500 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
             >
               {n}
             </button>
           ))}
         </div>
      </div>
   );
}
