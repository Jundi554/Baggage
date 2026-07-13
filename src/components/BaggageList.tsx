import React, { useState } from 'react';
import { format, parseISO, isSameMonth, differenceInCalendarDays } from 'date-fns';
import { id } from 'date-fns/locale';
import { BaggageEvent } from '../types';
import { Plane, MapPin, Building2, Calendar, FileText, Phone, CheckCircle, Trash2, Share2, Facebook, MessageCircle, Package, PlaneTakeoff, Send, Instagram, Copy } from 'lucide-react';

interface BaggageListProps {
  events: BaggageEvent[];
  currentDate: Date;
  onDeleteEvent: (id: string) => void;
  onClearAll: () => void;
  showToast?: (msg: string) => void;
}

export function BaggageList({ events, currentDate, onDeleteEvent, onClearAll, showToast }: BaggageListProps) {
  const [routeFilter, setRouteFilter] = useState<'all' | 'jkt-cai' | 'cai-jkt'>('all');
  const [activeShareMenu, setActiveShareMenu] = useState<string | null>(null);

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

  const shareEvent = (event: BaggageEvent, platform: 'whatsapp' | 'telegram' | 'messenger' | 'instagram' | 'copy') => {
    const contacts = event.phoneNumbers.map(n => `${n} (wa.me/${n.replace(/\D/g, '')})`).join(', ');
    const price = typeof event.pricePerKg === 'number' ? `Rp ${event.pricePerKg.toLocaleString('id-ID')}/kg` : event.pricePerKg;
    const date = event.departureDate ? format(parseISO(event.departureDate), 'd MMMM yyyy', { locale: id }) : 'Tidak diketahui';
    
    const text = `*INFO BAGASI TERDEKAT*

✈️ : ${event.providerName.toUpperCase()}
📍 : ${event.route}
🏤 : ${event.addressCairo || '-'} / ${event.addressIndonesia || '-'}
📅 : ${date}
💰 : ${price}
📝 : ${event.policy}
📞 : ${contacts}

Info lebih lanjut silakan hubungi kontak tertera.`;

    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    } else if (platform === 'telegram') {
      window.open(`https://t.me/share/url?url=&text=${encodeURIComponent(text)}`, '_blank');
    } else if (platform === 'messenger') {
      navigator.clipboard.writeText(text);
      if (showToast) {
        showToast("Teks disalin ke papan klip! Membuka Messenger...");
      } else {
        alert("Teks disalin ke papan klip! Membuka Messenger...");
      }
      setTimeout(() => {
        window.open('https://www.messenger.com/', '_blank');
      }, 1000);
    } else if (platform === 'instagram') {
      navigator.clipboard.writeText(text);
      if (showToast) {
        showToast("Teks disalin ke papan klip! Membuka Instagram...");
      } else {
        alert("Teks disalin ke papan klip! Membuka Instagram...");
      }
      setTimeout(() => {
        window.open('https://www.instagram.com/', '_blank');
      }, 1000);
    } else {
      navigator.clipboard.writeText(text);
      if (showToast) {
        showToast("Teks iklan bagasi berhasil disalin!");
      } else {
        alert("Teks iklan bagasi berhasil disalin!");
      }
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
      if (dateA !== dateB) return dateA - dateB;
      
      return a.providerName.localeCompare(b.providerName);
    });

  // Calculate statistics for the active month (always show all stats)
  const allMonthlyEvents = events.filter(e => e.departureDate && isSameMonth(parseISO(e.departureDate), currentDate));
  const jktToCaiCount = allMonthlyEvents.filter(e => getRouteType(e.route) === 'jkt-cai').length;
  const caiToJktCount = allMonthlyEvents.filter(e => getRouteType(e.route) === 'cai-jkt').length;

  return (
    <div className="bg-transparent flex flex-col h-full relative">
      <div className="sticky top-[56px] z-30 bg-bni-light/95 backdrop-blur-sm pt-1 pb-3 px-1 -mx-1">
        <div className="px-4 py-3 bg-white border border-bni-teal/20 rounded-xl mb-3 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <h2 className="text-[17px] font-extrabold text-bni-teal">
              Jadwal Penerbangan Bulan {format(currentDate, 'MMMM yyyy', { locale: id })}
            </h2>
          </div>
          <button
            onClick={onClearAll}
            className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-all"
            title="Hapus Semua"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Statistics Counter for the month */}
        <div className="flex gap-2">
          <button 
            onClick={() => setRouteFilter(routeFilter === 'jkt-cai' ? 'all' : 'jkt-cai')}
            className={`flex-1 px-3 py-2 rounded-xl flex flex-col items-center justify-center transition-all duration-300 ${
              routeFilter === 'jkt-cai' 
                ? 'bg-[#EAF3F4] border border-bni-teal/30 text-bni-teal shadow-inner'
                : 'bg-white border border-bni-teal/10 text-bni-dark/70 hover:bg-bni-light/50 shadow-sm'
            }`}
          >
            <span className="text-[13px] font-bold">JKT → CAI</span>
            <span className="text-xl font-extrabold text-bni-orange">{jktToCaiCount}</span>
          </button>
          <button 
            onClick={() => setRouteFilter(routeFilter === 'cai-jkt' ? 'all' : 'cai-jkt')}
            className={`flex-1 px-3 py-2 rounded-xl flex flex-col items-center justify-center transition-all duration-300 ${
              routeFilter === 'cai-jkt' 
                ? 'bg-[#EAF3F4] border border-bni-teal/30 text-bni-teal shadow-inner'
                : 'bg-white border border-bni-teal/10 text-bni-dark/70 hover:bg-bni-light/50 shadow-sm'
            }`}
          >
            <span className="text-[13px] font-bold">CAI → JKT</span>
            <span className="text-xl font-extrabold text-bni-orange">{caiToJktCount}</span>
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-4 relative z-10 custom-scrollbar pt-2 pb-4">
        {monthlyEvents.length === 0 ? (
          <div className="py-8 text-center flex flex-col items-center bg-white border border-bni-teal/20 rounded-xl shadow-md">
            <div className="w-12 h-12 bg-bni-light rounded-full flex items-center justify-center mb-3">
              <Package className="w-6 h-6 text-bni-teal" />
            </div>
            <h3 className="text-bni-teal text-[15px] font-extrabold mb-1">Tidak ada jadwal bagasi</h3>
            <p className="text-[13px] text-bni-dark/70 px-4">
              Belum ada jadwal tersimpan untuk bulan {format(currentDate, 'MMMM yyyy', { locale: id })}.
            </p>
          </div>
        ) : (
          monthlyEvents.map((event) => {
          const days = event.departureDate ? differenceInCalendarDays(parseISO(event.departureDate), new Date()) : null;
          const isPast = days !== null && days < 0;
          const addressText = [event.addressCairo, event.addressIndonesia]
             .filter(a => a && a !== 'Tidak Diketahui' && a !== 'Unknown')
             .join(' / ') || '-';

          return (
          <div key={event.id} className={`bg-white rounded-xl overflow-hidden relative shadow-md border border-bni-teal/20 mb-4 ${isPast ? 'opacity-70' : ''}`}>
            {/* Header banner */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-bni-teal/10 bg-bni-light/45">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-bni-teal flex items-center justify-center shrink-0 shadow-sm">
                  <Plane className="w-5 h-5 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-bni-teal text-[15px]">{event.providerName.toUpperCase()}</span>
                  <span className="text-[13px] text-bni-dark/70 flex items-center gap-1">
                    {days !== null && (
                      <span className="font-bold text-bni-orange">
                        {days < 0 ? 'Selesai' : days === 0 ? 'Hari Ini' : `${days} Hari Lagi`} •
                      </span>
                    )}
                    {event.departureDate ? format(parseISO(event.departureDate), 'd MMMM yyyy', { locale: id }) : '-'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="px-4 py-3">
              <div className="space-y-2">
                
                {/* Text Content */}
                <div className="text-[14px] text-bni-dark">
                  <div className="flex gap-2.5 mb-1.5">
                    <span className="font-bold text-bni-teal w-20 shrink-0 flex justify-between select-none">
                      <span>Rute</span>
                      <span>:</span>
                    </span>
                    <span>{event.route}</span>
                  </div>
                  <div className="flex gap-2.5 mb-1.5">
                    <span className="font-bold text-bni-teal w-20 shrink-0 flex justify-between select-none">
                      <span>Alamat</span>
                      <span>:</span>
                    </span>
                    <span>{addressText}</span>
                  </div>
                  <div className="flex gap-2.5 mb-1.5">
                    <span className="font-bold text-bni-teal w-20 shrink-0 flex justify-between select-none">
                      <span>Harga</span>
                      <span>:</span>
                    </span>
                    <span className="font-bold text-bni-orange">
                      {typeof event.pricePerKg === 'number' 
                        ? `Rp ${event.pricePerKg.toLocaleString('id-ID')}/kg`
                        : event.pricePerKg}
                    </span>
                  </div>
                  <div className="flex gap-2.5 mb-1.5">
                    <span className="font-bold text-bni-teal w-20 shrink-0 flex justify-between select-none">
                      <span>Ketentuan</span>
                      <span>:</span>
                    </span>
                    <span className="text-[13px] leading-relaxed">{event.policy}</span>
                  </div>
                  {!isPast && event.phoneNumbers && event.phoneNumbers.length > 0 && (
                    <div className="flex gap-2.5">
                      <span className="font-bold text-bni-teal w-20 shrink-0 flex justify-between select-none">
                        <span>No. WA</span>
                        <span>:</span>
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {event.phoneNumbers.map((phone, idx) => (
                          <a
                            key={idx}
                            href={`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Apakah bagasi untuk tanggal ${event.departureDate ? format(parseISO(event.departureDate), 'd MMMM yyyy', { locale: id }) : 'tersebut'} dari ${event.route} masih tersedia? `)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-[#EAF3F4] hover:bg-[#D5E8EA] border border-bni-teal/10 transition-colors rounded-lg px-2.5 py-1 flex items-center gap-1.5 text-bni-teal font-extrabold text-[13px] shadow-sm"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-[#25D366] fill-[#25D366]/10" />
                            {phone}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="px-4 py-2 border-t border-bni-teal/10 bg-bni-light/30 flex items-center justify-end gap-2 text-bni-dark/70 relative">
              <div className="relative">
                <button 
                  onClick={() => setActiveShareMenu(activeShareMenu === event.id ? null : event.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EAF3F4] hover:bg-[#D5E8EA] text-bni-teal rounded-full transition-colors font-bold text-[13px] shadow-sm"
                  title="Bagikan Iklan Bagasi"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Bagikan Iklan Bagasi
                </button>

                {/* Dropdown Menu */}
                {activeShareMenu === event.id && (
                  <>
                    {/* Click outside backdrop */}
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setActiveShareMenu(null)}
                    />
                    <div className="absolute right-0 bottom-full mb-2 w-56 bg-white border border-bni-teal/20 rounded-xl shadow-xl p-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                        <div className="text-[11px] font-extrabold text-bni-teal px-3 py-1.5 border-b border-bni-teal/5 uppercase tracking-wider">
                          Bagikan Iklan
                        </div>
                        <div className="flex flex-col gap-0.5 mt-1">
                          {/* WhatsApp */}
                          <button
                            onClick={() => {
                              shareEvent(event, 'whatsapp');
                              setActiveShareMenu(null);
                            }}
                            className="flex items-center gap-2.5 w-full px-3 py-2 text-left text-[13px] font-bold text-bni-dark hover:bg-bni-light rounded-lg transition-colors"
                          >
                            <span className="w-6 h-6 rounded-full bg-[#25D366]/10 flex items-center justify-center text-[#25D366]">
                              <MessageCircle className="w-3.5 h-3.5 fill-[#25D366]/10" />
                            </span>
                            WhatsApp
                          </button>

                          {/* Telegram */}
                          <button
                            onClick={() => {
                              shareEvent(event, 'telegram');
                              setActiveShareMenu(null);
                            }}
                            className="flex items-center gap-2.5 w-full px-3 py-2 text-left text-[13px] font-bold text-bni-dark hover:bg-bni-light rounded-lg transition-colors"
                          >
                            <span className="w-6 h-6 rounded-full bg-[#0088cc]/10 flex items-center justify-center text-[#0088cc]">
                              <Send className="w-3 h-3 text-[#0088cc]" />
                            </span>
                            Telegram
                          </button>

                          {/* Messenger */}
                          <button
                            onClick={() => {
                              shareEvent(event, 'messenger');
                              setActiveShareMenu(null);
                            }}
                            className="flex items-center gap-2.5 w-full px-3 py-2 text-left text-[13px] font-bold text-bni-dark hover:bg-bni-light rounded-lg transition-colors"
                          >
                            <span className="w-6 h-6 rounded-full bg-[#0084FF]/10 flex items-center justify-center text-[#0084FF]">
                              <Facebook className="w-3.5 h-3.5 text-[#0084FF]" />
                            </span>
                            Messenger
                          </button>

                          {/* Instagram */}
                          <button
                            onClick={() => {
                              shareEvent(event, 'instagram');
                              setActiveShareMenu(null);
                            }}
                            className="flex items-center gap-2.5 w-full px-3 py-2 text-left text-[13px] font-bold text-bni-dark hover:bg-bni-light rounded-lg transition-colors"
                          >
                            <span className="w-6 h-6 rounded-full bg-[#E1306C]/10 flex items-center justify-center text-[#E1306C]">
                              <Instagram className="w-3.5 h-3.5 text-[#E1306C]" />
                            </span>
                            Instagram
                          </button>
                          
                          <div className="border-t border-bni-teal/5 my-1" />
                          
                          {/* Copy Text */}
                          <button
                            onClick={() => {
                              shareEvent(event, 'copy');
                              setActiveShareMenu(null);
                            }}
                            className="flex items-center gap-2.5 w-full px-3 py-2 text-left text-[13px] font-bold text-bni-teal hover:bg-[#EAF3F4] rounded-lg transition-colors"
                          >
                            <span className="w-6 h-6 rounded-full bg-bni-teal/10 flex items-center justify-center text-bni-teal">
                              <Copy className="w-3 h-3 text-bni-teal" />
                            </span>
                            Salin Teks Lengkap
                          </button>
                        </div>
                      </div>
                    </>
                )}
              </div>
              <button 
                onClick={() => onDeleteEvent(event.id)}
                className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                title="Hapus"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          );
        })
        )}
      </div>

    </div>
  );
}
