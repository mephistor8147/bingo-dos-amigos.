import React, { useState, useEffect } from 'react';
import { AppState, Room, BingoCardData, GameMode } from './types';
import { AdminRooms } from './components/AdminRooms';
import { PlayerLobby } from './components/PlayerLobby';
import { PlayerMobileView } from './components/PlayerMobileView';
import { Dashboard } from './components/Dashboard';
import { AuthScreen } from './components/AuthScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { AdminUsers } from './components/AdminUsers';
import { Toaster, toast } from 'react-hot-toast';
import { Moon, Sun, LogOut } from 'lucide-react';
import { generateBingoCard, isCardWinner, serializeGrid, deserializeGrid } from './utils';

export default function App() {
  const [appState, setAppState] = useState<AppState & { showAuth?: boolean }>(() => {
    let savedSettings = { soundEnabled: true, notificationsEnabled: true, darkMode: false };
    try {
      const saved = localStorage.getItem('bingo_live_settings');
      if (saved) {
        savedSettings = JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    return {
      view: 'home',
      rooms: [],
      currentRoomId: null,
      currentUser: null,
      showAuth: false,
      settings: savedSettings
    };
  });

  const [adminTab, setAdminTab] = useState<'rooms' | 'users'>('rooms');

  useEffect(() => {
    if (appState.settings) {
      localStorage.setItem('bingo_live_settings', JSON.stringify(appState.settings));
      
      const isDark = appState.settings.darkMode;
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [appState.settings]);

  // Restaura sessão do Firebase Auth automaticamente
  useEffect(() => {
    let unsubPromise = (async () => {
      const { onAuthStateChanged } = await import('firebase/auth');
      const { getDoc, doc } = await import('firebase/firestore');
      const { auth, db } = await import('./lib/firebase');

      return onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          try {
            const userSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
            if (userSnap.exists()) {
              const userData = userSnap.data();
              setAppState(prev => {
                const isHome = prev.view === 'home';
                return {
                  ...prev,
                  currentUser: userData as any,
                  view: isHome ? (userData.role === 'admin' ? 'admin' : 'player_lobby') : prev.view,
                  showAuth: false
                };
              });
            }
          } catch (err) {
            console.error("Error automatic session retrieve:", err);
          }
        }
      });
    })();

    return () => {
      unsubPromise.then(unsub => {
        if (typeof unsub === 'function') unsub();
      });
    };
  }, []);

  const handleLogout = async () => {
    try {
      const { auth } = await import('./lib/firebase');
      const { signOut } = await import('firebase/auth');
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
    setAppState(prev => ({
      ...prev,
      view: 'home',
      currentUser: null,
      currentRoomId: null
    }));
    toast.success('Sessão encerrada.');
  };

  const handleUpdateProfilePhoto = async (photoURL: string) => {
    if (!appState.currentUser) return;
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('./lib/firebase');
      
      const userRef = doc(db, 'users', appState.currentUser.uid);
      await updateDoc(userRef, { photoURL });
      
      setAppState(prev => ({
        ...prev,
        currentUser: prev.currentUser ? { ...prev.currentUser, photoURL } : null
      }));
      toast.success('Foto do perfil atualizada com sucesso!');
    } catch (e: any) {
      console.error(e);
      setAppState(prev => ({
        ...prev,
        currentUser: prev.currentUser ? { ...prev.currentUser, photoURL } : null
      }));
      toast.success('Foto atualizada com sucesso localmente.');
    }
  };

  const handleLoginSuccess = (user: any, role: 'admin' | 'player') => {
    toast.success(`Bem-vindo, ${user.name}!`);
    setAppState(prev => ({
      ...prev,
      currentUser: user,
      view: role === 'admin' ? 'admin' : 'player_lobby',
      showAuth: false
    }));
  };

  const handleCreateRoom = (partialRoom: Partial<Room>) => {
    const newRoom: Room = {
      id: Math.random().toString(36).substring(2, 9),
      name: partialRoom.name!,
      entryFee: partialRoom.entryFee!,
      scheduledTime: partialRoom.scheduledTime!,
      maxPlayers: partialRoom.maxPlayers!,
      status: 'waiting',
      drawnNumbers: [],
      players: [],
      messages: [],
      gameMode: partialRoom.gameMode,
      prize: partialRoom.prize,
      bgMusicUrl: partialRoom.bgMusicUrl,
      onlineRadioUrl: partialRoom.onlineRadioUrl
    };
    setAppState(prev => ({ ...prev, rooms: [...prev.rooms, newRoom] }));
    toast.success('Sala criada com sucesso!');
  };

  const handleJoinRoom = async (roomId: string, card: BingoCardData) => {
    if (!appState.currentUser) return;
    const room = appState.rooms.find(r => r.id === roomId);
    if (!room) {
      toast.error('Sala não encontrada.');
      return;
    }
    if (appState.currentUser.coins < room.entryFee) {
      toast.error('Saldo insuficiente.');
      return;
    }

    try {
      const { doc, setDoc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('./lib/firebase');
      
      const userRef = doc(db, 'users', appState.currentUser.uid);
      const newCoins = appState.currentUser.coins - room.entryFee;
      
      // Update coins
      await updateDoc(userRef, { coins: newCoins });
      
      // Add player to the room in Firestore
      await setDoc(doc(db, 'rooms', roomId, 'players', appState.currentUser.uid), {
        name: appState.currentUser.name,
        card: {
          id: card.id,
          playerName: card.playerName,
          grid: serializeGrid(card.grid)
        }
      });
      
      setAppState(prev => {
        return {
          ...prev,
          currentUser: prev.currentUser ? {
            ...prev.currentUser,
            coins: newCoins
          } : null
        };
      });
      
      toast.success('Você entrou na sala! Boa sorte! 🎟️');
    } catch (e) {
      console.error("Error joining room:", e);
      toast.error('Erro ao entrar na sala. Tente novamente.');
    }
  };

  const handleDrawNumberAdmin = (roomId: string, num: number) => {
    setAppState(prev => ({
      ...prev,
      rooms: prev.rooms.map(r => r.id === roomId ? { ...r, drawnNumbers: [...r.drawnNumbers, num] } : r)
    }));
  };
  
  const handleResetGameAdmin = (roomId: string) => {
    setAppState(prev => ({
      ...prev,
      rooms: prev.rooms.map(r => r.id === roomId ? { ...r, drawnNumbers: [] } : r)
    }));
  };

  const handleDeleteRoom = async (roomId: string) => {
    try {
      const { doc, deleteDoc } = await import('firebase/firestore');
      const { db } = await import('./lib/firebase');
      await deleteDoc(doc(db, 'rooms', roomId));
    } catch (e) {
      console.error("Error deleting room from Firestore:", e);
    }
    setAppState(prev => ({
      ...prev,
      rooms: prev.rooms.filter(r => r.id !== roomId)
    }));
    toast.success('Sala excluída.');
  };

  const handleSendMessage = (roomId: string, text: string) => {
    setAppState(prev => ({
      ...prev,
      rooms: prev.rooms.map(r => {
        if (r.id === roomId) {
          const newMessage = {
            id: Math.random().toString(36).substring(2, 9),
            senderId: prev.currentUser!.uid,
            senderName: prev.currentUser!.name,
            text,
            timestamp: Date.now()
          };
          return { ...r, messages: [...r.messages, newMessage] };
        }
        return r;
      })
    }));
  };

  const [isAdminAutoDraw, setIsAdminAutoDraw] = useState(false);
  const [isAdminSpeechEnabled, setIsAdminSpeechEnabled] = useState(true);
  const [adminVoiceGender, setAdminVoiceGender] = useState<'female' | 'male'>('female');

  // 🤖 Criação Automática de Salas & Bots Real-time Sync
  const [autoRoomEnabled, setAutoRoomEnabled] = useState(false);
  const [autoRoomInterval, setAutoRoomInterval] = useState(5);
  const [processedRooms, setProcessedRooms] = useState<Set<string>>(new Set());
  const [scheduledDeletions, setScheduledDeletions] = useState<Set<string>>(new Set());

  // Sincronizar Configuração Global via Firestore
  useEffect(() => {
    if (!appState.currentUser) return;
    let unsub: () => void = () => {};
    const initAutomationSync = async () => {
      try {
        const { doc, onSnapshot } = await import('firebase/firestore');
        const { db } = await import('./lib/firebase');
        
        unsub = onSnapshot(doc(db, 'settings', 'global_automation'), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setAutoRoomEnabled(data.enabled ?? false);
            setAutoRoomInterval(data.intervalMinutes ?? 5);
          }
        });
      } catch (err) {
        console.warn("Firestore settings: using local state fallback.");
      }
    };
    initAutomationSync();
    return () => unsub();
  }, [appState.currentUser]);

  const handleToggleAutoRoomEnabled = async () => {
    const newVal = !autoRoomEnabled;
    setAutoRoomEnabled(newVal);
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('./lib/firebase');
      await setDoc(doc(db, 'settings', 'global_automation'), {
        enabled: newVal,
        intervalMinutes: autoRoomInterval
      }, { merge: true });
      toast.success(newVal ? 'Criação automática ativada!' : 'Criação automática desativada!');
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateAutoRoomInterval = async (val: number) => {
    setAutoRoomInterval(val);
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('./lib/firebase');
      await setDoc(doc(db, 'settings', 'global_automation'), {
        enabled: autoRoomEnabled,
        intervalMinutes: val
      }, { merge: true });
      toast.success(`Intervalo atualizado para ${val} min!`);
    } catch (e) {
      console.error(e);
    }
  };

  // Criação automática de salas: se ativado, agenda uma nova se não houver nenhuma agendada
  const triggerAutoRoomCreation = async () => {
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('./lib/firebase');
      
      const newRoomId = 'auto_' + Math.random().toString(36).substring(2, 9);
      const scheduledTime = Date.now() + autoRoomInterval * 60 * 1000;
      
      const roomPayload = {
        name: `Sala Automática ⚡`,
        entryFee: 40,
        prize: 400,
        scheduledTime,
        maxPlayers: 10,
        status: 'waiting',
        drawnNumbers: [],
        gameMode: 'full_card',
        botsEnabled: true,
        maxBots: 2,
        isAutoCreated: true
      };
      
      await setDoc(doc(db, 'rooms', newRoomId), roomPayload);
      
      // Adicionar 2 bots na coleção de players
      const botNames = ["Bot Arthur", "Bot Daiane", "Bot Camila", "Bot Sandra", "Bot Renato"];
      const shuffled = [...botNames].sort(() => 0.5 - Math.random());
      
      for (let i = 0; i < 2; i++) {
        const botId = `bot_auto_${Math.random().toString(36).substring(2, 9)}`;
        const botCard = generateBingoCard(botId, shuffled[i]);
        await setDoc(doc(db, 'rooms', newRoomId, 'players', botId), {
          name: shuffled[i],
          card: {
            id: botCard.id,
            playerName: botCard.playerName,
            grid: serializeGrid(botCard.grid)
          }
        });
      }
      
      console.log("Automatic Scheduled Room created.");
    } catch (e) {
      console.error("Auto room creator failure:", e);
    }
  };

  // Background Auto Room Scheduled loop
  useEffect(() => {
    if (!autoRoomEnabled) return;
    
    const interval = setInterval(() => {
      const autoRooms = appState.rooms.filter(r => r.isAutoCreated);
      const totalActiveAutoRooms = autoRooms.filter(r => r.status === 'waiting' || r.status === 'active').length;
      const hasUpcomingAutoRoom = autoRooms.some(r => r.status === 'waiting');
      
      if (!hasUpcomingAutoRoom && totalActiveAutoRooms < 3 && appState.rooms.length > 0) {
        triggerAutoRoomCreation();
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, [autoRoomEnabled, appState.rooms, autoRoomInterval]);

  // Monitoramento e auto-exclusão de salas com ganhador ou última bola sorteada após 30 segundos
  useEffect(() => {
    appState.rooms.forEach(room => {
      if (room.isAutoCreated && !scheduledDeletions.has(room.id)) {
        const winners = room.players.filter(p => isCardWinner(p.card, room.drawnNumbers, room.gameMode || 'full_card'));
        const hasWinner = winners.length > 0;
        const reachedLastBall = room.drawnNumbers.length >= 75;
        const isFinished = room.status === 'finished';

        if (isFinished || hasWinner || reachedLastBall) {
          setScheduledDeletions(prev => {
            const next = new Set(prev);
            next.add(room.id);
            return next;
          });

          console.log(`[Auto Delete] Sorteio finalizado ou ganhador identificado na sala ${room.id}. Excluindo em 30 segundos...`);
          setTimeout(async () => {
            try {
              const { doc, deleteDoc } = await import('firebase/firestore');
              const { db } = await import('./lib/firebase');
              await deleteDoc(doc(db, 'rooms', room.id));
              console.log(`[Auto Delete] Sala ${room.id} excluída do Firestore com sucesso.`);
            } catch (e) {
              console.error(`[Auto Delete] Erro ao excluir sala ${room.id} do Firestore:`, e);
            }

            setAppState(prev => ({
              ...prev,
              rooms: prev.rooms.filter(r => r.id !== room.id)
            }));
          }, 30000);
        }
      }
    });
  }, [appState.rooms, scheduledDeletions]);

  // Background Interactive Bots Chat Commentary Simulation
  useEffect(() => {
    const activeRoom = appState.rooms.find(r => r.id === appState.currentRoomId);
    if (!activeRoom || activeRoom.status !== 'active') return;
    
    const botPlayers = activeRoom.players.filter(p => p.id.startsWith('bot_') || p.id.includes('bot'));
    if (botPlayers.length === 0) return;
    
    const chatTick = setInterval(async () => {
      if (Math.random() > 0.4) return;
      
      const randomBot = botPlayers[Math.floor(Math.random() * botPlayers.length)];
      const commentaries = [
        "Falta só um pra mim! 😱",
        "Pede B-12! Só vem!",
        "Esse prêmio já é meu, kkkk",
        "Nossa, to longe de ganhar ainda rs",
        "Boa sorte galera! Bingo tá emocionante!",
        "Agora vai! Marquei agora!",
        "Mais alguém na boa?",
        "BINGO tá vindo!!! 🔥",
        "Quase marquei essa de agora!!! 😂",
        "Vem número bom pfv!!!",
        "Vambora bingo!!! 🔥"
      ];
      
      if (activeRoom.drawnNumbers.length > 25) {
        commentaries.push("Meu Deus, o coração tá batendo forte!");
        commentaries.push("Ta quase de sair o ganhador!!!");
      }
      
      const messageText = commentaries[Math.floor(Math.random() * commentaries.length)];
      
      try {
        const { doc, setDoc } = await import('firebase/firestore');
        const { db } = await import('./lib/firebase');
        
        const messageId = `botmsg_${Math.random().toString(36).substring(2, 9)}`;
        await setDoc(doc(db, 'rooms', activeRoom.id, 'messages', messageId), {
          senderId: randomBot.id,
          senderName: randomBot.name,
          text: messageText,
          timestamp: Date.now()
        });
      } catch (err) {
        console.error("Bot chat message error:", err);
      }
    }, 15000);
    
    return () => clearInterval(chatTick);
  }, [appState.currentRoomId, appState.rooms]);

  // Sincronizar salas via onSnapshot em tempo real
  useEffect(() => {
    if (!appState.currentUser) return;
    let unsubRooms: () => void = () => {};
    const initRoomsRealtimeSync = async () => {
      try {
        const { collection, onSnapshot } = await import('firebase/firestore');
        const { db } = await import('./lib/firebase');
        
        unsubRooms = onSnapshot(collection(db, 'rooms'), (snap) => {
          const roomsList: Room[] = [];
          
          snap.forEach(docSnap => {
            const data = docSnap.data();
            roomsList.push({
              id: docSnap.id,
              name: data.name,
              scheduledTime: data.scheduledTime,
              entryFee: data.entryFee,
              maxPlayers: data.maxPlayers || 10,
              status: data.status,
              drawnNumbers: data.drawnNumbers || [],
              players: [], // Synced live per room below
              messages: [], // Synced live per room below
              gameMode: data.gameMode || 'full_card',
              prize: data.prize || 100,
              bgMusicUrl: data.bgMusicUrl,
              onlineRadioUrl: data.onlineRadioUrl,
              botsEnabled: data.botsEnabled || false,
              maxBots: data.maxBots || 0,
              isAutoCreated: data.isAutoCreated || false
            } as any);
          });
          
          setAppState(prev => ({
            ...prev,
            rooms: roomsList
          }));
        });
      } catch (err) {
        console.log("Real-time rooms listener error:", err);
      }
    };
    initRoomsRealtimeSync();
    return () => unsubRooms();
  }, [appState.currentUser]);

  // Sincronizar jogadores e chat em tempo real da sala de jogo atual
  useEffect(() => {
    if (!appState.currentRoomId) return;
    
    let unsubPlayers: () => void = () => {};
    let unsubMessages: () => void = () => {};
    
    const initSubcollectionsSync = async () => {
      try {
        const { collection, onSnapshot, query, orderBy } = await import('firebase/firestore');
        const { db } = await import('./lib/firebase');
        
        const rId = appState.currentRoomId!;
        
        unsubPlayers = onSnapshot(collection(db, 'rooms', rId, 'players'), (snap) => {
          const fetchedPlayers: any[] = [];
          snap.forEach(pSnap => {
            const d = pSnap.data();
            const rawCard = d.card;
            let finalCard = rawCard;
            if (rawCard && Array.isArray(rawCard.grid)) {
              const firstRow = rawCard.grid[0];
              if (firstRow && !Array.isArray(firstRow) && typeof firstRow === 'object') {
                finalCard = {
                  ...rawCard,
                  grid: deserializeGrid(rawCard.grid)
                };
              }
            }
            fetchedPlayers.push({
              id: pSnap.id,
              name: d.name,
              card: finalCard
            });
          });
          
          setAppState(prev => {
            const newRooms = prev.rooms.map(r => {
              if (r.id === rId) {
                return { ...r, players: fetchedPlayers };
              }
              return r;
            });
            return { ...prev, rooms: newRooms };
          });
        });

        unsubMessages = onSnapshot(
          query(collection(db, 'rooms', rId, 'messages'), orderBy('timestamp', 'asc')),
          (snap) => {
            const fetchedMsgs: any[] = [];
            snap.forEach(mSnap => {
              const d = mSnap.data();
              fetchedMsgs.push({
                id: mSnap.id,
                senderId: d.senderId,
                senderName: d.senderName,
                text: d.text,
                timestamp: d.timestamp
              });
            });
            
            setAppState(prev => {
              const newRooms = prev.rooms.map(r => {
                if (r.id === rId) {
                  return { ...r, messages: fetchedMsgs };
                }
                return r;
              });
              return { ...prev, rooms: newRooms };
            });
          }
        );
      } catch (err) {
        console.error("Subcollections sync failure:", err);
      }
    };
    
    initSubcollectionsSync();
    
    return () => {
      unsubPlayers();
      unsubMessages();
    };
  }, [appState.currentRoomId]);

  // Listen to completed games and process winner rewards
  useEffect(() => {
    if (!appState.currentUser) return;
    
    const finishedRoom = appState.rooms.find(
      r => r.id === appState.currentRoomId && r.status === 'finished'
    );
    
    if (finishedRoom && !processedRooms.has(finishedRoom.id)) {
      setProcessedRooms(prev => {
        const next = new Set(prev);
        next.add(finishedRoom.id);
        return next;
      });

      const winners = finishedRoom.players.filter(p => isCardWinner(p.card, finishedRoom.drawnNumbers, finishedRoom.gameMode || 'full_card'));
      const isUserWinner = winners.some(w => w.id === appState.currentUser!.uid);
      const sharePrize = finishedRoom.prize && winners.length > 0 
        ? Math.floor(finishedRoom.prize / winners.length) 
        : 0;

      if (isUserWinner && sharePrize > 0) {
        const creditAward = async () => {
          try {
            const { doc, getDoc, updateDoc } = await import('firebase/firestore');
            const { db } = await import('./lib/firebase');
            
            const userRef = doc(db, 'users', appState.currentUser!.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const currentCoins = userSnap.data().coins || 0;
              await updateDoc(userRef, {
                coins: currentCoins + sharePrize
              });
              
              setAppState(prev => ({
                ...prev,
                currentUser: prev.currentUser ? {
                  ...prev.currentUser,
                  coins: currentCoins + sharePrize
                } : null
              }));
              
              toast.success(`🎉 BINGO! Você faturou ${sharePrize} moedas! 🏆`, { duration: 8000 });
            }
          } catch (e) {
            console.error("Error crediting winners:", e);
          }
        };
        creditAward();
      } else {
        if (winners.length > 0) {
          const winnerNames = winners.map(w => w.name).join(', ');
          toast.success(`Rodada finalizada! Ganhador(es): ${winnerNames}`, { duration: 6000 });
        } else {
          toast.success(`Rodada terminada. Retornando ao lobby...`, { duration: 4000 });
        }
      }

      setTimeout(() => {
        setAppState(prev => ({
          ...prev,
          view: 'player_lobby',
          currentRoomId: null
        }));
      }, 5000);
    }
  }, [appState.rooms, appState.currentRoomId, appState.currentUser, processedRooms]);

  useEffect(() => {
    const clockStatus = setInterval(() => {
      setAppState(prev => {
         let changed = false;
         const newRooms = prev.rooms.map(r => {
            if (r.status === 'waiting' && Date.now() >= r.scheduledTime) {
               changed = true;
               return { ...r, status: 'active' as const };
            }
            return r;
         });
         return changed ? { ...prev, rooms: newRooms } : prev;
      });
    }, 1000);
    return () => clearInterval(clockStatus);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    interval = setInterval(() => {
      setAppState(prev => {
        let changed = false;
        let nextCurrentUser = prev.currentUser;
        let nextView = prev.view;
        let nextCurrentRoomId = prev.currentRoomId;
        
        const newRooms = prev.rooms.map(room => {
          if (room.status === 'active') {
            const winners = room.players.filter(p => isCardWinner(p.card, room.drawnNumbers, room.gameMode));
            
            if (winners.length > 0 || room.drawnNumbers.length >= 75) {
              changed = true;
              if (winners.length > 0 && nextCurrentUser && room.prize) {
                  const isUserWinner = winners.some(w => w.id === nextCurrentUser!.uid);
                  if (isUserWinner) {
                      nextCurrentUser = {
                          ...nextCurrentUser,
                          coins: nextCurrentUser.coins + Math.floor(room.prize / winners.length)
                      };
                  }
              }

              // Check if the current user is active inside this room that just ended
              if (prev.currentRoomId === room.id) {
                nextView = 'player_lobby';
                nextCurrentRoomId = null;

                if (winners.length > 0) {
                  const speakerNames = winners.map(w => w.name).join(', ');
                  setTimeout(() => {
                    toast.success(`🎉 Bingo! Ganhador(es): ${speakerNames}!`, { duration: 6000 });
                  }, 150);
                } else {
                  setTimeout(() => {
                    toast.success(`Partida finalizada! Retornando ao lobby.`, { duration: 4000 });
                  }, 150);
                }
              }

              return { ...room, status: 'finished' as const };
            }
            
            let available = Array.from({length: 75}, (_, i) => i + 1).filter(n => !room.drawnNumbers.includes(n));
            if (available.length > 0) {
              changed = true;
              return { ...room, drawnNumbers: [...room.drawnNumbers, available[Math.floor(Math.random() * available.length)]] };
            }
          }
          return room;
        });

        if (changed) {
          return { 
            ...prev, 
            rooms: newRooms, 
            currentUser: nextCurrentUser, 
            view: nextView, 
            currentRoomId: nextCurrentRoomId 
          };
        }
        return prev;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  if (appState.showAuth) {
    return (
      <>
        <Toaster position="top-center" />
        <AuthScreen 
          onLoginSuccess={handleLoginSuccess}
          onGoBack={() => setAppState(prev => ({ ...prev, showAuth: false }))}
        />
      </>
    );
  }

  if (appState.view === 'home') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 transition-colors">
         <Toaster position="top-center" />
         <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-xl p-8 text-center space-y-6 transition-colors">
            <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">Bingo<span className="text-emerald-500">Live</span></h1>
            <p className="text-slate-500 dark:text-slate-450 font-medium">Faça login para continuar</p>
            <div className="grid grid-cols-1 gap-4 pt-4">
              <button 
                onClick={() => setAppState(prev => ({ ...prev, showAuth: true }))} 
                className="bg-emerald-500 hover:bg-emerald-600 text-white p-5 rounded-2xl font-bold text-lg transition-transform active:scale-95 shadow-lg shadow-emerald-500/20"
              >
                Acessar Plataforma
              </button>
            </div>
         </div>
      </div>
    );
  }

  if (appState.view === 'admin') {
     return (
       <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors flex flex-col">
         <Toaster position="top-center" />
         {/* Beautiful Responsive Unified Admin Header Card */}
         <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-850 shadow-sm transition-colors sticky top-0 z-50">
           <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 sm:py-0 sm:h-16 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
             {/* Logo / Brand */}
             <div className="flex items-center gap-2">
               <span className="font-extrabold text-lg md:text-xl text-slate-800 dark:text-white tracking-tight shrink-0">Admin<span className="text-emerald-500">Bingo</span></span>
             </div>

             {/* Tab Navigation Controls */}
             <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-800/85 w-full sm:w-auto">
               <button 
                 onClick={() => setAdminTab('rooms')}
                 className={`px-3 md:px-4 py-1.5 rounded-xl font-bold text-xs transition-all ${
                   adminTab === 'rooms' 
                     ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                     : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                 }`}
               >
                 Salas do Bingo
               </button>
               <button 
                 onClick={() => setAdminTab('users')}
                 className={`px-3 md:px-4 py-1.5 rounded-xl font-bold text-xs transition-all ${
                   adminTab === 'users' 
                     ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                     : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                 }`}
               >
                 Gerenciar Usuários
                </button>
                <button 
                  onClick={() => setAppState(prev => ({ ...prev, view: 'player_lobby' }))}
                  className="px-3 md:px-4 py-1.5 rounded-xl font-bold text-xs text-amber-600 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-1 shrink-0"
                >
                  Ver Salas (Jogador)
                </button>
              </div>

             {/* Action triggers */}
             <div className="flex items-center gap-2">
               {/* Dark mode button directly on header for easy toggling! */}
               <button 
                 onClick={() => {
                   const isDark = appState.settings?.darkMode;
                   setAppState(prev => ({
                     ...prev,
                     settings: {
                       ...prev.settings,
                       darkMode: !isDark
                     }
                   }));
                 }}
                 title="Alternar Tema"
                 className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
               >
                 {appState.settings?.darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
               </button>

               <button 
                 onClick={handleLogout}
                 className="bg-red-50 hover:bg-red-100 dark:bg-red-950/30 text-red-650 dark:text-red-400 border border-red-100 dark:border-red-900 font-extrabold text-xs px-2.5 md:px-3 text-xs h-9 rounded-xl transition-all flex items-center gap-1"
               >
                 <LogOut className="w-3.5 h-3.5" />
                 <span className="hidden sm:inline">Sair</span>
               </button>
             </div>
           </div>
         </header>

         <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 pb-20">
           {adminTab === 'rooms' ? (
              appState.currentRoomId ? (
                (() => {
                  const room = appState.rooms.find(r => r.id === appState.currentRoomId);
                  if (!room) {
                    setAppState(prev => ({ ...prev, currentRoomId: null }));
                    return null;
                  }
                  return (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 border border-slate-200/50 dark:border-slate-800 rounded-3xl shadow-sm mb-2 transition-colors">
                        <div className="flex items-center gap-3">
                          <button onClick={() => setAppState(prev => ({ ...prev, currentRoomId: null }))} className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-extrabold px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs transition-colors border border-slate-200/40 dark:border-slate-700">← Voltar</button>
                          <h2 className="font-extrabold text-slate-850 dark:text-slate-100 text-sm md:text-base">{room.name} — Painel Sorteio Ativo</h2>
                        </div>
                        <div className="text-xs font-bold text-slate-400 dark:text-slate-500">
                          {room.players.length} participante(s) ativo(s)
                        </div>
                      </div>
                      <Dashboard 
                        gameState={{ drawnNumbers: room.drawnNumbers, cards: [], isGameActive: room.drawnNumbers.length > 0 }}
                        isAutoDraw={isAdminAutoDraw}
                        isSpeechEnabled={isAdminSpeechEnabled}
                        voiceGender={adminVoiceGender}
                        bgMusicUrl={room.bgMusicUrl}
                        onToggleAutoDraw={() => {
                          setAppState(prev => ({
                             ...prev,
                             rooms: prev.rooms.map(r => r.id === room.id ? { ...r, status: r.status === 'active' ? 'waiting' : 'active' } : r)
                          }));
                          setIsAdminAutoDraw(room.status !== 'active');
                        }}
                        onToggleSpeech={() => setIsAdminSpeechEnabled(prev => !prev)}
                        onToggleVoiceGender={() => setAdminVoiceGender(prev => prev === 'female' ? 'male' : 'female')}
                        onDrawNumber={() => {
                          let available = Array.from({length: 75}, (_, i) => i + 1).filter(n => !room.drawnNumbers.includes(n));
                          if (available.length > 0) handleDrawNumberAdmin(room.id, available[Math.floor(Math.random() * available.length)]);
                        }}
                        onResetGame={() => {
                          handleResetGameAdmin(room.id);
                          setIsAdminAutoDraw(false);
                        }}
                      />
                    </div>
                  );
                })()
              ) : (
                <AdminRooms 
                  rooms={appState.rooms} 
                  onCreateRoom={handleCreateRoom} 
                  onEnterRoom={(id) => setAppState(prev => ({ ...prev, currentRoomId: id }))} 
                  onDeleteRoom={handleDeleteRoom}
                  autoRoomEnabled={autoRoomEnabled}
                  autoRoomInterval={autoRoomInterval}
                  onToggleAutoRoomEnabled={handleToggleAutoRoomEnabled}
                  onUpdateAutoRoomInterval={handleUpdateAutoRoomInterval}
                />
              )
           ) : (
             <AdminUsers onGoBack={() => setAdminTab('rooms')} />
           )}
         </main>
       </div>
     );
  }

  if (appState.view === 'player_lobby') {
    const isAdmin = appState.currentUser?.role === 'admin';
    return (
       <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors pt-10">
         <div className="max-w-4xl mx-auto px-6 mb-8 flex items-center justify-between">
           <div className="flex items-center gap-3">
             <button onClick={handleLogout} className="text-slate-500 dark:text-slate-400 font-bold bg-white dark:bg-slate-900 px-4 py-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">Sair</button>
             {isAdmin && (
               <button 
                 onClick={() => setAppState(prev => ({ ...prev, view: 'admin' }))}
                 className="bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold px-3.5 py-2 rounded-xl shadow-md border border-indigo-500 transition-all active:scale-95 text-xs uppercase tracking-wider shrink-0"
               >
                 ← Painel de Admin
               </button>
             )}
           </div>
           
           {/* Quick dark mode button in player lobby header */}
           <button 
             onClick={() => {
               const isDark = appState.settings?.darkMode;
               setAppState(prev => ({
                 ...prev,
                 settings: {
                   ...prev.settings,
                   darkMode: !isDark
                 }
               }));
             }}
             title="Alternar Tema"
             className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 transition-colors shadow-sm"
           >
             {appState.settings?.darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
           </button>
         </div>
         <PlayerLobby 
           appState={appState} 
           onJoinRoom={handleJoinRoom} 
           onEnterRoom={(id) => setAppState(prev => ({ ...prev, view: 'player_game', currentRoomId: id }))} 
           onOpenProfile={() => setAppState(prev => ({ ...prev, view: 'profile' }))}
         />
       </div>
    );
  }

  if (appState.view === 'player_game' && appState.currentRoomId) {
     const room = appState.rooms.find(r => r.id === appState.currentRoomId)!;
     const player = room.players.find(p => p.id === appState.currentUser!.uid);
     const isSpectator = !player;
     const card = player ? player.card : generateBingoCard('SPECTATOR', appState.currentUser!.name);
     
     // Calculate time left (simulated)
     const timeLeftSeconds = Math.max(0, Math.floor((room.scheduledTime - Date.now()) / 1000));
     
     return (
       <>
         <Toaster position="top-center" />
         <PlayerMobileView 
           card={card}
           drawnNumbers={room.drawnNumbers}
           user={{ ...appState.currentUser!, avatar: appState.currentUser!.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + appState.currentUser!.name }}
           timeLeft={timeLeftSeconds}
           scheduledTime={room.scheduledTime}
           messages={room.messages}
           gameMode={room.gameMode}
           prize={room.prize}
           isSpectator={isSpectator}
           initialSoundEnabled={appState.settings?.soundEnabled ?? true}
           bgMusicUrl={room.bgMusicUrl}
           onlineRadioUrl={room.onlineRadioUrl}
           participants={room.players.map(p => {
             // We don't have the full User object in room.players in this mock, just id and name.
            // In a real app we'd fetch their photoURL. For now we use dicebear.
            const fullUser = appState.currentUser?.uid === p.id ? appState.currentUser : null;
            return { uid: p.id, name: p.name, avatar: fullUser?.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + p.name };
          })}
          playersList={room.players}
           onExit={() => setAppState(prev => ({ ...prev, view: 'player_lobby', currentRoomId: null }))}
          onSendMessage={(text) => handleSendMessage(room.id, text)}
          onOpenProfile={() => setAppState(prev => ({ ...prev, view: 'profile' }))}
        />
      </>
       );
  }

  if (appState.view === 'settings') {
    return (
      <>
        <Toaster position="top-center" />
        <SettingsScreen 
          settings={appState.settings}
          onUpdateSettings={(newSettings) => setAppState(prev => ({ ...prev, settings: newSettings }))}
          onGoBack={() => setAppState(prev => ({ ...prev, view: 'profile' }))}
        />
      </>
    );
  }

  if (appState.view === 'profile' && appState.currentUser) {
    return (
      <>
        <Toaster position="top-center" />
        <ProfileScreen 
          user={appState.currentUser} 
          onGoBack={() => setAppState(prev => ({ 
            ...prev, 
            view: prev.currentRoomId ? 'player_game' : 'player_lobby' 
          }))} 
          onLogout={() => setAppState(prev => ({ ...prev, view: 'home', currentUser: null, currentRoomId: null }))}
          onGoSettings={() => setAppState(prev => ({ ...prev, view: 'settings' }))}
          onUpdateProfilePhoto={handleUpdateProfilePhoto}
        />
      </>
    );
  }

  return null;
}
