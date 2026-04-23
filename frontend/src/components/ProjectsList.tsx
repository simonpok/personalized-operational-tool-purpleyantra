import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Project {
  id: string;
  name: string;
  description: string | null;
  goals: any[];
}

export function ProjectsList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const navigate = useNavigate();

  const fetchProjects = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/projects');
      const data = await res.json();
      setProjects(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreate = async () => {
    if (!formName.trim()) return;
    try {
      const res = await fetch('http://localhost:3001/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName, description: formDesc })
      });
      if (res.ok) {
        setFormName('');
        setFormDesc('');
        setIsAdding(false);
        fetchProjects();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!formName.trim()) return;
    try {
      const res = await fetch(`http://localhost:3001/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName, description: formDesc })
      });
      if (res.ok) {
        setEditingProjectId(null);
        fetchProjects();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this project? It will be moved to the Trash Bin.")) {
      try {
        const res = await fetch(`http://localhost:3001/api/projects/${id}`, { method: 'DELETE' });
        if (res.ok) {
          setProjects(projects.filter(p => p.id !== id));
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const openEdit = (e: React.MouseEvent, p: Project) => {
    e.stopPropagation();
    setFormName(p.name);
    setFormDesc(p.description || '');
    setEditingProjectId(p.id);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8 sm:p-12 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tighter uppercase">Projects Workspace</h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-2">Select or create a mission project</p>
          </div>
          <button
            onClick={() => { setIsAdding(true); setFormName(''); setFormDesc(''); }}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30"
          >
            + New Project
          </button>
        </div>

        {isAdding && (
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200 mb-8 max-w-md animate-in fade-in zoom-in-95 duration-300">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Create New Project</h3>
            <input 
              autoFocus
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Project Name"
              value={formName}
              onChange={e => setFormName(e.target.value)}
            />
            <textarea 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-24"
              placeholder="Project Description (optional)"
              value={formDesc}
              onChange={e => setFormDesc(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={handleCreate} className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 text-sm">Create</button>
              <button onClick={() => setIsAdding(false)} className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-lg hover:bg-slate-200 text-sm">Cancel</button>
            </div>
          </div>
        )}

        {projects.length === 0 && !isAdding ? (
          <div className="text-center py-24 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
             <div className="text-slate-300 text-5xl mb-4">📂</div>
             <p className="text-slate-500 font-bold uppercase tracking-widest text-sm mb-6">No projects found</p>
             <button 
               onClick={() => { setIsAdding(true); setFormName(''); setFormDesc(''); }}
               className="bg-slate-800 text-white px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-slate-700 transition-all"
             >
               Initialize First Project
             </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(p => (
              editingProjectId === p.id ? (
                <div key={p.id} className="bg-white p-6 rounded-2xl shadow-xl border border-blue-200">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Edit Project</h3>
                  <input 
                    autoFocus
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Project Name"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                  />
                  <textarea 
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-20"
                    placeholder="Project Description"
                    value={formDesc}
                    onChange={e => setFormDesc(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button onClick={() => handleUpdate(p.id)} className="flex-1 bg-green-600 text-white font-bold py-2 rounded-lg hover:bg-green-700 text-xs uppercase tracking-wider">Save</button>
                    <button onClick={() => setEditingProjectId(null)} className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-lg hover:bg-slate-200 text-xs uppercase tracking-wider">Cancel</button>
                  </div>
                </div>
              ) : (
                <div 
                  key={p.id} 
                  onClick={() => p.goals.length > 0 && navigate(`/goal/${p.goals[0].id}/dashboard`)}
                  className={`bg-white p-6 rounded-2xl shadow-sm hover:shadow-xl border border-slate-200 transition-all duration-300 group flex flex-col ${p.goals.length > 0 ? 'cursor-pointer hover:-translate-y-1' : 'opacity-75'}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => openEdit(e, p)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button onClick={(e) => handleDelete(e, p.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>
                  <h2 className="text-xl font-bold text-slate-800 tracking-tight mb-2 truncate">{p.name}</h2>
                  <p className="text-sm text-slate-500 line-clamp-2 mb-6 flex-1">{p.description || 'No description provided.'}</p>
                  
                  <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
                    <span>{p.goals.length} Phase{p.goals.length !== 1 ? 's' : ''}</span>
                    <span className="text-blue-500 group-hover:translate-x-1 transition-transform flex items-center gap-1">Enter <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg></span>
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
