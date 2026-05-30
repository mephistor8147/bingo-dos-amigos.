import React, { useState, useEffect, useRef } from 'react';
import { GameState } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Play, RotateCcw, Trophy, Pause, Volume2, VolumeX, User, UserCircle2, Music } from 'lucide-react';
import { audioController } from '../audioUtils';

interface DashboardProps {
  gameState: GameState;
  onDrawNumber: () => void;
  onResetGame: () => void;
  isAutoDraw: boolean;
  onToggleAutoDraw: () => void;
  isSpeechEnabled: boolean;
  onToggleSpeech: () => void;
  voiceGender: 'male' | 'female';
  onToggleVoiceGender: () => void;
  bgMusicUrl?: string;
}

export function Dashboard({ gameState, onDrawNumber, onResetGame, isAutoDraw, onToggleAutoDraw, isSpeechEnabled, onToggleSpeech, voiceGender, onToggleVoiceGender, bgMusicUrl }: DashboardProps) {
  const currentNumber = gameState.drawnNumbers[gameState.drawnNumbers.length - 1];
  
  const [displayNumber, setDisplayNumber] = useState<number | null>(currentNumber);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showBurst, setShowBurst] = useState(false);
  const customAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      audioController.stopBackgroundMusic();
      if (customAudioRef.current) customAudioRef.current.pause();
    };
  }, []);

  const [soundEnabled, setSoundEnabled] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  const unlockAudio = () => {
    if (audioUnlocked) return;
    setAudioUnlocked(true);
    audioController.init();
    if (soundEnabled) {
      if (bgMusicUrl && customAudioRef.current) {
        customAudioRef.current.play().catch(e => console.log(e));
      } else {
        audioController.playBackgroundMusic();
      }
    }
  };

  const toggleSoundEffects = () => {
    unlockAudio();
    if (soundEnabled) {
      if (bgMusicUrl && customAudioRef.current) customAudioRef.current.pause();
      else audioController.stopBackgroundMusic();
      setSoundEnabled(false);
    } else {
      if (bgMusicUrl && customAudioRef.current) customAudioRef.current.play().catch(e => console.log(e));
      else audioController.playBackgroundMusic();
      setSoundEnabled(true);
    }
  };

  const getColumnLetter = (num: number) => {
    if (num <= 15) return 'B';
    if (num <= 30) return 'I';
    if (num <= 45) return 'N';
    if (num <= 60) return 'G';
    return 'O';
  };

  useEffect(() => {
    if (currentNumber && currentNumber !== displayNumber && !isAnimating) {
      setIsAnimating(true);
      setShowBurst(false);
      let count = 0;
      const maxCount = 40;
      const interval = setInterval(() => {
        setDisplayNumber(Math.floor(Math.random() * 75) + 1);
        count++;
        if (count >= maxCount) {
          clearInterval(interval);
          setDisplayNumber(currentNumber);
          setIsAnimating(false);
          setShowBurst(true);
          if (soundEnabled && audioUnlocked) {
             audioController.playPop();
          }
          if (isSpeechEnabled) {
             const letter = getColumnLetter(currentNumber);
             audioController.speak(`${letter} ${currentNumber}`, voiceGender);
          }
          setTimeout(() => setShowBurst(false), 800);
        }
      }, 40);
      return () => clearInterval(interval);
    } else if (!currentNumber) {
      setDisplayNumber(null);
      setShowBurst(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentNumber]);

  return (
    <div className="max-w-4xl mx-auto space-y-8" onClick={unlockAudio}>
      {bgMusicUrl && (
         <audio ref={customAudioRef} src={bgMusicUrl} loop preload="auto" />
      )}
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        <div className="p-6 md:p-16 text-center flex flex-col items-center relative">
          
          <div className="absolute top-6 right-6 flex items-center gap-2">
            <button 
              onClick={toggleSoundEffects}
              title={soundEnabled ? "Pausar Efeitos Sonoros" : "Tocar Efeitos Sonoros"}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                soundEnabled 
                  ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' 
                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
              }`}
            >
              <Music className="w-5 h-5" />
            </button>
            {isSpeechEnabled && (
              <button 
                onClick={onToggleVoiceGender}
                title={voiceGender === 'female' ? "Mudar para Voz Masculina" : "Mudar para Voz Feminina"}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors bg-indigo-50 text-indigo-600 hover:bg-indigo-100`}
              >
                {voiceGender === 'female' ? <User className="w-5 h-5 text-rose-500" /> : <UserCircle2 className="w-5 h-5 text-blue-500" />}
              </button>
            )}
            <button 
              onClick={onToggleSpeech}
              title={isSpeechEnabled ? "Desativar Voz" : "Ativar Voz"}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                isSpeechEnabled 
                  ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' 
                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
              }`}
            >
              {isSpeechEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          </div>

          <h2 className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-8 font-bold">Painel de Sorteio</h2>
          
          <div className="w-64 h-64 md:w-[320px] md:h-[320px] mx-auto rounded-full flex items-center justify-center relative mb-12">
             <AnimatePresence>
               {isAnimating && (
                 <motion.div
                   key="anim-burst-1"
                   initial={{ scale: 0, opacity: 1, rotate: 0 }}
                   animate={{ scale: [1, 1.3, 1.8], opacity: [1, 0.8, 0], rotate: 180 }}
                   transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                   className="absolute inset-0 rounded-full border-[6px] border-dashed border-indigo-400 z-0"
                 />
               )}
               {isAnimating && (
                 <motion.div
                   key="anim-burst-2"
                   initial={{ scale: 0, opacity: 1 }}
                   animate={{ scale: [1, 2.5], opacity: [1, 0] }}
                   transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
                   className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 blur-2xl z-0"
                 />
               )}
             </AnimatePresence>

             <motion.div
               animate={
                 isAnimating
                   ? {
                       rotate: [0, 5, -5, 8, -8, 0],
                       y: [0, -10, 10, -5, 5, 0],
                       scale: [1, 1.05, 0.95, 1.1, 1],
                     }
                   : { rotate: 0, y: 0, scale: 1 }
               }
               transition={{ duration: 0.3, repeat: isAnimating ? Infinity : 0 }}
               className="w-full h-full rounded-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-white via-indigo-50 to-indigo-200 border-[12px] border-white shadow-[0_20px_60px_-15px_rgba(79,70,229,0.4),inset_0_-10px_20px_rgba(0,0,0,0.1)] relative flex flex-col items-center justify-center overflow-hidden z-10"
             >
                <div className="absolute top-4 left-8 w-1/2 h-1/4 bg-white/70 blur-md rounded-full transform -rotate-12 z-10 pointer-events-none" />

                {displayNumber ? (
                   <motion.div
                      key={isAnimating ? 'shuffling' : displayNumber}
                      initial={{ scale: 0, opacity: 0, rotateY: 90 }}
                      animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                      exit={{ scale: 2, opacity: 0, filter: 'blur(10px)' }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="text-center relative z-20"
                   >
                      <motion.div
                         animate={isAnimating ? { color: ['#4f46e5', '#e11d48', '#059669', '#d97706', '#4f46e5'] } : { color: '#4f46e5' }}
                         transition={{ duration: 0.3, repeat: Infinity }}
                         className="font-black text-4xl md:text-6xl tracking-[0.2em] mb-2 drop-shadow-sm"
                      >
                         {getColumnLetter(displayNumber)}
                      </motion.div>
                      <div 
                        className={`text-[100px] md:text-[140px] font-black leading-none tracking-tighter`}
                        style={{ 
                          WebkitTextStroke: isAnimating ? '4px rgba(79,70,229,0.5)' : '0px',
                          color: isAnimating ? 'transparent' : '#1e293b',
                          textShadow: isAnimating ? 'none' : '0 10px 30px rgba(0,0,0,0.15)'
                        }}
                      >
                         {displayNumber}
                      </div>
                   </motion.div>
                ) : (
                   <div className="text-slate-300 transform -rotate-12 z-20">
                     <Trophy className="w-24 h-24 md:w-32 md:h-32 opacity-50 drop-shadow-xl" />
                   </div>
                )}
             </motion.div>

             <AnimatePresence>
                {showBurst && currentNumber && (
                   <motion.div
                      key={`slam-${currentNumber}`}
                      initial={{ scale: 1, opacity: 1, borderWidth: '30px' }}
                      animate={{ scale: 2.5, opacity: 0, borderWidth: '0px' }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="absolute inset-0 rounded-full border-yellow-400 z-20 pointer-events-none drop-shadow-[0_0_30px_rgba(250,204,21,0.8)]"
                   />
                )}
             </AnimatePresence>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center w-full justify-center">
             <button
               onClick={onDrawNumber}
               disabled={gameState.drawnNumbers.length >= 75 || isAutoDraw || isAnimating}
               className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 md:px-12 py-4 md:py-5 rounded-full font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 text-sm md:text-base w-full sm:w-auto"
             >
               <Play className="w-5 h-5 md:w-6 md:h-6 fill-current shrink-0" />
               <span className="truncate">Sortear 1 Número</span>
             </button>

             <button
               onClick={onToggleAutoDraw}
               disabled={gameState.drawnNumbers.length >= 75 || isAnimating}
               className={`text-white px-8 md:px-10 py-4 md:py-5 rounded-full font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 text-sm md:text-base w-full sm:w-auto ${
                 isAutoDraw ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'
               }`}
             >
               {isAutoDraw ? <Pause className="w-5 h-5 shrink-0" /> : <Play className="w-5 h-5 shrink-0" />}
               <span className="truncate">{isAutoDraw ? 'Pausar' : 'Automático'}</span>
             </button>
             
             {gameState.drawnNumbers.length > 0 && (
                 <button
                   onClick={onResetGame}
                   title="Resetar Sorteio"
                   className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-4 md:py-5 rounded-full font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 w-full sm:w-auto"
                 >
                   <RotateCcw className="w-5 h-5 shrink-0" />
                   <span className="sm:hidden">Resetar</span>
                 </button>
             )}
          </div>
        </div>
        
        <div className="bg-slate-50 p-6 md:p-8 border-t border-slate-100">
           <div className="flex items-center justify-between mb-6">
             <h3 className="text-xs uppercase tracking-widest text-slate-500 font-bold">Números Sorteados ({gameState.drawnNumbers.length})</h3>
             {gameState.drawnNumbers.length >= 30 && (
               <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                 Pausa de 30 Bolas Atingida
               </span>
             )}
           </div>
           {gameState.drawnNumbers.length === 0 ? (
             <div className="text-center py-10 text-slate-400 text-sm font-medium">Nenhum número sorteado ainda.</div>
           ) : (
             <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar">
               {gameState.drawnNumbers.slice().reverse().map((num, i) => (
                  <motion.div
                    key={num}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className={`w-12 h-12 shrink-0 rounded-full flex flex-col items-center justify-center font-black text-lg shadow-sm ring-1 ring-inset ${
                      i === 0 
                        ? 'bg-indigo-600 text-white ring-indigo-500 shadow-indigo-200' 
                        : 'bg-white text-slate-700 ring-slate-200'
                    }`}
                  >
                    <span className="text-[8px] uppercase tracking-widest font-bold opacity-60 leading-none mb-0.5">{getColumnLetter(num)}</span>
                    <span className="leading-none">{num}</span>
                  </motion.div>
               ))}
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
