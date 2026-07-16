import React, { useRef, useState, useEffect } from 'react';
import { 
  User, 
  LogOut, 
  ArrowLeft, 
  Coins, 
  TrendingUp, 
  Download, 
  Upload, 
  Settings, 
  Check, 
  Copy, 
  QrCode, 
  History, 
  ArrowDownLeft, 
  ArrowUpRight, 
  ShieldCheck, 
  Wallet,
  Smartphone
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ProfileScreenProps {
  user: any; 
  onGoBack: () => void;
  onLogout: () => void;
  onGoSettings?: () => void;
  onUpdateProfilePhoto?: (photoURL: string) => void;
}

export function ProfileScreen({ user, onGoBack, onLogout, onGoSettings, onUpdateProfilePhoto }: ProfileScreenProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Tab control: 'info' | 'deposit' | 'withdraw'
  const [activeTab, setActiveTab] = useState<'info' | 'deposit' | 'withdraw'>('info');
  
  // Deposit States
  const [depositAmount, setDepositAmount] = useState<number>(20);
  const [customDeposit, setCustomDeposit] = useState<string>('');
  const [showPixPay, setShowPixPay] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Withdraw States
  const [pixKeyType, setPixKeyType] = useState<'cpf' | 'phone' | 'email' | 'random'>('cpf');
  const [pixKey, setPixKey] = useState('');
  const [withdrawCoins, setWithdrawCoins] = useState<number>(2000); // 2000 coins = R$ 20.00
  const [customWithdrawCoins, setCustomWithdrawCoins] = useState<string>('');
  
  // Ledger Transactions State
  const [history, setHistory] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Synchronise Transaction history dynamically
  useEffect(() => {
    if (!user || !user.uid) return;
    
    let unsubscribe: () => void = () => {};

    const setupSnapshot = async () => {
      const { collection, onSnapshot, query, orderBy, limit } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');
      
      const q = query(
        collection(db, 'users', user.uid, 'transactions'),
        orderBy('timestamp', 'desc'),
        limit(25)
      );
      
      unsubscribe = onSnapshot(q, (snapshot) => {
        const txs: any[] = [];
        snapshot.forEach((doc) => {
          txs.push({ id: doc.id, ...doc.data() });
        });
        setHistory(txs);
      }, (err) => {
        console.error("Transações sync error:", err);
      });
    };

    setupSnapshot();
    
    return () => {
      unsubscribe();
    };
  }, [user]);

  // Handle Photo changes
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 600 * 1024) {
      toast.error("A imagem deve ter no máximo 600KB para ser salva.");
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

  // Generate real looking pix copy/paste key based on current value
  const getPixCode = () => {
    const amount = customDeposit ? Number(customDeposit) : depositAmount;
    const formattedAmount = Number(amount).toFixed(2);
    return `00020101021126360014br.gov.pix0114+55119999999995204000053039865404${formattedAmount}5802BR5913BINGOLIVE6009SAOPAULO62070503***6304CAFE`;
  };

  const handleCopyPix = () => {
    navigator.clipboard.writeText(getPixCode());
    setCopied(true);
    toast.success("Código PIX Copia e Cola copiado!", { icon: '📋' });
    setTimeout(() => setCopied(false), 2000);
  };

  // Process Simulated Deposit
  const handleSimulatedDeposit = async () => {
    const amountVal = customDeposit ? Number(customDeposit) : depositAmount;
    if (isNaN(amountVal) || amountVal <= 0) {
      toast.error("Valor de depósito inválido!");
      return;
    }

    setIsProcessing(true);
    try {
      const { doc, updateDoc, collection, setDoc } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');

      const creditedCoins = amountVal * 100; // 1 Real = 100 dev-coins
      
      // Update User Balance in Firestore
      const userRef = doc(db, 'users', user.uid);
      const currentCoins = Number(user.coins || 0);

      await updateDoc(userRef, {
        coins: currentCoins + creditedCoins
      });

      // Generate a shared transaction ID
      const txRef = doc(collection(db, 'transactions'));
      const txId = txRef.id;

      const txPayload = {
        userId: user.uid,
        userName: user.name,
        userEmail: user.email || '',
        type: 'deposit',
        amount: amountVal,
        coins: creditedCoins,
        timestamp: Date.now(),
        status: 'completed',
        description: `Depósito via Pix`
      };

      // Record Global Ledger (for Admin)
      await setDoc(doc(db, 'transactions', txId), txPayload);

      // Record User subcollection Ledger (for Player profile history)
      await setDoc(doc(db, 'users', user.uid, 'transactions', txId), {
        type: txPayload.type,
        amount: txPayload.amount,
        coins: txPayload.coins,
        timestamp: txPayload.timestamp,
        status: txPayload.status,
        description: txPayload.description
      });

      toast.success(`🎉 Depósito de R$ ${amountVal.toFixed(2)} (${creditedCoins.toLocaleString()} Moedas) processado com sucesso!`, { duration: 5000 });
      setShowPixPay(false);
      setCustomDeposit('');
      setActiveTab('info');
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao creditar saldo de depósitos.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Process Simulated Withdrawal
  const handleSimulatedWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalWithdrawCoins = customWithdrawCoins ? Number(customWithdrawCoins) : withdrawCoins;
    
    if (isNaN(finalWithdrawCoins) || finalWithdrawCoins <= 0) {
      toast.error("Quantidade de moedas para saque inválida!");
      return;
    }

    if (finalWithdrawCoins < 1000) {
      toast.error("Saque mínimo de 1.000 moedas (R$ 10,00).");
      return;
    }

    const currentCoins = Number(user.coins || 0);
    if (finalWithdrawCoins > currentCoins) {
      toast.error(`Saldo insuficiente! Você possui ${currentCoins.toLocaleString()} moedas.`);
      return;
    }

    if (!pixKey.trim()) {
      toast.error("Por favor, informe a Chave PIX de destino.");
      return;
    }

    setIsProcessing(true);
    try {
      const { doc, updateDoc, collection, setDoc } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');

      const userRef = doc(db, 'users', user.uid);
      const debitValue = finalWithdrawCoins;
      const convertBrl = Number(debitValue / 100);

      // Debit User balance immediately to lock the funds
      await updateDoc(userRef, {
        coins: currentCoins - debitValue
      });

      // Generate a shared transaction ID
      const txRef = doc(collection(db, 'transactions'));
      const txId = txRef.id;

      const txPayload = {
        userId: user.uid,
        userName: user.name,
        userEmail: user.email || '',
        type: 'withdrawal',
        amount: convertBrl,
        coins: debitValue,
        timestamp: Date.now(),
        status: 'pending',
        pixKey: pixKey,
        description: `Saque via Pix para ${pixKey}`
      };

      // Record Global Ledger (for Admin approval)
      await setDoc(doc(db, 'transactions', txId), txPayload);

      // Record User subcollection Ledger (for player history)
      await setDoc(doc(db, 'users', user.uid, 'transactions', txId), {
        type: txPayload.type,
        amount: txPayload.amount,
        coins: txPayload.coins,
        timestamp: txPayload.timestamp,
        status: txPayload.status,
        pixKey: txPayload.pixKey,
        description: txPayload.description
      });

      toast.success(`💸 Solicitação de Saque de R$ ${convertBrl.toFixed(2)} (${debitValue.toLocaleString()} moedas) enviada para análise e aprovação!`, { duration: 6000 });
      setPixKey('');
      setCustomWithdrawCoins('');
      setActiveTab('info');
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao registrar transação de saque.");
    } finally {
      setIsProcessing(false);
    }
  };

  const getActiveDepositVal = () => {
    return customDeposit ? Number(customDeposit) : depositAmount;
  };

  const getActiveWithdrawVal = () => {
    return customWithdrawCoins ? Number(customWithdrawCoins) : withdrawCoins;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors flex flex-col items-center py-6 sm:py-10 px-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-800 transition-colors">
        
        {/* Profile Card Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 relative text-white">
          <div className="flex items-center justify-between w-full mb-4">
            <button 
               onClick={onGoBack} 
               className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs transition-all pointer-events-auto cursor-pointer"
            >
               <ArrowLeft className="w-4 h-4" />
               <span>Voltar</span>
            </button>
            <span className="text-[10px] font-black tracking-widest text-emerald-100 uppercase bg-black/10 px-2.5 py-1.5 rounded-lg select-none">Carteira & Perfil</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="relative group">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center border-4 border-emerald-300 overflow-hidden shadow-lg cursor-pointer hover:scale-105 active:scale-95 transition-all"
                title="Alterar imagem de perfil"
              >
                 {user.photoURL ? (
                    <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                 ) : (
                    <User className="w-10 h-10 text-slate-300 pointer-events-none" />
                 )}
                 <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[9px] font-black uppercase tracking-wider text-center px-1 rounded-full select-none">
                   Alterar Foto
                 </div>
              </div>
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 p-1.5 bg-amber-500 hover:bg-amber-600 border border-amber-400 text-white rounded-full shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center"
              >
                <Upload className="w-3 h-3" />
              </button>
            </div>

            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            
            <h2 className="text-xl font-black text-white text-center leading-tight mt-3">
              {user.name}
            </h2>
            <p className="text-emerald-100 font-bold text-[10px] sm:text-xs tracking-wider uppercase mt-1">
              CPF: {user.cpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') || 'N/A'}
            </p>
          </div>
        </div>

        {/* Balance Section Grid */}
        <div className="bg-emerald-50 dark:bg-emerald-950/20 m-6 mb-4 rounded-2xl p-4 border border-emerald-100/60 dark:border-emerald-900/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 dark:bg-amber-950/50 p-3 rounded-full">
              <Coins className="w-8 h-8 text-amber-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest leading-none mb-1">Saldo do Usuário</p>
              <div className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white leading-none">
                {user.coins?.toLocaleString() || 0}
              </div>
              <p className="text-[10px] text-slate-400 font-semibold mt-1">Equivalente a R$ {((user.coins || 0) / 100).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Internal Ledger Navigation Tabs */}
        <div className="px-6 flex gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <button
            onClick={() => { setActiveTab('info'); setShowPixPay(false); }}
            className={`flex-1 py-2 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer ${activeTab === 'info' ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white font-extrabold' : 'text-slate-400 hover:text-slate-650'}`}
          >
            Cadastro
          </button>
          <button
            onClick={() => setActiveTab('deposit')}
            className={`flex-1 py-2 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${activeTab === 'deposit' ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-extrabold' : 'text-slate-400 hover:text-slate-650'}`}
          >
            <Upload className="w-3.5 h-3.5" />
            Depositar
          </button>
          <button
            onClick={() => { setActiveTab('withdraw'); setShowPixPay(false); }}
            className={`flex-1 py-2 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${activeTab === 'withdraw' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-slate-400 hover:text-slate-650'}`}
          >
            <Download className="w-3.5 h-3.5" />
            Sacar
          </button>
        </div>

        {/* Tab Content renderers */}
        <div className="p-6 space-y-6">
          
          {/* TAB 1: USER DETAILS */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* Profile details */}
              <div className="bg-slate-50 dark:bg-slate-950/40 rounded-2xl p-4 border border-slate-150/45 dark:border-slate-800 space-y-3">
                <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Detalhes do Cadastro</h3>
                <div className="flex justify-between border-b border-slate-200/40 dark:border-slate-800 pb-2">
                    <span className="text-slate-500 dark:text-slate-400 font-medium text-xs">E-mail</span>
                    <span className="text-slate-800 dark:text-slate-100 font-bold text-xs text-right line-clamp-1">{user.email || 'Não informado'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/40 dark:border-slate-800 pb-2">
                    <span className="text-slate-500 dark:text-slate-400 font-medium text-xs">Telefone</span>
                    <span className="text-slate-800 dark:text-slate-100 font-bold text-xs">{user.phone || 'Não informado'}</span>
                </div>
                <div className="flex justify-between pb-1">
                    <span className="text-slate-500 dark:text-slate-400 font-medium text-xs">Permissões</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-black text-[10px] capitalize bg-emerald-500/10 px-2 py-0.5 rounded">
                      {user.role === 'admin' ? '👑 Administrador' : '🎮 Jogador'}
                    </span>
                </div>
              </div>

              {/* Avatar Style Presets */}
              <div className="bg-slate-50 dark:bg-slate-950/40 rounded-2xl p-4 border border-slate-150/45 dark:border-slate-800 space-y-3">
                <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Estilos de Avatar</h3>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { name: 'Gamer Pixel', url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Jack' },
                    { name: 'Sorte Mítica', url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Sophia' },
                    { name: 'Ouro Fino', url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Felix' },
                    { name: 'Ciborgue Bingo', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Robo1' },
                    { name: 'Fúria Neon', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Robo2' },
                    { name: 'Mente Quente', url: 'https://api.dicebear.com/7.x/mindblown/svg?seed=Mind' },
                    { name: 'Trevo de Ouro', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Lucky' },
                    { name: 'Mago Real', url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Garra' },
                  ].map((av) => (
                    <button
                      key={av.name}
                      type="button"
                      onClick={() => onUpdateProfilePhoto && onUpdateProfilePhoto(av.url)}
                      className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all p-1 hover:scale-105 active:scale-95 flex items-center justify-center ${user.photoURL === av.url ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 ring-2 ring-amber-300' : 'border-transparent bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                      title={av.name}
                    >
                      <img src={av.url} alt={av.name} className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Transactions History / Ledger Logs */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <History className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Extrato de Transações (Ledger)</h3>
                  </div>
                  <span className="text-[9px] text-slate-400 font-bold select-none">{history.length} registradas</span>
                </div>

                {history.length === 0 ? (
                  <div className="bg-slate-50 dark:bg-slate-950/30 rounded-2xl p-6 text-center border border-dashed border-slate-200 dark:border-slate-800">
                    <Coins className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                    <p className="text-xs text-slate-400 font-bold">Nenhuma transação no histórico.</p>
                    <p className="text-[10px] text-slate-400">Suas movimentações Pix e compras de cartões aparecerão listadas aqui!</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {history.map((tx) => (
                      <div 
                        key={tx.id}
                        className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 rounded-xl flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          {tx.type === 'deposit' ? (
                            <div className="bg-emerald-50 dark:bg-emerald-950/45 p-2 rounded-lg text-emerald-600 dark:text-emerald-400">
                              <ArrowDownLeft className="w-4 h-4" />
                            </div>
                          ) : (
                            <div className="bg-amber-50 dark:bg-amber-950/45 p-2 rounded-lg text-amber-600 dark:text-amber-400">
                              <ArrowUpRight className="w-4 h-4" />
                            </div>
                          )}
                          <div className="text-left text-xs leading-tight">
                            <p className="font-extrabold text-slate-800 dark:text-slate-200">
                              {tx.type === 'deposit' ? 'Depósito Recebido' : 'Saque Efetuado'}
                            </p>
                            <span className="text-[9px] text-slate-400 font-semibold">{new Date(tx.timestamp).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                          </div>
                        </div>
                        <div className="text-right leading-none">
                          <span className={`font-black text-xs ${tx.type === 'deposit' ? 'text-emerald-500' : 'text-amber-500'}`}>
                            {tx.type === 'deposit' ? '+' : '-'}{tx.coins.toLocaleString()}
                          </span>
                          <p className="text-[8px] text-slate-400 font-semibold mt-0.5">R$ {tx.amount.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CREDIT / DEPOSIT VIA PIX */}
          {activeTab === 'deposit' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-2xl p-4 shadow-sm relative">
                <Wallet className="absolute top-4 right-4 w-12 h-12 text-indigo-300/30" />
                <h3 className="font-black text-sm uppercase tracking-wider">Depósito Pix Instantâneo</h3>
                <p className="text-indigo-100 text-[11px] mt-1 pr-6">Adicione moedas fictícias no saldo simulando uma transação PIX. Suas moedas são ativadas na hora!</p>
              </div>

              {!showPixPay ? (
                <div className="space-y-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 text-center">Selecione o valor do depósito</span>
                  <div className="grid grid-cols-2 gap-3">
                    {[10, 20, 50, 100].map(val => (
                      <button
                        key={val}
                        onClick={() => { setDepositAmount(val); setCustomDeposit(''); }}
                        className={`p-3.5 rounded-xl border font-bold text-center flex flex-col items-center justify-center transition-all cursor-pointer ${depositAmount === val && !customDeposit ? 'bg-indigo-600 text-white border-indigo-400 shadow-md ring-2 ring-indigo-300' : 'border-slate-150 text-slate-700 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white'}`}
                      >
                        <span className="text-[10px] uppercase font-black tracking-widest text-indigo-400/80">PRESET</span>
                        <span className="text-lg font-black">R$ {val}</span>
                        <span className="text-[10px] font-semibold opacity-85">{(val * 100).toLocaleString()} moedas</span>
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1">Ou digite um valor personalizado (R$)</label>
                    <input 
                      type="number" 
                      min="1" 
                      value={customDeposit} 
                      onChange={e => {setCustomDeposit(e.target.value); setDepositAmount(0); }}
                      placeholder="Valor personalizado. Ex: 15" 
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800 dark:text-slate-100" 
                    />
                  </div>

                  <button 
                    onClick={() => setShowPixPay(true)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold p-4 rounded-xl mt-2 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-md shadow-indigo-600/10 cursor-pointer text-sm uppercase"
                  >
                    <QrCode className="w-5 h-5" />
                    Gerar Código QR do PIX
                  </button>
                </div>
              ) : (
                <div className="space-y-4 bg-slate-50 dark:bg-slate-900 border border-slate-200/40 p-4 rounded-2xl text-center">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Qr-Code Pix Gerado</span>
                    <button onClick={() => setShowPixPay(false)} className="text-xs font-bold text-slate-400 hover:text-slate-550 underline bg-transparent border-none">Alterar valor</button>
                  </div>
                  
                  {/* Visual QR code mockup representation */}
                  <div className="bg-white p-4 rounded-2xl aspect-square max-w-44 mx-auto border border-slate-200/60 shadow-inner flex flex-col items-center justify-center relative">
                    <QrCode className="w-full h-full text-zinc-900" />
                    <div className="absolute inset-0 bg-transparent flex items-center justify-center">
                      <div className="bg-white border-2 border-slate-100 rounded-lg p-1.5 shadow-md font-black text-[9px] text-indigo-700 select-none uppercase tracking-widest">BINGO PIX</div>
                    </div>
                  </div>

                  <p className="text-xs font-extrabold text-slate-705 dark:text-slate-350">
                    Valor a ser Pago: <span className="text-indigo-650 dark:text-indigo-400 font-extrabold text-sm font-black">R$ {getActiveDepositVal().toFixed(2)}</span>
                  </p>
                  <p className="text-[10px] text-slate-400">Equivale a <span className="font-bold text-amber-500">{(getActiveDepositVal() * 100).toLocaleString()} moedas</span> créditos</p>

                  <div className="space-y-2">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest text-left">Código Pix Copia e Cola:</label>
                    <div className="flex gap-2 bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-800 p-2 rounded-xl text-left">
                      <input 
                        readOnly 
                        value={getPixCode()} 
                        className="text-[9px] font-mono text-slate-500 bg-transparent outline-none flex-1 min-w-0 pointer-events-none select-all" 
                      />
                      <button 
                        onClick={handleCopyPix}
                        className="p-1 px-2.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-lg text-indigo-600 transition-all text-[10px] font-bold flex items-center gap-1 active:scale-90"
                      >
                        {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span>{copied ? 'Copiado' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/50 mt-4 space-y-2">
                    <button 
                      onClick={handleSimulatedDeposit}
                      disabled={isProcessing}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black p-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 disabled:opacity-50 text-xs uppercase"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      {isProcessing ? 'Confirmando...' : 'Confirmar Pagamento Simulado'}
                    </button>
                    <p className="text-[9px] text-slate-400 font-semibold">Clicando em confirmar, simulamos o callback instantâneo da API do banco creditando suas moedas.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: WITDRAWALS / SAQUE VIA PIX */}
          {activeTab === 'withdraw' && (
            <form onSubmit={handleSimulatedWithdrawal} className="space-y-4">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl p-4 shadow-sm relative">
                <Download className="absolute top-4 right-4 w-12 h-12 text-emerald-200/30" />
                <h3 className="font-black text-sm uppercase tracking-wider">Solicitação de Saque Pix</h3>
                <p className="text-emerald-50 text-[11px] mt-1 pr-6">Retire seu saldo em moedas de premiação diretamente para sua conta PIX bancária. Taxa de conversão: 100 Moedas = R$ 1,00.</p>
              </div>

              {/* Amount Inputs */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Quantidade de Moedas para Sacar</label>
                <div className="grid grid-cols-3 gap-2">
                  {[2000, 5000, 10000].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => { setWithdrawCoins(val); setCustomWithdrawCoins(''); }}
                      className={`p-2 rounded-xl border text-xs font-bold transition-all text-center flex flex-col justify-center items-center cursor-pointer ${withdrawCoins === val && !customWithdrawCoins ? 'bg-emerald-500 text-white border-emerald-400 shadow' : 'border-slate-150 text-slate-600 bg-white dark:bg-slate-800 dark:border-slate-700'}`}
                    >
                      <span className="font-black">{val.toLocaleString()}</span>
                      <span className="text-[9px] font-semibold opacity-75">R$ {val / 100}</span>
                    </button>
                  ))}
                </div>

                <div className="pt-1.5">
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">Ou especifique moedas personalizadas</span>
                  <input
                    type="number"
                    min="1000"
                    placeholder="Min: 1.000 moedas"
                    value={customWithdrawCoins}
                    onChange={e => { setCustomWithdrawCoins(e.target.value); setWithdrawCoins(0); }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-850 dark:text-slate-100"
                  />
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold mt-1 px-1">
                    <span>Mínimo: 1.000 moedas (R$ 10)</span>
                    <span className="text-emerald-600">Receberá: R$ {(getActiveWithdrawVal() / 100).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* PIX Destination key type selection */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Tipo de Chave PIX</label>
                <div className="grid grid-cols-4 gap-1.5 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl">
                  {([
                    { id: 'cpf', label: 'CPF' },
                    { id: 'phone', label: 'Celular' },
                    { id: 'email', label: 'E-mail' },
                    { id: 'random', label: 'Chave Aleatória' }
                  ] as const).map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => { setPixKeyType(item.id); setPixKey(''); }}
                      className={`py-1.5 rounded-lg font-bold text-[9px] sm:text-[10px] transition-all cursor-pointer ${pixKeyType === item.id ? 'bg-white dark:bg-slate-800 text-slate-850 dark:text-slate-105 shadow-sm font-extrabold' : 'text-slate-400'}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Informe a Chave PIX</label>
                  <input
                    required
                    type="text"
                    value={pixKey}
                    onChange={e => setPixKey(e.target.value)}
                    placeholder={
                      pixKeyType === 'cpf' ? '000.000.000-00' :
                      pixKeyType === 'phone' ? '(00) 90000-0000' :
                      pixKeyType === 'email' ? 'exemplo@email.com' : 'Sua chave aleatória de 32 caracteres'
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-850 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Withdraw Button triggers */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black p-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50 text-xs uppercase cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  {isProcessing ? 'Enviando...' : 'Confirmar Envio do Saque PIX'}
                </button>
                <div className="flex justify-center items-center gap-1 mt-3">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Saque 100% Garantido e Automático</span>
                </div>
              </div>
            </form>
          )}

          {onGoSettings && activeTab === 'info' && (
             <button 
                onClick={onGoSettings}
                className="w-full bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-bold p-4 rounded-xl flex items-center justify-center gap-2 transition-all mt-2 cursor-pointer shadow-sm"
             >
                <Settings className="w-5 h-5 text-slate-400" />
                Configurações da Conta
             </button>
          )}

          {/* Logout */}
          {activeTab === 'info' && (
            <button 
               onClick={onLogout}
               className="w-full bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400 font-bold p-4 rounded-xl flex items-center justify-center gap-2 transition-colors mt-4 border border-red-200/20 cursor-pointer"
            >
               <LogOut className="w-5 h-5" />
               Sair da Conta
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
