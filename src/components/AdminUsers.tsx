import React, { useEffect, useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { User } from '../types';
import { 
  Loader2, Coins, ArrowLeft, Gift, Plus, Trash2, Edit3, X, Check, Search, 
  UserPlus, ShieldAlert, Phone, Mail, User as UserIcon, Calendar, CheckSquare
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface AdminUsersProps {
  onGoBack: () => void;
}

export function AdminUsers({ onGoBack }: AdminUsersProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [welcomeBonusEnabled, setWelcomeBonusEnabled] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'player' | 'admin'>('all');

  // Create User State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCpf, setNewCpf] = useState('');
  const [newRole, setNewRole] = useState<'player' | 'admin'>('player');
  const [newCoins, setNewCoins] = useState('500');

  // Edit User State (Modal)
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCpf, setEditCpf] = useState('');
  const [editRole, setEditRole] = useState<'player' | 'admin'>('player');
  const [editCoins, setEditCoins] = useState('0');

  // Quick coins adjustment helper state for the main table
  const [editingCoins, setEditingCoins] = useState<{ [uid: string]: string }>({});

  const fetchUsersAndSettings = async () => {
    try {
      setLoading(true);
      // Fetch users
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersData: User[] = [];
      querySnapshot.forEach((doc) => {
        usersData.push({ uid: doc.id, ...doc.data() } as User);
      });
      setUsers(usersData);

      // Fetch welcome bonus settings
      const { getDoc } = await import('firebase/firestore');
      const docSnap = await getDoc(doc(db, 'settings', 'global_automation'));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setWelcomeBonusEnabled(data.welcomeBonusEnabled !== false);
      }
    } catch (err) {
      console.error('Failed to fetch data', err);
      toast.error('Erro ao buscar usuários ou configurações');
      handleFirestoreError(err, OperationType.GET, 'users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndSettings();
  }, []);

  // Quick Coins Actions
  const handleCoinsChange = (uid: string, value: string) => {
    setEditingCoins(prev => ({ ...prev, [uid]: value }));
  };

  const handleAddCoins = async (uid: string, currentCoins: number, valueStr: string) => {
    const addAmount = parseInt(valueStr || '0', 10);
    if (isNaN(addAmount) || addAmount === 0) return;

    try {
      const newCoins = currentCoins + addAmount;
      await updateDoc(doc(db, 'users', uid), { coins: newCoins });
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, coins: newCoins } : u));
      setEditingCoins(prev => ({ ...prev, [uid]: '' }));
      toast.success('Saldo adicionado com sucesso!');
    } catch (err) {
      console.error('Failed to update coins', err);
      toast.error('Erro ao adicionar saldo');
    }
  };

  const handleSubtractCoins = async (uid: string, currentCoins: number, valueStr: string) => {
    const subAmount = parseInt(valueStr || '0', 10);
    if (isNaN(subAmount) || subAmount === 0) return;

    try {
      const newCoins = Math.max(0, currentCoins - subAmount);
      await updateDoc(doc(db, 'users', uid), { coins: newCoins });
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, coins: newCoins } : u));
      setEditingCoins(prev => ({ ...prev, [uid]: '' }));
      toast.success('Saldo subtraído com sucesso!');
    } catch (err) {
      console.error('Failed to update coins', err);
      toast.error('Erro ao subtrair saldo');
    }
  };

  const handleSetCoins = async (uid: string, valueStr: string) => {
    const setAmount = parseInt(valueStr, 10);
    if (isNaN(setAmount) || setAmount < 0) {
      toast.error('O saldo informado não é válido');
      return;
    }

    try {
      await updateDoc(doc(db, 'users', uid), { coins: setAmount });
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, coins: setAmount } : u));
      setEditingCoins(prev => ({ ...prev, [uid]: '' }));
      toast.success(`Saldo definido para ${setAmount} moedas!`);
    } catch (err) {
      console.error('Failed to update coins', err);
      toast.error('Erro ao definir saldo');
    }
  };

  const handleToggleWelcomeBonus = async () => {
    const newVal = !welcomeBonusEnabled;
    setWelcomeBonusEnabled(newVal);
    try {
      const { setDoc: firestoreSetDoc } = await import('firebase/firestore');
      await firestoreSetDoc(doc(db, 'settings', 'global_automation'), {
        welcomeBonusEnabled: newVal
      }, { merge: true });
      toast.success(newVal ? 'Bônus de boas-vindas ativado!' : 'Bônus de boas-vindas desativado!');
    } catch (err) {
      console.error('Failed to update welcome bonus setting', err);
      toast.error('Erro ao salvar configuração de bônus');
      setWelcomeBonusEnabled(!newVal);
    }
  };

  // --- CRUD Operations ---

  // CREATE
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error('Por favor, informe o nome.');
      return;
    }

    try {
      const { collection: firestoreCollection, doc: firestoreDoc } = await import('firebase/firestore');
      // Create random ID if email not used, else clean email-based ID
      const uid = newEmail ? `user_${newEmail.replace(/[^a-zA-Z0-9]/g, '_')}` : `user_${Date.now()}`;
      
      const coinsVal = parseInt(newCoins || '0', 10);
      const userPayload: User = {
        uid,
        name: newName,
        email: newEmail || undefined,
        phone: newPhone || undefined,
        cpf: newCpf || undefined,
        role: newRole,
        coins: isNaN(coinsVal) ? 0 : coinsVal
      };

      await setDoc(firestoreDoc(db, 'users', uid), {
        name: userPayload.name,
        email: userPayload.email || '',
        phone: userPayload.phone || '',
        cpf: userPayload.cpf || '',
        role: userPayload.role,
        coins: userPayload.coins
      });

      setUsers(prev => [userPayload, ...prev]);
      setShowCreateForm(false);
      
      // Reset Form
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      setNewCpf('');
      setNewRole('player');
      setNewCoins('500');

      toast.success('Usuário criado com sucesso!', { icon: '👤' });
    } catch (err) {
      console.error('Error creating user:', err);
      toast.error('Erro ao criar usuário');
    }
  };

  // UPDATE
  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setEditName(user.name || '');
    setEditEmail(user.email || '');
    setEditPhone(user.phone || '');
    setEditCpf(user.cpf || '');
    setEditRole(user.role || 'player');
    setEditCoins((user.coins || 0).toString());
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editName.trim()) {
      toast.error('Nome não pode estar vazio');
      return;
    }

    try {
      const coinsVal = parseInt(editCoins || '0', 10);
      const updatedData = {
        name: editName,
        email: editEmail,
        phone: editPhone,
        cpf: editCpf,
        role: editRole,
        coins: isNaN(coinsVal) ? 0 : coinsVal
      };

      await updateDoc(doc(db, 'users', editingUser.uid), updatedData);
      
      setUsers(prev => prev.map(u => u.uid === editingUser.uid ? { ...u, ...updatedData } : u));
      setEditingUser(null);
      toast.success('Cadastro atualizado com sucesso!', { icon: '💾' });
    } catch (err) {
      console.error('Error updating user:', err);
      toast.error('Erro ao atualizar cadastro');
    }
  };

  // DELETE
  const handleDeleteUser = async (uid: string, name: string) => {
    const confirm = window.confirm(`Tem certeza de que deseja excluir permanentemente o usuário "${name}"?`);
    if (!confirm) return;

    try {
      await deleteDoc(doc(db, 'users', uid));
      setUsers(prev => prev.filter(u => u.uid !== uid));
      toast.success('Usuário excluído com sucesso!', { icon: '🗑️' });
    } catch (err) {
      console.error('Error deleting user:', err);
      toast.error('Erro ao excluir usuário');
    }
  };

  // Filtered Users List
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.cpf || '').includes(searchQuery) ||
      (user.phone || '').includes(searchQuery);

    const matchesRole = 
      roleFilter === 'all' || 
      (roleFilter === 'admin' && user.role === 'admin') ||
      (roleFilter === 'player' && user.role !== 'admin');

    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 transition-colors">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button onClick={onGoBack} className="p-2 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                Gerenciar Usuários
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">Controle total sobre o cadastro, cargos e saldos dos participantes.</p>
            </div>
          </div>

          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider px-5 py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-500/10 cursor-pointer"
          >
            {showCreateForm ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {showCreateForm ? "Cancelar Novo" : "Novo Usuário"}
          </button>
        </div>

        {/* 🎁 Welcome Bonus Global Config Card */}
        <div className="bg-gradient-to-r from-emerald-50 to-indigo-50 dark:from-slate-900/40 dark:to-slate-950/40 border border-emerald-100/50 dark:border-slate-800 rounded-3xl p-5 mb-6 shadow-sm">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500 text-white p-2.5 rounded-2xl shrink-0">
                <Gift className="w-5 h-5 animate-pulse" />
              </div>
              <div className="text-left">
                <h3 className="font-extrabold text-slate-800 dark:text-white text-sm">
                  Bônus de Boas-vindas (Novos Registros)
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold">
                  Novos jogadores registrados recebem ou não o bônus inicial de <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">R$ 500 moedas</span>.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleWelcomeBonus}
              className={`w-full md:w-auto px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                welcomeBonusEnabled
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-700"
                  : "bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300"
              }`}
            >
              {welcomeBonusEnabled ? "🎁 Ativo (Concede R$ 500)" : "🚫 Desativado (Dá R$ 0)"}
            </button>
          </div>
        </div>

        {/* ➕ Create User Form Block */}
        {showCreateForm && (
          <form onSubmit={handleCreateUser} className="bg-white dark:bg-slate-900 rounded-3xl p-6 mb-6 border border-slate-200/60 dark:border-slate-800 shadow-xl space-y-4 animate-in slide-in-from-top-3 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-sm text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-500" />
                Criar Novo Usuário
              </h3>
              <button type="button" onClick={() => setShowCreateForm(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nome Completo *</label>
                <input 
                  type="text" 
                  value={newName} 
                  onChange={e => setNewName(e.target.value)} 
                  placeholder="Ex: João Silva" 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-xs outline-none focus:border-indigo-500 dark:text-white font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">E-mail</label>
                <input 
                  type="email" 
                  value={newEmail} 
                  onChange={e => setNewEmail(e.target.value)} 
                  placeholder="Ex: joao@email.com" 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-xs outline-none focus:border-indigo-500 dark:text-white font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Telefone</label>
                <input 
                  type="text" 
                  value={newPhone} 
                  onChange={e => setNewPhone(e.target.value)} 
                  placeholder="Ex: (11) 99999-9999" 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-xs outline-none focus:border-indigo-500 dark:text-white font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">CPF (Opcional)</label>
                <input 
                  type="text" 
                  value={newCpf} 
                  onChange={e => setNewCpf(e.target.value)} 
                  placeholder="000.000.000-00" 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-xs outline-none focus:border-indigo-500 dark:text-white font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Função / Cargo</label>
                <select 
                  value={newRole} 
                  onChange={e => setNewRole(e.target.value as 'player' | 'admin')} 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-xs outline-none focus:border-indigo-500 dark:text-white font-extrabold"
                >
                  <option value="player">👤 Jogador</option>
                  <option value="admin">🔑 Administrador</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Saldo Fictício Inicial (R$)</label>
                <div className="relative">
                  <Coins className="absolute left-3.5 top-3 w-4 h-4 text-amber-500" />
                  <input 
                    type="number" 
                    value={newCoins} 
                    onChange={e => setNewCoins(e.target.value)} 
                    placeholder="500" 
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 pl-10 pr-3 p-3 rounded-xl text-xs outline-none focus:border-indigo-500 dark:text-white font-black"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => setShowCreateForm(false)} 
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 font-bold text-xs px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
              >
                Salvar Cadastro
              </button>
            </div>
          </form>
        )}

        {/* 🔍 Search and Filters Bar */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 mb-6 border border-slate-200/40 dark:border-slate-800/80 shadow-sm flex flex-col md:flex-row items-center gap-3">
          <div className="relative w-full md:flex-1">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome, e-mail, telefone ou CPF..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800 pl-10 pr-4 p-2.5 rounded-2xl text-xs outline-none focus:border-indigo-500 dark:text-white font-semibold"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-955 p-1 rounded-2xl border border-slate-200/40 dark:border-slate-800 w-full md:w-auto">
            {(['all', 'player', 'admin'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                  roleFilter === r
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-400 hover:text-slate-650 dark:hover:text-slate-200"
                }`}
              >
                {r === 'all' ? 'Todos' : r === 'player' ? 'Jogadores' : 'Admins'}
              </button>
            ))}
          </div>
        </div>

        {/* 📋 User Registry Table and Lists */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          {/* Mobile view: Card Layout */}
          <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-805">
            {filteredUsers.map(user => (
              <div key={user.uid} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-extrabold text-slate-850 dark:text-white text-sm">{user.name}</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-450 mt-0.5">{user.email || 'Sem e-mail'}</p>
                    {user.phone && <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">📞 {user.phone}</p>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wide ${user.role === 'admin' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                      {user.role === 'admin' ? 'Admin' : 'Jogador'}
                    </span>
                    <button 
                      onClick={() => handleOpenEdit(user)} 
                      className="p-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-lg border border-slate-200/50 dark:border-slate-700/50 transition-colors"
                      title="Editar cadastro"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteUser(user.uid, user.name)} 
                      className="p-1.5 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-lg border border-rose-100 dark:border-rose-900/30 transition-colors"
                      title="Excluir cadastro"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-3 gap-3 border-t border-slate-50 dark:border-slate-800">
                  <div className="flex items-center gap-1 font-black text-amber-500 text-xs">
                    <Coins className="w-4 h-4" />
                    <span>{user.coins} moedas</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <input 
                      type="number" 
                      value={editingCoins[user.uid] || ''} 
                      onChange={(e) => handleCoinsChange(user.uid, e.target.value)}
                      placeholder="Valor"
                      className="w-16 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1.5 rounded-lg text-xs outline-none focus:border-indigo-500 dark:text-white"
                    />
                    <button 
                      onClick={() => handleAddCoins(user.uid, user.coins, editingCoins[user.uid] || '')}
                      disabled={!editingCoins[user.uid]}
                      className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg text-[10px] font-black transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      + Add
                    </button>
                    <button 
                      onClick={() => handleSubtractCoins(user.uid, user.coins, editingCoins[user.uid] || '')}
                      disabled={!editingCoins[user.uid]}
                      className="bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-105 px-2.5 py-1.5 rounded-lg text-[10px] font-black transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      - Sub
                    </button>
                    <button 
                      onClick={() => handleSetCoins(user.uid, editingCoins[user.uid] || '')}
                      disabled={!editingCoins[user.uid]}
                      className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg text-[10px] font-black transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      = Set
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <div className="p-8 text-center text-slate-400 font-medium">Nenhum usuário encontrado.</div>
            )}
          </div>

          {/* Desktop view: Table Layout */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 uppercase text-[10px] font-black tracking-wider text-slate-400 dark:text-slate-500">
                  <th className="p-4">Identificação</th>
                  <th className="p-4">Contato / Cadastro</th>
                  <th className="p-4">Função</th>
                  <th className="p-4">Saldo</th>
                  <th className="p-4">Ajuste Rápido de Saldo</th>
                  <th className="p-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user.uid} className="border-b border-slate-50 dark:border-slate-800/60 last:border-0 hover:bg-slate-50/30 dark:hover:bg-slate-900/30 transition-colors">
                    <td className="p-4">
                      <div className="font-extrabold text-slate-800 dark:text-white text-sm">{user.name}</div>
                      {user.cpf && <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">CPF: {user.cpf}</div>}
                    </td>
                    <td className="p-4">
                      <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {user.email || 'N/A'}
                      </div>
                      {user.phone && (
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {user.phone}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${user.role === 'admin' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                        {user.role === 'admin' ? 'Administrador' : 'Jogador'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 font-black text-amber-500 text-sm">
                        <Coins className="w-4 h-4" />
                        {user.coins}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <input 
                          type="number" 
                          value={editingCoins[user.uid] || ''} 
                          onChange={(e) => handleCoinsChange(user.uid, e.target.value)}
                          placeholder="Valor"
                          className="w-20 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 rounded-lg outline-none focus:border-indigo-500 dark:text-white text-sm"
                        />
                        <button 
                          onClick={() => handleAddCoins(user.uid, user.coins, editingCoins[user.uid] || '')}
                          disabled={!editingCoins[user.uid]}
                          className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 px-2.5 py-2 rounded-lg text-xs font-black transition-colors disabled:opacity-40 cursor-pointer"
                          title="Somar saldo atual"
                        >
                          + Adicionar
                        </button>
                        <button 
                          onClick={() => handleSubtractCoins(user.uid, user.coins, editingCoins[user.uid] || '')}
                          disabled={!editingCoins[user.uid]}
                          className="bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60 px-2.5 py-2 rounded-lg text-xs font-black transition-colors disabled:opacity-40 cursor-pointer"
                          title="Subtrair do saldo"
                        >
                          - Remover
                        </button>
                        <button 
                          onClick={() => handleSetCoins(user.uid, editingCoins[user.uid] || '')}
                          disabled={!editingCoins[user.uid]}
                          className="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 px-2.5 py-2 rounded-lg text-xs font-black transition-colors disabled:opacity-40 cursor-pointer"
                          title="Substituir saldo pelo novo valor"
                        >
                          = Definir
                        </button>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleOpenEdit(user)} 
                          className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-350 rounded-xl border border-slate-200/55 dark:border-slate-700 transition-colors cursor-pointer"
                          title="Editar Cadastro"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user.uid, user.name)} 
                          className="p-2 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-100 dark:border-rose-900/30 transition-colors cursor-pointer"
                          title="Excluir Cadastro"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 font-bold text-xs">Nenhum usuário correspondente aos filtros foi encontrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ✏️ EDIT MODAL (Update Dialog) */}
        {editingUser && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl relative animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-3.5 mb-4">
                <h3 className="font-black text-sm text-slate-850 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-indigo-500" />
                  Editar Cadastro do Usuário
                </h3>
                <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nome Completo</label>
                  <input 
                    type="text" 
                    value={editName} 
                    onChange={e => setEditName(e.target.value)} 
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-xs outline-none focus:border-indigo-500 dark:text-white font-semibold"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">E-mail</label>
                    <input 
                      type="email" 
                      value={editEmail} 
                      onChange={e => setEditEmail(e.target.value)} 
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-xs outline-none focus:border-indigo-500 dark:text-white font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Telefone</label>
                    <input 
                      type="text" 
                      value={editPhone} 
                      onChange={e => setEditPhone(e.target.value)} 
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-xs outline-none focus:border-indigo-500 dark:text-white font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">CPF (Opcional)</label>
                    <input 
                      type="text" 
                      value={editCpf} 
                      onChange={e => setEditCpf(e.target.value)} 
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-xs outline-none focus:border-indigo-500 dark:text-white font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo (Coins)</label>
                    <input 
                      type="number" 
                      value={editCoins} 
                      onChange={e => setEditCoins(e.target.value)} 
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-xs outline-none focus:border-indigo-500 dark:text-white font-black"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Função / Nível de Acesso</label>
                  <select 
                    value={editRole} 
                    onChange={e => setEditRole(e.target.value as 'player' | 'admin')} 
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-xs outline-none focus:border-indigo-500 dark:text-white font-extrabold"
                  >
                    <option value="player">👤 Jogador Normal</option>
                    <option value="admin">🔑 Administrador</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button 
                    type="button" 
                    onClick={() => setEditingUser(null)} 
                    className="bg-slate-105 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-650 dark:text-slate-300 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer"
                  >
                    Descartar
                  </button>
                  <button 
                    type="submit" 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-md cursor-pointer"
                  >
                    Confirmar Alterações
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
