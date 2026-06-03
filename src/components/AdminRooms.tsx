import React, { useState } from 'react';
import { Room } from '../types';
import { Plus, Users, Clock, Coins, Play, Trophy, Radio } from 'lucide-react';

interface AdminRoomsProps {
  rooms: Room[];
  onCreateRoom: (room: Partial<Room>) => void;
  onEnterRoom: (roomId: string) => void;
  onDeleteRoom: (roomId: string) => void;
}

export function AdminRooms({ rooms, onCreateRoom, onEnterRoom, onDeleteRoom }: AdminRoomsProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [fee, setFee] = useState(10);
  const [prize, setPrize] = useState(100);
  const [bgMusicUrl, setBgMusicUrl] = useState('');
  const [onlineRadioUrl, setOnlineRadioUrl] = useState('');
  const [startTime, setStartTime] = useState(() => {
    const d = new Date(Date.now() + 5 * 60000);
    const z = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`;
  });
  const [gameMode, setGameMode] = useState<'full_card' | 'line' | 'block_of_4'>('full_card');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !startTime) return;
    
    onCreateRoom({
      name: newName,
      entryFee: fee,
      prize,
      bgMusicUrl: bgMusicUrl.trim() || undefined,
      onlineRadioUrl: onlineRadioUrl.trim() || undefined,
      scheduledTime: new Date(startTime).getTime(),
      maxPlayers: 10,
      gameMode,
    });
    setNewName('');
    setBgMusicUrl('');
    setOnlineRadioUrl('');
    setShowCreate(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
           <h2 className="text-3xl font-black text-slate-800">Gerenciar Salas</h2>
           <p className="text-slate-500 font-medium">Controle as rodadas e apostas</p>
        </div>
        <button 
           onClick={() => setShowCreate(!showCreate)}
           className="bg-indigo-600 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5"/>
          Nova Sala
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 mb-8 space-y-4">
           <h3 className="text-lg font-bold text-slate-800">Criar Nova Sala</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome da Sala</label>
                 <input type="text" value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Ex: Rodada Prêmium" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" />
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hora de Início</label>
                 <input type="datetime-local" value={startTime} onChange={e=>setStartTime(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-indigo-600" />
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Taxa de Entrada (Moedas)</label>
                 <input type="number" min="0" value={fee} onChange={e=>setFee(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-amber-600" />
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Premiação (Moedas)</label>
                 <input type="number" min="0" value={prize} onChange={e=>setPrize(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-emerald-600" />
               </div>
               <div className="md:col-span-2">
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Música de Fundo (MP3, MIDI)</label>
                 <div className="flex gap-2">
                   <input type="text" value={bgMusicUrl} onChange={e=>setBgMusicUrl(e.target.value)} placeholder="URL ou faça upload ->" className="flex-1 bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700" />
                   <label className="bg-indigo-50 text-indigo-700 cursor-pointer px-4 rounded-xl font-bold hover:bg-indigo-100 flex items-center justify-center whitespace-nowrap transition-colors border border-indigo-200">
                      <span>Upload Local</span>
                      <input 
                        type="file" 
                        accept="audio/*,.mid,.midi" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          // If file is too large, it might crash the browser when saving to memory
                          // Using Data URL
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setBgMusicUrl(event.target?.result as string);
                          };
                          reader.readAsDataURL(file);
                        }} 
                        className="hidden" 
                      />
                   </label>
                 </div>
                 {bgMusicUrl.startsWith('data:') && (
                   <div className="text-xs text-emerald-600 font-bold mt-1">✓ Áudio local carregado: Pronto.</div>
                 )}
               </div>
               <div className="md:col-span-2">
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Link de Rádio Online (Streaming)</label>
                 <input 
                   type="text" 
                   value={onlineRadioUrl} 
                   onChange={e => setOnlineRadioUrl(e.target.value)} 
                   placeholder="URL direta de streaming de rádio (MP3, AAC, m3u8, Icecast)" 
                   className="w-full bg-slate-50 text-slate-800 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700 mb-4" 
                 />

                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Modo de Jogo</label>
                 <select value={gameMode} onChange={e=>setGameMode(e.target.value as any)} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700">
                   <option value="full_card">Cartela Cheia</option>
                   <option value="line">Linha (Vertical/Horizontal)</option>
                   <option value="block_of_4">4 Números Próximos (Bloco 2x2)</option>
                 </select>
               </div>
             </div>
           <button type="submit" disabled={!newName.trim()} className="w-full bg-slate-800 hover:bg-slate-900 text-white p-4 rounded-xl font-bold transition-colors disabled:opacity-50">
             Criar e Agendar
           </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {rooms.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 font-medium bg-white/50 border-2 border-dashed border-slate-200 rounded-3xl">Nenhuma sala criada.</div>
        ) : rooms.map(room => (
          <div key={room.id} className="bg-white rounded-3xl shadow-md border border-slate-100 p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-black text-xl text-slate-800">{room.name}</h4>
                <div className="flex items-center gap-1.5 text-slate-500 text-sm font-medium mt-1">
                  <Clock className="w-4 h-4"/>
                  {new Date(room.scheduledTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
                <div className="text-xs font-bold text-slate-400 mt-1 uppercase">
                  Modo: {room.gameMode === 'full_card' ? 'Cartela Cheia' : room.gameMode === 'line' ? 'Linha' : '4 Cantos'}
                  {room.onlineRadioUrl && (
                    <div className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 px-2.5 py-1 rounded-lg border border-indigo-150/40 text-[10px] font-black uppercase inline-flex items-center gap-1.5 mt-2 shadow-sm w-fit">
                      <Radio className="w-3.5 h-3.5 animate-pulse text-indigo-505" />
                      Rádio Online
                    </div>
                  )}
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
            
            <div className="flex items-center justify-between mt-6">
              <div className="flex items-center gap-1.5 text-slate-500 font-bold bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                <Users className="w-4 h-4"/>
                {room.players.length} / {room.maxPlayers} Ativos
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => onDeleteRoom(room.id)}
                  className="text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl font-bold flex items-center transition-colors"
                >
                  Excluir
                </button>
                <button 
                  onClick={() => onEnterRoom(room.id)}
                  className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors"
                >
                  Detalhes
                  <Play className="w-4 h-4"/>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
