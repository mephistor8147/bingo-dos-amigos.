import React from 'react';
import { Room, AppState } from '../types';
import { Users, Clock, Coins, UserCircle2, Trophy } from 'lucide-react';
import { generateBingoCard, isCardWinner } from '../utils';

interface PlayerLobbyProps {
  appState: AppState;
  onJoinRoom: (roomId: string, card: any) => void;
  onEnterRoom: (roomId: string) => void;
  onOpenProfile: () => void;
}

export function PlayerLobby({ appState, onJoinRoom, onEnterRoom, onOpenProfile }: PlayerLobbyProps) {
  const user = appState.currentUser!;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 pb-24">
      {/* Lobby Unified Header Card */}
      <div className="flex items-center justify-between mb-8 bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-md border border-slate-100 dark:border-slate-800 transition-colors">
         <button onClick={onOpenProfile} className="flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-850 p-2 rounded-2xl transition-colors text-left">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-450 rounded-full flex items-center justify-center overflow-hidden shrink-0">
              {user.photoURL ? <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover"/> : <UserCircle2 className="w-8 h-8"/>}
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-black text-slate-800 dark:text-white leading-tight">{user.name}</h2>
              <p className="text-emerald-600 dark:text-emerald-400 font-extrabold text-xs md:text-sm hover:underline">Ver Perfil</p>
            </div>
         </button>
         <div className="bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-4 py-2 rounded-2xl flex items-center gap-2 font-black text-base md:text-lg transition-colors border border-amber-200/20 dark:border-amber-900/30 shrink-0">
            <Coins className="w-5 h-5 md:w-6 md:h-6 shrink-0"/>
            {user.coins.toLocaleString()}
         </div>
      </div>

      <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6 uppercase tracking-wider text-sm md:text-base">Salas Disponíveis</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {appState.rooms.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 dark:text-slate-600 font-medium bg-white/50 dark:bg-slate-900/10 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl transition-colors">Nenhuma sala aberta no momento.</div>
        ) : appState.rooms.map(room => {
          const isJoined = room.players.some(p => p.id === user.uid);
          const isFull = room.players.length >= room.maxPlayers;
          const canJoin = !isJoined && !isFull && user.coins >= room.entryFee;

          const userParticipant = room.players.find(p => p.id === user.uid);
          const hasWon = userParticipant ? isCardWinner(userParticipant.card, room.drawnNumbers, room.gameMode) : false;

          return (
            <div key={room.id} className="bg-white dark:bg-slate-900 rounded-3xl shadow-md border border-slate-100 dark:border-slate-800 p-6 flex flex-col justify-between hover:shadow-lg dark:hover:shadow-black/20 transition-all bg-gradient-to-br from-white to-emerald-50/10 dark:from-slate-900 dark:to-slate-900/50 relative overflow-hidden">
              {hasWon && (
                <div className="bg-amber-500 text-white p-3 rounded-2xl mb-4 font-black text-center text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-md border border-amber-400">
                  <Trophy className="w-5 h-5 text-yellow-200 fill-yellow-200 animate-bounce shrink-0 animate-none" />
                  <span>VOCÊ GANHOU NESTA SALA! 🎉</span>
                </div>
              )}
              <div className="flex justify-between items-start mb-4 gap-2">
                <div>
                  <h4 className="font-black text-xl text-slate-800 dark:text-white line-clamp-1">{room.name}</h4>
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">
                    <Clock className="w-4 h-4 shrink-0"/>
                    {new Date(room.scheduledTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                  <div className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wider">
                    Modo: {room.gameMode === 'full_card' ? 'Cartela Cheia' : room.gameMode === 'line' ? 'Linha' : '4 Cantos'}
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
              
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-450 font-bold bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-200/50 dark:border-slate-800/80 text-xs">
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

