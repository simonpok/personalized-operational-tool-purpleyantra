import { Routes, Route, Link, useParams, useNavigate, Navigate } from 'react-router-dom';
import { useEffect, useState, createContext, useContext } from 'react';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';
import { Board } from './components/Board';
import { GoalSelector } from './components/GoalSelector';
import { ThemeToggle } from './components/ThemeToggle';
import React from 'react';
import { io } from 'socket.io-client';

interface Goal {
  id: string;
  title: string;
  s1: string;
  s2: string;
  progress: number;
  order: number;
}

const MissionContext = createContext<{
  goals: Goal[];
  refreshGoals: () => void;
}>({ goals: [], refreshGoals: () => {} });

function DashboardSkeleton() {
  return (
    <div className="p-8 max-w-6xl mx-auto font-sans animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-8 bg-white shadow-sm p-4 rounded-xl border border-slate-200">
        <div className="h-8 w-64 skeleton" />
        <div className="h-10 w-32 skeleton" />
      </div>
      <div className="bg-white shadow-lg border border-slate-200 rounded-2xl p-8 mb-8 h-48 skeleton" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 h-32 skeleton" />
        ))}
      </div>
    </div>
  );
}

function ProjectSidebar() {
  const { goalId } = useParams();
  const [stats, setStats] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    if (goalId) {
      fetch(`http://localhost:3001/api/stats/${goalId}`)
        .then(res => res.json())
        .then(data => {
          if (!data.error) setStats(data);
        })
        .catch(console.error);
    }
  }, [goalId]);

  return (
    <div className={`${isExpanded ? 'w-64' : 'w-20'} bg-white border-r border-slate-200 transition-all duration-300 flex flex-col flex-shrink-0 relative group z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]`}>
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -right-3 top-6 bg-white border border-slate-200 rounded-full w-6 h-6 flex items-center justify-center shadow-sm text-slate-400 hover:text-slate-600 z-50 opacity-0 group-hover:opacity-100 transition-all"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isExpanded ? '' : 'rotate-180'}>
          <path d="m15 18-6-6 6-6"/>
        </svg>
      </button>

      <div className="p-4 flex-1 flex flex-col overflow-hidden">
        {/* Header Area */}
        <div className={`mb-8 mt-2 flex items-center gap-3 ${isExpanded ? '' : 'justify-center'}`}>
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          {isExpanded ? (
            <div className="min-w-0 flex-1">
              <h1 className="font-bold font-mono tracking-tight text-slate-800 uppercase truncate text-sm">
                {stats?.projectName || 'Loading...'}
              </h1>
              <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest truncate">{stats?.goalTitle || 'Loading...'}</p>
            </div>
          ) : null}
        </div>

        {/* Links Area */}
        <nav className="flex flex-col gap-2">
          {/* Active styling logic could be added using useLocation, but using hover styles for simplicity. */}
          <Link 
            to={`/goal/${goalId}/dashboard`} 
            className="flex items-center gap-3 px-3 py-3 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all group/link overflow-hidden"
            title="Stats"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover/link:text-blue-500 transition-colors flex-shrink-0"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
            <span className={`${isExpanded ? 'opacity-100' : 'opacity-0 w-0'} transition-opacity duration-300 whitespace-nowrap`}>Stats Dashboard</span>
          </Link>
          <Link 
            to={`/goal/${goalId}/board`} 
            className="flex items-center gap-3 px-3 py-3 rounded-xl font-bold text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-600 border border-transparent hover:border-blue-100 transition-all group/link overflow-hidden"
            title="Board"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover/link:text-blue-500 transition-colors flex-shrink-0"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M7 7h.01"/><path d="M17 7h.01"/><path d="M12 7h.01"/><path d="M7 12h.01"/><path d="M17 12h.01"/><path d="M12 12h.01"/><path d="M7 17h.01"/><path d="M17 17h.01"/><path d="M12 17h.01"/></svg>
            <span className={`${isExpanded ? 'opacity-100' : 'opacity-0 w-0'} transition-opacity duration-300 whitespace-nowrap`}>Ops Board</span>
          </Link>
        </nav>

        <div className="mt-auto flex flex-col gap-3">
          <div className="pt-4 border-t border-slate-100">
            <Link 
              to={`/goal/${goalId}/trash`} 
              className="flex items-center gap-3 px-3 py-3 rounded-xl font-bold text-sm text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-100 border border-transparent transition-all group/link overflow-hidden"
              title="Trash"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover/link:text-red-400 transition-colors flex-shrink-0"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              <span className={`${isExpanded ? 'opacity-100' : 'opacity-0 w-0'} transition-opacity duration-300 whitespace-nowrap`}>Trash Bin</span>
            </Link>
          </div>

          <div className={`flex items-center ${isExpanded ? 'px-2' : 'justify-center'} pb-2`}>
              <UserButton afterSignOutUrl="/"/>
          </div>
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const { goalId } = useParams();
  const { goals } = useContext(MissionContext);
  const [stats, setStats] = useState<{
    projectName: string,
    goalTitle: string,
    s1: string,
    s2: string,
    progress: number,
    departments: { id: string, name: string, color: string, progress: number }[]
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetch(`http://localhost:3001/api/stats/${goalId}`)
      .then(res => res.json())
      .then(data => {
        if (!data.error) setStats(data);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [goalId]);

  if (isLoading || !stats) return <DashboardSkeleton />;

  return (
    <div className="p-8 max-w-6xl mx-auto font-sans animate-in fade-in duration-500">
      {/* Dynamic Status Label (Mission Wide) */}
      <div className="mb-2 px-1">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500/60 transition-all duration-700">
          {(() => {
            // Use fresh stats to overlay stale context if task progress was just updated
            const currentGoalsState = goals.map(g => 
               g.id === goalId && stats ? { ...g, progress: stats.progress } : g
            );

            const firstIncompleteIndex = currentGoalsState.findIndex(g => g.progress < 100);

            if (firstIncompleteIndex === -1) {
              const lastGoal = currentGoalsState[currentGoalsState.length - 1];
              if (!lastGoal) return "Mission Ready";
              const match = lastGoal.title.match(/Status (\d+)/i);
              const n = match ? parseInt(match[1]) : currentGoalsState.length;
              return `Congrats you reached Status ${n} and now you can move to Status ${n + 1} (S${n + 1})`;
            } else {
              const activeGoal = currentGoalsState[firstIncompleteIndex];
              const match = activeGoal.title.match(/Status (\d+)/i);
              const n = match ? parseInt(match[1]) : (firstIncompleteIndex + 1);
              return `You are currently in Status ${n} (S${n})`;
            }
          })()}
        </span>
      </div>


      {/* S1 -> S2 Journey */}
      <div className="bg-card shadow-lg border border-border rounded-2xl p-8 mb-8 transform transition-all hover:shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
           <svg width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M2 12h20"/></svg>
        </div>
        
        <div className="flex justify-between text-xs mb-4 text-mutedText font-bold uppercase tracking-widest">
          <div className="flex flex-col">
            <span className="text-slate-400 mb-1">Current State (S1)</span>
            <span className="text-slate-800 text-base normal-case font-medium">{stats.s1}</span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-accentBlue mb-1">Goal State (S2)</span>
            <span className="text-slate-800 text-base normal-case font-medium">{stats.s2}</span>
          </div>
        </div>
        
        <div className="w-full bg-slate-100/50 rounded-2xl h-12 overflow-hidden relative border border-slate-100 shadow-inner">
          <div 
            className="bg-gradient-to-r from-accentBlue via-accentBlue to-accentGreen h-full rounded-2xl transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(37,99,235,0.3)]" 
            style={{width: `${stats.progress}%`}}
          ></div>
          <div className="absolute inset-0 flex items-center justify-center font-mono font-black text-slate-800 text-xl tracking-tighter mix-blend-overlay">
            {stats.progress}%
          </div>
        </div>
      </div>
      

    </div>
  );
}

function TrashView() {
  const [archived, setArchived] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3001/api/trash')
      .then(res => res.json())
      .then(data => setArchived(data))
      .finally(() => setLoading(false));
  }, []);

  const handleRestore = async (id: string) => {
    const res = await fetch(`http://localhost:3001/api/goals/${id}/restore`, { method: 'PUT' });
    if (res.ok) {
      setArchived(archived.filter(g => g.id !== id));
      window.location.reload(); 
    }
  };

  const handlePurge = async (id: string) => {
    if (window.confirm("ARE YOU SURE? This will permanently delete all tasks in this phase forever.")) {
      const res = await fetch(`http://localhost:3001/api/goals/${id}/purge`, { method: 'DELETE' });
      if (res.ok) setArchived(archived.filter(g => g.id !== id));
    }
  };

  const handlePurgeAll = async () => {
    if (window.confirm("CRITICAL ACTION: Permanently delete ALL items in the trash? This cannot be undone.")) {
      const res = await fetch(`http://localhost:3001/api/trash/purge-all`, { method: 'DELETE' });
      if (res.ok) setArchived([]);
    }
  };

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="p-8 max-w-6xl mx-auto font-sans animate-in fade-in duration-500">
      <div className="flex justify-between items-end mb-8 bg-slate-900 text-white p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
           <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl font-black uppercase tracking-tighter mb-1">Archive Chamber</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">Decommissioned Mission Phases</p>
        </div>
        {archived.length > 0 && (
          <button 
            onClick={handlePurgeAll}
            className="relative z-10 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300"
          >
            Purge All Data
          </button>
        )}
      </div>

      {archived.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100">
          <div className="text-slate-300 text-4xl mb-4">📭</div>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Nothing in the trash</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {archived.map(goal => (
            <div key={goal.id} className="bg-white p-8 rounded-[1.5rem] border border-slate-100 flex justify-between items-center shadow-xl shadow-slate-200/40 hover:scale-[1.01] transition-all duration-300 group">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 group-hover:bg-red-50 group-hover:text-red-300 transition-colors">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight mb-1">{goal.title}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{goal.s1}</span>
                    <span className="text-slate-200">→</span>
                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{goal.s2}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => handleRestore(goal.id)}
                  className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30"
                >
                  Restore Phase
                </button>
                <button 
                  onClick={() => handlePurge(goal.id)}
                  className="bg-white text-slate-400 hover:text-red-500 hover:bg-red-50 border border-slate-100 hover:border-red-100 px-4 py-3 rounded-xl transition-all"
                  title="Purge Permanently"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Welcome() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="bg-card p-12 rounded-2xl shadow-xl text-center max-w-md border border-border">
        <h1 className="text-4xl font-extrabold font-mono tracking-tighter mb-4">TRU-OPS</h1>
        <p className="text-mutedText mb-8">Operational Progress Management System. S2 = f(S1) × T.</p>
        <SignInButton mode="modal">
          <button className="bg-accentBlue text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors w-full">
            Sign In to Continue
          </button>
        </SignInButton>
      </div>
    </div>
  );
}

function Launcher() {
  const [status, setStatus] = useState<'initializing' | 'empty' | 'error' | 'seeding'>('initializing');
  const navigate = useNavigate();

  const handleSeed = async () => {
    setStatus('seeding');
    try {
      await fetch('http://localhost:3001/api/seed', { method: 'POST' });
      window.location.reload();
    } catch (e) {
      setStatus('error');
    }
  };

  useEffect(() => {
    fetch('http://localhost:3001/api/projects')
      .then(res => res.json())
      .then(data => {
        if (data.length > 0 && data[0].goals && data[0].goals.length > 0) {
          navigate(`/goal/${data[0].goals[0].id}/dashboard`);
        } else {
          setStatus('empty');
        }
      })
      .catch((e) => {
        console.error(e);
        setStatus('error');
      });
  }, []);

  if (status === 'initializing') return <DashboardSkeleton />;
  
  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-red-500 font-mono text-sm font-bold bg-white p-4 rounded-xl shadow-sm border border-red-100">
          ERROR: Backend Unavailable
        </div>
      </div>
    );
  }

  if (status === 'seeding') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
          <div className="text-slate-400 font-mono text-xs uppercase tracking-widest animate-pulse font-bold">
            Calibrating Multi-Goal Mission...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 text-center max-w-md animate-in zoom-in-95 duration-500">
        <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>
        </div>
        <h1 className="text-3xl font-black text-slate-800 mb-4 tracking-tighter">TRU-OPS READY</h1>
        <p className="text-slate-500 mb-8 leading-relaxed">No operational hierarchy detected. Initialize the first multi-goal mission with S1 to S2, S2 to S3 progression.</p>
        <button 
          onClick={handleSeed} 
          className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-900/10 active:scale-[0.98]"
        >
          Initialize Mission Map
        </button>
      </div>
    </div>
  );
}

const GoalLayout = ({ children }: { children: React.ReactNode }) => {
  const { goalId } = useParams();
  const navigate = useNavigate();
  const [goals, setGoals] = useState<Goal[]>([]);

  const refreshGoals = () => {
    fetch('http://localhost:3001/api/projects')
      .then(res => res.json())
      .then(data => {
        if (data.length > 0) setGoals(data[0].goals);
      });
  };

  useEffect(() => {
    refreshGoals();
    
    // Connect socket to ensure global mission context is always instantly synced
    const socket = io('http://localhost:3001');
    socket.on('progress:updated', () => refreshGoals());
    socket.on('board:updated', () => refreshGoals());
    
    return () => {
      socket.disconnect();
    };
  }, []);

  const handleDeleteGoal = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:3001/api/goals/${id}`, { method: 'DELETE' });
      if (res.ok) {
        // Refresh goals or redirect if current goal was deleted
        const remaining = goals.filter((g: any) => g.id !== id);
        setGoals(remaining);
        if (goalId === id) {
          if (remaining.length > 0) {
            navigate(`/goal/${remaining[0].id}/dashboard`);
          } else {
            navigate('/');
          }
        }
      }
    } catch (e) {
      console.error('Failed to delete goal', e);
    }
  };

  const handleAddGoal = async (newGoal: { title: string, s1: string, s2: string }) => {
    try {
      const res = await fetch('http://localhost:3001/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: goals[0]?.projectId,
          title: newGoal.title,
          s1: newGoal.s1,
          s2: newGoal.s2,
          order: goals.length
        })
      });
      if (res.ok) {
        const addedGoal = await res.json();
        setGoals([...goals, addedGoal] as any);
        navigate(`/goal/${addedGoal.id}/dashboard`);
      }
    } catch (e) {
      console.error('Failed to add goal', e);
    }
  };

  return (
    <MissionContext.Provider value={{ goals, refreshGoals }}>
      <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
        <div className="flex-shrink-0 z-20">
          <GoalSelector 
            goals={goals} 
            currentGoalId={goalId} 
            onDeleteGoal={handleDeleteGoal}
            onAddGoal={handleAddGoal}
          />
        </div>
        <div className="flex flex-1 overflow-hidden relative">
          <ProjectSidebar />
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </MissionContext.Provider>
  );
};
  

export default function App() {
  return (
    <div className="min-h-screen bg-background dark:bg-slate-950 transition-colors duration-300">
      <ThemeToggle />
      <Routes>
        <Route path="/" element={<Launcher />} />
        <Route path="/goal/:goalId/dashboard" element={<GoalLayout><Dashboard /></GoalLayout>} />
        <Route path="/goal/:goalId/board" element={<GoalLayout><Board /></GoalLayout>} />
        <Route path="/goal/:goalId/trash" element={<GoalLayout><TrashView /></GoalLayout>} />
      </Routes>
    </div>
  );
}
