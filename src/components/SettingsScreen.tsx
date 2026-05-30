import React from 'react';
import { ArrowLeft, Bell, Volume2, Shield, Gem } from 'lucide-react';
import { AppState } from '../types';
import { toast } from 'react-hot-toast';

interface SettingsScreenProps {
  settings?: AppState['settings'];
  onUpdateSettings: (newSettings: any) => void;
  onGoBack: () => void;
}

export function SettingsScreen({ settings, onUpdateSettings, onGoBack }: SettingsScreenProps) {
  const currentSettings = settings || { notificationsEnabled: true, soundEnabled: true };

  const handleToggle = (key: 'notificationsEnabled' | 'soundEnabled') => {
    const newVal = !currentSettings[key];
    onUpdateSettings({ ...currentSettings, [key]: newVal });
    if (key === 'notificationsEnabled' && newVal) {
      toast.success('Notificações ativadas', { icon: '🔔' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 relative">
        <button 
          onClick={onGoBack}
          className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shadow-sm hover:bg-slate-200 transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-3xl font-black text-slate-800 mb-8">
          Configurações
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-500 flex items-center justify-center">
                 <Bell className="w-5 h-5" />
               </div>
               <div>
                 <h4 className="font-bold text-slate-700 text-sm">Notificações</h4>
                 <p className="text-xs text-slate-400 font-medium">Avisos de novas salas e bingos</p>
               </div>
             </div>
             <button 
               onClick={() => handleToggle('notificationsEnabled')}
               className={`w-12 h-6 rounded-full p-1 transition-colors ${currentSettings.notificationsEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
             >
               <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${currentSettings.notificationsEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
             </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-500 flex items-center justify-center">
                 <Volume2 className="w-5 h-5" />
               </div>
               <div>
                 <h4 className="font-bold text-slate-700 text-sm">Efeitos Sonoros</h4>
                 <p className="text-xs text-slate-400 font-medium">Sons de bingo e sorteio</p>
               </div>
             </div>
             <button 
               onClick={() => handleToggle('soundEnabled')}
               className={`w-12 h-6 rounded-full p-1 transition-colors ${currentSettings.soundEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
             >
               <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${currentSettings.soundEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
             </button>
          </div>
          
          <div className="mt-8 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-start gap-4">
            <Shield className="w-6 h-6 text-emerald-500 flex-shrink-0" />
            <div>
              <h4 className="font-bold text-emerald-800 text-sm">Conta Protegida</h4>
              <p className="text-xs text-emerald-600 mt-1">Sua conta está integrada e segura na plataforma. As opções acima são salvas localmente.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
