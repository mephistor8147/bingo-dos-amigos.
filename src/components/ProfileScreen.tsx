import React, { useRef } from 'react';
import { User, LogOut, ArrowLeft, Coins, TrendingUp, Download, Upload, Settings } from 'lucide-react';

interface ProfileScreenProps {
  user: any; // We can type this with our user structure
  onGoBack: () => void;
  onLogout: () => void;
  onGoSettings?: () => void;
  onUpdateProfilePhoto?: (photoURL: string) => void;
}

export function ProfileScreen({ user, onGoBack, onLogout, onGoSettings, onUpdateProfilePhoto }: ProfileScreenProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock function to show an alert for transaction buttons
  const handleTransaction = (type: string) => {
    alert(`Funcionalidade de ${type} estará disponível em breve!`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 600 * 1024) {
      alert("A imagem deve ter no máximo 600KB para ser salva.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (onUpdateProfilePhoto) {
        onUpdateProfilePhoto(base64String);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors flex flex-col items-center py-10 px-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-800 transition-colors">
        
        {/* Unified Profile Card Header at the Top */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 relative">
          {/* Header Action Bar */}
          <div className="flex items-center justify-between w-full mb-4">
            <button 
               onClick={onGoBack} 
               className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs transition-all pointer-events-auto"
            >
               <ArrowLeft className="w-4 h-4" />
               <span>Voltar</span>
            </button>
            <span className="text-[10px] font-black tracking-widest text-emerald-100 uppercase bg-black/10 px-2.5 py-1.5 rounded-lg select-none">Meu Perfil</span>
          </div>

          <div className="flex flex-col items-center">
            {/* Unified Photo Frame with hover uploads */}
            <div className="relative group">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center border-4 border-emerald-300 overflow-hidden shadow-lg cursor-pointer hover:scale-105 active:scale-95 transition-all"
                title="Clique para alterar a foto do perfil"
              >
                 {user.photoURL ? (
                   <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                 ) : (
                   <User className="w-12 h-12 text-slate-300 pointer-events-none" />
                 )}
                 <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-black uppercase tracking-wider text-center px-1 rounded-full select-none">
                   Alterar Foto
                 </div>
              </div>
              
              {/* Upload badge floating directly attached to the photo circle inside the card */}
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1.5 -right-1.5 p-2 bg-amber-500 hover:bg-amber-600 border border-amber-400 text-white rounded-full shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                title="Upload de foto de perfil"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
            </div>

            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <h2 className="text-2xl font-black text-white text-center leading-tight mt-4">
              {user.name}
            </h2>
            <p className="text-emerald-100 font-extrabold text-xs tracking-wider uppercase mt-1">CPF: {user.cpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') || 'N/A'}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Balance Section */}
          <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl p-4 border border-emerald-100/60 dark:border-emerald-900/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 dark:bg-amber-950/50 p-3 rounded-full">
                <Coins className="w-8 h-8 text-amber-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Saldo em Conta</p>
                <div className="text-3xl font-black text-slate-800 dark:text-white">
                  {user.coins?.toLocaleString() || 0}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => handleTransaction('Depósito')}
              className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-4 flex flex-col items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors shadow-sm"
            >
               <div className="bg-blue-100 dark:bg-blue-950/40 p-3 rounded-full text-blue-600 dark:text-blue-400">
                 <Upload className="w-6 h-6" />
               </div>
               <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">Depositar</span>
            </button>
            <button 
                onClick={() => handleTransaction('Saque')}
                className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-4 flex flex-col items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors shadow-sm"
            >
                <div className="bg-emerald-100 dark:bg-emerald-950/40 p-3 rounded-full text-emerald-600 dark:text-emerald-450">
                  <Download className="w-6 h-6" />
                </div>
                <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">Sacar</span>
            </button>
          </div>

          {/* User Details */}
          <div className="bg-slate-50 dark:bg-slate-950/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-850 space-y-3">
             <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Informações de Cadastro</h3>
             <div className="flex justify-between border-b border-slate-200/50 dark:border-slate-800 pb-2">
                 <span className="text-slate-500 dark:text-slate-400 font-medium text-sm">E-mail</span>
                 <span className="text-slate-850 dark:text-slate-100 font-bold text-sm text-right line-clamp-1">{user.email || 'Não informado'}</span>
             </div>
             <div className="flex justify-between border-b border-slate-200/50 dark:border-slate-800 pb-2">
                 <span className="text-slate-500 dark:text-slate-400 font-medium text-sm">Telefone</span>
                 <span className="text-slate-850 dark:text-slate-100 font-bold text-sm">{user.phone || 'Não informado'}</span>
             </div>
          </div>

          {/* Win History Mock */}
          <div className="bg-slate-50 dark:bg-slate-950/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-850">
             <div className="flex items-center gap-2 mb-3">
               <TrendingUp className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
               <h3 className="text-xs font-black text-slate-750 dark:text-slate-350 uppercase tracking-widest">Histórico de Ganhos</h3>
             </div>
             <div className="text-center text-slate-400 dark:text-slate-500 py-4 font-medium text-sm">
               Nenhuma vitória registrada. Continue jogando!
             </div>
          </div>

          {onGoSettings && (
             <button 
                onClick={onGoSettings}
                className="w-full bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-bold p-4 rounded-xl flex items-center justify-center gap-2 transition-colors mt-2"
             >
                <Settings className="w-5 h-5 text-slate-400" />
                Configurações
             </button>
          )}

          {/* Logout */}
          <button 
             onClick={onLogout}
             className="w-full bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-955 text-red-600 dark:text-red-400 font-bold p-4 rounded-xl flex items-center justify-center gap-2 transition-colors mt-4 border border-red-200/20"
          >
             <LogOut className="w-5 h-5" />
             Sair da Conta
          </button>
        </div>
      </div>
    </div>
  );
}
