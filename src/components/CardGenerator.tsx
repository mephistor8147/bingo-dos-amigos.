import React, { useState } from 'react';
import { GameState } from '../types';
import { BingoCard } from './BingoCard';
import { Plus, Users, Grid3X3 } from 'lucide-react';
import { motion } from 'motion/react';

interface CardGeneratorProps {
  gameState: GameState;
  onGenerateCard: (name: string) => void;
}

export function CardGenerator({ gameState, onGenerateCard }: CardGeneratorProps) {
  const [name, setName] = useState('');

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onGenerateCard(name.trim());
      setName('');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      <div className="bg-white rounded-3xl shadow-xl p-6 md:p-10 border border-slate-100 flex flex-col lg:flex-row gap-6 md:gap-8 items-center justify-between">
         <div className="flex flex-col sm:flex-row items-center sm:items-start lg:items-center text-center sm:text-left gap-4 w-full lg:w-auto">
           <div className="w-16 h-16 shrink-0 bg-indigo-50 rounded-2xl flex items-center justify-center">
             <Grid3X3 className="w-8 h-8 text-indigo-500" />
           </div>
           <div>
             <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Gerador de Cartelas</h2>
             <p className="text-slate-500 text-sm sm:text-base font-medium mt-1">Crie cartelas personalizadas para os jogadores.</p>
           </div>
         </div>
         
         <form onSubmit={handleGenerate} className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto mt-2 lg:mt-0">
           <div className="relative flex-1 md:w-64">
             <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
               <Users className="w-5 h-5 text-slate-400" />
             </div>
             <input
               type="text"
               value={name}
               onChange={e => setName(e.target.value)}
               placeholder="Nome do Jogador"
               className="w-full bg-slate-50 border border-slate-200 pl-12 pr-4 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-slate-800 font-bold placeholder:font-medium placeholder:text-slate-400 shadow-sm"
             />
           </div>
           <button
             type="submit"
             disabled={!name.trim()}
             className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-500 text-white px-6 py-4 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:active:scale-100 disabled:shadow-none"
           >
             <Plus className="w-5 h-5" />
             <span className="hidden sm:inline">Gerar</span>
           </button>
         </form>
      </div>

      <div>
        <div className="flex items-center justify-between mb-6 px-2">
          <h3 className="text-sm uppercase tracking-widest font-bold text-slate-400">Cartelas Geradas ({gameState.cards.length})</h3>
        </div>

        {gameState.cards.length === 0 ? (
           <div className="text-center py-24 bg-white/50 rounded-3xl border-2 border-slate-200 border-dashed">
              <p className="text-slate-500 font-medium">Nenhuma cartela gerada ainda. Adicione jogadores acima.</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {gameState.cards.map((card, i) => (
              <motion.div 
                key={card.id} 
                className="flex justify-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i > 10 ? 0 : i * 0.05 }}
              >
                <BingoCard card={card} drawnNumbers={gameState.drawnNumbers} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
