import React, { useState, useEffect } from 'react';
import { CalendarView } from './components/CalendarView';
import { DropZone } from './components/DropZone';
import { BaggageList } from './components/BaggageList';
import { BaggageEvent } from './types';
import { Plane, LogIn, LogOut, Cloud, CloudOff, Search, X } from 'lucide-react';
import { initAuth, googleSignIn, logout, getAccessToken, db, auth, handleFirestoreError, OperationType } from './auth';
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
  const [searchQuery, setSearchQuery] = useState('');

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

  const cleanEvents = React.useMemo(() => {
    // Sort by departureDate closest first, then by providerName
    const sorted = [...events].sort((a, b) => {
      if (!a.departureDate && b.departureDate) return 1;
      if (a.departureDate && !b.departureDate) return -1;
      
      const dateDiff = (a.departureDate ? new Date(a.departureDate).getTime() : 0) - (b.departureDate ? new Date(b.departureDate).getTime() : 0);
      if (dateDiff !== 0) return dateDiff;

      return a.providerName.localeCompare(b.providerName);
    });

    // Deduplicate by providerName and departureDate (even if route is different)
    const unique: BaggageEvent[] = [];
    const seen = new Set<string>();
    for (const event of sorted) {
      const key = `${event.providerName.toLowerCase()}-${event.departureDate}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(event);
      }
    }
    return unique;
  }, [events]);

  const filteredEvents = React.useMemo(() => {
    if (!searchQuery.trim()) return cleanEvents;
    const queryStr = searchQuery.toLowerCase().trim();
    return cleanEvents.filter(event => {
      const provider = (event.providerName || '').toLowerCase();
      const route = (event.route || '').toLowerCase();
      const policy = (event.policy || '').toLowerCase();
      const addressCairo = (event.addressCairo || '').toLowerCase();
      const addressIndonesia = (event.addressIndonesia || '').toLowerCase();
      return (
        provider.includes(queryStr) ||
        route.includes(queryStr) ||
        policy.includes(queryStr) ||
        addressCairo.includes(queryStr) ||
        addressIndonesia.includes(queryStr)
      );
    });
  }, [cleanEvents, searchQuery]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const authUnsubscribe = initAuth(
      async (u) => {
        setUser(u);
        setIsAuthenticated(true);
        
        // Subscribe to Firestore events when logged in
        setIsLoadingEvents(true);
        console.log("Subscribing to Firestore for user:", u.uid);
        const baggageCollection = collection(db, 'baggage_events');
        const q = query(baggageCollection, where('userId', '==', u.uid));
        
        // Unsubscribe from any previous listener just in case
        if (unsubscribe) {
          unsubscribe();
        }
        
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
              batch.commit().catch(err => {
                console.error("Auto-sync error:", err);
                handleFirestoreError(err, OperationType.WRITE, 'baggage_events');
              });
            }
            return fetchedEvents;
          });
          
          setIsLoadingEvents(false);
        }, (error) => {
          console.error("Error fetching events:", error);
          setIsLoadingEvents(false);
          // Only show error if we are still authenticated
          if (auth.currentUser) {
            showToast("Gagal memuat data dari database.");
            handleFirestoreError(error, OperationType.LIST, 'baggage_events');
          }
        });
      },
      () => {
        setUser(null);
        setIsAuthenticated(false);
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = undefined;
        }
      }
    );

    return () => {
      authUnsubscribe();
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const handleLogin = async () => {
    try {
      await googleSignIn();
    } catch (e: any) {
      if (e?.code === 'auth/popup-closed-by-user') {
        console.log('Login popup closed by user');
      } else {
        showToast('Gagal masuk. Silakan coba lagi.');
      }
    }
  };

  const handleLogout = async () => {
    await logout();
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
      
    // Map to BaggageEvent objects
    const mappedEvents: BaggageEvent[] = schedules.map((schedule: any) => ({
      id: crypto.randomUUID(),
      providerName: (data.providerName || 'Tidak Diketahui').trim(),
      route: (schedule.route || data.route || 'Tidak Diketahui').trim(),
      policy: data.policy || 'Tidak ada info kebijakan',
      pricePerKg: data.pricePerKg || 'Tidak ada info harga',
      phoneNumbers: data.phoneNumbers || [],
      addressCairo: data.addressCairo || 'Tidak Diketahui',
      addressIndonesia: data.addressIndonesia || 'Tidak Diketahui',
      departureDate: schedule.departureDate || null,
      createdAt: new Date().toISOString()
    }));

    // Deduplicate within the NEW batch (in case AI returns same schedule twice)
    const uniqueInBatch: BaggageEvent[] = [];
    mappedEvents.forEach(item => {
      const isDupe = uniqueInBatch.some(b => 
        b.providerName.toLowerCase() === item.providerName.toLowerCase() &&
        b.route.toLowerCase() === item.route.toLowerCase() &&
        b.departureDate === item.departureDate
      );
      if (!isDupe) uniqueInBatch.push(item);
    });

    // Check for duplicates against existing events
    const uniqueNewEvents = uniqueInBatch.filter(newEvent => {
      const isDuplicate = newEvent.departureDate && events.some(existingEvent => 
        existingEvent.providerName.toLowerCase() === newEvent.providerName.toLowerCase() &&
        existingEvent.route.toLowerCase() === newEvent.route.toLowerCase() &&
        existingEvent.departureDate === newEvent.departureDate
      );
      return !isDuplicate;
    });

    if (uniqueNewEvents.length < mappedEvents.length) {
      if (uniqueNewEvents.length === 0 && mappedEvents.length > 0) {
        showToast('ℹ️ Informasi: Jadwal sudah ada di dalam daftar.');
        return;
      }
      showToast('⚠️ Peringatan: Terdapat jadwal duplikat yang diabaikan.');
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
          handleFirestoreError(e, OperationType.WRITE, 'baggage_events');
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
        handleFirestoreError(e, OperationType.DELETE, `baggage_events/${id}`);
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
        handleFirestoreError(e, OperationType.DELETE, 'baggage_events');
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
    <div className="min-h-screen bg-bni-light text-[#00414A] font-sans flex flex-col selection:bg-orange-100">
      
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-bni-teal text-white shadow-md h-14 flex items-center">
        <div className="max-w-[1400px] w-full mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-bni-orange rounded-full flex items-center justify-center shrink-0 shadow-md">
              <Plane className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight block">
              Baggage<span className="text-bni-orange">Tracker</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Kunci Pencarian (Search Input) */}
            <div className="relative flex items-center">
              <div className="absolute left-2.5 text-white/60 pointer-events-none">
                <Search className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                placeholder="Cari bagasi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-7 py-1.5 bg-white/10 hover:bg-white/15 focus:bg-white/20 focus:outline-none focus:ring-1 focus:ring-white/30 rounded-full text-[13px] text-white placeholder-white/50 transition-all w-28 xs:w-32 sm:w-44 md:w-56"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 text-white/60 hover:text-white p-0.5 rounded-full hover:bg-white/10 transition-colors"
                  title="Bersihkan pencarian"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-10 h-10 bg-[#004D57] hover:bg-[#003E46] rounded-full text-white/90 cursor-default" title="Tersinkronisasi dengan Cloud">
                  {isLoadingEvents ? (
                    <div className="w-2 h-2 bg-bni-orange rounded-full animate-pulse" />
                  ) : (
                    <Cloud className="w-5 h-5" />
                  )}
                </div>
                <div className="hidden sm:flex items-center px-4 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full transition-colors cursor-pointer">
                  <span className="text-[15px] font-semibold text-white">{user?.displayName?.split(' ')[0] || 'Pengguna'}</span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="w-10 h-10 flex items-center justify-center bg-[#004D57] hover:bg-bni-orange hover:text-white transition-colors rounded-full text-white/90"
                  title="Keluar"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-10 h-10 bg-[#004D57] rounded-full text-white/80 hidden sm:flex" title="Penyimpanan lokal">
                  <CloudOff className="w-5 h-5" />
                </div>
                <button 
                  onClick={handleLogin}
                  className="flex items-center gap-2 px-5 py-1.5 bg-bni-orange hover:bg-[#e04f1a] transition-all rounded-full text-white text-[15px] font-bold shadow-md shadow-black/10"
                >
                  <LogIn className="w-4 h-4" />
                  Masuk
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 py-4 sm:py-6">
        <div className="flex flex-col gap-6">
          {/* Calendar Section */}
          <div className="w-full bg-white rounded-2xl shadow-sm border border-bni-teal/10 overflow-hidden min-h-[500px] sm:min-h-[600px]">
            <CalendarView 
              currentDate={currentDate} 
              setCurrentDate={setCurrentDate} 
              events={filteredEvents} 
            />
          </div>

          {/* Details Section (Previously Sidebar) */}
          <div className="w-full flex flex-col gap-6">
            <DropZone onParse={isOnline ? handleParse : undefined} isOnline={isOnline} />
            <BaggageList 
              events={filteredEvents} 
              currentDate={currentDate} 
              onDeleteEvent={handleDeleteEvent}
              onClearAll={handleClearAll}
              showToast={showToast}
            />
          </div>
        </div>
      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-6">
          <div className="bg-bni-dark text-white px-5 py-3 rounded-xl shadow-xl text-[15px] flex items-center gap-3 border border-bni-teal/20">
            <div className="w-2.5 h-2.5 rounded-full bg-bni-orange animate-pulse"></div>
            {toastMessage}
          </div>
        </div>
      )}

      {/* Confirm Clear All Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bni-dark/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-[#CED0D4] rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-bni-teal mb-2">Hapus Semua Jadwal?</h3>
              <p className="text-[15px] text-gray-600">
                Tindakan ini tidak dapat dibatalkan. Semua jadwal bagasi yang tersimpan akan dihapus permanen.
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelClearAll}
                className="py-2 px-4 rounded-full bg-transparent text-bni-teal hover:bg-bni-light font-bold transition-colors text-[15px]"
              >
                Batal
              </button>
              <button
                onClick={confirmClearAll}
                className="py-2 px-6 rounded-full bg-bni-orange hover:bg-[#e04f1a] text-white font-bold transition-colors text-[15px] shadow-sm shadow-orange-500/10"
              >
                Hapus Semua
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
