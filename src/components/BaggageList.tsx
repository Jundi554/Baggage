import React, { useState } from 'react';
import { format, parseISO, isSameMonth, differenceInCalendarDays } from 'date-fns';
import { id } from 'date-fns/locale';
import { BaggageEvent } from '../types';
import { PlaneTakeoff, Phone, Package, Info, Calendar, CheckCircle, Trash2, Share2, Facebook, MessageCircle } from 'lucide-react';

interface BaggageListProps {
  events: BaggageEvent[];
  currentDate: Date;
  onSaveToCalendar: (event: BaggageEvent) => void;
  onDeleteEvent: (id: string) => void;
  onClearAll: () => void;
}

export function BaggageList({ events, currentDate, onSaveToCalendar, onDeleteEvent, onClearAll }: BaggageListProps) {
  const [routeFilter, setRouteFilter] = useState<'all' | 'jkt-cai' | 'cai-jkt'>('all');

  // Helper to determine route type
  const getRouteType = (route: string): 'jkt-cai' | 'cai-jkt' | 'other' => {
    const r = route.toLowerCase();
    const isJktCai = (r.includes('jakarta') && r.includes('kairo') && r.indexOf('jakarta') < r.indexOf('kairo')) ||
                     (r.includes('jakarta') && r.includes('cairo') && r.indexOf('jakarta') < r.indexOf('cairo')) ||
                     (r.includes('jkt') && r.includes('cai') && r.indexOf('jkt') < r.indexOf('cai')) ||
                     r.includes('jakarta - kairo') || r.includes('jkt - cai') || r.includes('jakarta to cairo') || r.includes('jkt-cai');
    
    if (isJktCai) return 'jkt-cai';

    const isCaiJkt = (r.includes('kairo') && r.includes('jakarta') && r.indexOf('kairo') < r.indexOf('jakarta')) ||
                     (r.includes('cairo') && r.includes('jakarta') && r.indexOf('cairo') < r.indexOf('jakarta')) ||
                     (r.includes('cai') && r.includes('jkt') && r.indexOf('cai') < r.indexOf('jkt')) ||
                     r.includes('kairo - jakarta') || r.includes('cai - jkt') || r.includes('cairo to jakarta') || r.includes('cai-jkt');

    if (isCaiJkt) return 'cai-jkt';
    return 'other';
  };

  const shareEvent = (event: BaggageEvent, platform: 'wa' | 'fb') => {
    const contacts = event.phoneNumbers.map(n => `${n} (wa.me/${n.replace(/\D/g, '')})`).join(', ');
    const price = typeof event.pricePerKg === 'number' ? `Rp ${event.pricePerKg.toLocaleString('id-ID')}/kg` : event.pricePerKg;
    const date = event.departureDate ? format(parseISO(event.departureDate), 'd MMMM yyyy', { locale: id }) : 'Tidak diketahui';
    
    const text = `*INFO BAGASI TERDEKAT*

✈️ : ${event.providerName}
📍 : ${event.route}
🏤 : ${event.addressCairo || '-'} / ${event.addressIndonesia || '-'}
📅 : ${date}
💰 : ${price}
📝 : ${event.policy}
📞 : ${contacts}

Info lebih lanjut silakan hubungi kontak tertera.`;

    if (platform === 'wa') {
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    } else {
        navigator.clipboard.writeText(text);
        alert("Teks informasi perjalanan berhasil disalin! Silakan tempel (paste) di Facebook.");
    }
  };
  const monthlyEvents = events
    .filter(e => e.departureDate && isSameMonth(parseISO(e.departureDate), currentDate))
    .filter(e => {
        if (routeFilter === 'all') return true;
        return getRouteType(e.route) === routeFilter;
    })
    .sort((a, b) => {
      const dateA = a.departureDate ? new Date(a.departureDate).getTime() : 0;
      const dateB = b.departureDate ? new Date(b.departureDate).getTime() : 0;
      return dateA - dateB;
    });

  // Calculate statistics for the active month (always show all stats)
  const allMonthlyEvents = events.filter(e => e.departureDate && isSameMonth(parseISO(e.departureDate), currentDate));
  const jktToCaiCount = allMonthlyEvents.filter(e => getRouteType(e.route) === 'jkt-cai').length;
  const caiToJktCount = allMonthlyEvents.filter(e => getRouteType(e.route) === 'cai-jkt').length;

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden flex flex-col h-full max-h-[800px]">
      <div className="px-6 py-5 border-b border-white/10 bg-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PlaneTakeoff className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-semibold text-slate-100">
            Jadwal Terdekat ({format(currentDate, 'MMMM', { locale: id })})
          </h2>
        </div>
        <button
          onClick={onClearAll}
          className="px-3 py-1.5 text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors flex items-center gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Hapus Semua
        </button>
      </div>

      {/* Summary Statistics Counter for the month */}
      <div className="px-5 py-4 bg-white/5 border-b border-white/10 grid grid-cols-2 gap-4">
        <div 
          onClick={() => setRouteFilter(routeFilter === 'jkt-cai' ? 'all' : 'jkt-cai')}
          className={`cursor-pointer border rounded-2xl p-3 flex flex-col justify-between transition-all duration-300 ${
            routeFilter === 'jkt-cai' 
              ? 'bg-indigo-600/30 border-indigo-400/60 shadow-[0_0_15px_rgba(79,70,229,0.3)]'
              : 'bg-indigo-600/10 border-indigo-400/20 hover:bg-indigo-600/20'
          }`}
        >
          <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Jakarta → Kairo</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-black text-white">{jktToCaiCount}</span>
            <span className="text-[10px] text-indigo-200">Perjalanan</span>
          </div>
        </div>
        <div 
          onClick={() => setRouteFilter(routeFilter === 'cai-jkt' ? 'all' : 'cai-jkt')}
          className={`cursor-pointer border rounded-2xl p-3 flex flex-col justify-between transition-all duration-300 ${
            routeFilter === 'cai-jkt' 
              ? 'bg-emerald-600/30 border-emerald-400/60 shadow-[0_0_15px_rgba(5,150,105,0.3)]'
              : 'bg-emerald-600/10 border-emerald-400/20 hover:bg-emerald-600/20'
          }`}
        >
          <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">Kairo → Jakarta</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-black text-white">{caiToJktCount}</span>
            <span className="text-[10px] text-emerald-200">Perjalanan</span>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {monthlyEvents.length === 0 ? (
          <div className="py-8 text-center flex flex-col items-center">
            <Package className="w-10 h-10 text-slate-600 mb-3" />
            <h3 className="text-slate-300 text-sm font-medium mb-1">Tidak ada jadwal bagasi</h3>
            <p className="text-xs text-slate-500 max-w-[200px] mx-auto">
              Belum ada jadwal tersimpan untuk bulan {format(currentDate, 'MMMM yyyy', { locale: id })}.
            </p>
          </div>
        ) : (
          monthlyEvents.map((event) => {
          const days = event.departureDate ? differenceInCalendarDays(parseISO(event.departureDate), new Date()) : null;
          const isPast = days !== null && days < 0;

          return (
          <div key={event.id} className={`p-5 bg-indigo-600/10 backdrop-blur-xl border border-indigo-400/20 rounded-2xl relative transition-all duration-300 ${isPast ? 'opacity-60 grayscale' : 'hover:bg-indigo-600/20'}`}>
            {event.departureDate && (
              <div className={`absolute -top-3 right-4 px-3 py-1 rounded-full text-[10px] font-bold text-white shadow-lg flex items-center gap-1 ${isPast ? 'bg-slate-500 shadow-slate-500/20' : 'bg-indigo-500 shadow-indigo-500/20'}`}>
                <Calendar className="w-3 h-3" />
                {format(parseISO(event.departureDate), 'd MMM yyyy', { locale: id })}
              </div>
            )}
            {isPast && (
              <div className="absolute -top-3 left-4 bg-slate-500 px-3 py-1 rounded-full text-[10px] font-bold text-white shadow-lg shadow-slate-500/20 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                SUDAH BERLALU
              </div>
            )}
            
            <div className="grid grid-cols-1 gap-y-4">
              <div className="space-y-1">
                <p className="text-[10px] text-indigo-300 uppercase font-bold tracking-widest">Penyedia Bagasi</p>
                <p className="text-lg font-semibold text-white">{event.providerName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-indigo-300 uppercase font-bold tracking-widest">Rute Perjalanan</p>
                <p className="text-sm font-semibold text-white">{event.route}</p>
              </div>
              <div className="h-px bg-white/10"></div>
              <div className="space-y-1">
                <p className="text-[10px] text-indigo-300 uppercase font-bold tracking-widest">Kebijakan Bagasi</p>
                <p className="text-sm text-slate-200 leading-relaxed">{event.policy}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-indigo-300 uppercase font-bold tracking-widest">Biaya Per KG</p>
                <p className="text-xl font-bold text-green-400">
                  {typeof event.pricePerKg === 'number' 
                    ? `Rp ${event.pricePerKg.toLocaleString('id-ID')}`
                    : event.pricePerKg}
                  {typeof event.pricePerKg === 'number' && <span className="text-xs text-slate-400 font-normal"> / kg</span>}
                </p>
              </div>
              <div className="h-px bg-white/10"></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] text-indigo-300 uppercase font-bold tracking-widest">Alamat Kairo</p>
                  <p className="text-xs text-slate-300 leading-relaxed">{event.addressCairo || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-indigo-300 uppercase font-bold tracking-widest">Alamat Indonesia</p>
                  <p className="text-xs text-slate-300 leading-relaxed">{event.addressIndonesia || '-'}</p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3">
              {!isPast && event.phoneNumbers && event.phoneNumbers.length > 0 && event.phoneNumbers.map((phone, idx) => (
                <a
                  key={idx}
                  href={`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Apakah bagasi untuk tanggal ${event.departureDate ? format(parseISO(event.departureDate), 'd MMMM yyyy', { locale: id }) : 'tersebut'} dari ${event.route} masih tersedia? `)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 transition-colors py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-green-400"
                >
                  <Phone className="w-4 h-4" />
                  HUBUNGI WHATSAPP (+{phone})
                </a>
              ))}
              
              {!isPast && (
                <button 
                  onClick={() => onSaveToCalendar(event)}
                  className="w-full px-6 bg-white/10 hover:bg-white/20 transition-colors py-2.5 rounded-xl text-xs font-bold border border-white/10 text-white flex items-center justify-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  SIMPAN KE KALENDER
                </button>
              )}

              <div className="flex gap-2">
                <div className={`flex-1 px-4 py-3 rounded-xl border flex flex-col items-center justify-center ${
                  days === null 
                    ? 'bg-slate-500/20 border-slate-500/30 text-slate-300'
                    : days < 0
                    ? 'bg-slate-500/20 border-slate-500/30 text-slate-300'
                    : days === 0
                    ? 'bg-amber-500/20 border-amber-500/30 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                    : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                }`}>
                  <div className="flex items-center gap-2">
                    {days === null ? <Calendar className="w-5 h-5" /> : days < 0 ? <CheckCircle className="w-5 h-5" /> : days === 0 ? <PlaneTakeoff className="w-6 h-6 animate-pulse" /> : <Calendar className="w-5 h-5" />}
                    <span className="text-lg font-black uppercase tracking-wider">
                      {days === null ? 'Tidak diketahui' : days < 0 ? 'Selesai' : days === 0 ? 'HARI INI' : `${days} HARI LAGI`}
                    </span>
                  </div>
                  {days !== null && days > 0 && <span className="text-[10px] font-medium opacity-80 uppercase tracking-widest mt-0.5">Menuju Keberangkatan</span>}
                </div>
                <button 
                  onClick={() => onDeleteEvent(event.id)}
                  className="px-4 py-3 bg-red-500/20 hover:bg-red-500/30 transition-colors rounded-xl text-xs font-bold border border-red-500/30 text-red-400 flex items-center justify-center"
                  title="Hapus perjalanan"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => shareEvent(event, 'wa')}
                  className="px-4 py-3 bg-green-500/20 hover:bg-green-500/30 transition-colors rounded-xl text-xs font-bold border border-green-500/30 text-green-400 flex items-center justify-center"
                  title="Bagikan ke WhatsApp"
                >
                  <MessageCircle className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => shareEvent(event, 'fb')}
                  className="px-4 py-3 bg-blue-600/20 hover:bg-blue-600/30 transition-colors rounded-xl text-xs font-bold border border-blue-600/30 text-blue-400 flex items-center justify-center"
                  title="Bagikan ke Facebook"
                >
                  <Facebook className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
          );
        })
        )}
      </div>
    </div>
  );
}
