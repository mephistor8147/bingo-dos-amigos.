import React from 'react';
import { Room, AppState } from '../types';
import { Users, Clock, Coins, UserCircle2, Trophy } from 'lucide-react';
import { generateBingoCard } from '../utils';

interface PlayerLobbyProps {
  appState: AppState;
  onJoinRoom: (roomId: string, card: any) => void;
  onEnterRoom: (roomId: string) => void;
  onOpenProfile: () => void;
}

export function PlayerLobby({ appState, onJoinRoom, onEnterRoom, onOpenProfile }: PlayerLobbyProps) {
  const user = appState.currentUser!;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8 bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
         <button onClick={onOpenProfile} className="flex items-center gap-3 hover:bg-slate-50 p-2 rounded-2xl transition-colors text-left">
           <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center overflow-hidden">
             {user.photoURL ? <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover"/> : <UserCircle2 className="w-8 h-8"/>}
           </div>
           <div>
             <h2 className="text-xl font-black text-slate-800">{user.name}</h2>
             <p className="text-slate-500 font-medium text-sm text-emerald-600 hover:underline">Ver Perfil</p>
           </div>
         </button>
         <div className="bg-amber-100 text-amber-700 px-4 py-2 rounded-2xl flex items-center gap-2 font-black text-lg">
            <Coins className="w-6 h-6"/>
            {user.coins.toLocaleString()}
         </div>
      </div>

      <h3 className="text-xl font-black text-slate-800 mb-6">Salas Disponíveis</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {appState.rooms.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 font-medium bg-white/50 border-2 border-dashed border-slate-200 rounded-3xl">Nenhuma sala aberta no momento.</div>
        ) : appState.rooms.map(room => {
          const isJoined = room.players.some(p => p.id === user.uid);
          const isFull = room.players.length >= room.maxPlayers;
          const canJoin = !isJoined && !isFull && user.coins >= room.entryFee;

          return (
            <div key={room.id} className="bg-white rounded-3xl shadow-md border border-slate-100 p-6 flex flex-col justify-between hover:shadow-lg transition-shadow bg-gradient-to-br from-white to-emerald-50/30">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-black text-xl text-slate-800">{room.name}</h4>
                  <div className="flex items-center gap-1.5 text-slate-500 text-sm font-medium mt-1">
                    <Clock className="w-4 h-4"/>
                    {new Date(room.scheduledTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                  <div className="text-xs font-bold text-slate-400 mt-1 uppercase">
                    Modo: {room.gameMode === 'full_card' ? 'Cartela Cheia' : room.gameMode === 'line' ? 'Linha' : '4 Cantos'}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full flex items-center gap-1 font-black text-sm">
                     <Coins className="w-4 h-4"/>
                     {room.entryFee}
                  </div>
                  {room.prize !== undefined && (
                     <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full flex items-center gap-1 font-black text-sm" title="Prêmio">
                        <Trophy className="w-4 h-4"/>
                        {room.prize}
                     </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-slate-500 font-bold bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                  <Users className="w-4 h-4"/>
                  {room.players.length} / {room.maxPlayers} Ativos
                </div>

                {isJoined ? (
                  <button 
                    onClick={() => onEnterRoom(room.id)}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold transition-colors shadow-lg shadow-emerald-500/20"
                  >
                    Jogar Agora
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      const newCard = generateBingoCard(Math.random().toString(36).substring(2, 8).toUpperCase(), user.name);
                      onJoinRoom(room.id, newCard);
                    }}
                    disabled={!canJoin}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-500 text-white px-5 py-2.5 rounded-xl font-bold transition-colors disabled:shadow-none shadow-lg shadow-indigo-600/20"
                  >
                    {isFull ? 'Lotada' : canJoin ? 'Comprar Cartela' : 'Saldo Insuficiente'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
