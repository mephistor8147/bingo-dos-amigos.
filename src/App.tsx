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

const isCardWinner = (card: BingoCardData, drawnNumbers: number[], gameMode: GameMode = 'full_card') => {
  const checkMarked = (r: number, c: number) => {
    if (r < 0 || r > 4 || c < 0 || c > 4) return false;
    const cell = card.grid[r][c];
    return cell === 'FREE' || drawnNumbers.includes(cell as number);
  };

  if (gameMode === 'full_card') {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (!checkMarked(r, c)) return false;
      }
    }
    return true;
  } else if (gameMode === 'line') {
    for (let r = 0; r < 5; r++) {
      let rowWin = true;
      for (let c = 0; c < 5; c++) {
         if (!checkMarked(r, c)) rowWin = false;
      }
      if (rowWin) return true;
    }
    for (let c = 0; c < 5; c++) {
      let colWin = true;
      for (let r = 0; r < 5; r++) {
         if (!checkMarked(r, c)) colWin = false;
      }
      if (colWin) return true;
    }
  } else if (gameMode === 'block_of_4') {
    // Verifica 16 possíveis blocos de 2x2 dentro da cartela 5x5
    for (let r = 0; r <= 3; r++) {
      for (let c = 0; c <= 3; c++) {
        const topLeft = checkMarked(r, c);
        const topRight = checkMarked(r, c + 1);
        const bottomLeft = checkMarked(r + 1, c);
        const bottomRight = checkMarked(r + 1, c + 1);
        
        if (topLeft && topRight && bottomLeft && bottomRight) {
          return true;
        }
      }
    }
  }
  return false;
};

export default function App() {
  const [appState, setAppState] = useState<AppState & { showAuth?: boolean }>({
    view: 'home',
    rooms: [],
    currentRoomId: null,
    currentUser: null,
    showAuth: false,
  });

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
      bgMusicUrl: partialRoom.bgMusicUrl
    };
    setAppState(prev => ({ ...prev, rooms: [...prev.rooms, newRoom] }));
    toast.success('Sala criada com sucesso!');
  };

  const handleJoinRoom = (roomId: string, card: BingoCardData) => {
    setAppState(prev => {
      const room = prev.rooms.find(r => r.id === roomId);
      if (!room || prev.currentUser!.coins < room.entryFee) {
          if (!room) toast.error('Sala não encontrada.');
          else toast.error('Saldo insuficiente.');
          return prev;
      }
      
      const newRooms = prev.rooms.map(r => {
        if (r.id === roomId) {
          return {
            ...r,
            players: [...r.players, { id: prev.currentUser!.uid, name: prev.currentUser!.name, card }]
          };
        }
        return r;
      });
      
      toast.success('Você entrou na sala! Boa sorte!');

      return {
        ...prev,
        rooms: newRooms,
        currentUser: {
          ...prev.currentUser!,
          coins: prev.currentUser!.coins - room.entryFee
        }
      };
    });
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

  const handleDeleteRoom = (roomId: string) => {
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
        return changed ? { ...prev, rooms: newRooms, currentUser: nextCurrentUser } : prev;
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
         <Toaster position="top-center" />
         <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center space-y-6">
            <h1 className="text-4xl font-black text-slate-800 tracking-tight">Bingo<span className="text-emerald-500">Live</span></h1>
            <p className="text-slate-500 font-medium">Faça login para continuar</p>
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
     if (appState.currentRoomId) {
       const room = appState.rooms.find(r => r.id === appState.currentRoomId)!;
       return (
         <div className="min-h-screen bg-slate-50">
           <header className="bg-white p-4 items-center flex border-b">
             <button onClick={() => setAppState(prev => ({ ...prev, currentRoomId: null }))} className="text-slate-500 hover:text-slate-800 font-bold px-4 py-2 bg-slate-100 rounded-lg">Voltar</button>
             <h2 className="ml-4 font-black">{room.name} - Sorteio</h2>
           </header>
           <div className="pt-8">
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
         </div>
       );
     }

     return (
       <div className="min-h-screen bg-slate-50 pt-10">
         <div className="max-w-4xl mx-auto px-6 mb-8 flex items-center justify-between">
           <button onClick={() => setAppState(prev => ({ ...prev, view: 'home' }))} className="text-slate-500 font-bold bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">Voltar para Home</button>
           <button onClick={() => setAppState(prev => ({ ...prev, view: 'admin_users' as any }))} className="bg-emerald-50 text-emerald-600 font-bold px-4 py-2 rounded-xl shadow-sm border border-emerald-200 hover:bg-emerald-100 transition-colors">Gerenciar Usuários</button>
         </div>
         <AdminRooms rooms={appState.rooms} onCreateRoom={handleCreateRoom} onEnterRoom={(id) => setAppState(prev => ({ ...prev, currentRoomId: id }))} onDeleteRoom={handleDeleteRoom} />
       </div>
     );
  }

  if (appState.view === 'admin_users') {
    return (
      <>
        <Toaster position="top-center" />
        <AdminUsers onGoBack={() => setAppState(prev => ({ ...prev, view: 'admin' }))} />
      </>
    );
  }

  if (appState.view === 'player_lobby') {
    return (
       <div className="min-h-screen bg-slate-50 pt-10">
         <div className="max-w-4xl mx-auto px-6 mb-8 flex items-center justify-between">
           <button onClick={() => setAppState(prev => ({ ...prev, view: 'home' }))} className="text-slate-500 font-bold bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">Sair</button>
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
     const player = room.players.find(p => p.id === appState.currentUser!.uid)!;
     // Calculate time left (simulated)
     const timeLeftSeconds = Math.max(0, Math.floor((room.scheduledTime - Date.now()) / 1000));
     
     return (
       <>
         <Toaster position="top-center" />
         <PlayerMobileView 
           card={player.card}
           drawnNumbers={room.drawnNumbers}
           user={{ ...appState.currentUser!, avatar: appState.currentUser!.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + appState.currentUser!.name }}
           timeLeft={timeLeftSeconds}
           scheduledTime={room.scheduledTime}
           messages={room.messages}
           gameMode={room.gameMode}
           prize={room.prize}
           initialSoundEnabled={appState.settings?.soundEnabled ?? true}
           participants={room.players.map(p => {
             // We don't have the full User object in room.players in this mock, just id and name.
           // In a real app we'd fetch their photoURL. For now we use dicebear.
           const fullUser = appState.currentUser?.uid === p.id ? appState.currentUser : null;
           return { uid: p.id, name: p.name, avatar: fullUser?.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + p.name };
         })}
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
        />
      </>
    );
  }

  return null;
}
