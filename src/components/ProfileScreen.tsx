import React from 'react';
import { User, LogOut, ArrowLeft, Coins, TrendingUp, Download, Upload, Settings } from 'lucide-react';

interface ProfileScreenProps {
  user: any; // We can type this with our user structure
  onGoBack: () => void;
  onLogout: () => void;
  onGoSettings?: () => void;
}

export function ProfileScreen({ user, onGoBack, onLogout, onGoSettings }: ProfileScreenProps) {
  // Mock function to show an alert for transaction buttons
  const handleTransaction = (type: string) => {
    alert(`Funcionalidade de ${type} estará disponível em breve!`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors flex flex-col items-center py-10 px-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-800 transition-colors">
        
        {/* Header styling like a banner */}
        <div className="bg-emerald-500 p-6 relative">
          <button 
             onClick={onGoBack} 
             className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all"
          >
             <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex flex-col items-center mt-4">
            <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center border-4 border-emerald-300 overflow-hidden mb-3 shadow">
               {user.photoURL ? (
                 <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
               ) : (
                 <User className="w-12 h-12 text-slate-300" />
               )}
            </div>
            <h2 className="text-2xl font-black text-white text-center leading-tight">
              {user.name}
            </h2>
            <p className="text-emerald-100 font-bold text-sm tracking-wide mt-1">CPF: {user.cpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') || 'N/A'}</p>
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
