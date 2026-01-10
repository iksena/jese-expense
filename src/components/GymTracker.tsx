'use client'

import { deleteGymSession, saveGymSession, setTimer as setServerTimer, updateRestTimer } from '@/app/actions';
import { GymExercise, GymSession, HouseholdSettings } from '@/types';
import { ArrowLeft, Check, Dumbbell, Edit2, History, Loader2, LogOut, Pause, Play, Plus, RotateCcw, Save, Settings, Timer, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';

// --- Safe Audio Helper ---
const playBeep = () => {
  if (typeof window === 'undefined') return;
  try {
    const AudioContext = (window.AudioContext ?? (window as {webkitAudioContext?: typeof window.AudioContext}).webkitAudioContext) as (typeof window.AudioContext | undefined);
    if (!AudioContext) return;
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
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
  } catch (e) {
    console.warn("Audio playback prevented:", e);
  }
};

// --- Safe Notification Helper ---
const sendNotification = (title: string) => {
  if (typeof window === 'undefined' || !("Notification" in window)) return;
  try {
    if (Notification.permission === 'granted') {
      try {
        new Notification(title);
      } catch (e) {
        if (navigator.serviceWorker && navigator.serviceWorker.ready) {
          navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(title);
          }).catch(() => {});
        }
      }
    }
  } catch (e) {
    console.warn("Notification failed:", e);
  }
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
  history,
  onStartTimer
}: ActiveSessionViewProps) => {
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);

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
    <div className="max-w-2xl mx-auto p-4 pb-20">
      {/* Active Header with Editable Title */}
      <div className="flex items-center justify-between mb-6 gap-3">
        <button onClick={onDiscard} className="text-slate-500 hover:text-slate-300">
          <ArrowLeft size={24} />
        </button>
        
        <div className="flex-1 flex items-center gap-2">
          {isEditingTitle ? (
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              onBlur={() => setIsEditingTitle(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
              autoFocus
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-lg font-bold focus:border-blue-500 focus:outline-none"
            />
          ) : (
            <h1 className="text-xl font-bold text-white flex-1">{sessionName || 'New Workout'}</h1>
          )}
          <button 
            onClick={() => setIsEditingTitle(!isEditingTitle)}
            className="text-slate-500 hover:text-slate-300 p-2"
          >
            <Edit2 size={18} />
          </button>
        </div>

        <button 
          onClick={onSave} 
          disabled={isSaving || exercises.length === 0}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          Save
        </button>
      </div>

      {/* Exercises List */}
      <div className="space-y-4">
        {exercises.length === 0 && (
          <div className="text-center text-slate-500 py-12">No exercises. Add one!</div>
        )}

        {exercises.map((exercise, exIdx) => (
          <div key={exercise.id} className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
            <div className="flex items-center justify-between p-4 bg-slate-800/50">
              <div className="flex-1 flex items-center gap-2">
                {editingExerciseId === exercise.id ? (
                  <input
                    type="text"
                    value={exercise.name}
                    onChange={(e) => {
                      const newEx = [...exercises];
                      newEx[exIdx].name = e.target.value;
                      setExercises(newEx);
                    }}
                    onBlur={() => setEditingExerciseId(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingExerciseId(null)}
                    autoFocus
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-bold focus:border-blue-500 focus:outline-none"
                  />
                ) : (
                  <h3 className="font-bold text-white flex-1">{exercise.name}</h3>
                )}
                <button 
                  onClick={() => setEditingExerciseId(exercise.id)}
                  className="text-slate-500 hover:text-slate-300 p-1"
                >
                  <Edit2 size={16} />
                </button>
              </div>
              <button 
                onClick={() => setExercises(prev => prev.filter(e => e !== exercise))}
                className="text-slate-500 hover:text-red-400 p-1"
              >
                <Trash2 size={18} />
              </button>
            </div>

            <div className="p-4">
              <div className="grid grid-cols-[40px_1fr_1fr_60px_auto] gap-2 mb-2 text-xs text-slate-500 font-medium">
                <div>#</div>
                <div>kg</div>
                <div>Reps</div>
                <div>Done</div>
                <div></div>
              </div>

              {exercise.sets.map((set, sIdx) => (
                <div key={set.id} className="grid grid-cols-[40px_1fr_1fr_60px_auto] gap-2 mb-2 items-center">
                  <div className="text-slate-500 text-sm text-center">{sIdx + 1}</div>
                  
                  <input
                    type="number"
                    placeholder="0"
                    value={set.weight}
                    onChange={(e) => {
                      const newEx = [...exercises];
                      newEx[exIdx].sets[sIdx].weight = e.target.value;
                      setExercises(newEx);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-center text-sm focus:border-blue-500 focus:outline-none text-white"
                  />
                  
                  <input
                    type="number"
                    placeholder="0"
                    value={set.reps}
                    onChange={(e) => {
                      const newEx = [...exercises];
                      newEx[exIdx].sets[sIdx].reps = e.target.value;
                      setExercises(newEx);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-center text-sm focus:border-blue-500 focus:outline-none text-white"
                  />
                  
                  <button
                    onClick={() => {
                      const wasCompleted = set.completed;
                      const newEx = [...exercises];
                      newEx[exIdx].sets[sIdx].completed = !wasCompleted;
                      setExercises(newEx);
                      
                      // Start/Restart timer ONLY if marking AS DONE (Grey -> Green)
                      if (!wasCompleted) {
                        onStartTimer();
                      }
                    }}
                    className={`flex-1 flex justify-center items-center h-9 rounded ${set.completed ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'}`}
                  >
                    <Check size={18} />
                  </button>

                  {!set.completed && (
                    <button onClick={() => {
                      const newEx = [...exercises];
                      newEx[exIdx].sets = newEx[exIdx].sets.filter((_, i) => i !== sIdx);
                      setExercises(newEx);
                    }} className="px-2 text-slate-600 hover:text-red-400">
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}

              <button onClick={() => {
                const newEx = [...exercises];
                const lastSet = newEx[exIdx].sets[newEx[exIdx].sets.length - 1];
                newEx[exIdx].sets.push({ id: Math.random().toString(), weight: lastSet ? lastSet.weight : '', reps: lastSet ? lastSet.reps : '', completed: false });
                setExercises(newEx);
              }} className="w-full py-3 text-sm text-blue-400 hover:bg-blue-900/10 border-t border-slate-800 font-medium flex items-center justify-center gap-2">
                <Plus size={16} />
                Add Set
              </button>
            </div>
          </div>
        ))}

        <button onClick={() => setShowAddExercise(true)} className="w-full py-4 rounded-xl border-2 border-dashed border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-400 transition-colors flex flex-col items-center gap-2">
          <Plus size={24} />
          Add Exercise
        </button>
      </div>

      {/* Add Exercise Modal */}
      {showAddExercise && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center p-4">
          <div className="bg-slate-900 rounded-t-3xl w-full max-w-md p-6 animate-slide-up">
            <h3 className="text-lg font-bold mb-4 text-white">New Exercise</h3>
            <input
              type="text"
              placeholder="Exercise name"
              value={newExerciseName}
              onChange={(e) => setNewExerciseName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 mb-4 text-white focus:border-blue-500 focus:outline-none"
            />
            {recentExercises.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-slate-500 mb-2">Recent</p>
                <div className="flex flex-wrap gap-2">
                  {recentExercises.map(name => (
                    <button
                      key={name}
                      onClick={() => setNewExerciseName(name)}
                      className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded hover:bg-slate-700 border border-slate-700"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowAddExercise(false)} className="flex-1 py-3 bg-slate-800 rounded-lg text-white">Cancel</button>
              <button onClick={() => handleAddExercise(newExerciseName)} className="flex-1 py-3 bg-blue-600 rounded-lg text-white">Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Timer Overlay */}
      {timer.isOpen && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl p-8 w-full max-w-sm text-center">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Rest Timer</h3>
              <button onClick={() => setTimerState(t => ({...t, isOpen: false}))} className="text-slate-500">
                <X size={24} />
              </button>
            </div>

            <div className="relative w-48 h-48 mx-auto mb-6">
              <svg className="transform -rotate-90 w-48 h-48">
                <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="8" fill="none" className="text-slate-800" />
                <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="8" fill="none" className="text-emerald-500"
                  strokeDasharray={`${2 * Math.PI * 88}`}
                  strokeDashoffset={`${2 * Math.PI * 88 * (1 - calculateProgress() / 100)}`}
                  style={{ transition: 'stroke-dashoffset 1s linear' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-5xl font-mono font-bold text-white">{formatTime(timer.timeLeft)}</div>
                <div className="text-sm text-slate-500 mt-1">Target: {formatTime(timer.duration)}</div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4">
              <button onClick={() => setTimerState(p => ({ ...p, timeLeft: Math.max(0, p.timeLeft - 10) }))} className="p-3 rounded-full bg-slate-800 text-slate-300">-10s</button>
              <button onClick={() => setTimerState(p => ({ ...p, active: !p.active }))} className={`p-4 rounded-full ${timer.active ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500 text-white'}`}>
                {timer.active ? <Pause size={24} /> : <Play size={24} />}
              </button>
              <button onClick={() => setTimerState(p => ({ ...p, timeLeft: p.timeLeft + 30 }))} className="p-3 rounded-full bg-slate-800 text-slate-300">+30s</button>
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
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Dumbbell size={28} />
          Gym Tracker
        </h1>
        <div className="flex gap-2">
          <button onClick={onOpenSettings} className="p-2 text-slate-400 hover:text-white">
            <Settings size={22} />
          </button>
          <button onClick={onExit} className="p-2 text-slate-400 hover:text-white">
            <LogOut size={22} />
          </button>
        </div>
      </div>

      <button onClick={() => onStartSession()} className="w-full py-4 bg-emerald-600 rounded-xl text-white font-bold text-lg shadow-lg shadow-emerald-900/20 hover:bg-emerald-500 transition-all active:scale-95 flex items-center justify-center gap-2">
        <Plus size={24} />
        Start New Workout
      </button>

      <div className="mt-8">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <History size={20} />
          History
        </h2>

        {history.length === 0 ? (
          <div className="text-center text-slate-500 py-12">No workout history.</div>
        ) : (
          <div className="space-y-3">
            {history.map(session => (
              <div key={session.id} className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-white">{session.name || 'Workout'}</h3>
                    <p className="text-sm text-slate-500">{new Date(session.created_at).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(session.id)}
                    className="text-slate-600 hover:text-red-500 p-1"
                    disabled={deletingId === session.id}
                  >
                    {deletingId === session.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                  </button>
                </div>

                <div className="space-y-2 mb-3">
                  {session.exercises.map(ex => {
                    const completedSets = ex.sets.filter(s => s.completed);
                    const maxWeight = Math.max(...ex.sets.map(s => Number(s.weight) || 0));
                    const totalReps = completedSets.reduce((sum, s) => sum + (Number(s.reps) || 0), 0);
                    
                    return (
                      <div key={ex.id} className="flex items-center justify-between text-sm bg-slate-800/50 rounded-lg p-2">
                        <span className="text-slate-300">{ex.name}</span>
                        <div className="flex items-center gap-3 text-slate-400">
                          <span>{completedSets.length} sets</span>
                          {maxWeight > 0 && <span className="text-emerald-400 font-medium">{maxWeight}kg</span>}
                          <span>{totalReps} reps</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button onClick={() => onStartSession(session)} className="w-full py-2 bg-slate-800 rounded-lg text-blue-400 text-sm font-medium hover:bg-slate-700 flex items-center justify-center gap-2">
                  <RotateCcw size={16} />
                  Repeat This Workout
                </button>
              </div>
            ))}
          </div>
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
  const [sessionName, setSessionName] = useState('');
  const [exercises, setExercises] = useState<GymExercise[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // --- Timer State ---
  const [timer, setTimer] = useState<TimerState>({ active: false, timeLeft: 0, duration: restTimeSetting, isOpen: false });

  // --- Audio/Notification Effects ---
  useEffect(() => {
    if (typeof window !== 'undefined' && "Notification" in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

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
            if (savedView === 'active') setView('active');
          }, 0);
        }
      } catch (e) { console.error("Failed to load session", e); }
    }
  }, []);

  // Save active session to local storage
  useEffect(() => {
    if (exercises.length > 0) {
      localStorage.setItem('gym-active-session', JSON.stringify({ name: sessionName, exercises, view }));
    } else if (view === 'history') {
      localStorage.removeItem('gym-active-session');
    }
  }, [exercises, sessionName, view]);

  // Sync Timer with Server State (Robust Timer Logic)
  useEffect(() => {
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
            duration: restTimeSetting,
            isOpen: true
          }));
        }, 0);
      } else {
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
            playBeep();
            sendNotification("Rest Complete!");
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
        id: Date.now().toString() + Math.random(),
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
    
    // Restart logic: reset timer to full duration and restart
    setTimer({ active: true, timeLeft: duration, duration: duration, isOpen: true });
    
    // Sync with Server
    await setServerTimer(userId, expiresAt);
  };

  const handleSaveSession = async () => {
    if (exercises.length === 0) return;
    setIsSaving(true);
    await saveGymSession({ name: sessionName, exercises, householdid: userId });
    setIsSaving(false);
    localStorage.removeItem('gym-active-session');
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
    <div className="min-h-screen bg-slate-950 text-white">
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
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center p-4">
          <div className="bg-slate-900 rounded-t-3xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4 text-white">Settings</h3>
            <label className="block mb-4">
              <span className="text-sm text-slate-400 mb-2 block">Default Rest Time (Seconds)</span>
              <input type="number" value={restTimeSetting} onChange={(e) => setRestTimeSetting(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white" />
            </label>
            <div className="flex gap-3">
              <button onClick={() => setShowSettings(false)} className="flex-1 py-3 bg-slate-800 rounded-lg text-white">Cancel</button>
              <button onClick={handleUpdateRestTime} className="flex-1 py-3 bg-blue-600 rounded-lg text-white">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
