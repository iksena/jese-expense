'use client'

import { deleteGymSession, saveGymSession, setTimer as setServerTimer, updateRestTimer } from '@/app/actions';
import { GymExercise, GymSession, HouseholdSettings } from '@/types';
import { ArrowLeft, Check, Dumbbell, History, Loader2, LogOut, Pause, Play, Plus, RotateCcw, Save, Settings, Timer, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';

// --- Audio Helper ---
const playBeep = () => {
  try {
    const AudioContext = window.AudioContext || (window as Window).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) { console.error(e); }
};

// --- Format Helper ---
const formatTime = (seconds: number) => {
  if (seconds <= 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// --- Types for Props ---
interface TimerState {
  active: boolean;
  timeLeft: number;
  duration: number;
  isOpen: boolean;
}

interface ActiveSessionViewProps {
  sessionName: string;
  setSessionName: (name: string) => void;
  exercises: GymExercise[];
  setExercises: Dispatch<SetStateAction<GymExercise[]>>;
  onSave: () => Promise<void>;
  onDiscard: () => void;
  isSaving: boolean;
  timer: TimerState;
  setTimerState: Dispatch<SetStateAction<TimerState>>;
  restTimeSetting: number;
  history: GymSession[];
  onStartTimer: () => void;
}

interface HistoryViewProps {
  history: GymSession[];
  onStartSession: (template?: GymSession) => void;
  onDeleteSession: (id: string) => Promise<void>;
  onOpenSettings: () => void;
  onExit: () => void;
}

// --- Sub-Components ---

const ActiveSessionView = ({
  sessionName,
  setSessionName,
  exercises,
  setExercises,
  onSave,
  onDiscard,
  isSaving,
  timer,
  setTimerState,
  restTimeSetting,
  history,
  onStartTimer
}: ActiveSessionViewProps) => {
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');

  const calculateProgress = () => {
    if (timer.duration === 0) return 0;
    return Math.min(100, Math.max(0, ((timer.duration - timer.timeLeft) / timer.duration) * 100));
  };

  const recentExercises = Array.from(new Set(
    history.flatMap(session => session.exercises.map(e => e.name))
  )).slice(0, 8);

  const handleAddExercise = (name: string) => {
    if (!name.trim()) return;
    setExercises(prev => [...prev, { 
      id: Math.random().toString(), 
      name: name, 
      sets: [{ id: Math.random().toString(), weight: '', reps: '', completed: false }] 
    }]);
    setNewExerciseName('');
    setShowAddExercise(false);
  };

  return (
    <div className="pb-24">
      {/* Active Header */}
      <header className="fixed top-0 left-0 right-0 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 z-20 px-4 py-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <button onClick={onDiscard} className="p-1 hover:bg-slate-800 rounded">
            <ArrowLeft className="text-slate-400" />
          </button>
          <input 
            value={sessionName} 
            onChange={(e) => setSessionName(e.target.value)}
            className="bg-transparent text-xl font-bold text-slate-100 focus:outline-none w-48"
            placeholder="Workout Name"
          />
        </div>
        <button 
          onClick={onSave} 
          disabled={isSaving} 
          className="text-sm bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-emerald-500 disabled:opacity-50 flex items-center gap-2"
        >
          {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save</>}
        </button>
      </header>

      {/* Exercises List */}
      <div className="pt-20 px-4 max-w-md mx-auto space-y-6">
        {exercises.length === 0 && (
          <div className="text-center py-20 opacity-50">
            <Dumbbell className="w-16 h-16 mx-auto mb-4 text-slate-700" />
            <p>No exercises. Add one!</p>
          </div>
        )}

        {exercises.map((exercise, exIdx) => (
          <div key={exercise.id || exIdx} className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
            <div className="px-4 py-3 bg-slate-800/50 flex justify-between items-center border-b border-slate-800">
              <h3 className="font-semibold text-lg text-blue-100">{exercise.name}</h3>
              <button 
                onClick={() => setExercises(prev => prev.filter(e => e !== exercise))} 
                className="text-slate-500 hover:text-red-400 p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-10 gap-2 px-4 py-2 text-xs font-medium text-slate-500 uppercase text-center">
              <div className="col-span-1">#</div>
              <div className="col-span-3">kg</div>
              <div className="col-span-3">Reps</div>
              <div className="col-span-3">Done</div>
            </div>

            <div className="px-2 pb-2 space-y-1">
              {exercise.sets.map((set, sIdx) => (
                <div key={set.id || sIdx} className={`grid grid-cols-10 gap-2 items-center p-2 rounded-lg transition-all ${set.completed ? 'bg-emerald-900/20' : 'bg-slate-800/30'}`}>
                  <div className="col-span-1 text-center font-mono text-slate-400 text-sm">{sIdx + 1}</div>
                  <div className="col-span-3">
                    <input type="number" placeholder="0" value={set.weight} 
                      onChange={(e) => {
                        const newEx = [...exercises];
                        newEx[exIdx].sets[sIdx].weight = e.target.value;
                        setExercises(newEx);
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-center text-sm focus:border-blue-500 focus:outline-none text-white"
                    />
                  </div>
                  <div className="col-span-3">
                    <input type="number" placeholder="0" value={set.reps} 
                      onChange={(e) => {
                        const newEx = [...exercises];
                        newEx[exIdx].sets[sIdx].reps = e.target.value;
                        setExercises(newEx);
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-center text-sm focus:border-blue-500 focus:outline-none text-white"
                    />
                  </div>
                  <div className="col-span-3 flex justify-center gap-1">
                    <button 
                      onClick={() => {
                        const wasCompleted = set.completed;
                        const newEx = [...exercises];
                        newEx[exIdx].sets[sIdx].completed = !wasCompleted;
                        setExercises(newEx);
                        
                        // Start timer ONLY if marking AS DONE (Grey -> Green)
                        if (!wasCompleted) {
                          onStartTimer();
                        }
                      }}
                      className={`flex-1 flex justify-center items-center h-9 rounded ${set.completed ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'}`}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    {!set.completed && (
                       <button onClick={() => {
                         const newEx = [...exercises];
                         newEx[exIdx].sets = newEx[exIdx].sets.filter((_, i) => i !== sIdx);
                         setExercises(newEx);
                       }} className="px-2 text-slate-600 hover:text-red-400"><X className="w-3 h-3" /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => {
               const newEx = [...exercises];
               const lastSet = newEx[exIdx].sets[newEx[exIdx].sets.length - 1];
               newEx[exIdx].sets.push({ id: Math.random().toString(), weight: lastSet ? lastSet.weight : '', reps: lastSet ? lastSet.reps : '', completed: false });
               setExercises(newEx);
            }} className="w-full py-3 text-sm text-blue-400 hover:bg-blue-900/10 border-t border-slate-800 font-medium flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> Add Set
            </button>
          </div>
        ))}

        <button onClick={() => setShowAddExercise(true)} className="w-full py-4 rounded-xl border-2 border-dashed border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-400 transition-colors flex flex-col items-center gap-2">
          <Plus className="w-6 h-6" /> <span className="font-medium">Add Exercise</span>
        </button>
      </div>

      {/* Add Ex Modal */}
      {showAddExercise && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 p-6 rounded-2xl w-full max-w-xs border border-slate-700">
            <h3 className="text-lg font-bold mb-4 text-white">New Exercise</h3>
            <input 
              autoFocus 
              type="text" 
              placeholder="E.g. Squat" 
              value={newExerciseName} 
              onChange={(e) => setNewExerciseName(e.target.value)} 
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 mb-4 text-white focus:border-blue-500 focus:outline-none" 
            />
            {recentExercises.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-slate-500 uppercase font-bold mb-2">Recent</p>
                <div className="flex flex-wrap gap-2">
                  {recentExercises.map(name => (
                    <button key={name} onClick={() => setNewExerciseName(name)} className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded hover:bg-slate-700 border border-slate-700">
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setShowAddExercise(false)} className="flex-1 py-3 bg-slate-800 rounded-lg text-white">Cancel</button>
              <button onClick={() => handleAddExercise(newExerciseName)} className="flex-1 py-3 bg-blue-600 rounded-lg text-white">Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Timer Overlay */}
      {timer.isOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 p-4 pb-8 safe-area-bottom shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          <div className="max-w-md mx-auto">
            <div className="flex justify-between items-center mb-4">
               <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Timer className="w-3 h-3" /> Rest Timer</span>
               <button onClick={() => setTimerState(t => ({...t, isOpen: false}))} className="text-slate-500"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex items-center justify-between gap-6">
              <div>
                  <div className="text-5xl font-mono font-bold text-white">
                      {formatTime(timer.timeLeft)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Target: {formatTime(timer.duration)}</div>
              </div>
              <div className="flex items-center gap-3">
                  <button onClick={() => setTimerState(p => ({ ...p, timeLeft: Math.max(0, p.timeLeft - 10) }))} className="p-3 rounded-full bg-slate-800 text-slate-300">-10s</button>
                  <button onClick={() => setTimerState(p => ({ ...p, active: !p.active }))} className={`p-4 rounded-full ${timer.active ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500 text-white'}`}>
                      {timer.active ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                  </button>
                  <button onClick={() => setTimerState(p => ({ ...p, timeLeft: p.timeLeft + 30 }))} className="p-3 rounded-full bg-slate-800 text-slate-300">+30s</button>
              </div>
            </div>
            <div className="h-1 bg-slate-800 w-full mt-6 rounded-full overflow-hidden">
                <div 
                    className={`h-full transition-all duration-1000 ease-linear ${timer.active ? 'bg-emerald-500' : 'bg-slate-500'}`}
                    style={{ width: `${calculateProgress()}%` }}
                />
            </div>
          </div>
        </div>
      )}
      {!timer.isOpen && timer.active && (
        <button onClick={() => setTimerState(t => ({...t, isOpen: true}))} className="fixed bottom-6 right-6 bg-emerald-600 text-white p-4 rounded-full shadow-lg z-30 font-mono font-bold">
          {formatTime(timer.timeLeft)}
        </button>
      )}
    </div>
  );
};

const HistoryView = ({ history, onStartSession, onDeleteSession, onOpenSettings, onExit }: HistoryViewProps) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this session?")) return;
    setDeletingId(id);
    await onDeleteSession(id);
    setDeletingId(null);
  };

  return (
    <div className="pb-24 pt-20 px-4 max-w-md mx-auto space-y-6">
      <header className="fixed top-0 left-0 right-0 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 z-20 px-4 py-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg"><Dumbbell className="w-5 h-5 text-white" /></div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">IronTrack</h1>
        </div>
        <div className="flex gap-2">
            <button onClick={onExit} className="p-2 text-slate-400 hover:text-white" title="Back to Expenses"><LogOut className="w-5 h-5" /></button>
            <button onClick={onOpenSettings} className="p-2 text-slate-400 hover:text-white"><Settings className="w-5 h-5" /></button>
        </div>
      </header>

      <button onClick={() => onStartSession()} className="w-full py-4 bg-emerald-600 rounded-xl text-white font-bold text-lg shadow-lg shadow-emerald-900/20 hover:bg-emerald-500 transition-all active:scale-95 flex items-center justify-center gap-2">
        <Plus className="w-6 h-6" /> Start New Workout
      </button>

      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><History className="w-4 h-4" /> History</h2>
        {history.length === 0 ? (
            <p className="text-slate-600 text-center py-4">No workout history.</p>
        ) : (
            history.map(session => (
                <div key={session.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <h3 className="font-bold text-white text-lg">{session.name || 'Workout'}</h3>
                            <p className="text-xs text-slate-500">{new Date(session.created_at).toLocaleDateString()}</p>
                        </div>
                        <button 
                          onClick={() => handleDelete(session.id)} 
                          className="text-slate-600 hover:text-red-500 p-1"
                          disabled={deletingId === session.id}
                        >
                          {deletingId === session.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                    </div>
                    <div className="space-y-1 mb-4">
                        {session.exercises.slice(0, 3).map(ex => (
                            <div key={ex.id} className="text-sm text-slate-400 flex justify-between">
                                <span>{ex.sets.length} x {ex.name}</span>
                                <span className="text-slate-600">{Math.max(...ex.sets.map(s => Number(s.weight)))}kg</span>
                            </div>
                        ))}
                        {session.exercises.length > 3 && <p className="text-xs text-slate-600">+{session.exercises.length - 3} more...</p>}
                    </div>
                    <button onClick={() => onStartSession(session)} className="w-full py-2 bg-slate-800 rounded-lg text-blue-400 text-sm font-medium hover:bg-slate-700 flex items-center justify-center gap-2">
                        <RotateCcw className="w-3 h-3" /> Repeat This Workout
                    </button>
                </div>
            ))
        )}
      </div>
    </div>
  );
};

// --- Main Component ---

export default function GymTracker({ initialHistory, householdSettings, userId }: { initialHistory: GymSession[], householdSettings: HouseholdSettings, userId: string }) {
  const router = useRouter();
  
  // --- Global State ---
  const [view, setView] = useState<'history' | 'active'>('history');
  const [restTimeSetting, setRestTimeSetting] = useState(householdSettings.default_rest_timer || 90);
  const [showSettings, setShowSettings] = useState(false);

  // --- Active Session State ---
  // Load from localStorage if available, else defaults
  const [sessionName, setSessionName] = useState('');
  const [exercises, setExercises] = useState<GymExercise[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // --- Timer State ---
  const [timer, setTimer] = useState<TimerState>({ active: false, timeLeft: 0, duration: restTimeSetting, isOpen: false });

  // Load active session from local storage on mount
  useEffect(() => {
    const savedSession = localStorage.getItem('gym-active-session');
    if (savedSession) {
      try {
        const { name, exercises: savedEx, view: savedView } = JSON.parse(savedSession);
        if (savedEx && savedEx.length > 0) {
          setTimeout(() => {
            setSessionName(name || '');
            setExercises(savedEx);
          }, 0);
          if (savedView === 'active') {
            setTimeout(() => {
              setView('active');
            }, 0);
          }
        }
      } catch (e) { console.error("Failed to load session", e); }
    }
  }, []);

  // Save active session to local storage whenever it changes
  useEffect(() => {
    if (exercises.length > 0) {
      localStorage.setItem('gym-active-session', JSON.stringify({ name: sessionName, exercises, view }));
    } else if (view === 'history') {
      localStorage.removeItem('gym-active-session');
    }
  }, [exercises, sessionName, view]);

  // Request Notification Permission
  useEffect(() => {
    if (typeof window !== 'undefined' && "Notification" in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Sync Timer with Server State (Robust Timer Logic)
  useEffect(() => {
    // 1. If server has a future expiry time, sync our local timer to it
    if (householdSettings.timer_expires_at) {
      const expires = new Date(householdSettings.timer_expires_at).getTime();
      const now = Date.now();
      const diff = Math.ceil((expires - now) / 1000);

      if (diff > 0) {
        setTimeout(() => {
          setTimer(prev => ({
            ...prev,
            active: true,
            timeLeft: diff,
            duration: restTimeSetting, // Assume duration is restTime setting for progress bar calculation
            isOpen: true // Re-open if it was running
          }));
        }, 0);
      } else {
        // Timer expired while away
        setTimeout(() => {
          setTimer(prev => ({ ...prev, active: false, timeLeft: 0 }));
        }, 0);
      }
    }
  }, [householdSettings.timer_expires_at, restTimeSetting]);

  // Timer Tick
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (timer.active && timer.timeLeft > 0) {
      interval = setInterval(() => {
        setTimer(p => {
          const newTime = p.timeLeft - 1;
          if (newTime <= 0) {
             // Timer Finished
             playBeep();
             if (typeof window !== 'undefined' && Notification.permission === 'granted') new Notification("Rest Complete!");
             // Clear server timer
             setServerTimer(userId, null); 
             return { ...p, timeLeft: 0, active: false };
          }
          return { ...p, timeLeft: newTime };
        });
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [timer.active, timer.timeLeft, userId]);

  // --- Handlers ---

  const startNewSession = (template?: GymSession) => {
    if (template) {
      setSessionName(template.name || 'Workout');
      setExercises(template.exercises.map(e => ({
        ...e,
        id: Date.now().toString() + Math.random(), // New Temp IDs
        sets: e.sets.map(s => ({ ...s, completed: false, id: Math.random().toString() }))
      })));
    } else {
      setSessionName('New Workout');
      setExercises([]);
    }
    setView('active');
  };

  const handleStartTimer = async () => {
    const duration = restTimeSetting;
    const expiresAt = new Date(Date.now() + duration * 1000).toISOString();
    
    // 1. Optimistic UI update
    setTimer({ active: true, timeLeft: duration, duration: duration, isOpen: true });
    
    // 2. Sync with Server
    await setServerTimer(userId, expiresAt);
  };

  const handleSaveSession = async () => {
    if (exercises.length === 0) return;
    setIsSaving(true);
    await saveGymSession({ name: sessionName, exercises, householdid: userId });
    setIsSaving(false);
    localStorage.removeItem('gym-active-session'); // Clear local storage
    setExercises([]);
    setView('history');
  };

  const handleDiscardSession = () => {
    if (confirm("Discard session?")) {
      localStorage.removeItem('gym-active-session');
      setExercises([]);
      setView('history');
    }
  };

  const handleDeleteSession = async (id: string) => {
    await deleteGymSession(id);
  };

  const handleUpdateRestTime = async () => {
    await updateRestTimer(userId, restTimeSetting);
    setShowSettings(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {view === 'history' ? (
        <HistoryView 
          history={initialHistory} 
          onStartSession={startNewSession} 
          onDeleteSession={handleDeleteSession}
          onOpenSettings={() => setShowSettings(true)}
          onExit={() => router.push('/')}
        />
      ) : (
        <ActiveSessionView 
          sessionName={sessionName}
          setSessionName={setSessionName}
          exercises={exercises}
          setExercises={setExercises}
          onSave={handleSaveSession}
          onDiscard={handleDiscardSession}
          isSaving={isSaving}
          timer={timer}
          setTimerState={setTimer}
          restTimeSetting={restTimeSetting}
          history={initialHistory}
          onStartTimer={handleStartTimer}
        />
      )}

      {showSettings && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 p-6 rounded-2xl w-full max-w-xs border border-slate-700">
                <h3 className="text-lg font-bold mb-4 text-white">Settings</h3>
                <div className="mb-6">
                    <label className="block text-sm text-slate-400 mb-2">Default Rest Time (Seconds)</label>
                    <input type="number" value={restTimeSetting} onChange={(e) => setRestTimeSetting(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white" />
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowSettings(false)} className="flex-1 py-3 bg-slate-800 rounded-lg text-white">Cancel</button>
                    <button onClick={handleUpdateRestTime} className="flex-1 py-3 bg-blue-600 rounded-lg text-white">Save</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}