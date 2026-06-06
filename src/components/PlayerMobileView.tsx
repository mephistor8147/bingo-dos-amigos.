import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { BingoCardData, BingoSpace, Message, GameMode } from '../types';
import { User, Clock, Star, Coins, Send, MessageCircle, ArrowLeft, Volume2, VolumeX, Mic, MicOff, Award, Radio, Eye, EyeOff, Sparkles, Trophy, Palette } from 'lucide-react';
import { audioController } from '../audioUtils';
import { toast } from 'react-hot-toast';
import { isCardWinner } from '../utils';

interface DaubColor {
  id: string;
  name: string;
  lightBg: string; // cell bg when marked in user card
  cellText: string; // cell text color when marked
  borderColor: string; // cell border color
  sampleBg: string; // dot color in selectors
}

const DAUB_COLORS: DaubColor[] = [
  { id: 'emerald', name: 'Verde', lightBg: 'bg-emerald-200 dark:bg-emerald-950/60', cellText: 'text-emerald-800 dark:text-emerald-300', borderColor: 'border-emerald-300/50 dark:border-emerald-900/50', sampleBg: 'bg-emerald-500' },
  { id: 'blue', name: 'Azul', lightBg: 'bg-blue-200 dark:bg-blue-950/60', cellText: 'text-blue-800 dark:text-blue-300', borderColor: 'border-blue-300/50 dark:border-blue-900/50', sampleBg: 'bg-blue-500' },
  { id: 'pink', name: 'Rosa', lightBg: 'bg-pink-100 dark:bg-pink-950/60', cellText: 'text-pink-800 dark:text-pink-300', borderColor: 'border-pink-300/50 dark:border-pink-900/50', sampleBg: 'bg-pink-500' },
  { id: 'purple', name: 'Roxo', lightBg: 'bg-purple-150 dark:bg-purple-950/60', cellText: 'text-purple-800 dark:text-purple-300', borderColor: 'border-purple-300/50 dark:border-purple-900/50', sampleBg: 'bg-purple-500' },
  { id: 'orange', name: 'Laranja', lightBg: 'bg-orange-150 dark:bg-orange-950/60', cellText: 'text-orange-800 dark:text-orange-300', borderColor: 'border-orange-300/50 dark:border-orange-900/50', sampleBg: 'bg-orange-500' },
  { id: 'red', name: 'Vermelho', lightBg: 'bg-red-150 dark:bg-red-950/60', cellText: 'text-red-800 dark:text-red-300', borderColor: 'border-red-300/50 dark:border-red-900/50', sampleBg: 'bg-red-500' },
];

interface PlayerMobileViewProps {
  card: BingoCardData;
  drawnNumbers: number[];
  user: { uid: string; name: string; coins: number; avatar?: string; role?: 'player' | 'admin' };
  timeLeft: number; // in seconds
  scheduledTime?: number;
  messages: Message[];
  gameMode?: GameMode;
  participants: { uid: string; name: string; avatar?: string }[];
  prize?: number;
  bgMusicUrl?: string;
  onlineRadioUrl?: string;
  initialSoundEnabled?: boolean;
  isSpectator?: boolean;
  onMarkSpace?: (row: number, col: number) => void;
  onExit?: () => void;
  onSendMessage: (text: string) => void;
  onOpenProfile?: () => void;
  winners?: { uid: string; name: string; avatar?: string }[];
  roomStatus?: 'waiting' | 'active' | 'finished';
  playersList?: { id: string; name: string; card: BingoCardData }[];
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

export function PlayerMobileView({ card, drawnNumbers, user, timeLeft: initialTimeLeft, scheduledTime, messages, gameMode = 'full_card', participants, prize, bgMusicUrl, onlineRadioUrl, initialSoundEnabled = true, isSpectator = false, onExit, onSendMessage, onOpenProfile, winners, roomStatus, playersList }: PlayerMobileViewProps) {
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>('');

  const activeCard = useMemo(() => {
    if (isSpectator && selectedParticipantId) {
      const selectedPlayer = (playersList || []).find(p => p.id === selectedParticipantId);
      if (selectedPlayer) return selectedPlayer.card;
    }
    return card;
  }, [card, selectedParticipantId, playersList, isSpectator]);

  // We'll mimic the "marked" state based on drawnNumbers for now, but a real app would let user tap.
  // Actually, standard digital bingo auto-daubs or user daubs. Let's make it auto-daub for simplicity,
  // or track clicked spaces. Let's track clicked spaces.
  const [markedSpaces, setMarkedSpaces] = useState<Set<string>>(new Set());
  const [autoDaub, setAutoDaub] = useState(true);
  const [selectedColorId, setSelectedColorId] = useState(() => {
    return localStorage.getItem('bingo_daub_color') || 'emerald';
  });
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [hasBingo, setHasBingo] = useState(false);
  const [showBingoAnimation, setShowBingoAnimation] = useState(false);
  const [localTimeLeft, setLocalTimeLeft] = useState(initialTimeLeft);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const [soundEnabled, setSoundEnabled] = useState(initialSoundEnabled);
  const currentDaubColor = useMemo(() => {
    return DAUB_COLORS.find(c => c.id === selectedColorId) || DAUB_COLORS[0];
  }, [selectedColorId]);
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(true);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  const [bgVolume, setBgVolume] = useState(() => {
    try {
      const saved = localStorage.getItem('bingo_bg_volume');
      return saved ? Number(saved) : 20; // Default to 20%
    } catch (e) {
      return 20;
    }
  });

  const handleVolumeChange = (vol: number) => {
    setBgVolume(vol);
    try {
      localStorage.setItem('bingo_bg_volume', vol.toString());
    } catch (e) {
      console.error(e);
    }
    
    // Apply immediate volume changes
    const val = vol / 100;
    if (customAudioRef.current) {
      customAudioRef.current.volume = val;
    }
    if (radioAudioRef.current) {
      radioAudioRef.current.volume = val;
    }
    audioController.setBackgroundVolume(val);
  };

  // Voice Chat States
  const [voiceActive, setVoiceActive] = useState(false);
  const [myAudioStream, setMyAudioStream] = useState<MediaStream | null>(null);
  const [isMyselfSpeaking, setIsMyselfSpeaking] = useState(false);
  const [voiceVolume, setVoiceVolume] = useState(0);
  const [connectedVoicePlayers, setConnectedVoicePlayers] = useState<Set<string>>(new Set());
  const [speakersState, setSpeakersState] = useState<Record<string, { isSpeaking: boolean; volume: number }>>({});

  useEffect(() => {
    return () => {
      // Cleanup voice tracks on unmount
      if (myAudioStream) {
        myAudioStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [myAudioStream]);

  const toggleVoiceChat = async () => {
    if (isSpectator) {
      toast.error('Espectadores não participam do canal de voz principal.');
      return;
    }
    if (voiceActive) {
      if (myAudioStream) {
        myAudioStream.getTracks().forEach(track => track.stop());
        setMyAudioStream(null);
      }
      setIsMyselfSpeaking(false);
      setVoiceVolume(0);
      setVoiceActive(false);
      setConnectedVoicePlayers(new Set());
      setSpeakersState({});
      toast.success('Chat de voz desativado.');
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setMyAudioStream(stream);
        setVoiceActive(true);
        toast.success('Conectado ao canal de voz da sala!');
        
        // Setup simple simulated speakers list to make it dynamic and fun
        // Connect some of the participants to voice
        if (participants.length > 0) {
          const joinedIds = new Set<string>();
          participants.forEach((p, index) => {
            if (index < 4) joinedIds.add(p.uid); // first 4 connect
          });
          setConnectedVoicePlayers(joinedIds);
        }

        // Setup real AudioContext analyzer for local speaker volume feedback
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            const ctx = new AudioContextClass();
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 64;
            source.connect(analyser);
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            
            const pollMic = () => {
              if (!stream.active) {
                ctx.close();
                return;
              }
              analyser.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const avg = sum / dataArray.length;
              setVoiceVolume(avg);
              setIsMyselfSpeaking(avg > 12);
              
              if (stream.active) {
                requestAnimationFrame(pollMic);
              } else {
                ctx.close();
              }
            };
            pollMic();
          }
        } catch (audioErr) {
          console.error("Audio analyser failed:", audioErr);
        }
      } catch (err) {
        console.error(err);
        toast.error('Privilégios de microfone negados ou indisponíveis.');
        setVoiceActive(false);
      }
    }
  };

  // Simulate other voice-connected players speaking occasionally to make it dynamic
  useEffect(() => {
    if (!voiceActive) return;
    
    const interval = setInterval(() => {
      const activeState: Record<string, { isSpeaking: boolean; volume: number }> = {};
      connectedVoicePlayers.forEach(uid => {
        // 30% chance for other voice-connected players to speak
        const isSpeaking = Math.random() < 0.35;
        activeState[uid] = {
          isSpeaking,
          volume: isSpeaking ? Math.floor(Math.random() * 80) + 20 : 0
        };
      });
      setSpeakersState(activeState);
    }, 1800);
    
    return () => clearInterval(interval);
  }, [voiceActive, connectedVoicePlayers]);

  const customAudioRef = useRef<HTMLAudioElement | null>(null);
  const radioAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isRadioPlaying, setIsRadioPlaying] = useState(!!onlineRadioUrl);

  const toggleRadio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onlineRadioUrl) return;

    if (isRadioPlaying) {
      if (radioAudioRef.current) radioAudioRef.current.pause();
      setIsRadioPlaying(false);
      
      if (soundEnabled) {
        if (bgMusicUrl && customAudioRef.current) {
          customAudioRef.current.play().catch(err => console.log('BGM Play Error:', err));
        } else {
          audioController.playBackgroundMusic(bgVolume / 100);
        }
      }
    } else {
      if (bgMusicUrl && customAudioRef.current) {
        customAudioRef.current.pause();
      } else {
        audioController.stopBackgroundMusic();
      }

      setIsRadioPlaying(true);
      setTimeout(() => {
        if (radioAudioRef.current) {
          radioAudioRef.current.play().catch(err => {
            console.log("Radio play error:", err);
            toast.error("Impossível reproduzir streaming no momento.");
            setIsRadioPlaying(false);
          });
        }
      }, 100);
    }
  };

  const unlockAudio = () => {
    if (audioUnlocked) return;
    setAudioUnlocked(true);
    audioController.init();
    
    if (soundEnabled) {
      if (isRadioPlaying && onlineRadioUrl) {
        if (radioAudioRef.current) {
          radioAudioRef.current.play().catch(e => console.log('Radio auto-play on touch error:', e));
        }
      } else if (bgMusicUrl && customAudioRef.current) {
         customAudioRef.current.play().catch(e => console.log('Audio error:', e));
      } else {
         audioController.playBackgroundMusic(bgVolume / 100);
      }
    }
  };

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (soundEnabled) {
      if (bgMusicUrl && customAudioRef.current) customAudioRef.current.pause();
      else audioController.stopBackgroundMusic();
      if (radioAudioRef.current) radioAudioRef.current.pause();
      setIsRadioPlaying(false);
      setSoundEnabled(false);
    } else {
      if (isRadioPlaying && onlineRadioUrl) {
         if (radioAudioRef.current) radioAudioRef.current.play().catch(e => console.log(e));
      } else {
         if (bgMusicUrl && customAudioRef.current) customAudioRef.current.play().catch(e => console.log(e));
         else audioController.playBackgroundMusic(bgVolume / 100);
      }
      setSoundEnabled(true);
    }
  };

  useEffect(() => {
    return () => {
       audioController.stopBackgroundMusic();
       if (customAudioRef.current) customAudioRef.current.pause();
       if (radioAudioRef.current) radioAudioRef.current.pause();
    };
  }, []);

  // auto play background music / online radio immediately on mount
  useEffect(() => {
    if (soundEnabled) {
      const runPlay = async () => {
        try {
          audioController.init();
          setAudioUnlocked(true);
          if (onlineRadioUrl) {
            // wait briefly for ref to resolve
            setTimeout(() => {
              if (radioAudioRef.current) {
                radioAudioRef.current.play().then(() => {
                  setIsRadioPlaying(true);
                }).catch(e => {
                  console.log("Radio auto-play wait for user gesture:", e);
                });
              }
            }, 100);
          } else if (bgMusicUrl) {
            // wait briefly for ref to resolve
            setTimeout(() => {
              if (customAudioRef.current) {
                customAudioRef.current.play().catch(e => {
                  console.log("Auto-play wait for user gesture:", e);
                });
              }
            }, 100);
          } else {
            audioController.playBackgroundMusic(bgVolume / 100);
          }
        } catch (e) {
          console.log(e);
        }
      };
      runPlay();
    }
  }, [bgMusicUrl, onlineRadioUrl, soundEnabled, bgVolume]);

  // Set initial volumes when audio elements mount or volume changes
  useEffect(() => {
    if (customAudioRef.current) {
      customAudioRef.current.volume = bgVolume / 100;
    }
  }, [bgVolume, bgMusicUrl]);

  useEffect(() => {
    if (radioAudioRef.current) {
      radioAudioRef.current.volume = bgVolume / 100;
    }
  }, [bgVolume, onlineRadioUrl]);

  // Efeito sonoro a cada nova bola sorteada
  useEffect(() => {
    if (drawnNumbers.length > 0 && soundEnabled && audioUnlocked) {
      audioController.playPop();
      
      const lastDrawn = drawnNumbers[drawnNumbers.length - 1];
      const isOnCard = activeCard.grid.some(row => row.includes(lastDrawn));
      if (isOnCard && autoDaub) {
         setTimeout(() => {
           audioController.playCoin();
         }, 300); // slight delay after the pop
      }
    }
  }, [drawnNumbers.length, soundEnabled, autoDaub, activeCard.grid, audioUnlocked]);
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
    if (isSpectator) return;
    // Check for BINGO condition
    let won = false;
    
    const isMarked = (r: number, c: number) => {
      if (r < 0 || r > 4 || c < 0 || c > 4) return false;
      const cell = activeCard.grid[r][c];
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
  }, [markedSpaces, activeCard.grid, hasBingo, onSendMessage, gameMode]);

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
    if (isSpectator) return;
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
  const recentDrawn = [...drawnNumbers].reverse().slice(0, 3);

  return (
    <div className="min-h-screen bg-emerald-500 font-sans text-slate-800 flex flex-col justify-start pb-8 relative overflow-hidden" onClick={unlockAudio} onTouchStart={unlockAudio}>
      {bgMusicUrl && (
         <audio ref={customAudioRef} src={bgMusicUrl} loop preload="auto" />
      )}
      {onlineRadioUrl && (
         <audio ref={radioAudioRef} src={onlineRadioUrl} preload="auto" />
      )}
      {/* Background Decor (Simulating the grassy field & sky from image) */}
      <div className="absolute inset-0 pointer-events-none z-0">
         <div className="absolute top-0 inset-x-0 h-1/3 bg-gradient-to-b from-sky-300 to-emerald-500 opacity-60"></div>
         <div className="absolute bottom-0 inset-x-0 h-1/3 bg-gradient-to-t from-emerald-600 to-transparent"></div>
         {/* Simple floral/cloud decor could go here, but CSS gradients do the trick */}
         <div className="relative z-10 w-full max-w-5xl mx-auto pt-safe px-4 flex flex-col h-full">
        {!isHeaderExpanded ? (
          <div className="flex justify-end w-full mb-2 px-1 relative z-50 animate-in fade-in slide-in-from-top-1 duration-200">
            <button
              onClick={() => setIsHeaderExpanded(true)}
              className="p-3 bg-white/95 dark:bg-slate-900 border border-emerald-300 dark:border-slate-800 rounded-full text-emerald-600 dark:text-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center shrink-0"
              title="Exibir Painel de Controle"
            >
              <Eye className="w-5 h-5 text-emerald-600 dark:text-emerald-450" />
            </button>
          </div>
        ) : (
          /* Top Unified Premium Header Card incorporating all circled top elements */
          <div className="bg-white/95 dark:bg-slate-900 border border-emerald-400/30 dark:border-slate-800 rounded-3xl p-3 shadow-xl flex flex-col gap-3.5 w-full mb-4 z-10 transition-all duration-300" onClick={(e) => e.stopPropagation()}>
            
            {/* Row 1: Profile and Action Controls */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
              {/* Left side: profile details + Toggle Button */}
              <div className="flex items-center justify-between w-full md:w-auto gap-3">
                <div 
                  onClick={(e) => { e.stopPropagation(); onOpenProfile && onOpenProfile(); }}
                  className="flex items-center gap-3 cursor-pointer hover:bg-emerald-50 dark:hover:bg-slate-800/60 p-1.5 rounded-2xl transition-all text-left"
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center overflow-hidden border border-emerald-200 dark:border-slate-700 relative shrink-0">
                     {user.avatar ? <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover"/> : <User className="w-6 h-6 text-slate-400" />}
                     {voiceActive && isMyselfSpeaking && (
                       <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center border-2 border-green-500 rounded-full">
                         <span className="flex gap-0.5 justify-center items-center">
                           <span className="w-1 h-2.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                           <span className="w-1 h-4 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                           <span className="w-1 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                         </span>
                       </div>
                     )}
                  </div>
                  <div>
                     <div className="text-slate-800 dark:text-slate-100 text-sm md:text-base font-black leading-tight tracking-tight">{user.name}</div>
                     <div className="flex items-center gap-1.5 mt-0.5">
                       <Coins className="w-4 h-4 text-amber-500 fill-amber-305 shrink-0" />
                       <span className="text-amber-600 dark:text-amber-400 text-xs md:text-sm font-black">{user.coins.toLocaleString()}</span>
                     </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Chat Warning Notification Icon (Only visible when chat is closed and there are messages) */}
                  {!isChatOpen && messages.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsChatOpen(true);
                        setTimeout(() => {
                          if (chatBottomRef.current) {
                            chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
                          }
                        }, 100);
                      }}
                      className="relative p-2 rounded-xl text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-all flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-900 shadow-sm bg-amber-50 dark:bg-slate-900 active:scale-95 animate-bounce"
                      title="Novas mensagens no chat"
                    >
                      <MessageCircle className="w-5 h-5 text-amber-500 animate-pulse" />
                      <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 animate-ping"></span>
                      <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                    </button>
                  )}

                  {/* Countdown Clock (Hidden when <= 0) */}
                  {localTimeLeft > 0 && (
                    <div className="bg-red-50 dark:bg-red-950/40 border border-red-200/50 dark:border-red-900/40 rounded-xl px-2.5 h-10 flex items-center gap-1 shadow-sm shrink-0">
                       <Clock className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                       <span className="text-red-700 dark:text-red-400 font-black text-xs tracking-wider">{formatTime(localTimeLeft)}</span>
                    </div>
                  )}

                  {/* Icon toggle button */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsHeaderExpanded(!isHeaderExpanded); }}
                    className="p-2 rounded-xl text-slate-500 hover:text-indigo-650 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 active:scale-95"
                    title={isHeaderExpanded ? "Ocultar detalhes" : "Mostrar detalhes"}
                  >
                    {isHeaderExpanded ? <EyeOff className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> : <Eye className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
                  </button>
                </div>
              </div>

              {/* Right side: game controls row */}
              {isHeaderExpanded && (
                <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
                  {/* Online Radio Button Play/Pause Toggle */}
                  {onlineRadioUrl && (
                    <button 
                      onClick={toggleRadio} 
                      title={isRadioPlaying ? "Pausar rádio online" : "Escutar rádio online"}
                      className={`h-10 w-10 flex items-center justify-center rounded-xl border transition-all active:scale-95 shadow-sm ${
                        isRadioPlaying 
                          ? 'bg-indigo-600 border-indigo-505 text-white animate-pulse shadow-indigo-600/10' 
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                      }`}
                    >
                      <Radio className={`w-4 h-4 ${isRadioPlaying ? 'text-indigo-200 animate-spin-slow' : 'text-slate-400 dark:text-slate-505'}`} />
                    </button>
                  )}

                  {/* Real Voice Chat Button */}
                  <button 
                    onClick={toggleVoiceChat} 
                    title={voiceActive ? "Desativar Canal de Voz" : "Ativar Canal de Voz"}
                    className={`h-10 w-10 flex items-center justify-center rounded-xl border transition-all active:scale-95 shadow-sm ${
                      voiceActive 
                        ? 'bg-indigo-600 border-indigo-505 text-white animate-pulse' 
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                    }`}
                  >
                    {voiceActive ? <Mic className="w-4 h-4 text-emerald-300" /> : <MicOff className="w-4 h-4 text-slate-400 dark:text-slate-505" />}
                  </button>

                  {/* Sound Controls */}
                  <button 
                    onClick={toggleSound} 
                    title="Áudio do Jogo"
                    className={`h-10 w-10 flex items-center justify-center rounded-xl border transition-all active:scale-95 shadow-sm shrink-0 ${soundEnabled ? 'bg-emerald-500 border-emerald-400/30 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-505 border-slate-200 dark:border-slate-700 hover:bg-slate-100'}`}
                  >
                    {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </button>

                  {/* Adjustable Volume Slider wrapper */}
                  {soundEnabled && (
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 h-10 rounded-xl shadow-sm shrink-0">
                      <Volume2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={bgVolume} 
                        onChange={(e) => handleVolumeChange(Number(e.target.value))}
                        className="w-16 sm:w-20 accent-emerald-500 h-1 cursor-pointer bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none" 
                        title="Volume do Som de Fundo"
                      />
                      <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 w-6 text-right shrink-0">{bgVolume}%</span>
                    </div>
                  )}

                  {/* Auto Daub Button */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); setAutoDaub(!autoDaub); }} 
                    title="Marcação Automática"
                    className={`h-10 w-10 flex items-center justify-center rounded-xl border transition-all active:scale-95 shadow-sm ${
                      autoDaub 
                        ? 'bg-indigo-600 border-indigo-400/30 text-white' 
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>

                  {/* Color Daub Color Chooser Button */}
                  <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => setIsColorPickerOpen(!isColorPickerOpen)} 
                      title="Escolher Cor de Marcação"
                      className={`h-10 w-10 flex items-center justify-center rounded-xl border transition-all active:scale-95 shadow-sm bg-slate-50 dark:bg-slate-800 text-slate-505 border-slate-205 dark:border-slate-700 hover:bg-slate-100 ${isColorPickerOpen ? 'ring-2 ring-indigo-500 border-transparent shadow-md' : ''}`}
                    >
                      <Palette className="w-4 h-4 text-indigo-550 dark:text-indigo-400" />
                    </button>
                    {isColorPickerOpen && (
                      <div className="absolute right-0 top-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl shadow-xl z-50 flex flex-col gap-2 min-w-[210px] animate-in fade-in slide-in-from-top-2 duration-150">
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-505 uppercase tracking-wider block border-b border-slate-100 dark:border-slate-800 pb-1 mb-1 text-center">
                          Cor de Marcação
                        </span>
                        <div className="grid grid-cols-3 gap-1.5">
                          {DAUB_COLORS.map(color => (
                            <button
                              key={color.id}
                              type="button"
                              onClick={() => {
                                setSelectedColorId(color.id);
                                localStorage.setItem('bingo_daub_color', color.id);
                                setIsColorPickerOpen(false);
                              }}
                              className={`flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all active:scale-90 hover:bg-slate-50 dark:hover:bg-slate-800 ${selectedColorId === color.id ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-sm' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'}`}
                            >
                              <div className={`w-4 h-4 rounded-full ${color.sampleBg} shadow-sm`} />
                              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 mt-1">{color.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Exit Button */}
                  <button onClick={onExit} className="w-10 h-10 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-655 dark:text-red-400 flex items-center justify-center border border-red-100 dark:border-red-900 active:scale-95 transition-all shadow-sm" title="Sair do Jogo">
                     <ArrowLeft className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            {/* Elegant Slate Divider Line with high contrast */}
            {isHeaderExpanded && (
              <div className="h-px bg-slate-100 dark:bg-slate-800/80 w-full animate-none" />
            )}

            {/* Row 2: Participants list and Live Info Badges */}
            {isHeaderExpanded && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
                {/* Left Part: Participants list miniatures */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 w-full sm:max-w-[70%]">
                   <div className="flex -space-x-1.5 shrink-0">
                     {participants.map((p, idx) => {
                       const isSpeaking = speakersState[p.uid]?.isSpeaking && voiceActive;
                       const isVoiceUser = connectedVoicePlayers.has(p.uid) && voiceActive;
                       return (
                         <div 
                           key={p.uid} 
                           className={`w-8 h-8 rounded-full border-2 bg-white dark:bg-slate-800 overflow-hidden shadow-sm flex-shrink-0 transition-all duration-200 relative ${
                             isSpeaking 
                               ? 'border-green-500 scale-110 ring-2 ring-green-400/40 z-10' 
                               : (isVoiceUser ? 'border-indigo-400' : 'border-emerald-400 dark:border-emerald-600')
                           }`} 
                           title={`${p.name} ${isVoiceUser ? '(Canal de Voz)' : ''}`}
                         >
                           {p.avatar ? (
                             <img src={p.avatar} alt={p.name} className="w-full h-full object-cover"/>
                           ) : (
                             <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-xs uppercase">
                               {p.name.charAt(0)}
                             </div>
                           )}
                           {/* Dynamic Voice Wave Animation Overlay */}
                           {isSpeaking && (
                             <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                               <span className="flex gap-0.5 justify-center items-center">
                                 <span className="w-0.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                 <span className="w-0.5 h-2.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '100ms' }} />
                                 <span className="w-0.5 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                               </span>
                             </div>
                           )}
                         </div>
                       );
                     })}
                   </div>
                   {participants.length === 0 && (
                     <span className="text-slate-400 dark:text-slate-505 text-xs font-semibold">Nenhum participante ativo</span>
                   )}
                </div>

                {/* Right Part: Dynamic Status Badges (Balls drawn & Online count) */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  {drawnNumbers.length > 0 && (
                    <div className="bg-emerald-50 dark:bg-slate-850 px-3 py-1.5 rounded-xl text-[10px] font-black tracking-wide uppercase text-emerald-855 dark:text-emerald-305 border border-emerald-250/20 dark:border-slate-800/80 shadow-sm flex items-center gap-1.5 transition-colors">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                      Bolas Sorteadas: <span className="text-emerald-600 dark:text-emerald-400 font-black">{drawnNumbers.length}</span> / 75
                    </div>
                  )}

                  <div className="text-[10px] font-black uppercase text-emerald-850 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-200/20 dark:border-emerald-900/30 flex items-center gap-1.5 shadow-sm">
                    {voiceActive && (
                      <span className="flex h-1.5 w-1.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-405 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
                      </span>
                    )}
                    {participants.length + 1} online
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

        {/* Admin Participant Cards Miniature Section */}
        {user.role === 'admin' && (
          <div className="bg-white/95 dark:bg-slate-900 border border-indigo-400/30 dark:border-slate-800 rounded-3xl p-3.5 shadow-xl flex flex-col gap-3 w-full mb-4 z-10 transition-all">
            <h3 className="font-extrabold text-slate-805 dark:text-white text-base md:text-lg flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-500 animate-pulse" />
              <span>Cartelas dos Participantes ({playersList?.length || 0})</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 overflow-y-auto max-h-96 pr-2">
              {playersList?.map(p => {
                const isWinner = isCardWinner(p.card, drawnNumbers, gameMode);
                return (
                  <div key={p.id} className={`p-3 rounded-2xl border transition-all ${
                    isWinner 
                      ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-400 shadow-amber-500/10 shadow-lg' 
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800'
                  }`}>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="font-extrabold text-slate-800 dark:text-slate-100 text-xs sm:text-sm truncate max-w-[70%]">{p.name}</span>
                      {isWinner && (
                        <span className="bg-amber-500 text-white font-black text-[9px] px-2 py-0.5 rounded-lg animate-bounce uppercase tracking-wider">
                          🏆 BINGO!
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-5 gap-1 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                      {p.card.grid.map((row, rIdx) =>
                        row.map((cell, cIdx) => {
                          const isFree = cell === 'FREE';
                          const isMarked = isFree || drawnNumbers.includes(cell as number);
                          return (
                            <div
                              key={`${rIdx}-${cIdx}`}
                              className={`w-full aspect-square rounded-lg flex items-center justify-center text-[9px] sm:text-xs font-black transition-all ${
                                isFree
                                  ? 'bg-yellow-101 border border-amber-300 text-amber-700'
                                  : isMarked
                                  ? 'bg-emerald-500 text-white border border-emerald-600'
                                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-350 border border-slate-100 dark:border-slate-750'
                              }`}
                            >
                              {isFree ? 'F' : cell}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
              {(!playersList || playersList.length === 0) && (
                <div className="col-span-full text-center text-slate-400 dark:text-slate-505 font-bold py-8 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 px-4">
                  Nenhum jogador na sala ainda.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Drawn Balls Animation Stage */}
        <div className="flex flex-col items-center mb-4 bg-slate-100/50 dark:bg-slate-900/60 p-3 rounded-3xl border border-slate-200/50 dark:border-slate-800/80 shadow-inner max-w-md mx-auto w-full">
          <span className="text-[10px] font-extrabold tracking-widest text-slate-400 dark:text-slate-500 uppercase mb-2 select-none">Painel de Sorteio</span>
          <div className="flex items-center gap-4 h-28 justify-center w-full relative">
            <AnimatePresence mode="popLayout">
              {recentDrawn.map((num, i) => {
                const letter = num <= 15 ? 'B' : num <= 30 ? 'I' : num <= 45 ? 'N' : num <= 60 ? 'G' : 'O';
                const isCurrent = i === 0;
                let colorClass = 'from-red-500 to-red-600 text-white';
                if (num > 15 && num <= 30) colorClass = 'from-purple-500 to-purple-600 text-white';
                else if (num > 30 && num <= 45) colorClass = 'from-amber-400 to-amber-500 text-slate-905';
                else if (num > 45 && num <= 60) colorClass = 'from-emerald-500 to-emerald-600 text-white';
                else if (num > 60) colorClass = 'from-sky-500 to-sky-600 text-white';

                return (
                  <motion.div
                    key={`${num}-${i}`}
                    initial={isCurrent ? { scale: 0.1, y: 30, opacity: 0, rotate: -45 } : { scale: 0.7, opacity: 0 }}
                    animate={isCurrent ? { 
                      scale: 1.1, 
                      y: 0, 
                      opacity: 1, 
                      rotate: 0,
                      boxShadow: '0 12px 20px -3px rgba(0, 0, 0, 0.3), 0 4px 8px -2px rgba(0, 0, 0, 0.2)'
                    } : { 
                      scale: 0.75, 
                      y: 0, 
                      opacity: 0.85,
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                    }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={isCurrent ? { type: "spring", stiffness: 220, damping: 14 } : { duration: 0.35 }}
                    className={`rounded-full flex flex-col items-center justify-center font-black relative overflow-hidden select-none border-b-4 border-black/25 ${
                      isCurrent 
                        ? `w-20 h-20 sm:w-22 sm:h-22 text-slate-900 bg-gradient-to-br ${colorClass} z-20 border-t-2 border-white/50 ring-4 ring-indigo-500/20` 
                        : `w-12 h-12 sm:w-14 sm:h-14 text-slate-800 bg-gradient-to-br ${colorClass} z-10 border-t border-white/30 opacity-75`
                    }`}
                  >
                    {/* Glossy Overlay Highlight */}
                    <div className="absolute top-1 left-1.5 right-1.5 h-1/2 bg-gradient-to-b from-white/35 via-white/10 to-transparent rounded-t-full pointer-events-none" />
                    
                    {/* 3D Ball Content */}
                    <div className="flex flex-col items-center justify-center leading-none select-none z-10">
                      {isCurrent ? (
                        <>
                          <span className={`text-[10px] sm:text-xs font-black tracking-wider uppercase opacity-85`}>
                            {letter}
                          </span>
                          <span className="text-3xl sm:text-4xl font-black mt-0.5 filter drop-shadow-sm">
                            {num}
                          </span>
                        </>
                      ) : (
                        <span className="text-base sm:text-lg font-black filter drop-shadow-sm">
                          {letter}-{num}
                        </span>
                      )}
                    </div>

                    {/* Bottom internal shadow */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />

                    {/* Ping/Ring aura for current ball */}
                    {isCurrent && (
                      <span className="absolute -inset-1 rounded-full border border-indigo-505 animate-pulse opacity-40 pointer-events-none" />
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
            
            {recentDrawn.length === 0 && (
              <div className="text-slate-400 dark:text-slate-500 font-bold tracking-widest uppercase text-xs animate-pulse">Aguardando sorteio...</div>
            )}
          </div>
        </div>

        {/* Spectator Warning Banner */}
        {isSpectator && (
          <div className="bg-indigo-600 border border-indigo-500 text-white px-5 py-3 rounded-2xl mb-4 max-w-[500px] w-full mx-auto flex items-center justify-between text-xs font-black tracking-wide shadow-md uppercase animate-pulse">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
              Modo Espectador Ativo
            </div>
            <div className="text-[10px] text-indigo-200">Apenas assistindo</div>
          </div>
        )}

        {/* Bot / Participant Selector for Demonstration */}
        {isSpectator && (playersList || []).length > 0 && (
          <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-3xl mb-4 max-w-[500px] w-full mx-auto shadow-sm">
            <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-505 animate-pulse" />
              <span>Painel de Simulação - Ver Participante:</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedParticipantId('')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
                  selectedParticipantId === ''
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-350 border border-slate-200 dark:border-slate-800'
                }`}
              >
                Minha Visão (Espectador)
              </button>
              {(playersList || []).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedParticipantId(p.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    selectedParticipantId === p.id
                      ? 'bg-indigo-600 text-white shadow-sm font-black'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {p.id.startsWith('bot_') ? '🤖' : '👤'} {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bingo Card Container */}
        <div className="bg-emerald-300 rounded-3xl p-2.5 shadow-2xl shadow-emerald-900/40 border-[3px] border-emerald-400 relative max-w-[460px] w-full mx-auto">
          
          <div className="grid grid-cols-5 gap-1.5 mb-2">
             {COLUMN_LETTERS.map((letter, i) => (
                <div key={letter} className={`h-8 rounded-xl flex items-center justify-center ${COLUMN_COLORS[i]} border-2 border-white/20 shadow-inner`}>
                  <span className="text-white font-black text-xl drop-shadow-md">{letter}</span>
                </div>
             ))}
          </div>

          <div className="bg-white/40 p-1.5 rounded-2xl grid grid-cols-5 gap-1.5 backdrop-blur-sm border border-white/50">
            {activeCard.grid.map((row, rIdx) => 
               row.map((cell, cIdx) => {
                 const isFree = cell === 'FREE';
                 const isMarked = isFree || markedSpaces.has(`${rIdx}-${cIdx}`) || drawnNumbers.includes(cell as number);
                 const bgClass = isFree 
                    ? 'bg-emerald-400' 
                    : (isMarked ? currentDaubColor.lightBg : 'bg-white');
                 const textClass = isFree 
                    ? 'text-white' 
                    : (isMarked ? currentDaubColor.cellText : 'text-slate-800');
                    
                 return (
                   <button
                     key={`${rIdx}-${cIdx}`}
                     onClick={() => !isSpectator && !isFree && handleSpaceClick(rIdx, cIdx, cell)}
                     disabled={isSpectator}
                     className={`aspect-square rounded-xl shadow-sm flex items-center justify-center font-black transition-all border-b-4 ${bgClass} ${textClass} ${isMarked ? currentDaubColor.borderColor : 'border-slate-200'} ${isSpectator ? 'cursor-not-allowed opacity-90' : 'active:scale-95'}`}
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
                      placeholder={isSpectator ? "Apenas jogadores podem usar o chat" : "Mensagem..."}
                      disabled={isSpectator}
                      className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <button 
                      type="submit" 
                      disabled={isSpectator || !chatMessage.trim()}
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

        {/* Real-time Room Winners Celebration Overlay */}
        <AnimatePresence>
          {(playersList || []).filter(p => isCardWinner(p.card, drawnNumbers, gameMode)).length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 text-center overflow-y-auto"
            >
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-10 left-10 w-40 h-40 bg-amber-500/15 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-10 right-10 w-40 h-40 bg-zinc-500/15 rounded-full blur-3xl animate-pulse" />
              </div>

              <motion.div
                initial={{ scale: 0.85, y: 30 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 1.05, opacity: 0 }}
                transition={{ type: "spring", damping: 18 }}
                className="bg-white dark:bg-slate-900 border-4 border-amber-500 rounded-[36px] shadow-[0_0_60px_rgba(245,158,11,0.55)] max-w-sm sm:max-w-md w-full p-6 sm:p-8 flex flex-col items-center relative my-auto scrollbar-none"
              >
                {/* Crown / Trophy Floating element */}
                <div className="absolute -top-12 bg-amber-500 text-white p-4.5 rounded-full border-4 border-white dark:border-slate-900 shadow-xl animate-bounce">
                  <Trophy className="w-8 h-8 text-white shrink-0 animate-pulse" />
                </div>

                <h2 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-yellow-400 uppercase tracking-widest mt-6 filter drop-shadow">
                  BINGO!
                </h2>
                
                <p className="text-xs sm:text-sm font-extrabold text-slate-500 dark:text-slate-400 mt-2 uppercase tracking-wide">
                  Temos Ganhadores na Rodada!
                </p>

                <div className="mt-6 flex flex-col gap-3 w-full max-h-[40vh] overflow-y-auto scrollbar-none">
                  {(playersList || []).filter(p => isCardWinner(p.card, drawnNumbers, gameMode)).map((winner) => {
                    const matchedParticipant = participants.find(part => part.uid === winner.id);
                    const isMe = winner.id === user.uid;
                    const avatarUrl = matchedParticipant?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + winner.name;
                    
                    return (
                      <motion.div 
                        key={winner.id}
                        initial={{ opacity: 0, x: -15 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-100 dark:border-slate-800"
                      >
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-amber-400 bg-amber-50 shrink-0 shadow-md">
                          <img 
                            referrerPolicy="no-referrer"
                            src={avatarUrl} 
                            alt={winner.name} 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <div className="text-left flex-1 min-w-0">
                          <div className="font-extrabold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-1.5">
                            <span className="truncate">{winner.name}</span>
                            {isMe && <span className="bg-emerald-500 text-white font-extrabold text-[8px] px-1.5 py-0.5 rounded-md uppercase tracking-wider">Você</span>}
                          </div>
                          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-400">
                            {winner.id.startsWith('bot_') ? '🤖 Participante Virtual' : '🎯 Jogador Real'}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {prize !== undefined && (
                            <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-xl font-black text-xs border border-amber-100 dark:border-amber-900/40">
                              <Coins className="w-3.5 h-3.5 text-amber-500 fill-amber-300 shrink-0" />
                              <span>+{Math.floor(prize / (playersList || []).filter(p => isCardWinner(p.card, drawnNumbers, gameMode)).length)}</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                <div className="mt-8 w-full">
                  <button
                    onClick={onExit}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold py-3.5 rounded-2xl text-xs sm:text-sm transition-all shadow-md uppercase tracking-wider"
                  >
                    Voltar ao Lobby
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
