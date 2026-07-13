import React, { useState, useRef } from 'react';
import { UploadCloud, Loader2 } from 'lucide-react';
import { cn } from '../utils';

interface DropZoneProps {
  onParse?: (text: string) => Promise<void>;
  isOnline: boolean;
}

export function DropZone({ onParse, isOnline }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    if (!isOnline) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    if (!isOnline) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setError(null);
    
    // ... (rest of the logic)
    if (!onParse) return;

    // Try to get text from drop (if someone dragged selected text)
    const droppedText = e.dataTransfer.getData('text');
    if (droppedText) {
      processText(droppedText);
      return;
    }

    // Try to get text from dropped file
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'text/plain') {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result;
          if (typeof content === 'string') {
            processText(content);
          }
        };
        reader.readAsText(file);
      } else {
        setError('Harap drop teks atau file .txt');
      }
    }
  };

  const processText = async (content: string) => {
    if (!content.trim() || !onParse) return;
    setIsLoading(true);
    setError(null);
    try {
      await onParse(content);
      setText(''); // Clear after success
    } catch (err: any) {
      setError(err.message || 'Gagal memproses teks.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processText(text);
  };

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium text-slate-200">AI Baggage Extractor</h3>
        <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-2 py-1 rounded font-bold tracking-wider">DRAG & DROP READY</span>
      </div>
      
      <div 
        className={cn(
          "border-2 border-dashed rounded-2xl p-6 text-center transition-colors mb-4 relative",
          !isOnline ? "border-red-400/20 bg-red-900/10 cursor-not-allowed" : 
          isDragging ? "border-indigo-400 bg-indigo-500/10" : "border-white/20 hover:bg-white/5",
          isLoading ? "opacity-50 pointer-events-none" : ""
        )}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <UploadCloud className={cn("w-10 h-10 mx-auto mb-3", !isOnline ? "text-red-400" : isDragging ? "text-indigo-400" : "text-slate-400")} />
        <p className="text-sm text-slate-300 mb-1">
          {isOnline ? 'Tarik & lepas (drag & drop) teks iklan di sini' : 'Mode Offline: Tidak dapat menambah jadwal baru'}
        </p>
        <p className="text-xs text-slate-500">{isOnline ? 'atau file .txt' : ''}</p>
      </div>

      <div className="text-center text-xs font-bold text-slate-500 my-3 uppercase tracking-widest">ATAU</div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={isOnline ? "Tempel (paste) teks iklan penyedia bagasi di sini..." : "Offline mode..."}
          className="w-full h-24 p-4 bg-slate-800/80 border border-white/10 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none placeholder-slate-500"
          disabled={isLoading || !isOnline}
        />
        
        {error && <p className="text-xs text-red-400 bg-red-400/10 p-2 rounded-lg border border-red-400/20">{error}</p>}
        
        <button
          type="submit"
          disabled={!text.trim() || isLoading || !isOnline}
          className={cn("w-full text-white text-xs font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg", isOnline ? "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20" : "bg-red-600 shadow-red-600/20")}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              MEMPROSES...
            </>
          ) : (
            isOnline ? 'EXTRACT TEXT' : 'OFFLINE MODE'
          )}
        </button>
      </form>
    </div>
  );
}
