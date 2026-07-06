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
            "p-2 min-h-[100px] border border-white/5 flex flex-col relative transition-colors hover:bg-white/5",
            !isCurrentMonth && "opacity-40 bg-black/20"
          )}
        >
          <div className="flex justify-between items-start mb-2">
            <span className={cn(
              "text-sm font-medium h-7 w-7 flex items-center justify-center rounded-full",
              isToday ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "",
              !isCurrentMonth && !isToday ? "text-slate-500" : "text-slate-300"
            )}>
              {formattedDate}
            </span>
            {dayEvents.length > 0 && (
              <span className="text-[10px] bg-indigo-500/30 text-indigo-200 font-bold px-1.5 py-0.5 rounded">
                {dayEvents.length}
              </span>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {dayEvents.map(event => (
              <div 
                key={event.id} 
                className="text-xs p-1.5 bg-indigo-500/20 border border-indigo-400/30 rounded-lg text-indigo-100 truncate"
                title={`${event.providerName} - ${event.route}`}
              >
                <div className="font-semibold truncate">{event.providerName}</div>
                <div className="text-indigo-300 text-[10px] truncate">{event.route}</div>
              </div>
            ))}
          </div>
        </div>
      );
      day = addDays(day, 1);
    }
    rows.push(
      <div className="grid grid-cols-7" key={day.toString()}>
        {days}
      </div>
    );
    days = [];
  }

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
        <h2 className="text-lg font-bold text-slate-100 capitalize">
          {format(currentDate, 'MMMM yyyy', { locale: id })}
        </h2>
        <div className="flex space-x-2">
          <button 
            onClick={prevMonth}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-slate-300"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1 text-sm font-medium text-slate-300 hover:bg-white/10 rounded-md transition-colors"
          >
            Hari Ini
          </button>
          <button 
            onClick={nextMonth}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-slate-300"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 bg-white/5 border-b border-white/10">
        {daysOfWeek.map(dayName => (
          <div key={dayName} className="py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {dayName}
          </div>
        ))}
      </div>
      
      <div className="flex flex-col bg-slate-900/50 flex-1">
        {rows}
      </div>
    </div>
  );
}
