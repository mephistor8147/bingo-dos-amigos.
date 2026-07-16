import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { BingoCardData, BingoSpace, Message, GameMode, Room } from '../types';
import { User, Clock, Star, Coins, Send, MessageCircle, ArrowLeft, Volume2, VolumeX, Mic, MicOff, Award, Radio, Eye, EyeOff, Sparkles, Trophy, Palette, AlertTriangle } from 'lucide-react';
import { audioController } from '../audioUtils';
import { toast } from 'react-hot-toast';
import { isCardWinner, getNumbersNeededToWin } from '../utils';

interface DaubColor {
  id: string;
  name: string;
  lightBg: string; // cell bg when marked in user card
  cellText: string; // cell text color when marked
  borderColor: string; // cell border color
  sampleBg: string; // dot color in selectors
}

const DAUB_COLORS: DaubColor[] = [
  { id: 'emerald', name: 'Verde', lightBg: 'bg-emerald-200 dark:bg-emerald-950/80', cellText: 'text-emerald-950 dark:text-emerald-200', borderColor: 'border-emerald-300 dark:border-emerald-800', sampleBg: 'bg-emerald-500' },
  { id: 'blue', name: 'Azul', lightBg: 'bg-blue-200 dark:bg-blue-950/80', cellText: 'text-blue-950 dark:text-blue-200', borderColor: 'border-blue-300 dark:border-blue-800', sampleBg: 'bg-blue-500' },
  { id: 'pink', name: 'Rosa', lightBg: 'bg-pink-200 dark:bg-pink-950/80', cellText: 'text-pink-950 dark:text-pink-200', borderColor: 'border-pink-300 dark:border-pink-800', sampleBg: 'bg-pink-500' },
  { id: 'purple', name: 'Roxo', lightBg: 'bg-purple-200 dark:bg-purple-950/80', cellText: 'text-purple-950 dark:text-purple-200', borderColor: 'border-purple-300 dark:border-purple-800', sampleBg: 'bg-purple-500' },
  { id: 'orange', name: 'Laranja', lightBg: 'bg-orange-200 dark:bg-orange-950/80', cellText: 'text-orange-950 dark:text-orange-200', borderColor: 'border-orange-300 dark:border-orange-800', sampleBg: 'bg-orange-500' },
  { id: 'red', name: 'Vermelho', lightBg: 'bg-red-200 dark:bg-red-950/80', cellText: 'text-red-950 dark:text-red-200', borderColor: 'border-red-300 dark:border-red-800', sampleBg: 'bg-red-500' },
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
  playersList?: { id: string; name: string; card: BingoCardData; doubleStageAccepted?: number }[];
  theme?: string;
  room?: Room;
  onUpdateCoins?: (newBalance: number) => void;
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

export function PlayerMobileView({ card, drawnNumbers, user, timeLeft: initialTimeLeft, scheduledTime, messages, gameMode = 'full_card', participants, prize, bgMusicUrl, onlineRadioUrl, initialSoundEnabled = true, isSpectator = false, onExit, onSendMessage, onOpenProfile, winners, roomStatus, playersList, theme = 'emerald', room, onUpdateCoins }: PlayerMobileViewProps) {
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>('');

  const hasInitializedSpectator = useRef(false);
  useEffect(() => {
    if (isSpectator && !hasInitializedSpectator.current && playersList && playersList.length > 0) {
      setSelectedParticipantId(playersList[0].id);
      hasInitializedSpectator.current = true;
    }
  }, [isSpectator, playersList]);

  // Real-time double stage timer countdown
  const [doubleTimeLeft, setDoubleTimeLeft] = useState(0);
  useEffect(() => {
    if (!room || !room.doubleStageTimer) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((room.doubleStageTimer! - Date.now()) / 1000));
      setDoubleTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [room?.doubleStageTimer]);

  const [confirmAction, setConfirmAction] = useState<{
    type: "accept" | "refuse";
    stage?: number;
  } | null>(null);

  useEffect(() => {
    // Force close confirmation if game double stage changes
    setConfirmAction(null);
  }, [room?.doubleStage]);

  const playerInRoom = room?.players?.find((p) => p.id === user.uid);
  const myDoubleStatus = playerInRoom?.doubleStageAccepted || 0;

  const handleAcceptDouble = async (targetStage: number) => {
    setConfirmAction(null);
    if (!room) return;
    if (user.coins < room.entryFee) {
      toast.error("Saldo de moedas insuficiente para aceitar a dobra! 😢");
      return;
    }

    try {
      const { doc, updateDoc, collection, addDoc } = await import("firebase/firestore");
      const { db } = await import("../lib/firebase");

      // 1. Deduct coins from user doc
      const userRef = doc(db, "users", user.uid);
      const newCoins = user.coins - room.entryFee;
      await updateDoc(userRef, { coins: newCoins });

      // 2. Add transaction history doc under user subcollection
      await addDoc(collection(db, "users", user.uid, "transactions"), {
        type: "game_double",
        amount: 0,
        coins: room.entryFee,
        timestamp: Date.now(),
        status: "completed",
        description: `Dobra de Cartela (${targetStage === 1 ? "Primeira" : "Última"} Rodada) - Sala ${room.name}`,
      });

      // 3. Update player subcollection level
      const playerRef = doc(db, "rooms", room.id, "players", user.uid);
      await updateDoc(playerRef, { doubleStageAccepted: targetStage });

      // 4. Update parent coins local state
      if (onUpdateCoins) {
        onUpdateCoins(newCoins);
      }

      toast.success(`🎉 Dobra aceita com sucesso! ${room.entryFee} moedas debitadas.`);
    } catch (e) {
      console.error("Erro ao aceitar a dobra no Firestore:", e);
      toast.error("Ocorreu um erro ao processar seu pagamento.");
    }
  };

  const handleRefuseDouble = async () => {
    setConfirmAction(null);
    if (!room) return;
    try {
      const { doc, updateDoc } = await import("firebase/firestore");
      const { db } = await import("../lib/firebase");

      const playerRef = doc(db, "rooms", room.id, "players", user.uid);
      await updateDoc(playerRef, { doubleStageAccepted: -1 });

      toast.success("Você recusou a dobra da cartela.");
    } catch (e) {
      console.error("Erro ao recusar dobra:", e);
    }
  };

  const fallbackCard: BingoCardData = useMemo(() => {
    return {
      id: 'fallback',
      playerName: 'Espectador',
      grid: [
        [5, 18, 32, 50, 64],
        [8, 22, 35, 52, 67],
        [10, 24, 'FREE', 55, 70],
        [12, 27, 40, 58, 72],
        [15, 30, 44, 60, 75]
      ]
    };
  }, []);

  const activeCard = useMemo(() => {
    if (isSpectator) {
      if (selectedParticipantId) {
        const selectedPlayer = (playersList || []).find(p => p.id === selectedParticipantId);
        if (selectedPlayer?.card) return selectedPlayer.card;
      }
      if (playersList && playersList.length > 0 && playersList[0].card) {
        return playersList[0].card;
      }
    }
    return card || fallbackCard;
  }, [card, selectedParticipantId, playersList, isSpectator, fallbackCard]);

  const winningProbabilities = useMemo(() => {
    if (!playersList || playersList.length === 0) return [];
    
    // For each player, calculate how many numbers they need to win and which ones
    const playersData = playersList.map(p => {
      // Find numbers needed to win
      const needed = getNumbersNeededToWin(p.card, drawnNumbers, gameMode);
      return {
        id: p.id,
        name: p.name,
        count: needed.count,
        numbers: needed.numbers
      };
    });

    // Calculate weight for each player
    const weightedPlayers = playersData.map(p => {
      let weight = 0;
      if (p.count === 0) {
        weight = 1000; // already won / BINGO
      } else {
        weight = Math.pow(10 / (p.count + 0.5), 2.2);
      }
      return { ...p, weight };
    });

    // Total weight
    const totalWeight = weightedPlayers.reduce((acc, p) => acc + p.weight, 0);

    // Normalize weights to percentages
    const result = weightedPlayers.map(p => {
      let probability = 0;
      if (totalWeight > 0) {
        probability = Math.round((p.weight / totalWeight) * 100);
      }
      return {
        id: p.id,
        name: p.name,
        count: p.count,
        numbers: p.numbers,
        probability: Math.min(100, Math.max(0, probability))
      };
    });

    // Sort by count ascending (fewer numbers needed first), then probability descending
    return result.sort((a, b) => {
      if (a.count !== b.count) {
        return a.count - b.count;
      }
      return b.probability - a.probability;
    });
  }, [playersList, drawnNumbers, gameMode]);

  // We'll mimic the "marked" state based on drawnNumbers for now, but a real app would let user tap.
  // Actually, standard digital bingo auto-daubs or user daubs. Let's make it auto-daub for simplicity,
  // or track clicked spaces. Let's track clicked spaces.
  const [markedSpaces, setMarkedSpaces] = useState<Set<string>>(new Set());
  const [autoDaub, setAutoDaub] = useState(true);
  const [selectedColorId, setSelectedColorId] = useState(() => {
    try {
      return localStorage.getItem('bingo_daub_color') || 'emerald';
    } catch (e) {
      return 'emerald';
    }
  });
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [hasBingo, setHasBingo] = useState(false);
  const [showBingoAnimation, setShowBingoAnimation] = useState(false);
  const [localTimeLeft, setLocalTimeLeft] = useState(initialTimeLeft);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const desktopChatBottomRef = useRef<HTMLDivElement>(null);
  const [soundEnabled, setSoundEnabled] = useState(initialSoundEnabled);
  const currentDaubColor = useMemo(() => {
    return DAUB_COLORS.find(c => c.id === selectedColorId) || DAUB_COLORS[0];
  }, [selectedColorId]);

  const themeColors = useMemo(() => {
    switch(theme) {
      case 'ocean':
        return {
          bgColor: 'bg-sky-600',
          gradientSky: 'from-blue-400 to-sky-600',
          gradientBottom: 'from-sky-700 to-transparent',
          borderAccent: 'border-sky-400/30'
        };
      case 'sunset':
        return {
          bgColor: 'bg-orange-500',
          gradientSky: 'from-amber-300 to-orange-500',
          gradientBottom: 'from-orange-600 to-transparent',
          borderAccent: 'border-orange-400/30'
        };
      case 'royal':
        return {
          bgColor: 'bg-indigo-950',
          gradientSky: 'from-purple-800 to-indigo-950',
          gradientBottom: 'from-indigo-950 to-transparent',
          borderAccent: 'border-purple-400/30'
        };
      case 'cherry':
        return {
          bgColor: 'bg-pink-500',
          gradientSky: 'from-rose-300 to-pink-500',
          gradientBottom: 'from-pink-600 to-transparent',
          borderAccent: 'border-pink-400/30'
        };
      case 'emerald':
      default:
        return {
          bgColor: 'bg-emerald-500',
          gradientSky: 'from-sky-300 to-emerald-500',
          gradientBottom: 'from-emerald-600 to-transparent',
          borderAccent: 'border-emerald-400/30'
        };
    }
  }, [theme]);
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(true);
  const [audioUnlocked, setAudioUnlocked] = useState(() => audioController.isUnlocked());
  const [recentTexters, setRecentTexters] = useState<Record<string, boolean>>({});

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
      if (radioAudioRef.current) {
        radioAudioRef.current.pause();
        radioAudioRef.current.src = ""; // Release stream resource to stop background download
      }
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
          radioAudioRef.current.src = onlineRadioUrl;
          radioAudioRef.current.load();
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
          if (!radioAudioRef.current.src || radioAudioRef.current.src === window.location.href) {
            radioAudioRef.current.src = onlineRadioUrl;
            radioAudioRef.current.load();
          }
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
      if (radioAudioRef.current) {
        radioAudioRef.current.pause();
        radioAudioRef.current.src = ""; // Release stream resource
      }
      setIsRadioPlaying(false);
      setSoundEnabled(false);
    } else {
      if (isRadioPlaying && onlineRadioUrl) {
         if (radioAudioRef.current) {
           radioAudioRef.current.src = onlineRadioUrl;
           radioAudioRef.current.load();
           radioAudioRef.current.play().catch(e => console.log(e));
         }
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
                radioAudioRef.current.src = onlineRadioUrl;
                radioAudioRef.current.load();
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
      const isOnCard = activeCard?.grid?.some(row => row && Array.isArray(row) && row.includes(lastDrawn));
      if (isOnCard && autoDaub) {
         setTimeout(() => {
           audioController.playMarkCard();
         }, 300); // slight delay after the pop
      }
    }
  }, [drawnNumbers.length, soundEnabled, autoDaub, activeCard?.grid, audioUnlocked]);
  useEffect(() => {
    if (!scheduledTime) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((scheduledTime - Date.now()) / 1000));
      setLocalTimeLeft(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [scheduledTime]);

  // Efeito sonoro e brilho ao receber uma nova mensagem no chat
  const prevMessagesLength = useRef(messages?.length || 0);
  useEffect(() => {
    let timeoutId: any;
    if (messages && messages.length > prevMessagesLength.current) {
      if (soundEnabled && audioUnlocked) {
        audioController.playChatMessage();
      }
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.senderId) {
        const senderId = lastMsg.senderId;
        setRecentTexters(prev => ({
          ...prev,
          [senderId]: true
        }));
        timeoutId = setTimeout(() => {
          setRecentTexters(prev => {
            const next = { ...prev };
            delete next[senderId];
            return next;
          });
        }, 4000);
      }
    }
    prevMessagesLength.current = messages?.length || 0;
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [messages, soundEnabled, audioUnlocked]);

  // Efeito sonoro quando um vencedor de cartela for anunciado na sala
  const winnersCount = useMemo(() => {
    return (playersList || []).filter(p => isCardWinner(p.card, drawnNumbers, gameMode)).length;
  }, [playersList, drawnNumbers, gameMode]);
  const prevWinnersCount = useRef(winnersCount);

  useEffect(() => {
    if (winnersCount > 0 && prevWinnersCount.current === 0) {
      if (soundEnabled && audioUnlocked) {
        audioController.playWinnerFanfare();
      }
    }
    prevWinnersCount.current = winnersCount;
  }, [winnersCount, soundEnabled, audioUnlocked]);

  useEffect(() => {
    if (isSpectator) return;
    // Check for BINGO condition
    let won = false;
    
    const isMarked = (r: number, c: number) => {
      if (r < 0 || r > 4 || c < 0 || c > 4) return false;
      const cell = activeCard?.grid?.[r]?.[c];
      if (cell === undefined) return false;
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
  }, [markedSpaces, activeCard?.grid, hasBingo, onSendMessage, gameMode]);

  useEffect(() => {
    if (isChatOpen && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isChatOpen]);

  useEffect(() => {
    if (desktopChatBottomRef.current) {
      desktopChatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSpectator) return;
    if (!chatMessage.trim()) return;
    onSendMessage(chatMessage);
    setChatMessage('');
  };

  const handleSpaceClick = (rIdx: number, cIdx: number, value: BingoSpace) => {
    if (isSpectator) return;
    if (value === 'FREE') return;
    const key = `${rIdx}-${cIdx}`;

    // Unlock audio context on direct action
    if (!audioUnlocked) {
      setAudioUnlocked(true);
      audioController.init();
    }

    setMarkedSpaces(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        if (soundEnabled) {
          audioController.playMarkCard();
        }
      } else {
        // Allow marking manually if the number was drawn, or if we want to allow mistakes we could just let them mark anyway.
        // For standard bingo, usually you can validly DAUB. Let's allow valid daubs:
        if (drawnNumbers.includes(value as number)) {
           next.add(key);
           if (soundEnabled) {
             audioController.playMarkCard();
           }
        }
      }
      return next;
    });
  };

  // The latest drawn numbers
  const recentDrawn = [...drawnNumbers].reverse().slice(0, 3);

  return (
    <div className={`min-h-screen ${themeColors.bgColor} font-sans text-slate-800 flex flex-col justify-start pb-8 relative overflow-y-auto`} onClick={unlockAudio} onTouchStart={unlockAudio}>
      {bgMusicUrl && (
         <audio ref={customAudioRef} src={bgMusicUrl} loop preload="auto" />
      )}
      {onlineRadioUrl && (
         <audio ref={radioAudioRef} src={onlineRadioUrl} preload="auto" />
      )}
      {/* Background Decor (Simulating the grassy field & sky from image) */}
      <div className="absolute inset-0 pointer-events-none z-0">
         <div className={`absolute top-0 inset-x-0 h-1/3 bg-gradient-to-b ${themeColors.gradientSky} opacity-60`}></div>
         <div className={`absolute bottom-0 inset-x-0 h-1/3 bg-gradient-to-t ${themeColors.gradientBottom}`}></div>
      </div>
      <div className="relative z-10 w-full max-w-5xl mx-auto pt-safe px-4 flex flex-col h-auto">
        {!isHeaderExpanded ? (
          <div className={`flex items-center justify-between w-full mb-4 px-3.5 py-2.5 bg-white/95 dark:bg-slate-900 border ${themeColors.borderAccent} dark:border-slate-800 rounded-3xl relative z-50 animate-in fade-in slide-in-from-top-1 duration-200 shadow-xl backdrop-blur-sm`} onClick={(e) => e.stopPropagation()}>
            {/* Left part: Miniature list of participants, highlighting our own */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 flex-1 pr-4">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0 mr-1.5 md:block hidden animate-none">
                Participantes:
              </span>
              <div className="flex -space-x-2 shrink-0 items-center">
                {participants.map((p, idx) => {
                  const isMe = p.uid === user.uid;
                  const isSpeaking = speakersState[p.uid]?.isSpeaking && voiceActive;
                  const isVoiceUser = connectedVoicePlayers.has(p.uid) && voiceActive;
                  const isGlowing = recentTexters[p.uid];
                  return (
                    <div 
                      key={p.uid} 
                      className={`w-8 h-8 rounded-full border-2 bg-white dark:bg-slate-800 overflow-hidden shadow-sm flex-shrink-0 transition-all duration-300 relative animate-in zoom-in-50 duration-300 ease-out fill-mode-both ${
                        isGlowing
                          ? 'border-cyan-400 dark:border-cyan-400 ring-4 ring-cyan-300 dark:ring-cyan-500 scale-125 z-55 shadow-lg shadow-cyan-400/50 animate-pulse'
                          : isMe 
                          ? 'border-amber-500 ring-4 ring-amber-400/75 scale-125 z-40 mx-2 shadow-lg shadow-amber-500/30' 
                          : isSpeaking 
                          ? 'border-green-500 ring-2 ring-green-400/40 z-10 scale-110' 
                          : (isVoiceUser ? 'border-indigo-400' : 'border-emerald-400 dark:border-emerald-600')
                      }`} 
                      style={{ animationDelay: `${idx * 40}ms` }}
                      title={`${p.name} ${isMe ? '(Você)' : ''} ${isVoiceUser ? '(Canal de Voz)' : ''}`}
                    >
                      {p.avatar ? (
                        <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 font-black text-xs uppercase animate-none">
                          {p.name.charAt(0)}
                        </div>
                      )}
                      
                      {/* Highlight Star overlay for current user */}
                      {isMe && (
                        <div className="absolute bottom-0 right-0 bg-amber-500 p-0.5 rounded-full border border-white dark:border-slate-800 leading-none z-10 shadow-sm flex items-center justify-center animate-none" style={{ width: '12px', height: '12px' }}>
                          <Star className="w-2 h-2 text-white fill-white" />
                        </div>
                      )}

                      {/* Dynamic Voice Wave Animation Overlay */}
                      {isSpeaking && (
                        <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center animate-none">
                          <span className="flex gap-0.5 justify-center items-center">
                            <span className="w-0.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-0.5 h-2.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '100ms' }} />
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {participants.length === 0 && (
                <span className="text-slate-400 dark:text-slate-500 text-xs font-semibold animate-none">Nenhum participante ao vivo</span>
              )}
              {/* Highlight Note/Label for oneself */}
              {participants.some(p => p.uid === user.uid) && (
                <span className="text-[9px] font-black text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full uppercase border border-amber-200/30 shadow-sm leading-none shrink-0 ml-2 animate-pulse">
                  Minha Foto
                </span>
              )}
            </div>

            {/* Right part: Toggle panel button */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsHeaderExpanded(true)}
                className="h-7 w-7 sm:h-8 sm:w-8 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-slate-800 rounded-xl text-emerald-600 dark:text-emerald-405 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-md hover:scale-110 active:scale-95 transition-all flex items-center justify-center shrink-0"
                title="Exibir Painel de Controle"
              >
                <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600" />
              </button>
            </div>
          </div>
        ) : (
          /* Top Unified Premium Header Card incorporating all circled top elements */
          <div className={`bg-white/95 dark:bg-slate-900 border ${themeColors.borderAccent} dark:border-slate-800 rounded-3xl p-3 shadow-xl flex flex-col gap-3.5 w-full mb-4 z-10 transition-all duration-300`} onClick={(e) => e.stopPropagation()}>
            
            {/* Row 1: Profile and Action Controls */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 w-full">
              {/* Left side: profile details + Toggle Button */}
              <div className="flex items-center justify-between w-full md:w-auto gap-2">
                <div 
                  onClick={(e) => { e.stopPropagation(); onOpenProfile && onOpenProfile(); }}
                  className="flex items-center gap-2 cursor-pointer hover:bg-emerald-50 dark:hover:bg-slate-800/60 p-1 rounded-xl transition-all text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center overflow-hidden border border-emerald-200 dark:border-slate-700 relative shrink-0">
                     {user.avatar ? <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover"/> : <User className="w-3.5 h-3.5 text-slate-400" />}
                     {voiceActive && isMyselfSpeaking && (
                       <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center border border-green-500 rounded-full">
                         <span className="flex gap-0.5 justify-center items-center">
                           <span className="w-0.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                           <span className="w-0.5 h-2.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                           <span className="w-0.5 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                         </span>
                       </div>
                     )}
                  </div>
                  <div>
                      <div className="text-slate-800 dark:text-slate-100 text-xs md:text-sm font-black leading-tight tracking-tight">{user.name}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Coins className="w-2.5 h-2.5 text-amber-500 fill-amber-305 shrink-0" />
                        <span className="text-amber-600 dark:text-amber-400 text-[10px] md:text-xs font-black">{user.coins.toLocaleString()}</span>
                      </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
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
                      className="relative h-7 w-7 sm:h-8 sm:w-8 rounded-lg text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-all flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-900 shadow-sm bg-amber-50 dark:bg-slate-900 active:scale-95 animate-bounce"
                      title="Novas mensagens no chat"
                    >
                      <MessageCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500 animate-pulse" />
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white dark:border-slate-900 animate-ping"></span>
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white dark:border-slate-900"></span>
                    </button>
                  )}

                  {/* Countdown Clock (Hidden when <= 0) */}
                  {localTimeLeft > 0 && (
                    <div className="bg-red-50 dark:bg-red-950/40 border border-red-200/50 dark:border-red-900/40 rounded-lg px-2 h-7 sm:h-8 flex items-center gap-1 shadow-sm shrink-0">
                       <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-red-600 dark:text-red-400 shrink-0" />
                       <span className="text-red-700 dark:text-red-400 font-extrabold text-[10px] sm:text-[11px] tracking-wider">{formatTime(localTimeLeft)}</span>
                    </div>
                  )}

                  {/* Icon toggle button */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsHeaderExpanded(!isHeaderExpanded); }}
                    className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg text-slate-500 hover:text-indigo-650 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 active:scale-95"
                    title={isHeaderExpanded ? "Ocultar detalhes" : "Mostrar detalhes"}
                  >
                    {isHeaderExpanded ? <EyeOff className="w-3" /> : <Eye className="w-3" />}
                  </button>
                </div>
              </div>

              {/* Right side: game controls row */}
              {isHeaderExpanded && (
                <div className="flex items-center gap-1.5 w-full md:w-auto justify-end flex-wrap">
                  {/* Online Radio Button Play/Pause Toggle */}
                  {onlineRadioUrl && (
                    <button 
                      onClick={toggleRadio} 
                      title={isRadioPlaying ? "Pausar rádio online" : "Escutar rádio online"}
                      className={`h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center rounded-lg border transition-all active:scale-95 shadow-sm ${
                        isRadioPlaying 
                          ? 'bg-indigo-600 border-indigo-500 text-white animate-pulse shadow-indigo-600/10' 
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                      }`}
                    >
                      <Radio className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isRadioPlaying ? 'text-indigo-200 animate-spin-slow' : 'text-slate-400 dark:text-slate-550'}`} />
                    </button>
                  )}

                  {/* Real Voice Chat Button */}
                  <button 
                    onClick={toggleVoiceChat} 
                    title={voiceActive ? "Desativar Canal de Voz" : "Ativar Canal de Voz"}
                    className={`h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center rounded-lg border transition-all active:scale-95 shadow-sm ${
                      voiceActive 
                        ? 'bg-indigo-600 border-indigo-500 text-white animate-pulse' 
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                    }`}
                  >
                    {voiceActive ? <Mic className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-300" /> : <MicOff className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 dark:text-slate-500" />}
                  </button>

                  {/* Sound Controls */}
                  <button 
                    onClick={toggleSound} 
                    title="Áudio do Jogo"
                    className={`h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center rounded-lg border transition-all active:scale-95 shadow-sm shrink-0 ${soundEnabled ? 'bg-emerald-500 border-emerald-400/30 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-555 border-slate-200 dark:border-slate-700 hover:bg-slate-100'}`}
                  >
                    {soundEnabled ? <Volume2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <VolumeX className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                  </button>

                  {/* Adjustable Volume Slider wrapper */}
                  {soundEnabled && (
                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 h-7 sm:h-8 rounded-lg shadow-sm shrink-0">
                      <Volume2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-400 shrink-0" />
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={bgVolume} 
                        onChange={(e) => handleVolumeChange(Number(e.target.value))}
                        className="w-12 sm:w-16 accent-emerald-500 h-1 cursor-pointer bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none" 
                        title="Volume do Som de Fundo"
                      />
                      <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 w-5 text-right shrink-0">{bgVolume}%</span>
                    </div>
                  )}

                  {/* Auto Daub Button */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); setAutoDaub(!autoDaub); }} 
                    title="Marcação Automática"
                    className={`h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center rounded-lg border transition-all active:scale-95 shadow-sm ${
                      autoDaub 
                        ? 'bg-indigo-600 border-indigo-400/30 text-white' 
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </button>

                  {/* Color Daub Color Chooser Button */}
                  <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => setIsColorPickerOpen(!isColorPickerOpen)} 
                      title="Escolher Cor de Marcação"
                      className={`h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center rounded-lg border transition-all active:scale-95 shadow-sm bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-100 ${isColorPickerOpen ? 'ring-2 ring-indigo-500 border-transparent shadow-md' : ''}`}
                    >
                      <Palette className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-550 dark:text-indigo-400" />
                    </button>
                    {isColorPickerOpen && (
                      <div className="absolute right-0 top-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl shadow-xl z-50 flex flex-col gap-2 min-w-[210px] animate-in fade-in slide-in-from-top-2 duration-150">
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block border-b border-slate-100 dark:border-slate-800 pb-1 mb-1 text-center">
                          Cor de Marcação
                        </span>
                        <div className="grid grid-cols-3 gap-1.5">
                          {DAUB_COLORS.map(color => (
                            <button
                              key={color.id}
                              type="button"
                              onClick={() => {
                                setSelectedColorId(color.id);
                                try {
                                  localStorage.setItem('bingo_daub_color', color.id);
                                } catch (e) {
                                  console.warn("Storage writing is blocked:", e);
                                }
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
                  <button onClick={onExit} className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-655 dark:text-red-400 flex items-center justify-center border border-red-100 dark:border-red-900 active:scale-95 transition-all shadow-sm" title="Sair do Jogo">
                     <ArrowLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
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
                       const isGlowing = recentTexters[p.uid];
                       return (
                         <div 
                           key={p.uid} 
                           className={`w-8 h-8 rounded-full border-2 bg-white dark:bg-slate-800 overflow-hidden shadow-sm flex-shrink-0 transition-all duration-200 relative ${
                             isGlowing
                               ? 'border-cyan-400 dark:border-cyan-400 ring-4 ring-cyan-300 dark:ring-cyan-500 scale-125 z-55 shadow-lg shadow-cyan-400/50 animate-pulse'
                               : isSpeaking 
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
                    <span className="text-slate-400 dark:text-slate-500 text-xs font-semibold">Nenhum participante ativo</span>
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
                      <div className="flex flex-col min-w-0">
                        <span className="font-extrabold text-slate-800 dark:text-slate-100 text-xs sm:text-sm truncate">{p.name}</span>
                        {gameMode === 'four_balls_double' && (() => {
                          const statusVal = p.doubleStageAccepted || 0;
                          let text = 'Jogando';
                          let cls = 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400';
                          if (statusVal === -1) {
                            text = 'Eliminado ❌';
                            cls = 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-450';
                          } else if (room?.doubleStage === 1 && statusVal === 0) {
                            text = 'Pensando...';
                            cls = 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 animate-pulse';
                          } else if (room?.doubleStage === 3 && statusVal === 1) {
                            text = 'Pensando Sobra Final...';
                            cls = 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 animate-pulse';
                          } else if (statusVal === 1) {
                            text = 'Dobra 1 ✔️';
                            cls = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400';
                          } else if (statusVal === 2) {
                            text = 'Dobra Final 💎';
                            cls = 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white border-0';
                          }
                          return (
                            <span className={`text-[9px] font-black uppercase mt-0.5 px-1.5 py-0.5 rounded border border-slate-200/20 w-fit ${cls}`}>
                              {text}
                            </span>
                          );
                        })()}
                      </div>
                      {isWinner && (
                        <span className="bg-amber-500 text-white font-black text-[9px] px-2 py-0.5 rounded-lg animate-bounce uppercase tracking-wider">
                          🏆 BINGO!
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-5 gap-1 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                      {(p.card?.grid || []).map((row, rIdx) =>
                        (row || []).map((cell, cIdx) => {
                          const isFree = cell === 'FREE';
                          const isMarked = isFree || drawnNumbers.includes(cell as number);
                          return (
                            <div
                              key={`${rIdx}-${cIdx}`}
                              className={`w-full aspect-square rounded-lg flex items-center justify-center text-[9px] sm:text-xs font-black transition-all ${
                                isFree
                                  ? 'bg-amber-100 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/65 text-amber-900 dark:text-amber-200'
                                  : isMarked
                                  ? 'bg-emerald-600 dark:bg-emerald-700 text-white border border-emerald-600 dark:border-emerald-800'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-750'
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
                <div className="col-span-full text-center text-slate-400 dark:text-slate-500 font-bold py-8 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 px-4">
                  Nenhum jogador na sala ainda.
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-2 w-full z-10">
          
          {/* LEFT COLUMN: Draw panel, simulator panel, spectator warnings, bingo card */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4 w-full">
            {/* Drawn Balls Animation Stage */}
        {!isSpectator && (
          <div className="flex flex-col items-center mb-4 bg-slate-100/50 dark:bg-slate-900/60 p-3 rounded-3xl border border-slate-200/50 dark:border-slate-800/80 shadow-inner max-w-md mx-auto w-full">
            <span className="text-[10px] font-extrabold tracking-widest text-slate-400 dark:text-slate-500 uppercase mb-2 select-none">Painel de Sorteio</span>
          <div className="flex items-center gap-4 h-28 justify-center w-full relative">
            <AnimatePresence mode="popLayout">
              {recentDrawn.map((num, i) => {
                const letter = num <= 15 ? 'B' : num <= 30 ? 'I' : num <= 45 ? 'N' : num <= 60 ? 'G' : 'O';
                const isCurrent = i === 0;
                let colorClass = 'from-red-500 to-red-600 text-white';
                if (num > 15 && num <= 30) colorClass = 'from-purple-500 to-purple-600 text-white';
                else if (num > 30 && num <= 45) colorClass = 'from-amber-400 to-amber-500 text-slate-900';
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
                        ? `w-20 h-20 sm:w-22 sm:h-22 bg-gradient-to-br ${colorClass} z-20 border-t-2 border-white/50 ring-4 ring-indigo-500/20` 
                        : `w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br ${colorClass} z-10 border-t border-white/30 opacity-75`
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
                        <div className="flex flex-col items-center justify-center leading-none">
                          <span className="text-[7px] sm:text-[8px] font-black tracking-tight opacity-75 uppercase leading-none block">
                            {letter}
                          </span>
                          <span className="text-xs sm:text-sm font-extrabold leading-none mt-0.5 filter drop-shadow-sm block">
                            {num}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Bottom internal shadow */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />

                    {/* Ping/Ring aura for current ball */}
                    {isCurrent && (
                      <span className="absolute -inset-1 rounded-full border border-indigo-500 animate-pulse opacity-40 pointer-events-none" />
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
        )}

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

        {/* Real-time Spectator Drawn Balls Grid (Tabela Completa de Bolas Sorteadas) */}
        {isSpectator && (
          <div id="spectator-drawn-balls-board" className="bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-800 p-5 rounded-3xl mb-4 max-w-[500px] w-full mx-auto shadow-md">
            <div className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-800 dark:text-slate-100 font-extrabold">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                Painel Geral de Bolas Sorteadas (1-75)
              </span>
              <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-extrabold select-none border border-indigo-100/40 dark:border-indigo-900/30">
                Sorteio: {drawnNumbers.length} / 75
              </span>
            </div>
            
            <div className="flex flex-col gap-3">
              {['B', 'I', 'N', 'G', 'O'].map((letter, idx) => {
                const min = idx * 15 + 1;
                const letterRange = Array.from({ length: 15 }, (_, i) => min + i);
                
                let letterColorClass = 'bg-red-500 text-white shadow-red-500/10';
                if (letter === 'I') letterColorClass = 'bg-purple-500 text-white shadow-purple-500/10';
                else if (letter === 'N') letterColorClass = 'bg-amber-500 text-slate-950 shadow-amber-500/10';
                else if (letter === 'G') letterColorClass = 'bg-emerald-500 text-white shadow-emerald-500/10';
                else if (letter === 'O') letterColorClass = 'bg-sky-500 text-white shadow-sky-500/10';

                return (
                  <div key={letter} className="flex gap-2.5 items-start bg-slate-50/70 dark:bg-slate-950/20 p-2 rounded-2xl border border-slate-100 dark:border-slate-900">
                    <span className={`w-8 h-8 rounded-xl font-black text-sm flex items-center justify-center shrink-0 shadow-sm uppercase ${letterColorClass}`}>
                      {letter}
                    </span>
                    <div className="flex flex-wrap gap-1.5 flex-1 items-center">
                      {letterRange.map((num) => {
                        const isDrawn = drawnNumbers.includes(num);
                        const isLatest = drawnNumbers.length > 0 && drawnNumbers[drawnNumbers.length - 1] === num;
                        const isOnActiveCard = activeCard?.grid?.some(row => row && Array.isArray(row) && row.includes(num)) || false;

                        let ballColorStyles = '';
                        if (isDrawn) {
                          if (num <= 15) {
                            ballColorStyles = 'bg-gradient-to-br from-red-500 to-red-650 text-white border-red-600 shadow-md shadow-red-500/25';
                          } else if (num <= 30) {
                            ballColorStyles = 'bg-gradient-to-br from-purple-500 to-purple-650 text-white border-purple-600 shadow-md shadow-purple-500/25';
                          } else if (num <= 45) {
                            ballColorStyles = 'bg-gradient-to-br from-amber-400 to-amber-550 text-slate-950 border-amber-500 shadow-md shadow-amber-400/20';
                          } else if (num <= 60) {
                            ballColorStyles = 'bg-gradient-to-br from-emerald-500 to-emerald-650 text-white border-emerald-600 shadow-md shadow-emerald-500/25';
                          } else {
                            ballColorStyles = 'bg-gradient-to-br from-sky-500 to-sky-650 text-white border-sky-600 shadow-md shadow-sky-500/25';
                          }
                        } else {
                          // Unselected styling
                          if (isOnActiveCard) {
                            ballColorStyles = 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border-indigo-400 dark:border-indigo-600 font-extrabold ring-1 ring-indigo-400 dark:ring-indigo-600/50 shadow-inner';
                          } else {
                            ballColorStyles = 'bg-slate-100 dark:bg-slate-800 text-slate-550 dark:text-slate-405 border-slate-250 dark:border-slate-700 font-bold';
                          }
                        }

                        return (
                          <div
                            key={num}
                            id={`spectator-ball-${num}`}
                            title={`Número ${num}${isDrawn ? ' (Sorteado)' : ' (Não sorteado)'}${isOnActiveCard ? ' - Presente na cartela spectada' : ''}`}
                            className={`relative flex items-center justify-center rounded-full transition-all duration-300 border font-black scale-100 select-none
                              w-7 h-7 sm:w-[29px] sm:h-[29px] text-[10px] sm:text-xs
                              ${ballColorStyles}
                              ${isLatest ? 'ring-4 ring-amber-400 animate-pulse scale-110 z-10 border-amber-500' : ''}
                              ${isDrawn && !isLatest ? 'hover:scale-105' : ''}
                            `}
                          >
                            <span>{num}</span>
                            
                            {/* Tiny bullet indicator below the number to explicitly mark state */}
                            {isOnActiveCard && (
                              <span className={`absolute -bottom-0.5 w-[5px] h-[5px] rounded-full ${
                                isDrawn 
                                  ? 'bg-white border border-black/20 animate-ping' 
                                  : 'bg-indigo-600 shadow-md'
                              }`} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Visual Helper Legends */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 text-[9px] font-bold text-slate-500 dark:text-slate-400 justify-center">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-250 dark:border-slate-700" />
                Não Sorteado
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-50 dark:bg-indigo-950/45 border-2 border-indigo-450 text-[5px] flex items-center justify-center p-0.5 text-indigo-500 font-black">
                  •
                </span>
                Na Cartela (Aguardando)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-600" />
                Sorteado
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-amber-500 animate-pulse" />
                Última Bola Sorteada
              </span>
            </div>
          </div>
        )}

        {/* 📊 Estatísticas em Tempo Real sobre Probabilidade de Vitória */}
        {isSpectator && (
          <div id="spectator-win-probabilities-board" className="bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-800 p-5 rounded-3xl mb-4 max-w-[500px] w-full mx-auto shadow-md">
            <div className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-800 dark:text-slate-100 font-extrabold text-xs">
                <Trophy className="w-4 h-4 text-amber-500 animate-bounce" />
                Líderes e Probabilidades de Vitória (%)
              </span>
              <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950/65 px-2 py-0.5 rounded text-emerald-600 dark:text-emerald-400 font-extrabold border border-emerald-100/30">
                Tempo Real
              </span>
            </div>
            
            <p className="text-slate-500 dark:text-slate-400 text-[11px] font-medium mb-4 leading-relaxed">
              Cálculo preditivo atualizado instantaneamente a cada nova bola, ponderando os números restantes para o Bingo de cada cartela ativa.
            </p>

            <div className="space-y-3.5">
              {winningProbabilities.slice(0, 5).map((p, idx) => {
                const getBallLetter = (n: number) => n <= 15 ? 'B' : n <= 30 ? 'I' : n <= 45 ? 'N' : n <= 60 ? 'G' : 'O';
                const rankColors = [
                  'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 ring-amber-300',
                  'bg-slate-100 text-slate-700 dark:bg-slate-850 dark:text-slate-300 ring-slate-300',
                  'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 ring-orange-300'
                ];
                const rankBadge = idx < 3 
                  ? rankColors[idx]
                  : 'bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400 border-slate-200';

                return (
                  <div key={p.id} className="p-3 bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 rounded-2xl flex flex-col gap-2 transition-all hover:translate-x-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] ring-1 ${rankBadge}`}>
                          {idx + 1}
                        </span>
                        <span className="font-extrabold text-xs text-slate-800 dark:text-white truncate max-w-[150px]">
                          {p.name}
                        </span>
                        {p.count === 1 && (
                          <span className="bg-red-500 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded animate-pulse">
                            🔥 Na Borda
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-indigo-650 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-lg border border-indigo-100/30">
                          {p.count === 0 ? 'BINGO!' : `${p.count} faltam`}
                        </span>
                        <span className="text-xs font-black text-emerald-650 dark:text-emerald-400">
                          {p.probability}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 dark:bg-slate-850 h-2.5 rounded-full overflow-hidden relative border border-slate-200/20">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${p.probability}%` }}
                        transition={{ type: "spring", stiffness: 80, damping: 15 }}
                        className={`h-full bg-gradient-to-r ${
                          idx === 0 
                            ? 'from-amber-400 to-emerald-500 shadow-sm shadow-emerald-500/10' 
                            : 'from-indigo-500 to-indigo-600'
                        }`} 
                      />
                    </div>

                    {/* Pending Numbers */}
                    {p.count > 0 && p.count <= 6 && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">Aguardando:</span>
                        {p.numbers.slice(0, 6).map((num) => {
                          const letter = getBallLetter(num);
                          let badgeBg = 'bg-red-50 text-red-600 border-red-100 dark:bg-red-950/20 dark:text-red-400';
                          if (letter === 'I') badgeBg = 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-950/20 dark:text-purple-400';
                          else if (letter === 'N') badgeBg = 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400';
                          else if (letter === 'G') badgeBg = 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400';
                          else if (letter === 'O') badgeBg = 'bg-sky-50 text-sky-600 border-sky-100 dark:bg-sky-950/20 dark:text-sky-400';

                          return (
                            <span key={num} className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border ${badgeBg}`}>
                              {letter}{num}
                            </span>
                          );
                        })}
                        {p.numbers.length > 6 && (
                          <span className="text-[9px] text-slate-400 font-bold">+{p.numbers.length - 6}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {winningProbabilities.length === 0 && (
                <div className="p-6 text-center text-slate-400 font-bold text-xs bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  Aguardando início do jogo para gerar probabilidades...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bot / Participant Selector for Demonstration */}
        {false && isSpectator && (playersList || []).length > 0 && (
          <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-3xl mb-4 max-w-[500px] w-full mx-auto shadow-sm">
            <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
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
        {!isSpectator && (
        <div className="bg-emerald-300 rounded-3xl p-2.5 shadow-2xl shadow-emerald-900/40 border-[3px] border-emerald-400 relative max-w-[460px] w-full mx-auto">
          
          <div className="grid grid-cols-5 gap-1.5 mb-2">
             {COLUMN_LETTERS.map((letter, i) => (
                <div key={letter} className={`h-8 rounded-xl flex items-center justify-center ${COLUMN_COLORS[i]} border-2 border-white/20 shadow-inner`}>
                  <span className="text-white font-black text-base sm:text-xl drop-shadow-md select-none">{letter}</span>
                </div>
             ))}
          </div>

          <div className="bg-white/40 p-1.5 rounded-2xl grid grid-cols-5 gap-1.5 backdrop-blur-sm border border-white/50">
            {(activeCard?.grid || []).map((row, rIdx) => 
               row.map((cell, cIdx) => {
                 const isFree = cell === 'FREE';
                 const isMarked = isFree || markedSpaces.has(`${rIdx}-${cIdx}`) || drawnNumbers.includes(cell as number);
                 const bgClass = isFree 
                    ? 'bg-emerald-400' 
                    : (isMarked ? currentDaubColor.lightBg : 'bg-white dark:bg-slate-800');
                 const textClass = isFree 
                    ? 'text-white' 
                    : (isMarked ? currentDaubColor.cellText : 'text-slate-800 dark:text-white');
                    
                 return (
                   <button
                     key={`${rIdx}-${cIdx}`}
                     onClick={() => !isSpectator && !isFree && handleSpaceClick(rIdx, cIdx, cell)}
                     disabled={isSpectator}
                      className={`aspect-square rounded-xl shadow-sm flex items-center justify-center font-black transition-all border-b-4 ${bgClass} ${textClass} ${isMarked ? currentDaubColor.borderColor : 'border-slate-200 dark:border-slate-700'} ${isSpectator ? 'cursor-not-allowed opacity-90' : 'active:scale-95'}`}
                   >
                     {isFree ? (
                       <Star className="w-8 h-8 fill-yellow-300 text-yellow-500 drop-shadow-sm" />
                     ) : (
                       <span className="text-lg sm:text-2xl md:text-3xl tracking-tighter select-none">{cell}</span>
                     )}
                   </button>
                 );
               })
            )}
          </div>
        </div>
        )}

          </div>

          {/* RIGHT COLUMN: Chat and sidebar activities */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4 w-full lg:sticky lg:top-4">
            {/* Native Desktop Chat */}
            <div className="hidden lg:flex flex-col bg-white/95 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden h-[420px] w-full">
              {/* Header */}
              <div className="bg-indigo-600 dark:bg-indigo-750 px-4 py-3 flex items-center justify-between text-white border-b border-indigo-500/30">
                <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider">
                  <MessageCircle className="w-3.5 h-3.5 text-indigo-200"/>
                  <span>Chat da Sala ({messages.length})</span>
                </div>
              </div>

              {/* Messages list with much higher text contrast */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50 dark:bg-slate-950/40">
                 {messages.length === 0 ? (
                   <div className="text-center text-slate-400 dark:text-slate-500 text-xs mt-10 font-bold">Nenhuma mensagem ainda.</div>
                 ) : (
                   messages.map(msg => {
                     const isMe = msg.senderId === user.uid;
                     const isBot = msg.senderId.startsWith('bot_') || msg.senderId.includes('bot') || msg.id.startsWith('botmsg');
                     return (
                       <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className="flex items-center gap-1 mb-0.5 px-1">
                             <span className="text-[10px] font-black text-slate-900 dark:text-slate-300">{isMe ? 'Você' : msg.senderName}</span>
                             {isMe ? (
                               <span className="text-[7px] bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-extrabold tracking-wider px-1 py-0.2 rounded uppercase select-none font-black scale-90">Você</span>
                             ) : isBot ? (
                               <span className="text-[7px] bg-sky-500/15 text-sky-600 dark:text-sky-400 font-extrabold tracking-wider px-1 py-0.2 rounded uppercase select-none font-black scale-90">Bot SIM</span>
                             ) : (msg.senderId === 'admin' || msg.senderName.toLowerCase().includes('admin')) ? (
                               <span className="text-[7px] bg-red-500/15 text-red-650 dark:text-red-400 font-extrabold tracking-wider px-1 py-0.2 rounded uppercase select-none font-black scale-90">Admin</span>
                             ) : (
                               <span className="text-[7px] bg-slate-500/15 text-slate-600 dark:text-slate-400 font-extrabold tracking-wider px-1 py-0.2 rounded uppercase select-none font-black scale-90">Player</span>
                             )}
                          </div>
                          <div className={`px-3 py-1.5 rounded-2xl max-w-[85%] text-xs font-bold leading-normal ${isMe ? 'bg-indigo-650 text-white rounded-br-sm shadow-sm' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-950 dark:text-white rounded-bl-sm shadow-sm font-extrabold'}`}>
                            {msg.text}
                          </div>
                       </div>
                     );
                   })
                 )}
                 <div ref={desktopChatBottomRef} />
              </div>
              
              {/* Input form */}
              <form onSubmit={handleSendMessage} className="p-2.5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                 <input 
                   type="text" 
                   value={chatMessage}
                   onChange={e => setChatMessage(e.target.value)}
                   placeholder={isSpectator ? "Apenas jogadores podem usar o chat" : "Mensagem..."}
                   disabled={isSpectator}
                   className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-805 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                 />
                 <button 
                   type="submit" 
                   disabled={isSpectator || !chatMessage.trim()}
                   className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white w-8 h-8 rounded-xl flex items-center justify-center transition-colors active:scale-95 shrink-0 cursor-pointer"
                 >
                   <Send className="w-4 h-4"/>
                 </button>
              </form>
            </div>
          </div>

        </div>

        {/* Floating Chat Button & Card (Mobile only) */}
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none lg:hidden" onClick={(e) => e.stopPropagation()}>
          {/* Chat Window */}
          <AnimatePresence>
            {isChatOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 40, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 40, scale: 0.9 }}
                className="pointer-events-auto bg-white/95 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl w-[calc(100vw-32px)] sm:w-96 h-80 shadow-2xl flex flex-col overflow-hidden mb-4 mr-0"
              >
                {/* Header */}
                <div className="bg-indigo-600 dark:bg-indigo-750 px-4 py-2.5 flex items-center justify-between text-white border-b border-indigo-500/30">
                  <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider">
                    <MessageCircle className="w-3.5 h-3.5 text-indigo-200"/>
                    <span>Chat da Sala ({messages.length})</span>
                  </div>
                  <button 
                    onClick={() => setIsChatOpen(false)}
                    className="hover:bg-indigo-700/60 p-1.5 rounded-lg text-white font-extrabold text-[10px] transition-all cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>

                {/* Messages list */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50 dark:bg-slate-950/40">
                   {messages.length === 0 ? (
                     <div className="text-center text-slate-400 dark:text-slate-550 text-xs mt-10">Nenhuma mensagem ainda.</div>
                   ) : (
                     messages.map(msg => {
                       const isMe = msg.senderId === user.uid;
                       return (
                         <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                             <div className="flex items-center gap-1 mb-0.5 px-1">
                                <span className="text-[10px] font-black text-slate-900 dark:text-slate-300">{isMe ? 'Você' : msg.senderName}</span>
                                {isMe ? (
                                  <span className="text-[7px] bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-extrabold tracking-wider px-1 py-0.2 rounded uppercase select-none font-black scale-90">Você</span>
                                ) : (msg.senderId.startsWith('bot_') || msg.senderId.includes('bot') || msg.id.startsWith('botmsg')) ? (
                                  <span className="text-[7px] bg-sky-500/15 text-sky-600 dark:text-sky-400 font-extrabold tracking-wider px-1 py-0.2 rounded uppercase select-none font-black scale-90">Bot SIM</span>
                                ) : (msg.senderId === 'admin' || msg.senderName.toLowerCase().includes('admin')) ? (
                                  <span className="text-[7px] bg-red-500/15 text-red-650 dark:text-red-400 font-extrabold tracking-wider px-1 py-0.2 rounded uppercase select-none font-black scale-90">Admin</span>
                                ) : (
                                  <span className="text-[7px] bg-slate-500/15 text-slate-600 dark:text-slate-400 font-extrabold tracking-wider px-1 py-0.2 rounded uppercase select-none font-black scale-90">Player</span>
                                )}
                             </div>
                            <div className={`px-3 py-1.5 rounded-2xl max-w-[85%] text-xs font-bold leading-normal ${isMe ? 'bg-indigo-650 text-white rounded-br-sm shadow-sm font-bold' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-950 dark:text-white rounded-bl-sm shadow-sm font-extrabold'}`}>
                              {msg.text}
                            </div>
                         </div>
                       );
                     })
                   )}
                   <div ref={chatBottomRef} />
                </div>
                
                {/* Input form */}
                <form onSubmit={handleSendMessage} className="p-2.5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                   <input 
                     type="text" 
                     value={chatMessage}
                     onChange={e => setChatMessage(e.target.value)}
                     placeholder={isSpectator ? "Apenas jogadores podem usar o chat" : "Mensagem..."}
                     disabled={isSpectator}
                     className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-805 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                   />
                   <button 
                     type="submit" 
                     disabled={isSpectator || !chatMessage.trim()}
                     className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white w-8 h-8 rounded-xl flex items-center justify-center transition-colors active:scale-95 shrink-0 cursor-pointer"
                   >
                     <Send className="w-4 h-4"/>
                   </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Toggle Floating Action Button */}
          <button 
            disabled={isChatOpen}
            onClick={() => {
              setIsChatOpen(true);
              setTimeout(() => {
                if (chatBottomRef.current) {
                  chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
                }
              }, 120);
            }}
            className={`pointer-events-auto h-14 w-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-90 transition-all border-2 border-white dark:border-slate-800 relative cursor-pointer ${isChatOpen ? 'opacity-0 scale-50 pointer-events-none' : 'opacity-100 scale-100 shadow-indigo-600/20'}`}
            title="Chat da Sala"
          >
            <MessageCircle className="w-5 h-5 shrink-0"/>
            {messages.length > 0 && (
               <span className="absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-650 text-white font-extrabold text-[10px] w-5 h-5 flex items-center justify-center rounded-full shadow-lg border border-white dark:border-slate-900 animate-pulse">
                 {messages.length}
               </span>
            )}
          </button>
        </div>
        
        {/* Bingo Animation Overlay */}
        {/* Individual User Bingo Animation */}
        <AnimatePresence>
          {showBingoAnimation && (
             <motion.div
               initial={{ opacity: 0, scale: 0.5 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 1.5 }}
               className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
             >
                {/* Framer Motion Confetti/Stars for personal win */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {Array.from({ length: 40 }).map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ 
                        opacity: 1, 
                        scale: 0, 
                        x: 0, 
                        y: 0 
                      }}
                      animate={{ 
                        opacity: [1, 1, 0],
                        scale: [0, Math.random() * 2 + 1, 1],
                        x: (Math.random() - 0.5) * window.innerWidth,
                        y: (Math.random() - 0.5) * window.innerHeight,
                        rotate: Math.random() * 360
                      }}
                      transition={{ 
                        duration: 2 + Math.random() * 2, 
                        ease: "easeOut",
                        delay: Math.random() * 0.3
                      }}
                      className="absolute left-1/2 top-1/2 w-3 h-3 md:w-5 md:h-5 rounded-sm shadow-md"
                      style={{
                        clipPath: i % 2 === 0 ? "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)" : "none",
                        backgroundColor: i % 3 === 0 ? '#F59E0B' : (i % 3 === 1 ? '#10B981' : '#3B82F6')
                      }}
                    />
                  ))}
                </div>

                <div className="text-center rounded-3xl bg-white p-8 border-4 border-emerald-400 shadow-[0_0_50px_rgba(52,211,153,0.5)] flex flex-col items-center z-10 relative">
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
                {/* Framer Motion Confetti/Stars */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[32px]">
                  {Array.from({ length: 25 }).map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ 
                        opacity: 1, 
                        scale: 0, 
                        x: 0, 
                        y: 0 
                      }}
                      animate={{ 
                        opacity: [1, 1, 0],
                        scale: [0, Math.random() * 1.5 + 0.5, 1],
                        x: (Math.random() - 0.5) * 500,
                        y: (Math.random() - 0.5) * 500 - 100,
                        rotate: Math.random() * 360
                      }}
                      transition={{ 
                        duration: 2 + Math.random() * 2, 
                        ease: "easeOut",
                        delay: Math.random() * 0.4
                      }}
                      className="absolute left-1/2 top-1/2 w-2 h-2 md:w-3 md:h-3 rounded-sm shadow-md"
                      style={{
                        clipPath: i % 2 === 0 ? "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)" : "none",
                        backgroundColor: i % 3 === 0 ? '#F59E0B' : (i % 3 === 1 ? '#10B981' : '#3B82F6')
                      }}
                    />
                  ))}
                </div>

                {/* Crown / Trophy Floating element */}
                <motion.div 
                  initial={{ scale: 0, rotate: -180, y: 50 }}
                  animate={{ scale: [1.5, 1], rotate: 0, y: 0 }}
                  transition={{ type: "spring", damping: 12, stiffness: 100, delay: 0.1 }}
                  className="absolute -top-12 bg-amber-500 text-white p-4.5 rounded-full border-4 border-white dark:border-slate-900 shadow-xl"
                >
                  <motion.div
                    animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.5 }}
                  >
                    <Trophy className="w-8 h-8 text-white shrink-0" />
                  </motion.div>
                </motion.div>

                <motion.h2 
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: [1.2, 1], opacity: 1 }}
                  transition={{ delay: 0.2, type: "spring", damping: 10 }}
                  className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-yellow-400 uppercase tracking-widest mt-6 filter drop-shadow z-10 relative"
                >
                  BINGO!
                </motion.h2>
                
                <p className="text-xs sm:text-sm font-extrabold text-slate-500 dark:text-slate-400 mt-2 uppercase tracking-wide z-10 relative">
                  Temos Ganhadores na Rodada!
                </p>

                <div className="mt-6 flex flex-col gap-3 w-full max-h-[40vh] overflow-y-auto scrollbar-none">
                  {(playersList || []).filter(p => isCardWinner(p.card, drawnNumbers, gameMode)).map((winner, index) => {
                    const matchedParticipant = participants.find(part => part.uid === winner.id);
                    const isMe = winner.id === user.uid;
                    const avatarUrl = matchedParticipant?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + winner.name;
                    
                    return (
                      <motion.div 
                        key={winner.id}
                        initial={{ opacity: 0, x: -50, scale: 0.8 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        transition={{ delay: 0.3 + index * 0.15, type: "spring", damping: 15 }}
                        whileHover={{ scale: 1.02 }}
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

        {/* 🎲 4 Bolas ou Dobra Prompt Overlays */}
        <AnimatePresence>
          {room && room.gameMode === "four_balls_double" && (
            <>
              {/* Prompt stage 1 (30 balls) when user has not yet decided */}
              {room.doubleStage === 1 && myDoubleStatus === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 text-center"
                >
                  <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="bg-white dark:bg-slate-900 border-4 border-amber-500 rounded-3xl p-6 shadow-2xl max-w-md w-full relative"
                  >
                    <div className="absolute top-4 right-4 bg-amber-500 text-white font-extrabold px-3 py-1.5 rounded-lg text-sm animate-pulse">
                      ⏳ {doubleTimeLeft}s
                    </div>
                    <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950/40 rounded-full flex items-center justify-center mb-4 mx-auto text-amber-500">
                      <AlertTriangle className="w-10 h-10 animate-bounce" />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2 uppercase">
                      ⚠️ SOLICITAÇÃO DE DOBRA!
                    </h3>
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                      O sorteio atingiu {room.fourBallsStage1Limit || 30} bolas e não houve vencedor! Você quer aceitar a dobra por{" "}
                      <span className="text-amber-500">R$ {room.entryFee} moedas</span> para continuar com o sorteio de mais {(room.fourBallsStage2Limit || 42) - (room.fourBallsStage1Limit || 30)} bolas adicionais? Se recusar, você sairá da disputa.
                    </p>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => setConfirmAction({ type: "accept", stage: 1 })}
                        className="w-full bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-extrabold py-3.5 rounded-xl text-xs sm:text-sm tracking-wider uppercase shadow-md transition-all flex items-center justify-center gap-2"
                      >
                        <Coins className="w-4 h-4 text-amber-100 fill-amber-100 shrink-0" />
                        Pagar e Continuar (R$ {room.entryFee} Moedas)
                      </button>
                      <button
                        onClick={() => setConfirmAction({ type: "refuse", stage: 1 })}
                        className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-350 font-bold py-2.5 rounded-xl text-xs tracking-wider uppercase transition-colors"
                      >
                        Recusar e Ver como Espectador
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {/* Prompt stage 3 (42 balls) when user has decided Stage 1, but has not yet decided Stage 3 */}
              {room.doubleStage === 3 && myDoubleStatus === 1 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 text-center"
                >
                  <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="bg-white dark:bg-slate-900 border-4 border-emerald-500 rounded-3xl p-6 shadow-2xl max-w-md w-full relative"
                  >
                    <div className="absolute top-4 right-4 bg-emerald-500 text-white font-extrabold px-3 py-1.5 rounded-lg text-sm animate-pulse">
                      ⏳ {doubleTimeLeft}s
                    </div>
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/40 rounded-full flex items-center justify-center mb-4 mx-auto text-emerald-500">
                      <Sparkles className="w-10 h-10 animate-spin" />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2 uppercase text-emerald-600 dark:text-emerald-400">
                      ⚡ ÚLTIMA RODADA - DOBRA!
                    </h3>
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                      A rodada extra de {(room.fourBallsStage2Limit || 42) - (room.fourBallsStage1Limit || 30)} bolas terminou sem ganhadores! Deseja pagar mais uma dobra de{" "}
                      <span className="text-emerald-500">R$ {room.entryFee} moedas</span> para habilitar as últimas {(room.fourBallsStage3Limit || 50) - (room.fourBallsStage2Limit || 42)} bolas finais do sorteio decisivo?
                    </p>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => setConfirmAction({ type: "accept", stage: 2 })}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-extrabold py-3.5 rounded-xl text-xs sm:text-sm tracking-wider uppercase shadow-md transition-all flex items-center justify-center gap-2"
                      >
                        <Coins className="w-4 h-4 text-emerald-100 fill-emerald-100 shrink-0" />
                        Pagar Dobra Final (R$ {room.entryFee} Moedas)
                      </button>
                      <button
                        onClick={() => setConfirmAction({ type: "refuse", stage: 2 })}
                        className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-350 font-bold py-2.5 rounded-xl text-xs tracking-wider uppercase transition-colors"
                      >
                        Recusar e Ver como Espectador
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {/* Pop-up de Confirmação customizado para Aceitar ou Recusar a dobra */}
              <AnimatePresence>
                {confirmAction && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 text-center"
                  >
                    <motion.div
                      initial={{ scale: 0.9, y: 15 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0.9, y: 15 }}
                      className="bg-white dark:bg-slate-900 border-4 border-indigo-500 rounded-3xl p-6 shadow-2xl max-w-sm w-full relative"
                    >
                      {confirmAction.type === "accept" ? (
                        <>
                          <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/40 rounded-full flex items-center justify-center mb-4 mx-auto text-amber-500 border border-amber-300">
                            <Coins className="w-10 h-10 animate-pulse fill-amber-300" />
                          </div>
                          <h3 className="text-lg font-black text-slate-800 dark:text-white mb-2 uppercase text-indigo-600 dark:text-indigo-400">
                            👛 Confirmar Dobra?
                          </h3>
                          <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                            Deseja autorizar o débito de{" "}
                            <span className="text-amber-500 font-extrabold">R$ {room.entryFee} moedas</span> do seu saldo para continuar jogando? Seu saldo atual é de R$ {user.coins} moedas.
                          </p>
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => handleAcceptDouble(confirmAction.stage || 1)}
                              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white font-extrabold py-3.5 rounded-xl text-xs sm:text-sm tracking-wider uppercase shadow-lg transition-all"
                            >
                              Sim, Pagar e Continuar
                            </button>
                            <button
                              onClick={() => setConfirmAction(null)}
                              className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 font-bold py-2.5 rounded-xl text-xs tracking-wider uppercase transition-colors"
                            >
                              Não, Voltar
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/45 rounded-full flex items-center justify-center mb-4 mx-auto text-rose-500 border border-rose-300">
                            <AlertTriangle className="w-10 h-10 animate-bounce" />
                          </div>
                          <h3 className="text-lg font-black text-slate-800 dark:text-white mb-2 uppercase text-rose-600 dark:text-rose-400">
                            ❌ Desistir da Rodada?
                          </h3>
                          <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 leading-relaxed mb-6 text-rose-650 dark:text-rose-350">
                            Atenção! Ao recusar a dobra você será <span className="underline font-black">ELIMINADO</span> permanentemente desta sala e só poderá assistir ao restante do sorteio como espectador. Tem certeza?
                          </p>
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={handleRefuseDouble}
                              className="w-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-extrabold py-3.5 rounded-xl text-xs sm:text-sm tracking-wider uppercase shadow-lg transition-all"
                            >
                              Sim, Desistir
                            </button>
                            <button
                              onClick={() => setConfirmAction(null)}
                              className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-250 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-350 font-bold py-2.5 rounded-xl text-xs tracking-wider uppercase transition-colors"
                            >
                              Não, Continuar
                            </button>
                          </div>
                        </>
                      )}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Informational overlay for Spectating because user declined */}
              {myDoubleStatus === -1 && room.status === "active" && (
                <div className="fixed bottom-6 left-6 z-40 bg-slate-900/90 dark:bg-slate-950/95 text-white px-4 py-3 rounded-2xl border border-slate-700/60 shadow-lg text-xs font-bold pointer-events-none max-w-xs leading-relaxed animate-bounce duration-1000">
                  🍿 Modo Espectador Ativo! Como você recusou a dobra, o sorteio continua para quem aceitou. Divirta-se assistindo!
                </div>
              )}
            </>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
