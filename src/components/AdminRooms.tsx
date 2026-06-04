import React, { useState } from 'react';
import { Room } from '../types';
import { Plus, Users, Clock, Coins, Play, Trophy, Radio, ShieldAlert, Edit3 } from 'lucide-react';

interface AdminRoomsProps {
  rooms: Room[];
  onCreateRoom: (room: Partial<Room & { botsEnabled?: boolean; maxBots?: number }>) => void;
  onEnterRoom: (roomId: string) => void;
  onDeleteRoom: (roomId: string) => void;
  onUpdateRoomSettings?: (roomId: string, name: string, botsEnabled: boolean, maxBots: number) => void;
  autoRoomEnabled: boolean;
  autoRoomInterval: number;
  autoRoomStartHour: string;
  autoRoomEndHour: string;
  onToggleAutoRoomEnabled: () => void;
  onUpdateAutoRoomInterval: (val: number) => void;
  onUpdateAutoRoomHours: (start: string, end: string) => void;
}

export function AdminRooms({ 
  rooms, 
  onCreateRoom, 
  onEnterRoom, 
  onDeleteRoom,
  onUpdateRoomSettings,
  autoRoomEnabled,
  autoRoomInterval,
  autoRoomStartHour,
  autoRoomEndHour,
  onToggleAutoRoomEnabled,
  onUpdateAutoRoomInterval,
  onUpdateAutoRoomHours
 }: AdminRoomsProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editName, setEditName] = useState('');
  const [editBotsEnabled, setEditBotsEnabled] = useState(false);
  const [editMaxBots, setEditMaxBots] = useState(2);
  const [newName, setNewName] = useState('');
  const [fee, setFee] = useState(10);
  const [prize, setPrize] = useState(100);
  const [bgMusicUrl, setBgMusicUrl] = useState('');
  const [onlineRadioUrl, setOnlineRadioUrl] = useState('');
  const [botsEnabled, setBotsEnabled] = useState(false);
  const [maxBots, setMaxBots] = useState(2);
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
      botsEnabled,
      maxBots,
    });
    setNewName('');
    setBgMusicUrl('');
    setOnlineRadioUrl('');
    setBotsEnabled(false);
    setMaxBots(2);
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

      {/* 🤖 Configuração Global de Criação Automática de Salas */}
      <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-850 rounded-3xl p-6 mb-8 space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 dark:bg-indigo-950/50 p-3 rounded-2xl text-indigo-600 dark:text-indigo-400">
              <Plus className="w-5 h-5 animate-pulse" />
            </div>
            <div className="text-left">
              <h3 className="font-extrabold text-slate-800 dark:text-white text-sm md:text-base">Criação Automática de Salas</h3>
              <p className="text-slate-550 dark:text-slate-450 text-xs font-semibold">Cria novas salas agendadas contendo 2 bots participantes por padrão.</p>
            </div>
          </div>
          
          <button 
            type="button"
            onClick={() => onToggleAutoRoomEnabled()}
            className={`w-full md:w-auto px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              autoRoomEnabled 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700' 
                : 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-350 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            {autoRoomEnabled ? 'Ativo' : 'Inativo'}
          </button>
        </div>

        {/* Subconfigurações de Agendamento */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200/60 dark:border-slate-800/80">
          {/* Intervalo */}
          <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-250/20 dark:border-slate-850 flex flex-col justify-between gap-1.5 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Intervalo de Criação</span>
            <select 
              value={autoRoomInterval} 
              onChange={e => onUpdateAutoRoomInterval(Number(e.target.value))}
              disabled={!autoRoomEnabled}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-2 text-xs font-black text-indigo-600 dark:text-indigo-450 outline-none disabled:opacity-40"
            >
              <option value="1">1 Minuto</option>
              <option value="2">2 Minutos</option>
              <option value="5">5 Minutos</option>
              <option value="10">10 Minutos</option>
              <option value="15">15 Minutos</option>
              <option value="30">30 Minutos</option>
            </select>
          </div>

          {/* Horário de Início */}
          <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-250/20 dark:border-slate-850 flex flex-col justify-between gap-1.5 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Início do Funcionamento (Diário)</span>
            <input 
              type="time" 
              value={autoRoomStartHour} 
              onChange={e => onUpdateAutoRoomHours(e.target.value, autoRoomEndHour)}
              disabled={!autoRoomEnabled}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-2 text-xs font-black text-slate-700 dark:text-slate-300 outline-none disabled:opacity-40 cursor-text"
            />
          </div>

          {/* Horário de Fim */}
          <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-250/20 dark:border-slate-850 flex flex-col justify-between gap-1.5 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fim do Funcionamento (Diário)</span>
            <input 
              type="time" 
              value={autoRoomEndHour} 
              onChange={e => onUpdateAutoRoomHours(autoRoomStartHour, e.target.value)}
              disabled={!autoRoomEnabled}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-2 text-xs font-black text-slate-700 dark:text-slate-300 outline-none disabled:opacity-40 cursor-text"
            />
          </div>
        </div>
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
                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                   <label className="block text-xs font-bold text-slate-500 uppercase">Link de Rádio Online (Streaming)</label>
                   <select
                     onChange={(e) => setOnlineRadioUrl(e.target.value)}
                     value={onlineRadioUrl}
                     className="bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 p-1.5 px-3 rounded-xl font-bold text-xs focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer border border-slate-200 dark:border-slate-700"
                   >
                     <option value="">-- Escolher Rádio Preset --</option>
                     <option value="https://live.hunter.fm/sertanejo_stream?ag=mp3">Sertanejo</option>
                     <option value="https://live.hunter.fm/pop_stream?ag=mp3">Pop</option>
                     <option value="https://live.hunter.fm/pagode_stream?ag=mp3">Pagode</option>
                     <option value="https://live.hunter.fm/rock_stream?ag=mp3">Rook</option>
                     <option value="https://live.hunter.fm/master_stream?ag=mp3">Master</option>
                     <option value="https://live.hunter.fm/mpb_stream?ag=mp3">Mpb</option>
                     <option value="https://live.hunter.fm/gospel_stream?ag=mp3">Gostei</option>
                     <option value="https://live.hunter.fm/hitsbrasil_stream?ag=mp3">Hits Brasil</option>
                     <option value="https://live.hunter.fm/pop2k_stream?ag=mp3">Pop 2k</option>
                     <option value="https://live.hunter.fm/modasertaneja_stream?ag=mp3">Moda sertaneja</option>
                     <option value="https://live.hunter.fm/80s_stream?ag=mp3">80s</option>
                     <option value="https://live.hunter.fm/kpop_stream?ag=mp3">Kpop</option>
                     <option value="https://live.hunter.fm/pisadinha_stream?ag=mp3">Pisadinha</option>
                   </select>
                 </div>
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

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
                    <h4 className="font-extrabold text-xs text-slate-500 uppercase tracking-wider mb-2">🤖 Bots na Sala (Até 5)</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <label className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl cursor-pointer hover:bg-slate-105 active:scale-95 transition-all">
                        <input 
                          type="checkbox" 
                          checked={botsEnabled} 
                          onChange={(e) => setBotsEnabled(e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer" 
                        />
                        <div className="flex flex-col select-none">
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-200">Ativar Bots</span>
                          <span className="text-[10px] text-slate-500">Nesta rodada</span>
                        </div>
                      </label>
                      {botsEnabled && (
                        <div>
                          <select 
                            value={maxBots} 
                            onChange={(e) => setMaxBots(Number(e.target.value))} 
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-xs text-slate-700 dark:text-slate-350"
                          >
                            <option value="1">1 Bot Ativo</option>
                            <option value="2">2 Bots Ativos</option>
                            <option value="3">3 Bots Ativos</option>
                            <option value="4">4 Bots Ativos</option>
                            <option value="5">5 Bots Ativos</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
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
              <div className="flex gap-1 md:gap-2 flex-wrap justify-end">
                <button 
                  type="button"
                  onClick={() => {
                    setEditingRoom(room);
                    setEditName(room.name);
                    setEditBotsEnabled(room.botsEnabled || false);
                    setEditMaxBots(room.maxBots || 0);
                  }}
                  className="bg-amber-100 hover:bg-amber-150 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 px-3 py-2 rounded-xl font-bold flex items-center gap-1 transition-colors text-xs"
                >
                  <Edit3 className="w-3.5 h-3.5"/>
                  Editar
                </button>
                <button 
                  onClick={() => onDeleteRoom(room.id)}
                  className="text-red-500 hover:bg-red-55/10 px-3 py-2 rounded-xl font-bold flex items-center transition-colors text-xs"
                >
                  Excluir
                </button>
                <button 
                  onClick={() => onEnterRoom(room.id)}
                  className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-colors text-xs"
                >
                  Detalhes
                  <Play className="w-3.5 h-3.5"/>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editingRoom && (
        <div className="fixed inset-0 bg-slate-950/65 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-800 dark:text-white">Editar Configurações da Sala</h3>
              <button 
                type="button"
                onClick={() => setEditingRoom(null)} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-extrabold text-sm p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Nome do Sorteio (Sala)</label>
                <input 
                  type="text" 
                  value={editName} 
                  onChange={e => setEditName(e.target.value)} 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800 dark:text-white text-xs md:text-sm" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Configuração de Bots</label>
                <div className="space-y-3 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-850">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={editBotsEnabled} 
                      onChange={e => setEditBotsEnabled(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer" 
                    />
                    <div className="flex flex-col select-none">
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200">Permitir Bots Participantes</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-450 font-semibold">Bots simulam atividade na sala</span>
                    </div>
                  </label>
                  
                  {editBotsEnabled && (
                    <div className="pt-2.5 border-t border-slate-200/50 dark:border-slate-800">
                      <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Quantidade de Bots na Sala (Até 10)</span>
                      <select 
                        value={editMaxBots} 
                        onChange={e => setEditMaxBots(Number(e.target.value))} 
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-xs text-slate-700 dark:text-slate-300"
                      >
                        <option value="1">1 Usuário Bot</option>
                        <option value="2">2 Usuários Bots</option>
                        <option value="3">3 Usuários Bots</option>
                        <option value="4">4 Usuários Bots</option>
                        <option value="5">5 Usuários Bots</option>
                        <option value="6">6 Usuários Bots</option>
                        <option value="7">7 Usuários Bots</option>
                        <option value="8">8 Usuários Bots</option>
                        <option value="9">9 Usuários Bots</option>
                        <option value="10">10 Usuários Bots</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => setEditingRoom(null)} 
                className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 py-3 rounded-xl font-bold transition-all text-xs uppercase tracking-wider text-center"
              >
                Cancelar
              </button>
              <button 
                type="button" 
                disabled={!editName.trim()}
                onClick={() => {
                  if (onUpdateRoomSettings && editingRoom) {
                    onUpdateRoomSettings(editingRoom.id, editName, editBotsEnabled, editBotsEnabled ? editMaxBots : 0);
                  }
                  setEditingRoom(null);
                }} 
                className="w-full bg-indigo-650 hover:bg-indigo-700 text-white py-3 rounded-xl font-black transition-all disabled:opacity-50 text-xs uppercase tracking-wider text-center"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
