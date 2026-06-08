import React, { useState } from 'react';
import { Room, GameMode } from '../types';
import { Plus, Users, Clock, Coins, Play, Trophy, Radio, ShieldAlert, Edit3, Image as ImageIcon } from 'lucide-react';

interface AdminRoomsProps {
  rooms: Room[];
  onCreateRoom: (room: Partial<Room & { botsEnabled?: boolean; maxBots?: number }>) => void;
  onEnterRoom: (roomId: string) => void;
  onDeleteRoom: (roomId: string) => void;
  onUpdateRoomSettings?: (roomId: string, name: string, botsEnabled: boolean, maxBots: number, backgroundImageUrl?: string, roomIcon?: string, theme?: string) => void;
  autoRoomEnabled: boolean;
  autoRoomInterval: number;
  autoRoomStartHour: string;
  autoRoomEndHour: string;
  autoRoomRadioUrl: string;
  onToggleAutoRoomEnabled: () => void;
  onUpdateAutoRoomInterval: (val: number) => void;
  onUpdateAutoRoomHours: (start: string, end: string) => void;
  onUpdateAutoRoomRadioUrl: (val: string) => void;
  autoRoomBotsCount?: number;
  autoRoomBaseName?: string;
  autoRoomSequenceNumber?: number;
  autoRoomGameMode?: GameMode;
  autoRoomQuantity?: number;
  onUpdateAutoRoomBotsCount?: (val: number) => void;
  onUpdateAutoRoomBaseName?: (val: string) => void;
  onUpdateAutoRoomSequenceNumber?: (val: number) => void;
  onUpdateAutoRoomGameMode?: (val: GameMode) => void;
  onUpdateAutoRoomQuantity?: (val: number) => void;
}

const PRESET_ICONS = ['🎉', '🏆', '💎', '🍀', '🔥', '🤖', '⭐', '🚀', '👑', '🃏', '🍒', '🎨', '🎵', '🎪', '🎰'];

const PRESET_BACKGROUNDS = [
  { name: 'Padrão Slate', value: '' },
  { name: 'Cosmic Purple (Galáxia)', value: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?auto=format&fit=crop&q=80&w=800' },
  { name: 'Midnight Neon Blue (Neon)', value: 'https://images.unsplash.com/photo-1543536448-d209d2d13a1c?auto=format&fit=crop&q=80&w=800' },
  { name: 'Sertanejo Festivo (Madeira)', value: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&q=80&w=800' },
  { name: 'Golden Premium (Luxo)', value: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800' },
  { name: 'Emerald Forest (Floresta)', value: 'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&q=80&w=800' }
];

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
  autoRoomRadioUrl,
  autoRoomBotsCount,
  autoRoomBaseName,
  autoRoomSequenceNumber,
  autoRoomGameMode,
  autoRoomQuantity,
  onToggleAutoRoomEnabled,
  onUpdateAutoRoomInterval,
  onUpdateAutoRoomHours,
  onUpdateAutoRoomRadioUrl,
  onUpdateAutoRoomBotsCount,
  onUpdateAutoRoomBaseName,
  onUpdateAutoRoomSequenceNumber,
  onUpdateAutoRoomGameMode,
  onUpdateAutoRoomQuantity
 }: AdminRoomsProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editName, setEditName] = useState('');
  const [editBotsEnabled, setEditBotsEnabled] = useState(false);
  const [editMaxBots, setEditMaxBots] = useState(2);
  const [editBgImage, setEditBgImage] = useState('');
  const [editIcon, setEditIcon] = useState('🎉');
  const [editTheme, setEditTheme] = useState('emerald');
  
  const [newName, setNewName] = useState('');
  const [theme, setTheme] = useState('emerald');
  const [fee, setFee] = useState(10);
  const [prize, setPrize] = useState(100);
  const [bgMusicUrl, setBgMusicUrl] = useState('');
  const [onlineRadioUrl, setOnlineRadioUrl] = useState('');
  const [roomBgImage, setRoomBgImage] = useState('');
  const [roomIcon, setRoomIcon] = useState('🎉');
  const [botsEnabled, setBotsEnabled] = useState(false);
  const [maxBots, setMaxBots] = useState(2);
  const [startTime, setStartTime] = useState(() => {
    const d = new Date(Date.now() + 5 * 60000);
    const z = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`;
  });
  const [gameMode, setGameMode] = useState<'full_card' | 'line' | 'block_of_4' | 'bot_vs_bot'>('full_card');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !startTime) return;
    
    onCreateRoom({
      name: newName,
      entryFee: fee,
      prize,
      bgMusicUrl: bgMusicUrl.trim() || undefined,
      onlineRadioUrl: onlineRadioUrl.trim() || undefined,
      backgroundImageUrl: roomBgImage.trim() || undefined,
      roomIcon: roomIcon,
      scheduledTime: new Date(startTime).getTime(),
      maxPlayers: 10,
      gameMode,
      botsEnabled,
      maxBots,
      theme,
    });
    setNewName('');
    setTheme('emerald');
    setBgMusicUrl('');
    setOnlineRadioUrl('');
    setRoomBgImage('');
    setRoomIcon('🎉');
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
      <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-6 mb-8 space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 dark:bg-indigo-950/50 p-3 rounded-2xl text-indigo-600 dark:text-indigo-400">
              <Plus className="w-5 h-5 animate-pulse" />
            </div>
            <div className="text-left">
              <h3 className="font-extrabold text-slate-800 dark:text-white text-sm md:text-base">Criação Automática de Salas</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Cria novas salas agendadas contendo 2 bots participantes por padrão.</p>
            </div>
          </div>
          
          <button 
            type="button"
            onClick={() => onToggleAutoRoomEnabled()}
            className={`w-full md:w-auto px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              autoRoomEnabled 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700' 
                : 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            {autoRoomEnabled ? 'Ativo' : 'Inativo'}
          </button>
        </div>

        {/* Subconfigurações de Agendamento */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200/60 dark:border-slate-800/80">
          {/* Intervalo */}
          <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800 flex flex-col justify-between gap-1.5 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Intervalo de Criação</span>
            <select 
              value={autoRoomInterval} 
              onChange={e => onUpdateAutoRoomInterval(Number(e.target.value))}
              disabled={!autoRoomEnabled}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-2 text-xs font-black text-indigo-600 dark:text-indigo-400 outline-none disabled:opacity-40"
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
          <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800 flex flex-col justify-between gap-1.5 shadow-sm">
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
          <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800 flex flex-col justify-between gap-1.5 shadow-sm">
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

        {/* Configurações Extra de Criação Automática (Quantidade de Bots, Prefixo, Sequencial) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200/60 dark:border-slate-800/80">
          {/* Prefixo / Base Name */}
          <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800 flex flex-col justify-between gap-1.5 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prefixo do Nome da Sala</span>
            <input 
              type="text" 
              value={autoRoomBaseName ?? "Sala do Milhão"}
              onChange={e => onUpdateAutoRoomBaseName && onUpdateAutoRoomBaseName(e.target.value)}
              disabled={!autoRoomEnabled}
              placeholder="Ex: Sala do Milhão"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-2 text-xs font-black text-slate-700 dark:text-slate-300 outline-none disabled:opacity-40 cursor-text"
            />
          </div>

          {/* Quantidade de Bots */}
          <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800 flex flex-col justify-between gap-1.5 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mínimo de Bots na Sala</span>
            <input 
              type="number" 
              min="0"
              max="15"
              value={autoRoomBotsCount ?? 2}
              onChange={e => onUpdateAutoRoomBotsCount && onUpdateAutoRoomBotsCount(Number(e.target.value))}
              disabled={!autoRoomEnabled}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-2 text-xs font-black text-slate-700 dark:text-slate-300 outline-none disabled:opacity-40"
            />
          </div>

          {/* Próximo Sequencial */}
          <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800 flex flex-col justify-between gap-1.5 shadow-sm font-semibold">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sequencial da Próxima Sala</span>
            <div className="flex gap-2 w-full">
              <input 
                type="number" 
                min="1"
                value={autoRoomSequenceNumber ?? 1}
                onChange={e => onUpdateAutoRoomSequenceNumber && onUpdateAutoRoomSequenceNumber(Number(e.target.value))}
                disabled={!autoRoomEnabled}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-2 text-xs font-black text-slate-700 dark:text-slate-300 outline-none disabled:opacity-40"
              />
              <button
                type="button"
                onClick={() => onUpdateAutoRoomSequenceNumber && onUpdateAutoRoomSequenceNumber(1)}
                disabled={!autoRoomEnabled}
                className="px-3 py-2 bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl font-bold text-[10px] uppercase hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-40 transition-colors shrink-0"
                title="Resetar para 01"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* ⚙️ Novidades: Modo de Jogo e Quantidade de Salas Criadas por Vez */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200/60 dark:border-slate-800/80">
          {/* Modo de Jogo Programado */}
          <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800 flex flex-col justify-between gap-1.5 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Modo de Jogo Automático</span>
            <select 
              value={autoRoomGameMode ?? "full_card"} 
              onChange={e => onUpdateAutoRoomGameMode && onUpdateAutoRoomGameMode(e.target.value as GameMode)}
              disabled={!autoRoomEnabled}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-2 text-xs font-black text-slate-700 dark:text-slate-300 outline-none disabled:opacity-40"
            >
              <option value="full_card">Cartela Cheia</option>
              <option value="line">Linha (Vertical/Horizontal)</option>
              <option value="block_of_4">4 Números Próximos (Bloco 2x2)</option>
              <option value="bot_vs_bot">Bot vs Bot (Apenas Bots)</option>
            </select>
          </div>

          {/* Quantidade de Salas Criadas por Vez */}
          <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800 flex flex-col justify-between gap-1.5 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quantidade de Salas Criadas por Vez</span>
            <input 
              type="number" 
              min="1"
              max="5"
              value={autoRoomQuantity ?? 1}
              onChange={e => onUpdateAutoRoomQuantity && onUpdateAutoRoomQuantity(Number(e.target.value))}
              disabled={!autoRoomEnabled}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-2 text-xs font-black text-slate-700 dark:text-slate-305 outline-none disabled:opacity-40"
            />
          </div>
        </div>

        {/* Rádio Online para Salas Automáticas */}
        <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left">
            <div>
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Rádio Online Automática (Streaming)</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Toca por padrão nas salas criadas automaticamente.</span>
            </div>
            <select
              onChange={(e) => onUpdateAutoRoomRadioUrl(e.target.value)}
              value={autoRoomRadioUrl}
              disabled={!autoRoomEnabled}
              className="bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 p-2 px-3 rounded-xl font-bold text-xs focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer border border-slate-200 dark:border-slate-800 w-full sm:w-auto disabled:opacity-40"
            >
              <option value="">-- Sem rádio --</option>
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
            value={autoRoomRadioUrl} 
            onChange={e => onUpdateAutoRoomRadioUrl(e.target.value)} 
            disabled={!autoRoomEnabled}
            placeholder="URL direta de streaming de rádio (ex: https://dominio.com/streaming.mp3)" 
            className="w-full bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-xs disabled:opacity-40" 
          />
        </div>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 mb-8 space-y-4">
           <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Criar Nova Sala</h3>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div>
                 <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nome da Sala</label>
                 <input type="text" value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Ex: Rodada Prêmium" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl focus:ring-2 focus:ring-indigo-505 outline-none font-bold text-slate-800 dark:text-slate-100" />
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Hora de Início</label>
                 <input type="datetime-local" value={startTime} onChange={e=>setStartTime(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl focus:ring-2 focus:ring-indigo-505 outline-none font-bold text-indigo-600 dark:text-indigo-400" />
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Tema Visual da Sala</label>
                 <select 
                   value={theme} 
                   onChange={e=>setTheme(e.target.value)} 
                   className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl focus:ring-2 focus:ring-indigo-505 outline-none font-bold text-slate-800 dark:text-slate-100"
                 >
                   <option value="emerald">Verde Esmeralda (Padrão)</option>
                   <option value="ocean">Azul Real Oceano</option>
                   <option value="sunset">Brilho do Pôr do Sol</option>
                   <option value="royal">Noite Estelar Roxa</option>
                   <option value="cherry">Beleza Flor de Cerejeira</option>
                 </select>
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Taxa de Entrada (Moedas)</label>
                 <input type="number" min="0" value={fee} onChange={e=>setFee(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl focus:ring-2 focus:ring-indigo-505 outline-none font-bold text-amber-600 dark:text-amber-400" />
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Premiação (Moedas)</label>
                 <input type="number" min="0" value={prize} onChange={e=>setPrize(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl focus:ring-2 focus:ring-indigo-505 outline-none font-bold text-emerald-605 dark:text-emerald-400" />
               </div>
               <div className="sm:col-span-2">
                 <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Música de Fundo (MP3, MIDI)</label>
                 <div className="flex flex-col sm:flex-row gap-2">
                   <input type="text" value={bgMusicUrl} onChange={e=>setBgMusicUrl(e.target.value)} placeholder="URL ou faça upload ->" className="flex-1 min-w-0 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800 dark:text-slate-100" />
                   <label className="bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 cursor-pointer p-3 sm:px-4 rounded-xl font-bold flex items-center justify-center whitespace-nowrap transition-colors border border-indigo-200 dark:border-indigo-900/50">
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
                   <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-1">✓ Áudio local carregado: Pronto.</div>
                 )}
               </div>
               <div className="sm:col-span-2">
                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                   <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Link de Rádio Online (Streaming)</label>
                   <select
                     onChange={(e) => setOnlineRadioUrl(e.target.value)}
                     value={onlineRadioUrl}
                     className="bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 p-1.5 px-3 rounded-xl font-bold text-xs focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer border border-slate-200 dark:border-slate-700 w-full sm:w-auto"
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
                   className="w-full bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold mb-4" 
                 />
 
                 <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Ícone Temático da Sala</label>
                 <div className="flex flex-wrap gap-2 mb-4 bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                   {PRESET_ICONS.map(ic => (
                     <button
                       key={ic}
                       type="button"
                       onClick={() => setRoomIcon(ic)}
                       className={`w-9 h-9 text-lg flex items-center justify-center rounded-xl transition-all hover:scale-110 active:scale-95 ${roomIcon === ic ? 'bg-indigo-600 text-white shadow-md scale-105' : 'bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                     >
                       {ic}
                     </button>
                   ))}
                 </div>

                 <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Imagem de Fundo da Sala</label>
                 <div className="space-y-2 mb-4">
                   <select 
                     value={roomBgImage} 
                     onChange={e => setRoomBgImage(e.target.value)} 
                     className="w-full bg-slate-50 dark:bg-slate-800 text-slate-100 border border-slate-250 dark:border-slate-700 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                   >
                     {PRESET_BACKGROUNDS.map(bg => (
                       <option key={bg.value} value={bg.value}>{bg.name}</option>
                     ))}
                     <option value="custom">-- Utilizar URL Personalizada ou Arquivo --</option>
                   </select>

                   <div className="space-y-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                     <input 
                       type="text" 
                       value={roomBgImage} 
                       onChange={e => setRoomBgImage(e.target.value)} 
                       placeholder="Cole aqui uma URL de imagem de fundo (opcional)" 
                       className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-150 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl placeholder-slate-400 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none" 
                     />
                     
                     <div className="flex items-center gap-2">
                       <span className="text-[10px] text-slate-400 font-bold uppercase">Ou envie um arquivo:</span>
                       <label className="px-2.5 py-1 bg-slate-250 hover:bg-slate-300 dark:bg-slate-800 hover:dark:bg-slate-700 text-[10px] font-black text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer transition-all flex items-center gap-1">
                         <ImageIcon className="w-3 h-3 text-slate-500" />
                         Selecionar Imagem
                         <input 
                           type="file" 
                           accept="image/*" 
                           onChange={(e) => {
                             const file = e.target.files?.[0];
                             if (file) {
                               const reader = new FileReader();
                               reader.onload = () => {
                                 if (reader.result) {
                                   setRoomBgImage(reader.result as string);
                                 }
                               };
                               reader.readAsDataURL(file);
                             }
                           }} 
                           className="hidden" 
                         />
                       </label>
                     </div>
                     
                     {roomBgImage && (
                       <div className="flex items-center gap-2 pt-1 border-t border-slate-200/40 dark:border-slate-700 mt-2">
                         <div className="w-20 h-10 rounded bg-cover bg-center border border-slate-200 dark:border-slate-700" style={{ backgroundImage: `url(${roomBgImage})` }}></div>
                         <button 
                           type="button" 
                           onClick={() => setRoomBgImage('')} 
                           className="text-[10px] font-extrabold text-red-500 hover:underline"
                         >
                           Remover Imagem
                         </button>
                       </div>
                     )}
                   </div>
                 </div>

                 <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Modo de Jogo</label>
                 <select value={gameMode} onChange={e=>setGameMode(e.target.value as any)} className="w-full bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold mb-4">
                   <option value="full_card">Cartela Cheia</option>
                   <option value="line">Linha (Vertical/Horizontal)</option>
                   <option value="block_of_4">4 Números Próximos (Bloco 2x2)</option>
                   <option value="bot_vs_bot">Bot vs Bot (Somente Bots)</option>
                  </select>
 
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
                    <h4 className="font-extrabold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">🤖 Bots na Sala (Até 5)</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <label className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-750 active:scale-95 transition-all">
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
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-xs text-slate-800 dark:text-slate-250 pointer-events-auto"
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
            <button type="submit" disabled={!newName.trim()} className="w-full bg-slate-800 hover:bg-slate-900 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white p-4 rounded-xl font-bold transition-colors disabled:opacity-50 mt-4 active:scale-[0.98]">
             Criar e Agendar
            </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {rooms.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 font-medium bg-white/50 dark:bg-slate-900/40 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">Nenhuma sala criada.</div>
        ) : (
          rooms.map(room => (
            <div 
              key={room.id} 
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-md border border-slate-200/50 dark:border-slate-800 p-6 flex flex-col justify-between relative overflow-hidden transition-all hover:shadow-xl text-slate-800 dark:text-slate-100"
            >
              {room.backgroundImageUrl && (
                <img 
                  src={room.backgroundImageUrl} 
                  alt="" 
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover opacity-[0.06] dark:opacity-15 pointer-events-none z-0 mix-blend-overlay"
                />
              )}
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                  <h4 className="font-black text-xl text-slate-800 dark:text-white flex items-center gap-2.5">
                    <span className="text-2xl bg-white dark:bg-slate-800 w-10 h-10 flex items-center justify-center rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 shrink-0">{room.roomIcon || '🎉'}</span>
                    <span className="truncate">{room.name}</span>
                  </h4>
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-sm font-medium mt-2">
                    <Clock className="w-4 h-4"/>
                    {new Date(room.scheduledTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                  <div className="text-xs font-bold text-slate-400 mt-1 uppercase flex flex-col gap-1.5">
                    <span>Modo: {room.gameMode === 'full_card' ? 'Cartela Cheia' : room.gameMode === 'line' ? 'Linha' : room.gameMode === 'bot_vs_bot' ? 'Bot vs Bot' : '4 Cantos'}</span>
                    {room.onlineRadioUrl && (
                      <div className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 px-2.5 py-1 rounded-lg border border-indigo-150/40 text-[10px] font-black uppercase inline-flex items-center gap-1.5 mt-1 shadow-sm w-fit">
                        <Radio className="w-3.5 h-3.5 animate-pulse text-indigo-500" />
                        Rádio Online
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className="bg-amber-100 dark:bg-amber-950/55 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-full flex items-center gap-1 font-black text-sm shadow-sm">
                     <Coins className="w-4 h-4"/>
                     {room.entryFee}
                  </div>
                  {room.prize !== undefined && (
                     <div className="bg-emerald-100 dark:bg-emerald-950/55 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full flex items-center gap-1 font-black text-sm shadow-sm" title="Prêmio">
                        <Trophy className="w-4 h-4"/>
                        {room.prize}
                     </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-6 relative z-10">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
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
                      setEditTheme(room.theme || 'emerald');
                    }}
                    className="bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-955/40 dark:text-amber-400 dark:hover:bg-amber-900/40 px-3 py-2 rounded-xl font-bold flex items-center gap-1 transition-colors text-xs cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5"/>
                    Editar
                  </button>
                  <button 
                    onClick={() => onDeleteRoom(room.id)}
                    className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 px-3 py-2 rounded-xl font-bold flex items-center transition-colors text-xs cursor-pointer"
                  >
                    Excluir
                  </button>
                  <button 
                    onClick={() => onEnterRoom(room.id)}
                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-955/40 dark:text-indigo-400 dark:hover:bg-indigo-900/40 px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-colors text-xs cursor-pointer"
                  >
                    Detalhes
                    <Play className="w-3.5 h-3.5"/>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {editingRoom && (
        <div className="fixed inset-0 bg-slate-950/65 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col p-5 md:p-6 animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h3 className="text-lg font-black text-slate-800 dark:text-white">Editar Configurações da Sala</h3>
              <button 
                type="button"
                onClick={() => setEditingRoom(null)} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-extrabold text-sm p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Nome do Sorteio (Sala)</label>
                <input 
                  type="text" 
                  value={editName} 
                  onChange={e => setEditName(e.target.value)} 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl focus:ring-2 focus:ring-indigo-505 outline-none font-bold text-slate-800 dark:text-white text-xs md:text-sm" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Tema Visual da Sala</label>
                <select 
                  value={editTheme} 
                  onChange={e => setEditTheme(e.target.value)} 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl focus:ring-2 focus:ring-indigo-505 outline-none font-bold text-slate-800 dark:text-white text-xs"
                >
                  <option value="emerald">Verde Esmeralda (Padrão)</option>
                  <option value="ocean">Azul Real Oceano</option>
                  <option value="sunset">Brilho do Pôr do Sol</option>
                  <option value="royal">Noite Estelar Roxa</option>
                  <option value="cherry">Beleza Flor de Cerejeira</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Configuração de Bots</label>
                <div className="space-y-3 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={editBotsEnabled} 
                      onChange={e => setEditBotsEnabled(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-650 focus:ring-indigo-500 accent-indigo-650 cursor-pointer" 
                    />
                    <div className="flex flex-col select-none">
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200">Permitir Bots Participantes</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Bots simulam atividade na sala</span>
                    </div>
                  </label>
                  
                  {editBotsEnabled && (
                    <div className="pt-2.5 border-t border-slate-200/50 dark:border-slate-800">
                      <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Quantidade de Bots na Sala (Até 10)</span>
                      <select 
                        value={editMaxBots} 
                        onChange={e => setEditMaxBots(Number(e.target.value))} 
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-xs border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
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

              {/* Custom Icon in Edit */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Ícone Temático da Sala</label>
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800">
                  {PRESET_ICONS.map(ic => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setEditIcon(ic)}
                      className={`w-8 h-8 text-base flex items-center justify-center rounded-lg transition-all hover:scale-110 ${editIcon === ic ? 'bg-indigo-600 text-white shadow-md scale-105' : 'bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Background in Edit */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Imagem de Fundo da Sala</label>
                <div className="space-y-2 bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  <select 
                    value={editBgImage} 
                    onChange={e => setEditBgImage(e.target.value)} 
                    className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl outline-none font-bold text-xs"
                  >
                    {PRESET_BACKGROUNDS.map(bg => (
                      <option key={bg.value} value={bg.value}>{bg.name}</option>
                    ))}
                    <option value="custom">-- Utilizar URL Personalizada ou Arquivo --</option>
                  </select>
                  
                  <input 
                    type="text" 
                    value={editBgImage} 
                    onChange={e => setEditBgImage(e.target.value)} 
                    placeholder="Cole aqui uma URL de imagem de fundo" 
                    className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 p-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none rounded-lg" 
                  />
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-405 font-bold uppercase">Ou envie um arquivo:</span>
                    <label className="px-2 py-0.5 bg-slate-200/60 hover:bg-slate-200 dark:bg-slate-800 hover:dark:bg-slate-700 text-[10px] font-black text-slate-700 dark:text-slate-300 rounded cursor-pointer border border-transparent transition-all">
                      Selecionar Imagem
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => {
                              if (reader.result) {
                                setEditBgImage(reader.result as string);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                  
                  {editBgImage && (
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-200/40 dark:border-slate-800 mt-2">
                      <div className="w-16 h-8 rounded border border-slate-200 dark:border-slate-700 bg-cover bg-center overflow-hidden" style={{ backgroundImage: `url(${editBgImage})` }}></div>
                      <button 
                        type="button" 
                        onClick={() => setEditBgImage('')} 
                        className="text-[10px] font-bold text-red-500 hover:underline"
                      >
                        Remover Imagem
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3.5 border-t border-slate-200 dark:border-slate-800 shrink-0">
              <button 
                type="button" 
                onClick={() => setEditingRoom(null)} 
                className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-3 rounded-xl font-bold transition-all text-xs uppercase tracking-wider text-center cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="button" 
                disabled={!editName.trim()}
                onClick={() => {
                  if (onUpdateRoomSettings && editingRoom) {
                    onUpdateRoomSettings(
                      editingRoom.id, 
                      editName, 
                      editBotsEnabled, 
                      editBotsEnabled ? editMaxBots : 0,
                      editBgImage,
                      editIcon,
                      editTheme
                    );
                  }
                  setEditingRoom(null);
                }} 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-black transition-all disabled:opacity-50 text-xs uppercase tracking-wider text-center cursor-pointer"
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
