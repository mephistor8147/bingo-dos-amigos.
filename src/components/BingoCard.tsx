import React from 'react';
import { BingoCardData } from '../types';

interface BingoCardProps {
  card: BingoCardData;
  drawnNumbers: number[];
}

export function BingoCard({ card, drawnNumbers }: BingoCardProps) {
  const headers = ['B', 'I', 'N', 'G', 'O'];
  const headerColors = [
    'bg-red-500 text-white',
    'bg-amber-500 text-white',
    'bg-blue-500 text-white',
    'bg-green-500 text-white',
    'bg-purple-500 text-white',
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-slate-800 dark:border-slate-700 rounded-xl overflow-hidden shadow-xl w-full max-w-[320px] shrink-0">
      <div className="bg-slate-100 dark:bg-slate-800 px-4 py-3 border-b-2 border-slate-800 dark:border-slate-700 flex justify-between items-center">
        <span className="font-black text-slate-800 dark:text-white uppercase tracking-widest truncate max-w-[180px]">{card?.playerName || 'Carregando...'}</span>
        <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">#{card?.id || '---'}</span>
      </div>
      
      <div className="grid grid-cols-5 border-b-2 border-slate-800 dark:border-slate-700">
        {headers.map((h, idx) => (
          <div key={idx} className={`text-center py-2 font-black text-2xl border-r-2 border-slate-800 dark:border-slate-700 last:border-r-0 ${headerColors[idx]}`}>
            {h}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-5 bg-white dark:bg-slate-900">
        {(card?.grid || []).map((row, rIdx) => 
          (row || []).map((cell, cIdx) => {
            const isDrawn = cell === 'FREE' || (typeof cell === 'number' && drawnNumbers.includes(cell));
            return (
              <div 
                key={`${rIdx}-${cIdx}`}
                className={`
                  aspect-square flex items-center justify-center border-r-2 border-b-2 border-slate-200 dark:border-slate-800 
                  ${cIdx === 4 ? 'border-r-0' : ''}
                  ${rIdx === 4 ? 'border-b-0' : ''}
                  ${isDrawn && cell === 'FREE' ? 'bg-amber-50 dark:bg-amber-950/20' : 'bg-white dark:bg-slate-900'}
                  relative p-1
                `}
              >
                {/* Stamp Effect */}
                {isDrawn && cell !== 'FREE' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                     <div className="w-[85%] h-[85%] rounded-full bg-rose-500/80 backdrop-blur-[2px] mix-blend-multiply flex items-center justify-center shadow-inner ring-4 ring-rose-500/20 transform -rotate-6">
                     </div>
                  </div>
                )}
                
                <span className={`
                  font-black z-10 transition-colors
                  ${cell === 'FREE' ? 'text-[10px] text-slate-800 dark:text-slate-200 uppercase transform -rotate-12 select-none' : 'text-xl sm:text-2xl text-slate-800 dark:text-white'} 
                  ${isDrawn && cell !== 'FREE' ? 'text-white drop-shadow-md' : ''}
                `}>
                  {cell}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
