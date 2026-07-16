import React, { useState } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface AuthScreenProps {
  onLoginSuccess: (user: any, role: 'admin' | 'player') => void;
  onGoBack: () => void;
}

export function AuthScreen({ onLoginSuccess, onGoBack }: AuthScreenProps) {
  const loginIllustration = new URL('../assets/images/login_illustration_1780710914633.png', import.meta.url).href;
  const [isLogin, setIsLogin] = useState(true);
  
  // Registration / Login fields
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  
  const PRESET_AVATARS = [
    { name: 'Gamer Pixel', url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Jack' },
    { name: 'Sorte Mítica', url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Sophia' },
    { name: 'Ouro Fino', url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Felix' },
    { name: 'Ciborgue Bingo', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Robo1' },
    { name: 'Fúria Neon', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Robo2' },
    { name: 'Mente Quente', url: 'https://api.dicebear.com/7.x/mindblown/svg?seed=Mind' },
    { name: 'Trevo de Ouro', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Lucky' },
    { name: 'Mago Real', url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Garra' },
  ];

  const [photoURL, setPhotoURL] = useState(PRESET_AVATARS[0].url);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const maskCpf = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11);
    if (raw.length <= 3) return raw;
    if (raw.length <= 6) return `${raw.slice(0, 3)}.${raw.slice(3)}`;
    if (raw.length <= 9) return `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6)}`;
    return `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6, 9)}-${raw.slice(9, 11)}`;
  };

  const maskPhone = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11);
    if (raw.length <= 2) return raw;
    if (raw.length <= 7) return `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
  };

  const getInitialCoins = async (autoAdmin?: string) => {
    if (autoAdmin === 'admin') return 0;
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const docSnap = await getDoc(doc(db, 'settings', 'global_automation'));
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.welcomeBonusEnabled === false) {
          return 0;
        }
      }
    } catch (err) {
      console.warn("Failed to check welcome bonus setting, falling back to 500:", err);
    }
    return 500;
  };

  React.useEffect(() => {
    const checkRedirect = async () => {
      try {
        setLoading(true);
        const userCredential = await getRedirectResult(auth);
        if (userCredential) {
          const userRef = doc(db, 'users', userCredential.user.uid);
          let userDoc;
          try {
            userDoc = await getDoc(userRef);
          } catch (dbErr) {
            handleFirestoreError(dbErr, OperationType.GET, `users/${userCredential.user.uid}`);
          }
          
          let userData;
          if (!userDoc.exists()) {
            const autoAdmin = userCredential.user.email === 'l2xbrasil@gmail.com' ? 'admin' : 'player';
            const initialCoins = await getInitialCoins(autoAdmin);
            userData = {
              uid: userCredential.user.uid,
              name: userCredential.user.displayName || 'Usuário',
              email: userCredential.user.email || '',
              photoURL: userCredential.user.photoURL || '',
              role: autoAdmin,
              coins: initialCoins
            };
            try {
              await setDoc(userRef, userData);
            } catch (dbErr) {
              handleFirestoreError(dbErr, OperationType.CREATE, `users/${userCredential.user.uid}`);
            }
          } else {
            userData = userDoc.data();
          }
          
          onLoginSuccess({ uid: userCredential.user.uid, ...userData }, userData.role || 'player');
        }
      } catch (err: any) {
        setError(err.message || 'Erro no login com Google');
      } finally {
        setLoading(false);
      }
    };
    checkRedirect();
  }, [onLoginSuccess]);

  const cleanCpf = (c: string) => c.replace(/\D/g, '');

  const handlePlayerAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cCpf = cleanCpf(cpf);
    if (cCpf.length !== 11) {
      setError('CPF inválido. Digite 11 números.');
      return;
    }
    
    setLoading(true);
    const mockEmail = `${cCpf}@bingolive.local`;

    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, mockEmail, password);
        let userDoc;
        try {
          userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        } catch (dbErr) {
          handleFirestoreError(dbErr, OperationType.GET, `users/${userCredential.user.uid}`);
        }
        if (userDoc.exists()) {
          const data = userDoc.data();
          onLoginSuccess({ uid: userCredential.user.uid, ...data }, data.role || 'player');
        } else {
          // Fallback if doc doesn't exist
          onLoginSuccess({
            uid: userCredential.user.uid,
            name: 'Jogador',
            coins: 500,
            role: 'player'
          }, 'player');
        }
      } else {
        if (!name.trim()) {
           setError('Nome é obrigatório para cadastro.');
           setLoading(false);
           return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, mockEmail, password);
        const initialCoins = await getInitialCoins('player');
        const newUser = {
          uid: userCredential.user.uid,
          name,
          cpf: cCpf,
          email,
          phone,
          photoURL,
          coins: initialCoins,
          role: 'player'
        };
        try {
          await setDoc(doc(db, 'users', userCredential.user.uid), newUser);
        } catch (dbErr) {
          handleFirestoreError(dbErr, OperationType.CREATE, `users/${userCredential.user.uid}`);
        }
        onLoginSuccess(newUser, 'player');
      }
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential') {
        setError('CPF ou senha incorretos. Se não tem conta, clique em Cadastrar-se.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este CPF já está cadastrado.');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else {
        setError(err.message || 'Erro na autenticação');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    const provider = new GoogleAuthProvider();
    let userCredential = null;
    
    try {
      userCredential = await signInWithPopup(auth, provider);
    } catch (err: any) {
      if (err.message && (err.message.includes('popup-closed-by-user') || err.message.includes('Cross-Origin'))) {
         try {
            await signInWithRedirect(auth, provider);
            return; // Wait for redirect
         } catch (redirectErr: any) {
            setError(redirectErr.message || 'Erro com o redirecionamento. Use uma nova aba.');
            setLoading(false);
            return;
         }
      } else {
         setError(err.message || 'Erro no login com Google.');
         setLoading(false);
         return;
      }
    }
    
    try {
      if (!userCredential) return;
      const userRef = doc(db, 'users', userCredential.user.uid);
      let userDoc;
      try {
        userDoc = await getDoc(userRef);
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.GET, `users/${userCredential.user.uid}`);
      }
      
      let userData;
      if (!userDoc.exists()) {
        const autoAdmin = userCredential.user.email === 'l2xbrasil@gmail.com' ? 'admin' : 'player';
        const initialCoins = await getInitialCoins(autoAdmin);
        userData = {
          uid: userCredential.user.uid,
          name: userCredential.user.displayName || 'Usuário',
          email: userCredential.user.email || '',
          photoURL: userCredential.user.photoURL || '',
          role: autoAdmin,
          coins: initialCoins
        };
        try {
          await setDoc(userRef, userData);
        } catch (dbErr) {
          handleFirestoreError(dbErr, OperationType.CREATE, `users/${userCredential.user.uid}`);
        }
      } else {
        userData = userDoc.data();
      }
      
      onLoginSuccess({ uid: userCredential.user.uid, ...userData }, userData.role || 'player');
    } catch (err: any) {
      setError(err.message || 'Erro após login com Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 sm:p-6 transition-colors">
       <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl shadow-xl p-6 sm:p-8 relative transition-colors">
          <button 
            onClick={onGoBack}
            className="absolute top-6 right-6 text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            Voltar
          </button>

          <div className="w-full h-44 mb-6 rounded-2xl overflow-hidden relative border border-slate-100 dark:border-slate-800 shadow-sm bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
             <img 
               src={loginIllustration} 
               alt="Bingo Live" 
               referrerPolicy="no-referrer"
               className="w-full h-full object-cover"
             />
          </div>

          <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-6">
            {isLogin ? 'Login' : 'Cadastro'}
          </h2>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm font-medium mb-4 border border-red-200/10">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <button 
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-bold p-4 rounded-xl flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5"/>
              Entrar com Google
            </button>
            
            <div className="relative py-4 flex items-center">
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
              <span className="flex-shrink-0 mx-4 text-slate-405 dark:text-slate-500 text-sm font-bold">ou use seu CPF</span>
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
            </div>

             <form onSubmit={handlePlayerAuth} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">CPF</label>
                <input required type="text" value={cpf} onChange={e => setCpf(maskCpf(e.target.value))} placeholder="000.000.000-00" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 dark:text-white font-bold" />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Senha</label>
                <input required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 dígitos" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 dark:text-white font-bold" />
              </div>

              {!isLogin && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nome Completo / Apelido</label>
                    <input required={!isLogin} type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Como você quer ser chamado" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 dark:text-white font-bold" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">E-mail (Opcional)</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 dark:text-white font-bold" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Telefone (Opcional)</label>
                    <input type="tel" value={phone} onChange={e => setPhone(maskPhone(e.target.value))} placeholder="(00) 00000-0000" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 dark:text-white font-bold" />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Escolha seu Avatar Gaming</label>
                    <div className="grid grid-cols-4 gap-2 mb-3 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                      {PRESET_AVATARS.map((av) => (
                        <button
                          key={av.name}
                          type="button"
                          onClick={() => setPhotoURL(av.url)}
                          className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all p-1 hover:scale-105 active:scale-95 flex items-center justify-center ${photoURL === av.url ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 ring-2 ring-amber-300' : 'border-transparent bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                          title={av.name}
                        >
                          <img src={av.url} alt={av.name} className="w-full h-full object-contain" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Ou cole uma URL de Foto Personalizada</label>
                    <input type="url" value={photoURL} onChange={e => setPhotoURL(e.target.value)} placeholder="https://..." className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs text-slate-800 dark:text-white font-bold" />
                  </div>
                </>
              )}

              <button disabled={loading} type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold p-4 rounded-xl mt-4 transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50 cursor-pointer">
                {isLogin ? 'Entrar com CPF' : 'Cadastrar'}
              </button>
            </form>

            <div className="text-center mt-4">
               <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-emerald-600 dark:text-emerald-400 font-bold text-sm hover:underline cursor-pointer">
                 {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça login'}
               </button>
            </div>
          </div>
       </div>
    </div>
  );
}
