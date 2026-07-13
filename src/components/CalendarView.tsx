import React, { useState } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays,
  parseISO
} from 'date-fns';
import { id } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../utils';
import { BaggageEvent } from '../types';

interface CalendarViewProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  events: BaggageEvent[];
}

export function CalendarView({ currentDate, setCurrentDate, events }: CalendarViewProps) {
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const dateFormat = "d";
  const rows = [];
  
  let days = [];
  let day = startDate;
  let formattedDate = "";

  const daysOfWeek = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      formattedDate = format(day, dateFormat);
      const cloneDay = day;
      
      const dayEvents = events.filter(e => e.departureDate && isSameDay(parseISO(e.departureDate), cloneDay));
      const isCurrentMonth = isSameMonth(day, monthStart);
      const isToday = isSameDay(day, new Date());

      days.push(
        <div 
          key={day.toString()} 
          className={cn(
            "p-1.5 sm:p-2 min-h-[90px] sm:min-h-[120px] border-r border-bni-teal/10 last:border-r-0 flex flex-col relative transition-all duration-300 hover:bg-bni-light/40 group",
            !isCurrentMonth && "opacity-40 bg-gray-50/30"
          )}
        >
          <div className="flex justify-between items-start mb-1">
            <span className={cn(
              "text-[13px] font-bold h-7 w-7 flex items-center justify-center rounded-full transition-all duration-300",
              isToday ? "bg-bni-teal text-white shadow-sm" : "group-hover:bg-bni-light text-[#00414A]",
              !isCurrentMonth && !isToday && "text-gray-400"
            )}>
              {formattedDate}
            </span>
            {dayEvents.length > 0 && (
              <span className="text-[11px] bg-bni-orange text-white font-bold px-1.5 py-0.5 rounded-md shadow-sm">
                {dayEvents.length}
              </span>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-1 pr-0.5 custom-scrollbar">
            {dayEvents.map(event => (
              <div 
                key={event.id} 
                className="px-1.5 py-1 bg-[#EAF3F4] hover:bg-[#D5E8EA] border-l-2 border-bni-teal rounded-r-md transition-all duration-300 cursor-default"
                title={`${event.providerName.toUpperCase()} - ${event.route}`}
              >
                <div className="text-[11px] font-bold text-bni-teal leading-tight truncate">{event.providerName.toUpperCase()}</div>
                <div className="hidden sm:block text-[10px] text-bni-dark/80 truncate">{event.route}</div>
              </div>
            ))}
          </div>
        </div>
      );
      day = addDays(day, 1);
    }
    rows.push(days);
    days = [];
  }

  return (
    <div className="bg-white border border-bni-teal/20 rounded-xl flex flex-col h-full shadow-md relative overflow-hidden">
      
      <div className="flex flex-col sm:flex-row items-center justify-between px-4 sm:px-6 py-4 border-b border-bni-teal/10 relative z-10 gap-3 sm:gap-0 bg-white">
        <h2 className="text-[20px] font-extrabold text-bni-teal capitalize tracking-tight w-full text-center sm:text-left">
          {format(currentDate, 'MMMM yyyy', { locale: id })}
        </h2>
        <div className="flex space-x-2">
          <button 
            onClick={prevMonth}
            className="p-1.5 hover:bg-bni-light/70 rounded-full transition-colors text-bni-teal"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setCurrentDate(new Date())}
            className="px-4 py-1.5 text-[14px] font-bold text-bni-teal border border-bni-teal/30 hover:bg-bni-light rounded-full transition-colors"
          >
            Hari Ini
          </button>
          <button 
            onClick={nextMonth}
            className="p-1.5 hover:bg-bni-light/70 rounded-full transition-colors text-bni-teal"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 bg-bni-light/50 border-b border-bni-teal/10 relative z-10">
        {daysOfWeek.map(dayName => (
          <div key={dayName} className="py-2.5 text-center text-[13px] font-bold text-bni-dark">
            {dayName}
          </div>
        ))}
      </div>
      
      <div className="flex flex-col flex-1 overflow-hidden bg-white relative z-10">
        {rows.map((row, i) => (
          <div className="grid grid-cols-7 flex-1 border-b border-bni-teal/10 last:border-0" key={i}>
            {row}
          </div>
        ))}
      </div>
    </div>
  );
}
