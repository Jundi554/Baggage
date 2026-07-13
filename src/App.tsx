import React, { useState, useEffect } from 'react';
import { CalendarView } from './components/CalendarView';
import { DropZone } from './components/DropZone';
import { BaggageList } from './components/BaggageList';
import { BaggageEvent } from './types';
import { Plane, LogIn, LogOut, Cloud, CloudOff } from 'lucide-react';
import { initAuth, googleSignIn, logout, getAccessToken, db } from './auth';
import { saveToGoogleCalendar } from './calendar';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  writeBatch,
  getDocs
} from 'firebase/firestore';

export default function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<BaggageEvent[]>(() => {
    const saved = localStorage.getItem('baggageEvents');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    let unsubscribe: () => void;

    const authUnsubscribe = initAuth(
      async (u) => {
        setUser(u);
        setIsAuthenticated(true);
        
        // Subscribe to Firestore events when logged in
        setIsLoadingEvents(true);
        console.log("Subscribing to Firestore for user:", u.uid);
        const baggageCollection = collection(db, 'baggage_events');
        const q = query(baggageCollection, where('userId', '==', u.uid));
        
        unsubscribe = onSnapshot(q, (snapshot) => {
          console.log("Snapshot received, docs:", snapshot.size);
          const fetchedEvents: BaggageEvent[] = [];
          snapshot.forEach((doc) => {
            fetchedEvents.push({ ...doc.data(), id: doc.id } as BaggageEvent);
          });
          
          // Initial sync logic: If we have local events without a userId, push them to Firestore
          // We do this by checking the current state before the first snapshot update
          setEvents((prev) => {
            const unsynced = prev.filter(e => !e.userId);
            if (unsynced.length > 0) {
              const batch = writeBatch(db);
              unsynced.forEach(event => {
                const docRef = doc(collection(db, 'baggage_events'));
                batch.set(docRef, {
                  ...event,
                  userId: u.uid,
                  createdAt: event.createdAt || new Date().toISOString()
                });
              });
              batch.commit().catch(err => console.error("Auto-sync error:", err));
            }
            return fetchedEvents;
          });
          
          setIsLoadingEvents(false);
        }, (error) => {
          console.error("Error fetching events:", error);
          setIsLoadingEvents(false);
          showToast("Gagal memuat data dari database.");
        });
      },
      () => {
        setUser(null);
        setIsAuthenticated(false);
        // On logout, we can either clear or keep what's there
        // Keeping it allows offline access to the last known state
      }
    );

    return () => {
      authUnsubscribe();
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleLogin = async () => {
    try {
      await googleSignIn();
    } catch (e) {
      showToast('Login failed. Please try again.');
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleSaveToCalendar = async (event: BaggageEvent) => {
    if (!isAuthenticated) {
      showToast('Silahkan sign in ke Google Calendar terlebih dahulu');
      await handleLogin();
      return;
    }
    
    try {
      await saveToGoogleCalendar(event);
      showToast('Berhasil disimpan ke Google Calendar!');
    } catch (e: any) {
      showToast(`Gagal menyimpan: ${e.message}`);
    }
  };

  // Save to local storage when events change
  useEffect(() => {
    localStorage.setItem('baggageEvents', JSON.stringify(events));
  }, [events]);

  const handleParse = async (text: string) => {
    const response = await fetch('/api/parse-baggage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        text, 
        currentDate: new Date().toISOString() 
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Gagal memproses data dengan server.');
    }

    const data = await response.json();
    
    const schedules = Array.isArray(data.schedules) && data.schedules.length > 0 
      ? data.schedules 
      : [{ route: data.route || 'Tidak Diketahui', departureDate: null }];
      
    const newEvents: BaggageEvent[] = schedules.map((schedule: any) => ({
      id: crypto.randomUUID(),
      providerName: data.providerName || 'Tidak Diketahui',
      route: schedule.route || data.route || 'Tidak Diketahui',
      policy: data.policy || 'Tidak ada info kebijakan',
      pricePerKg: data.pricePerKg || 'Tidak ada info harga',
      phoneNumbers: data.phoneNumbers || [],
      addressCairo: data.addressCairo || 'Tidak Diketahui',
      addressIndonesia: data.addressIndonesia || 'Tidak Diketahui',
      departureDate: schedule.departureDate || null,
      createdAt: new Date().toISOString()
    }));

    // Check for duplicates
    const uniqueNewEvents = newEvents.filter(newEvent => {
      const isDuplicate = newEvent.departureDate && events.some(existingEvent => 
        existingEvent.providerName.toLowerCase() === newEvent.providerName.toLowerCase() &&
        existingEvent.departureDate === newEvent.departureDate
      );
      return !isDuplicate;
    });

    if (uniqueNewEvents.length < newEvents.length) {
      showToast('⚠️ Peringatan: Terdapat jadwal dengan penyedia bagasi yang sama di tanggal tersebut. Jadwal duplikat diabaikan.');
    } else if (uniqueNewEvents.length > 0) {
      showToast('✅ Berhasil menambahkan jadwal baru.');
    }

    if (uniqueNewEvents.length > 0) {
      if (isAuthenticated && user) {
        // Save to Firestore
        try {
          const batch = writeBatch(db);
          uniqueNewEvents.forEach(event => {
            const docRef = doc(collection(db, 'baggage_events'));
            batch.set(docRef, {
              ...event,
              userId: user.uid,
              createdAt: new Date().toISOString()
            });
          });
          await batch.commit();
        } catch (e) {
          console.error("Error saving to Firestore:", e);
          showToast("Gagal menyimpan ke database.");
        }
      } else {
        setEvents(prev => {
          const trulyUnique = uniqueNewEvents.filter(newEvent => 
            !prev.some(existingEvent => 
              existingEvent.providerName.toLowerCase() === newEvent.providerName.toLowerCase() &&
              existingEvent.departureDate === newEvent.departureDate
            )
          );
          return [...prev, ...trulyUnique];
        });
      }
      
      if (uniqueNewEvents[0].departureDate) {
        setCurrentDate(new Date(uniqueNewEvents[0].departureDate));
      }
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (isAuthenticated && user) {
      try {
        await deleteDoc(doc(db, 'baggage_events', id));
      } catch (e) {
        console.error("Error deleting from Firestore:", e);
        showToast("Gagal menghapus dari database.");
      }
    } else {
      setEvents(prev => prev.filter(event => event.id !== id));
    }
  };

  const handleClearAll = () => {
    setShowClearConfirm(true);
  };

  const confirmClearAll = async () => {
    if (isAuthenticated && user) {
      try {
        const q = query(collection(db, 'baggage_events'), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
      } catch (e) {
        console.error("Error clearing Firestore:", e);
        showToast("Gagal menghapus data dari database.");
      }
    } else {
      setEvents([]);
    }
    setShowClearConfirm(false);
    showToast('Semua jadwal berhasil dihapus');
  };

  const cancelClearAll = () => {
    setShowClearConfirm(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans flex flex-col">
      {/* Header */}
      <header className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2">
        <div className="flex justify-between items-center bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Plane className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Baggage<span className="text-indigo-400">Tracker</span></h1>
          </div>
          <div className="flex gap-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
                  {isLoadingEvents ? (
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  ) : (
                    <Cloud className="w-3.5 h-3.5 text-green-400" />
                  )}
                  <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider">Cloud Synced</span>
                </div>
                <span className="text-xs text-slate-300 hidden sm:inline">Signed in as <span className="font-bold text-white">{user?.displayName || 'User'}</span></span>
                <button 
                  onClick={handleLogout}
                  className="p-2 bg-white/10 hover:bg-white/20 transition-colors rounded-xl border border-white/10 text-white"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-white/5 rounded-full">
                  <CloudOff className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Local Mode</span>
                </div>
                <button 
                  onClick={handleLogin}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 transition-colors rounded-xl border border-white/10 text-white text-xs font-bold"
                >
                  <LogIn className="w-4 h-4" />
                  Sign in with Google
                </button>
              </div>
            )}

          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
          {/* Left Column: Calendar & Add Form */}
          <div className="lg:col-span-8 flex flex-col gap-6 h-full">
            <CalendarView 
              currentDate={currentDate} 
              setCurrentDate={setCurrentDate} 
              events={events} 
            />
          </div>

          {/* Right Column: List and Dropzone */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <DropZone onParse={isOnline ? handleParse : undefined} isOnline={isOnline} />
            <BaggageList 
              events={events} 
              currentDate={currentDate} 
              onSaveToCalendar={handleSaveToCalendar}
              onDeleteEvent={handleDeleteEvent}
              onClearAll={handleClearAll}
            />
          </div>
        </div>
      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl border border-white/10 text-sm font-medium">
            {toastMessage}
          </div>
        </div>
      )}

      {/* Confirm Clear All Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Hapus Semua Jadwal?</h3>
              <p className="text-sm text-slate-400">
                Tindakan ini tidak dapat dibatalkan. Semua data jadwal akan dihapus secara permanen.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={cancelClearAll}
                className="flex-1 py-2.5 px-4 rounded-xl border border-white/10 text-white font-medium hover:bg-white/5 transition-colors text-sm"
              >
                Batal
              </button>
              <button
                onClick={confirmClearAll}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-colors text-sm"
              >
                Ya, Hapus Semua
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
