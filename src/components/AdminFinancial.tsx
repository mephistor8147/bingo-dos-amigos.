import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, query, orderBy, getDoc } from 'firebase/firestore';
import { Loader2, ArrowLeft, Coins, TrendingUp, TrendingDown, Clock, ShieldCheck, Check, X, Search, DollarSign } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface AdminFinancialProps {
  onGoBack: () => void;
}

interface Transaction {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  coins: number;
  timestamp: number;
  status: 'completed' | 'pending' | 'approved' | 'rejected';
  pixKey?: string;
  description: string;
}

export function AdminFinancial({ onGoBack }: AdminFinancialProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'rejected'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'deposit' | 'withdrawal'>('all');

  // Stats
  const [totalDeposits, setTotalDeposits] = useState(0);
  const [totalWithdrawals, setTotalWithdrawals] = useState(0);
  const [pendingWithdrawalsCount, setPendingWithdrawalsCount] = useState(0);
  const [pendingWithdrawalsSum, setPendingWithdrawalsSum] = useState(0);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const txRef = collection(db, 'transactions');
      const q = query(txRef, orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      
      const txData: Transaction[] = [];
      let depSum = 0;
      let witSum = 0;
      let pendCount = 0;
      let pendSum = 0;

      snapshot.forEach((document) => {
        const data = document.data();
        const tx = { id: document.id, ...data } as Transaction;
        txData.push(tx);

        if (tx.type === 'deposit' && tx.status === 'completed') {
          depSum += tx.amount;
        } else if (tx.type === 'withdrawal') {
          if (tx.status === 'completed' || tx.status === 'approved') {
            witSum += tx.amount;
          } else if (tx.status === 'pending') {
            pendCount++;
            pendSum += tx.amount;
          }
        }
      });

      setTransactions(txData);
      setTotalDeposits(depSum);
      setTotalWithdrawals(witSum);
      setPendingWithdrawalsCount(pendCount);
      setPendingWithdrawalsSum(pendSum);
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
      toast.error("Erro ao buscar extrato financeiro");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // APPROVE WITHDRAWAL
  const handleApproveWithdrawal = async (tx: Transaction) => {
    const confirm = window.confirm(`Deseja aprovar o saque de R$ ${tx.amount.toFixed(2)} para ${tx.userName}?`);
    if (!confirm) return;

    try {
      // Update global transaction
      await updateDoc(doc(db, 'transactions', tx.id), {
        status: 'approved',
        description: `Saque via Pix aprovado e pago via Painel Administrativo`
      });

      // Update user transaction history item
      try {
        await updateDoc(doc(db, 'users', tx.userId, 'transactions', tx.id), {
          status: 'approved',
          description: `Saque via Pix aprovado e pago`
        });
      } catch (subErr) {
        console.warn("Could not write to user transaction subcollection:", subErr);
      }

      toast.success("Saque aprovado com sucesso!", { icon: '✅' });
      fetchTransactions(); // Refresh
    } catch (err) {
      console.error("Failed to approve transaction:", err);
      toast.error("Erro ao aprovar transação");
    }
  };

  // REJECT WITHDRAWAL (REFUND COINS)
  const handleRejectWithdrawal = async (tx: Transaction) => {
    const confirm = window.confirm(`Deseja recusar o saque de R$ ${tx.amount.toFixed(2)}? O valor de ${tx.coins.toLocaleString()} moedas será devolvido à conta do jogador.`);
    if (!confirm) return;

    try {
      // Refund the coins to the user
      const userRef = doc(db, 'users', tx.userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const currentCoins = Number(userData.coins || 0);
        await updateDoc(userRef, {
          coins: currentCoins + tx.coins
        });
      }

      // Update global transaction
      await updateDoc(doc(db, 'transactions', tx.id), {
        status: 'rejected',
        description: `Saque recusado pelo administrador. Saldo de ${tx.coins.toLocaleString()} moedas estornado.`
      });

      // Update user transaction history item
      try {
        await updateDoc(doc(db, 'users', tx.userId, 'transactions', tx.id), {
          status: 'rejected',
          description: `Saque recusado. Moedas estornadas para sua carteira.`
        });
      } catch (subErr) {
        console.warn("Could not write to user transaction subcollection:", subErr);
      }

      toast.success("Saque rejeitado e moedas estornadas com sucesso!", { icon: '↩️' });
      fetchTransactions(); // Refresh
    } catch (err) {
      console.error("Failed to reject transaction:", err);
      toast.error("Erro ao recusar transação");
    }
  };

  // Filters
  const filteredTx = transactions.filter(t => {
    const matchesSearch = 
      (t.userName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.userEmail || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.pixKey || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = 
      statusFilter === 'all' || 
      t.status === statusFilter ||
      (statusFilter === 'completed' && t.status === 'approved'); // Treat 'approved' withdrawal as completed

    const matchesType = typeFilter === 'all' || t.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  const netGain = totalDeposits - totalWithdrawals;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 transition-colors">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={onGoBack} className="p-2 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white flex items-center gap-2">
              Menu Financeiro 💰
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">Gerencie os pagamentos, recebimentos, depósitos e ordens de saques em tempo real.</p>
          </div>
        </div>

        {/* 📊 Financial Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Card 1: Total Deposited */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Recebido (Pix)</span>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">R$ {totalDeposits.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-2xl text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: Total Paid (Withdrawals) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Pago (Saques)</span>
              <div className="text-xl font-black text-rose-600 dark:text-rose-400">R$ {totalWithdrawals.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="bg-rose-50 dark:bg-rose-950/40 p-3 rounded-2xl text-rose-600 dark:text-rose-400">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: Pending Withdrawals */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Saques Pendentes ({pendingWithdrawalsCount})</span>
              <div className="text-xl font-black text-amber-500">R$ {pendingWithdrawalsSum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-2xl text-amber-500 animate-pulse">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          {/* Card 4: Net Profit (Apurado) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Apurado Líquido</span>
              <div className={`text-xl font-black ${netGain >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-500'}`}>
                R$ {netGain.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className={`p-3 rounded-2xl ${netGain >= 0 ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400' : 'bg-rose-50 text-rose-500'}`}>
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* 🔍 Search and Filters Bar */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 mb-6 border border-slate-200/40 dark:border-slate-800/80 shadow-sm flex flex-col lg:flex-row items-center gap-3">
          <div className="relative w-full lg:flex-1">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar por usuário, e-mail, chave PIX ou descrição..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800 pl-10 pr-4 p-2.5 rounded-2xl text-xs outline-none focus:border-indigo-500 dark:text-white font-semibold"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as any)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-xs outline-none text-slate-700 dark:text-slate-300 font-extrabold flex-1 lg:flex-none"
            >
              <option value="all">💳 Todos Fluxos</option>
              <option value="deposit">📥 Recebimentos (Pix)</option>
              <option value="withdrawal">📤 Pagamentos (Saques)</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-xs outline-none text-slate-700 dark:text-slate-300 font-extrabold flex-1 lg:flex-none"
            >
              <option value="all">🎯 Todos Status</option>
              <option value="pending">⏳ Pendente</option>
              <option value="completed">✅ Pago / Completo</option>
              <option value="rejected">❌ Rejeitado</option>
            </select>
          </div>
        </div>

        {/* Extrato Financeiro List */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          {/* Mobile view: Card Layout */}
          <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-805">
            {filteredTx.map(tx => {
              const dateStr = new Date(tx.timestamp).toLocaleString('pt-BR');
              return (
                <div key={tx.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-extrabold text-slate-850 dark:text-white text-sm">{tx.userName}</h4>
                      <p className="text-[10px] text-slate-400 dark:text-slate-450 mt-0.5">{tx.userEmail || 'Sem e-mail'}</p>
                      <p className="text-[9px] text-slate-400 dark:text-slate-550 mt-1">{dateStr}</p>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wide ${
                      tx.type === 'deposit' 
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/30' 
                        : 'bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/30'
                    }`}>
                      {tx.type === 'deposit' ? '📥 Recebido' : '📤 Saque'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-650 dark:text-slate-350 font-medium">{tx.description}</p>
                  
                  {tx.pixKey && (
                    <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded-xl text-[10px] font-semibold text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-900">
                      Chave PIX: <span className="font-black text-slate-800 dark:text-slate-200 select-all">{tx.pixKey}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-50 dark:border-slate-800">
                    <div className="space-y-0.5">
                      <div className="font-black text-slate-850 dark:text-white text-sm">
                        R$ {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[9px] text-slate-400 font-bold">
                        ({tx.coins.toLocaleString()} moedas)
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {tx.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => handleApproveWithdrawal(tx)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer transition-all"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Aprovar
                          </button>
                          <button
                            onClick={() => handleRejectWithdrawal(tx)}
                            className="bg-rose-600 hover:bg-rose-700 text-white p-2 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer transition-all"
                          >
                            <X className="w-3.5 h-3.5" />
                            Recusar
                          </button>
                        </>
                      ) : (
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
                          tx.status === 'completed' || tx.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-450'
                        }`}>
                          {tx.status === 'completed' || tx.status === 'approved' ? 'Pago' : 'Recusado'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredTx.length === 0 && (
              <div className="p-8 text-center text-slate-400 font-medium">Nenhuma transação financeira encontrada.</div>
            )}
          </div>

          {/* Desktop view: Table Layout */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 uppercase text-[10px] font-black tracking-wider text-slate-400 dark:text-slate-500">
                  <th className="p-4">Usuário</th>
                  <th className="p-4">Fluxo / Data</th>
                  <th className="p-4">Descrição / PIX</th>
                  <th className="p-4">Valor BRL / Moedas</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Ações de Pagamento</th>
                </tr>
              </thead>
              <tbody>
                {filteredTx.map(tx => {
                  const dateStr = new Date(tx.timestamp).toLocaleString('pt-BR');
                  return (
                    <tr key={tx.id} className="border-b border-slate-50 dark:border-slate-800/60 last:border-0 hover:bg-slate-50/30 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="p-4">
                        <div className="font-extrabold text-slate-800 dark:text-white text-sm">{tx.userName}</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-450 mt-0.5">{tx.userEmail}</div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wide ${
                          tx.type === 'deposit' 
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/30 dark:bg-emerald-950/30 dark:text-emerald-450' 
                            : 'bg-rose-50 text-rose-600 border border-rose-100/30 dark:bg-rose-950/30 dark:text-rose-450'
                        }`}>
                          {tx.type === 'deposit' ? '📥 Recebido' : '📤 Saque'}
                        </span>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-1">{dateStr}</div>
                      </td>
                      <td className="p-4 max-w-xs">
                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 line-clamp-2">{tx.description}</div>
                        {tx.pixKey && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-450 mt-1 select-all font-mono">
                            Chave PIX: <span className="font-extrabold text-slate-800 dark:text-slate-200">{tx.pixKey}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="font-black text-slate-800 dark:text-white text-sm">
                          R$ {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold mt-0.5">
                          ({tx.coins.toLocaleString()} moedas)
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase ${
                          tx.status === 'pending'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 animate-pulse'
                            : tx.status === 'completed' || tx.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : 'bg-slate-100 text-slate-550 dark:bg-slate-800 dark:text-slate-455'
                        }`}>
                          {tx.status === 'pending' ? '⏳ Pendente' : tx.status === 'completed' || tx.status === 'approved' ? 'Aprovado' : 'Recusado'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {tx.status === 'pending' ? (
                            <>
                              <button 
                                onClick={() => handleApproveWithdrawal(tx)} 
                                className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm shadow-emerald-500/10 cursor-pointer hover:scale-[1.02] transition-all"
                                title="Aprovar transferência e liberar pagamento"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Liberar Pix</span>
                              </button>
                              <button 
                                onClick={() => handleRejectWithdrawal(tx)} 
                                className="bg-rose-600 hover:bg-rose-700 text-white p-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm shadow-rose-500/10 cursor-pointer hover:scale-[1.02] transition-all"
                                title="Recusar e devolver saldo ao jogador"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Recusar</span>
                              </button>
                            </>
                          ) : (
                            <span className="text-xs font-bold text-slate-400 flex items-center gap-1 select-none">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              Encerrado
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredTx.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 font-bold text-xs">Nenhum fluxo financeiro registrado com esses filtros.</td>
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
