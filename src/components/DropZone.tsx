import React, { useState, useRef } from 'react';
import { UploadCloud, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [isExpanded, setIsExpanded] = useState(true);
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
        setError('Harap seret dan lepas teks atau berkas .txt');
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
    <div className="bg-white border border-bni-teal/20 rounded-xl p-4 flex flex-col shadow-md relative transition-all duration-300">
      <div 
        className="flex justify-between items-center cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-bni-orange animate-pulse" />
          <h3 className="font-extrabold text-bni-teal text-[15px]">Pengekstrak Bagasi AI</h3>
        </div>
        <button className="p-1 text-bni-teal hover:bg-bni-light/70 rounded-full transition-colors">
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>
      
      {isExpanded && (
        <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div 
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center transition-all duration-300 mb-4 bg-bni-light/30",
              !isOnline ? "border-red-300 bg-red-50 cursor-not-allowed" : 
              isDragging ? "border-bni-teal bg-bni-light" : "border-bni-teal/20 hover:border-bni-teal/40",
              isLoading && "opacity-50 pointer-events-none"
            )}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            <UploadCloud className={cn("w-8 h-8 mx-auto mb-2", !isOnline ? "text-red-400" : isDragging ? "text-bni-orange" : "text-bni-teal")} />
            <p className="text-[13px] text-bni-dark font-bold">
              {isOnline ? 'Seret & lepas teks atau berkas .txt di sini' : 'Mode Luring'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={isOnline ? "Tempel teks iklan bagasi di sini..." : "Mode luring..."}
              className="w-full h-24 p-3 bg-bni-light/30 border border-bni-teal/20 rounded-lg text-[13px] text-bni-dark focus:ring-1 focus:ring-bni-teal focus:border-bni-teal outline-none resize-none placeholder:text-gray-400 transition-all custom-scrollbar"
              disabled={isLoading || !isOnline}
            />
            
            {error && <p className="text-[13px] text-red-600 bg-red-50 p-2 rounded-md border border-red-200">{error}</p>}
            
            <button
              type="submit"
              disabled={!text.trim() || isLoading || !isOnline}
              className={cn("w-full text-white text-[15px] font-bold py-2 px-4 rounded-full transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-black/5", 
              isOnline ? "bg-bni-orange hover:bg-[#e04f1a]" : "bg-gray-400")}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin text-white" />
                  Memproses...
                </>
              ) : (
                isOnline ? 'Ekstrak Informasi' : 'Luring'
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
