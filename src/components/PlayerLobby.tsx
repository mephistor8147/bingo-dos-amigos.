import React from 'react';
import { Room, AppState } from '../types';
import { Users, Clock, Coins, UserCircle2, Trophy } from 'lucide-react';
import { generateBingoCard, isCardWinner } from '../utils';

interface PlayerLobbyProps {
  appState: AppState;
  onJoinRoom: (roomId: string, card: any) => void;
  onEnterRoom: (roomId: string) => void;
  onOpenProfile: () => void;
  autoRoomEnabled?: boolean;
}

export function PlayerLobby({ appState, onJoinRoom, onEnterRoom, onOpenProfile, autoRoomEnabled }: PlayerLobbyProps) {
  const user = appState.currentUser!;
  const [countdown, setCountdown] = React.useState<string>('');

  React.useEffect(() => {
    const updateCountdown = () => {
      // Find the upcoming auto-created or any upcoming room
      const upcoming = appState.rooms
        .filter(r => r.status === 'waiting')
        .sort((a, b) => a.scheduledTime - b.scheduledTime)[0];

      if (!upcoming) {
        setCountdown('');
        return;
      }

      const diff = upcoming.scheduledTime - Date.now();
      if (diff <= 0) {
        setCountdown('Começando agora! ⚡');
        return;
      }

      const min = Math.floor(diff / 60000);
      const sec = Math.floor((diff % 60000) / 1000);
      setCountdown(`${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [appState.rooms]);

  return (
    <div className="max-w-4xl mx-auto p-3 md:p-5 pb-20">
      {/* Lobby Unified Header Card */}
      <div className="flex items-center justify-between mb-5 bg-white dark:bg-slate-900 p-3.5 rounded-3xl shadow-md border border-slate-100 dark:border-slate-800 transition-colors">
         <button onClick={onOpenProfile} className="flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 p-1.5 rounded-2xl transition-colors text-left">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-450 rounded-full flex items-center justify-center overflow-hidden shrink-0">
              {user.photoURL ? <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover"/> : <UserCircle2 className="w-8 h-8"/>}
            </div>
            <div>
              <h2 className="text-base md:text-lg font-black text-slate-800 dark:text-white leading-tight">{user.name}</h2>
              <p className="text-emerald-600 dark:text-emerald-400 font-extrabold text-[11px] md:text-xs hover:underline">Ver Perfil</p>
            </div>
         </button>
         <div className="bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-3.5 py-1.5 rounded-2xl flex items-center gap-1.5 font-black text-sm md:text-base transition-colors border border-amber-200/20 dark:border-amber-900/30 shrink-0">
            <Coins className="w-4.5 h-4.5 md:w-5 h-5 shrink-0"/>
            {user.coins.toLocaleString()}
         </div>
      </div>

      {autoRoomEnabled && countdown && (
        <div className="mb-5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-3xl p-4 md:p-5 flex items-center justify-between shadow-lg shadow-indigo-500/20 relative overflow-hidden transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full filter blur-xl transform translate-x-12 -translate-y-12"></div>
          <div className="flex items-center gap-3 relative z-10">
            <div className="bg-white/10 p-3 rounded-2xl">
              <Clock className="w-5 h-5 text-indigo-100 animate-pulse" />
            </div>
            <div className="text-left">
              <span className="text-[10px] uppercase font-black tracking-widest text-indigo-200 block">Próxima Rodada Automática</span>
              <h4 className="text-sm md:text-base font-extrabold text-white leading-tight">Uma nova rodada começará em breve</h4>
            </div>
          </div>
          <div className="bg-white/10 px-4 py-2 rounded-2xl font-mono text-xl md:text-2xl font-black text-white relative z-10 border border-white/10 shrink-0 select-none">
            {countdown}
          </div>
        </div>
      )}

      <h3 className="text-lg font-black text-slate-800 dark:text-white mb-4 uppercase tracking-wider text-xs md:text-sm">Salas Disponíveis</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {appState.rooms.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 dark:text-slate-600 font-medium bg-white/50 dark:bg-slate-900/10 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl transition-colors">Nenhuma sala aberta no momento.</div>
        ) : appState.rooms.map(room => {
          const isJoined = room.players.some(p => p.id === user.uid);
          const isFull = room.players.length >= room.maxPlayers;
          const canJoin = !isJoined && !isFull && user.coins >= room.entryFee;

          const userParticipant = room.players.find(p => p.id === user.uid);
          const hasWon = userParticipant ? isCardWinner(userParticipant.card, room.drawnNumbers, room.gameMode) : false;

          return (
            <div 
              key={room.id} 
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 p-4 md:p-5 flex flex-col justify-between hover:shadow-lg dark:hover:shadow-black/20 transition-all bg-gradient-to-br from-white to-emerald-50/10 dark:from-slate-900 dark:to-slate-900/50 relative overflow-hidden"
              style={room.backgroundImageUrl ? {
                backgroundImage: `linear-gradient(to bottom, rgba(255, 255, 255, 0.94), rgba(255, 255, 255, 0.98)), url(${room.backgroundImageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              } : undefined}
            >
              {hasWon && (
                <div className="bg-amber-500 text-white p-3 rounded-2xl mb-4 font-black text-center text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-md border border-amber-400 relative z-10">
                  <Trophy className="w-5 h-5 text-yellow-200 fill-yellow-200 animate-bounce shrink-0 animate-none" />
                  <span>VOCÊ GANHOU NESTA SALA! 🎉</span>
                </div>
              )}
              <div className="flex justify-between items-start mb-2.5 gap-2 relative z-10">
                <div>
                  <h4 className="font-black text-xl text-slate-800 dark:text-white line-clamp-1 flex items-center gap-2">
                    <span className="text-xl bg-slate-50 dark:bg-slate-800 w-8 h-8 flex items-center justify-center rounded-lg shadow-sm border border-slate-200/50 dark:border-slate-700 shrink-0">{room.roomIcon || '🎉'}</span>
                    <span>{room.name}</span>
                  </h4>
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-sm font-medium mt-2">
                    <Clock className="w-4 h-4 shrink-0"/>
                    {new Date(room.scheduledTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                  <div className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wider">
                    Modo: {room.gameMode === 'full_card' ? 'Cartela Cheia' : room.gameMode === 'line' ? 'Linha' : room.gameMode === 'bot_vs_bot' ? 'Bot vs Bot' : '4 Cantos'}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <div className="bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-xl flex items-center gap-1 font-black text-xs md:text-sm border border-amber-200/10 dark:border-amber-900/30">
                     <Coins className="w-3.5 h-3.5"/>
                     {room.entryFee}
                  </div>
                  {room.prize !== undefined && (
                     <div className="bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-xl flex items-center gap-1 font-black text-xs md:text-sm border border-emerald-200/10 dark:border-emerald-900/30" title="Prêmio">
                        <Trophy className="w-3.5 h-3.5"/>
                        {room.prize}
                     </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-200/50 dark:border-slate-800/80 text-xs">
                  <Users className="w-3.5 h-3.5 shrink-0"/>
                  {room.players.length} / {room.maxPlayers} Ativos
                </div>

                {user.role === 'admin' ? (
                  <button 
                    onClick={() => onEnterRoom(room.id)}
                    className="bg-indigo-650 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-black transition-all shadow-lg shadow-indigo-650/20 active:scale-95 text-xs md:text-sm"
                  >
                    Entrar (Admin)
                  </button>
                ) : room.gameMode === 'bot_vs_bot' ? (
                  <button 
                    onClick={() => onEnterRoom(room.id)}
                    className="bg-gradient-to-r from-purple-650 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-purple-650/20 active:scale-95 text-xs md:text-sm"
                  >
                    Assistir Demo
                  </button>
                ) : isJoined ? (
                  <button 
                    onClick={() => onEnterRoom(room.id)}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-95 text-xs md:text-sm"
                  >
                    Jogar Agora
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    {/* If user doesn't have balance, offer SPECTATE but styled nicely */}
                    {user.coins < room.entryFee ? (
                      <div className="flex items-center gap-2">
                        <span className="text-red-500 dark:text-red-400 font-extrabold text-[10px] md:text-xs uppercase tracking-wider bg-red-100 dark:bg-red-950/40 px-2.5 py-1 rounded-lg">
                          Sem Saldo
                        </span>
                        <button 
                          onClick={() => onEnterRoom(room.id)}
                          className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-md active:scale-95 text-xs md:text-sm"
                        >
                          Assistir
                        </button>
                      </div>
                    ) : (
                      /* User has balance and is not joined */
                      <>
                        {room.status === 'active' ? (
                          <button 
                            onClick={() => onEnterRoom(room.id)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-95 text-xs md:text-sm flex items-center gap-1.5"
                          >
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                            Assistir Ao Vivo
                          </button>
                        ) : (
                          <div className="flex items-center gap-3">
                            <button 
                               onClick={() => {
                                 const newCard = generateBingoCard(Math.random().toString(36).substring(2, 8).toUpperCase(), user.name);
                                 onJoinRoom(room.id, newCard);
                               }}
                               disabled={isFull}
                               className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-95 text-xs md:text-sm"
                            >
                              {isFull ? 'Lotada' : 'Comprar'}
                            </button>
                            
                            <button 
                              onClick={() => onEnterRoom(room.id)}
                              className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-bold transition-colors underline"
                            >
                              Assistir
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

