import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { BingoCardData, BingoSpace, Message, GameMode } from '../types';
import { User, Settings, Clock, Star, Coins, Send, MessageCircle, ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import { audioController } from '../audioUtils';

interface PlayerMobileViewProps {
  card: BingoCardData;
  drawnNumbers: number[];
  user: { uid: string; name: string; coins: number; avatar?: string };
  timeLeft: number; // in seconds
  scheduledTime?: number;
  messages: Message[];
  gameMode?: GameMode;
  participants: { uid: string; name: string; avatar?: string }[];
  prize?: number;
  bgMusicUrl?: string;
  initialSoundEnabled?: boolean;
  onMarkSpace?: (row: number, col: number) => void;
  onExit?: () => void;
  onSendMessage: (text: string) => void;
  onOpenProfile?: () => void;
}

const COLUMN_COLORS = [
  'bg-red-400',    // B
  'bg-purple-500', // I
  'bg-amber-400',  // N
  'bg-emerald-500',// G
  'bg-sky-400'     // O
];

const COLUMN_LETTERS = ['B', 'I', 'N', 'G', 'O'];

const getColumnColor = (num: number) => {
  if (num <= 15) return 'bg-red-500 text-white';
  if (num <= 30) return 'bg-purple-500 text-white';
  if (num <= 45) return 'bg-amber-400 text-black';
  if (num <= 60) return 'bg-emerald-500 text-white';
  return 'bg-sky-400 text-white';
};

const formatTime = (seconds: number) => {
  if (seconds <= 0) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export function PlayerMobileView({ card, drawnNumbers, user, timeLeft: initialTimeLeft, scheduledTime, messages, gameMode = 'full_card', participants, prize, bgMusicUrl, initialSoundEnabled = true, onExit, onSendMessage, onOpenProfile }: PlayerMobileViewProps) {
  // We'll mimic the "marked" state based on drawnNumbers for now, but a real app would let user tap.
  // Actually, standard digital bingo auto-daubs or user daubs. Let's make it auto-daub for simplicity,
  // or track clicked spaces. Let's track clicked spaces.
  const [markedSpaces, setMarkedSpaces] = useState<Set<string>>(new Set());
  const [autoDaub, setAutoDaub] = useState(true);
  const [chatMessage, setChatMessage] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [hasBingo, setHasBingo] = useState(false);
  const [showBingoAnimation, setShowBingoAnimation] = useState(false);
  const [localTimeLeft, setLocalTimeLeft] = useState(initialTimeLeft);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const [soundEnabled, setSoundEnabled] = useState(initialSoundEnabled);
  
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  const customAudioRef = useRef<HTMLAudioElement | null>(null);

  const unlockAudio = () => {
    if (audioUnlocked) return;
    setAudioUnlocked(true);
    // Initialize Web Audio API on first interaction
    audioController.init();
    
    if (soundEnabled) {
      if (bgMusicUrl && customAudioRef.current) {
         customAudioRef.current.play().catch(e => console.log('Audio error:', e));
      } else {
         audioController.playBackgroundMusic();
      }
    }
  };

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
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

  useEffect(() => {
    return () => {
       audioController.stopBackgroundMusic();
       if (customAudioRef.current) customAudioRef.current.pause();
    };
  }, []);

  // Efeito sonoro a cada nova bola sorteada
  useEffect(() => {
    if (drawnNumbers.length > 0 && soundEnabled && audioUnlocked) {
      audioController.playPop();
      
      const lastDrawn = drawnNumbers[drawnNumbers.length - 1];
      const isOnCard = card.grid.some(row => row.includes(lastDrawn));
      if (isOnCard && autoDaub) {
         setTimeout(() => {
           audioController.playCoin();
         }, 300); // slight delay after the pop
      }
    }
  }, [drawnNumbers.length, soundEnabled, autoDaub, card.grid, audioUnlocked]);
  useEffect(() => {
    if (!scheduledTime) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((scheduledTime - Date.now()) / 1000));
      setLocalTimeLeft(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [scheduledTime]);

  useEffect(() => {
    // Check for BINGO condition
    let won = false;
    
    const isMarked = (r: number, c: number) => {
      if (r < 0 || r > 4 || c < 0 || c > 4) return false;
      const cell = card.grid[r][c];
      return cell === 'FREE' || markedSpaces.has(`${r}-${c}`) || (autoDaub && drawnNumbers.includes(cell as number));
    };

    if (gameMode === 'full_card') {
      won = true;
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if (!isMarked(r, c)) won = false;
        }
      }
    } else if (gameMode === 'line') {
      // Rows
      for (let r = 0; r < 5; r++) {
        let rowWin = true;
        for (let c = 0; c < 5; c++) {
           if (!isMarked(r, c)) rowWin = false;
        }
        if (rowWin) won = true;
      }
      // Cols
      for (let c = 0; c < 5; c++) {
        let colWin = true;
        for (let r = 0; r < 5; r++) {
           if (!isMarked(r, c)) colWin = false;
        }
        if (colWin) won = true;
      }
    } else if (gameMode === 'block_of_4') {
      // Verifica 16 possíveis blocos de 2x2
      for (let r = 0; r <= 3; r++) {
        for (let c = 0; c <= 3; c++) {
          const topLeft = isMarked(r, c);
          const topRight = isMarked(r, c + 1);
          const bottomLeft = isMarked(r + 1, c);
          const bottomRight = isMarked(r + 1, c + 1);
          
          if (topLeft && topRight && bottomLeft && bottomRight) {
            won = true;
          }
        }
      }
    }

    if (won && !hasBingo) {
       setHasBingo(true);
       setShowBingoAnimation(true);
       
       if (soundEnabled && audioUnlocked) {
         audioController.playCheer();
       }
       
       // Trigger confetti animation
       const duration = 5 * 1000;
       const animationEnd = Date.now() + duration;
       const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

       const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

       const interval: any = setInterval(function() {
         const timeLeft = animationEnd - Date.now();

         if (timeLeft <= 0) {
           return clearInterval(interval);
         }

         const particleCount = 50 * (timeLeft / duration);
         confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
         confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
       }, 250);

       onSendMessage("🎉 BINGO! Eu ganhei! 🎉");
       setTimeout(() => setShowBingoAnimation(false), 5000);
    }
  }, [markedSpaces, card.grid, hasBingo, onSendMessage, gameMode]);

  useEffect(() => {
    if (isChatOpen && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isChatOpen]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    onSendMessage(chatMessage);
    setChatMessage('');
  };

  const handleSpaceClick = (rIdx: number, cIdx: number, value: BingoSpace) => {
    if (value === 'FREE') return;
    const key = `${rIdx}-${cIdx}`;
    setMarkedSpaces(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        // Allow marking manually if the number was drawn, or if we want to allow mistakes we could just let them mark anyway.
        // For standard bingo, usually you can validly DAUB. Let's allow valid daubs:
        if (drawnNumbers.includes(value as number)) {
           next.add(key);
           if (soundEnabled && audioUnlocked) {
             audioController.playCoin();
           }
        }
      }
      return next;
    });
  };

  // The latest drawn numbers
  const recentDrawn = [...drawnNumbers].reverse().slice(0, 5);

  return (
    <div className="min-h-screen bg-emerald-500 font-sans text-slate-800 flex flex-col justify-start pb-8 relative overflow-hidden" onClick={unlockAudio} onTouchStart={unlockAudio}>
      {bgMusicUrl && (
         <audio ref={customAudioRef} src={bgMusicUrl} loop preload="auto" />
      )}
      {/* Background Decor (Simulating the grassy field & sky from image) */}
      <div className="absolute inset-0 pointer-events-none z-0">
         <div className="absolute top-0 inset-x-0 h-1/3 bg-gradient-to-b from-sky-300 to-emerald-500 opacity-60"></div>
         <div className="absolute bottom-0 inset-x-0 h-1/3 bg-gradient-to-t from-emerald-600 to-transparent"></div>
         {/* Simple floral/cloud decor could go here, but CSS gradients do the trick */}
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto pt-safe px-4 flex flex-col h-full">
        {/* Top Header */}
        <div className="flex items-center justify-between py-4">
          <div 
            onClick={(e) => { e.stopPropagation(); onOpenProfile && onOpenProfile(); }}
            className="bg-emerald-600/80 rounded-full pl-1 pr-4 py-1 flex items-center gap-2 border border-emerald-400 backdrop-blur-sm cursor-pointer hover:bg-emerald-600 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center overflow-hidden border-2 border-emerald-300">
               {user.avatar ? <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover"/> : <User className="w-6 h-6 text-slate-400" />}
            </div>
            <div>
               <div className="text-white text-xs font-bold leading-tight">{user.name}</div>
               <div className="flex items-center gap-1">
                 <Coins className="w-3 h-3 text-amber-300 fill-amber-300" />
                 <span className="text-emerald-100 text-[10px] font-black">{user.coins.toLocaleString()}</span>
               </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={toggleSound} 
              title="Áudio"
              className={`h-10 w-10 flex items-center justify-center rounded-full border transition-colors ${soundEnabled ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-white text-emerald-700 border-white'}`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setAutoDaub(!autoDaub); }} 
              title="Marcação Automática"
              className={`h-10 px-3 rounded-full flex items-center gap-1.5 text-xs font-bold border transition-colors ${autoDaub ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-white text-emerald-700 border-white'}`}
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Auto</span>
            </button>
            <div className="bg-emerald-600/80 rounded-full px-3 h-10 border border-emerald-400 flex items-center gap-1.5 backdrop-blur-sm">
               <Clock className="w-4 h-4 text-emerald-200" />
               <span className="text-white font-bold text-sm tracking-widest">{formatTime(localTimeLeft)}</span>
            </div>
            <button onClick={onExit} className="w-10 h-10 rounded-full bg-white text-emerald-600 flex items-center justify-center shadow-md active:scale-95 transition-transform">
               <ArrowLeft className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Drawn Balls Header */}
        <div className="flex items-center gap-2 mb-6 h-20 px-2 justify-center">
           <AnimatePresence>
             {recentDrawn.map((num, i) => (
                <motion.div
                  key={`${num}-${i}`}
                  initial={i === 0 ? { scale: 0, x: -50, opacity: 0 } : { x: -20, opacity: 0 }}
                  animate={{ scale: i === 0 ? 1 : 0.8, x: 0, opacity: i === 0 ? 1 : 0.9 }}
                  className={`rounded-full flex items-center justify-center font-black shadow-lg shadow-black/20 ${getColumnColor(num)} ${
                    i === 0 
                      ? 'w-16 h-16 text-3xl border-4 border-white/50 border-dashed z-10 relative' 
                      : 'w-12 h-12 text-xl border-2 border-white/30 z-0'
                  }`}
                  style={{
                    boxShadow: 'inset -3px -3px 8px rgba(0,0,0,0.2), inset 2px 2px 5px rgba(255,255,255,0.4)',
                  }}
                >
                  <span className="drop-shadow-sm">{num}</span>
                </motion.div>
             ))}
           </AnimatePresence>
           {recentDrawn.length === 0 && (
              <div className="text-emerald-100/50 font-bold tracking-widest uppercase text-sm mt-4">Nenhuma bola sorteada</div>
           )}
        </div>

        {/* Bingo Card Container */}
        <div className="bg-emerald-300 rounded-3xl p-3 shadow-2xl shadow-emerald-900/40 border-4 border-emerald-400 relative max-w-[500px] w-full mx-auto">
          
          <div className="grid grid-cols-5 gap-2 mb-3">
             {COLUMN_LETTERS.map((letter, i) => (
                <div key={letter} className={`h-10 rounded-xl flex items-center justify-center ${COLUMN_COLORS[i]} border-2 border-white/20 shadow-inner`}>
                  <span className="text-white font-black text-xl drop-shadow-md">{letter}</span>
                </div>
             ))}
          </div>

          <div className="bg-white/40 p-2 rounded-2xl grid grid-cols-5 gap-2 backdrop-blur-sm border border-white/50">
            {card.grid.map((row, rIdx) => 
               row.map((cell, cIdx) => {
                 const isFree = cell === 'FREE';
                 const isMarked = isFree || markedSpaces.has(`${rIdx}-${cIdx}`) || drawnNumbers.includes(cell as number);
                 const bgClass = isFree 
                    ? 'bg-emerald-400' 
                    : (isMarked ? 'bg-emerald-200' : 'bg-white');
                 const textClass = isFree 
                    ? 'text-white' 
                    : (isMarked ? 'text-emerald-800' : 'text-slate-800');
                    
                 return (
                   <button
                     key={`${rIdx}-${cIdx}`}
                     onClick={() => !isFree && handleSpaceClick(rIdx, cIdx, cell)}
                     className={`aspect-square rounded-xl shadow-sm flex items-center justify-center font-black transition-all active:scale-95 border-b-4 ${bgClass} ${textClass} ${isMarked ? 'border-emerald-300/50' : 'border-slate-200'}`}
                   >
                     {isFree ? (
                       <Star className="w-8 h-8 fill-yellow-300 text-yellow-500 drop-shadow-sm" />
                     ) : (
                       <span className="text-2xl md:text-3xl tracking-tighter">{cell}</span>
                     )}
                   </button>
                 );
               })
            )}
          </div>
        </div>

        {/* Chat Section & Participants */}
        <div className="mt-4 flex-1 flex flex-col justify-end relative z-20 w-full max-w-[500px] mx-auto mb-16">
           <div className="flex justify-center items-center gap-2 mb-2">
             <div className="flex -space-x-2">
               {participants.slice(0, 5).map((p, idx) => (
                 <div key={p.uid} className="w-8 h-8 rounded-full border-2 border-emerald-400 bg-white overflow-hidden" title={p.name}>
                   {p.avatar ? (
                     <img src={p.avatar} alt={p.name} className="w-full h-full object-cover"/>
                   ) : (
                     <User className="w-full h-full text-slate-400 p-1" />
                   )}
                 </div>
               ))}
             </div>
             {participants.length > 5 && (
               <div className="w-8 h-8 rounded-full border-2 border-emerald-400 bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center z-10 shadow-sm">
                 +{participants.length - 5}
               </div>
             )}
             <div className="text-emerald-100 text-xs font-bold bg-emerald-800/40 px-2 py-1 rounded-lg backdrop-blur-sm ml-1">
               {participants.length} online
             </div>
           </div>

           <button 
             onClick={() => setIsChatOpen(!isChatOpen)}
             className="mx-auto w-full max-w-[200px] bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-t-2xl font-bold flex items-center justify-center gap-2 shadow-lg transition-colors border-t border-x border-emerald-400"
           >
             <MessageCircle className="w-5 h-5"/>
             {isChatOpen ? 'Fechar Chat' : 'Chat da Sala'}
             {messages.length > 0 && !isChatOpen && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full absolute -top-2 right-4 shadow-sm animate-pulse">
                  {messages.length}
                </span>
             )}
           </button>

           <AnimatePresence>
             {isChatOpen && (
               <motion.div 
                 initial={{ height: 0, opacity: 0 }}
                 animate={{ height: 280, opacity: 1 }}
                 exit={{ height: 0, opacity: 0 }}
                 className="bg-white rounded-b-2xl rounded-t-none w-full shadow-2xl overflow-hidden flex flex-col border-x border-b border-emerald-400"
               >
                 <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50">
                    {messages.length === 0 ? (
                      <div className="text-center text-slate-400 text-sm mt-10">Nenhuma mensagem ainda.</div>
                    ) : (
                      messages.map(msg => {
                        const isMe = msg.senderId === user.uid;
                        return (
                          <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                             <span className="text-[10px] font-bold text-slate-400 mb-0.5 px-1">{isMe ? 'Você' : msg.senderName}</span>
                             <div className={`px-3 py-2 rounded-2xl max-w-[85%] text-sm ${isMe ? 'bg-emerald-500 text-white rounded-br-sm' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-sm'}`}>
                               {msg.text}
                             </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={chatBottomRef} />
                 </div>
                 
                 <form onSubmit={handleSendMessage} className="p-2 bg-white border-t border-slate-100 flex items-center gap-2">
                    <input 
                      type="text" 
                      value={chatMessage}
                      onChange={e => setChatMessage(e.target.value)}
                      placeholder="Mensagem..."
                      className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <button 
                      type="submit" 
                      disabled={!chatMessage.trim()}
                      className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white w-10 h-10 rounded-xl flex items-center justify-center transition-colors active:scale-95"
                    >
                      <Send className="w-5 h-5"/>
                    </button>
                 </form>
               </motion.div>
             )}
           </AnimatePresence>
        </div>
        
        {/* Bingo Animation Overlay */}
        <AnimatePresence>
          {showBingoAnimation && (
             <motion.div
               initial={{ opacity: 0, scale: 0.5 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 1.5 }}
               className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
             >
                <div className="text-center rounded-3xl bg-white p-8 border-4 border-emerald-400 shadow-[0_0_50px_rgba(52,211,153,0.5)] flex flex-col items-center">
                  <motion.div 
                    animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.2, 1] }} 
                    transition={{ duration: 0.5, repeat: Infinity }}
                    className="text-7xl font-black text-yellow-400 drop-shadow-[0_0_30px_rgba(250,204,21,1)] mb-4"
                    style={{ WebkitTextStroke: '3px #b45309' }}
                  >
                    BINGO!
                  </motion.div>
                  {prize !== undefined && (
                     <div className="mt-4 bg-amber-100 text-amber-700 px-8 py-4 rounded-3xl font-black text-4xl inline-flex items-center gap-3 border-4 border-amber-300 shadow-xl">
                        <Coins className="w-10 h-10 text-amber-500" />
                        +{prize}
                     </div>
                  )}
                  <p className="mt-6 text-sm font-bold text-slate-400 animate-pulse">Parabéns, prêmio adicionado à sua conta!</p>
                </div>
             </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
