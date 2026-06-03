import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { User } from '../types';
import { Loader2, Coins, Save, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface AdminUsersProps {
  onGoBack: () => void;
}

export function AdminUsers({ onGoBack }: AdminUsersProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCoins, setEditingCoins] = useState<{ [uid: string]: string }>({});

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const usersData: User[] = [];
        querySnapshot.forEach((doc) => {
          usersData.push(doc.data() as User);
        });
        setUsers(usersData);
      } catch (err) {
        console.error('Failed to fetch users', err);
        toast.error('Erro ao buscar usuários');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleCoinsChange = (uid: string, value: string) => {
    setEditingCoins(prev => ({ ...prev, [uid]: value }));
  };

  const handleAddCoins = async (uid: string, currentCoins: number) => {
    const addAmount = parseInt(editingCoins[uid] || '0', 10);
    if (!addAmount || isNaN(addAmount)) return;

    try {
      const newCoins = currentCoins + addAmount;
      await updateDoc(doc(db, 'users', uid), {
        coins: newCoins
      });
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, coins: newCoins } : u));
      setEditingCoins(prev => ({ ...prev, [uid]: '' }));
      toast.success('Saldo atualizado com sucesso!');
    } catch (err) {
      console.error('Failed to update coins', err);
      toast.error('Erro ao atualizar saldo');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={onGoBack} className="p-2 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-500 hover:text-slate-800 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-3xl font-black text-slate-800">Gerenciar Usuários</h2>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          {/* Mobile view: Card Layout */}
          <div className="block md:hidden divide-y divide-slate-100">
            {users.map(user => (
              <div key={user.uid} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-extrabold text-slate-800">{user.name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{user.email || 'N/A'}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-md text-xs font-bold ${user.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'}`}>
                    {user.role === 'admin' ? 'Admin' : 'Jogador'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                  <div className="flex items-center gap-1 font-black text-amber-500 text-sm">
                    <Coins className="w-4 h-4" />
                    <span>{user.coins}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      value={editingCoins[user.uid] || ''} 
                      onChange={(e) => handleCoinsChange(user.uid, e.target.value)}
                      placeholder="± Valor"
                      className="w-20 bg-slate-50 border border-slate-205 p-1.5 rounded-lg text-xs outline-none focus:border-amber-500"
                    />
                    <button 
                      onClick={() => handleAddCoins(user.uid, user.coins)}
                      disabled={!editingCoins[user.uid] || editingCoins[user.uid] === '0'}
                      className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 p-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Salvar Saldo"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {users.length === 0 && (
              <div className="p-8 text-center text-slate-400 font-medium">Nenhum usuário encontrado.</div>
            )}
          </div>

          {/* Desktop view: Table Layout */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 uppercase text-xs font-bold text-slate-500">
                  <th className="p-4">Nome</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Função</th>
                  <th className="p-4">Saldo Atual</th>
                  <th className="p-4">Adicionar/Remover Saldo</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.uid} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-bold text-slate-800">{user.name}</td>
                    <td className="p-4 text-slate-500">{user.email || 'N/A'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${user.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'}`}>
                        {user.role === 'admin' ? 'Administrador' : 'Jogador'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 font-black text-amber-500">
                        <Coins className="w-4 h-4" />
                        {user.coins}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          value={editingCoins[user.uid] || ''} 
                          onChange={(e) => handleCoinsChange(user.uid, e.target.value)}
                          placeholder="± Valor"
                          className="w-24 bg-white border border-slate-200 p-2 rounded-lg outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                        />
                        <button 
                          onClick={() => handleAddCoins(user.uid, user.coins)}
                          disabled={!editingCoins[user.uid] || editingCoins[user.uid] === '0'}
                          className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Salvar Saldo"
                        >
                          <Save className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">Nenhum usuário encontrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
