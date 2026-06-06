import React, { useState } from 'react';
import { auth, db } from '../lib/firebase';
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
  const [photoURL, setPhotoURL] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    const checkRedirect = async () => {
      try {
        setLoading(true);
        const userCredential = await getRedirectResult(auth);
        if (userCredential) {
          const userRef = doc(db, 'users', userCredential.user.uid);
          const userDoc = await getDoc(userRef);
          
          let userData;
          if (!userDoc.exists()) {
            const autoAdmin = userCredential.user.email === 'l2xbrasil@gmail.com' ? 'admin' : 'player';
            userData = {
              uid: userCredential.user.uid,
              name: userCredential.user.displayName || 'Usuário',
              email: userCredential.user.email || '',
              photoURL: userCredential.user.photoURL || '',
              role: autoAdmin,
              coins: autoAdmin === 'admin' ? 0 : 500
            };
            await setDoc(userRef, userData);
          } else {
            userData = userDoc.data();
          }
          
          onLoginSuccess(userData, userData.role || 'player');
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
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          onLoginSuccess(data, data.role || 'player');
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
        const newUser = {
          uid: userCredential.user.uid,
          name,
          cpf: cCpf,
          email,
          phone,
          photoURL,
          coins: 500,
          role: 'player'
        };
        await setDoc(doc(db, 'users', userCredential.user.uid), newUser);
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
      const userDoc = await getDoc(userRef);
      
      let userData;
      if (!userDoc.exists()) {
        const autoAdmin = userCredential.user.email === 'l2xbrasil@gmail.com' ? 'admin' : 'player';
        userData = {
          uid: userCredential.user.uid,
          name: userCredential.user.displayName || 'Usuário',
          email: userCredential.user.email || '',
          photoURL: userCredential.user.photoURL || '',
          role: autoAdmin,
          coins: autoAdmin === 'admin' ? 0 : 500
        };
        await setDoc(userRef, userData);
      } else {
        userData = userDoc.data();
      }
      
      onLoginSuccess(userData, userData.role || 'player');
    } catch (err: any) {
      setError(err.message || 'Erro após login com Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
       <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 relative">
          <button 
            onClick={onGoBack}
            className="absolute top-6 right-6 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
          >
            Voltar
          </button>

          <div className="w-full h-44 mb-6 rounded-2xl overflow-hidden relative border border-slate-100 shadow-sm bg-slate-50 flex items-center justify-center">
             <img 
               src={loginIllustration} 
               alt="Bingo Live" 
               referrerPolicy="no-referrer"
               className="w-full h-full object-cover"
             />
          </div>

          <h2 className="text-3xl font-black text-slate-800 mb-6">
            {isLogin ? 'Login' : 'Cadastro'}
          </h2>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <button 
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white border border-slate-200 text-slate-700 font-bold p-4 rounded-xl flex items-center justify-center gap-3 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5"/>
              Entrar com Google
            </button>
            
            <div className="relative py-4 flex items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink-0 mx-4 text-slate-400 text-sm font-bold">ou use seu CPF</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <form onSubmit={handlePlayerAuth} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">CPF</label>
                <input required type="text" value={cpf} onChange={e => setCpf(e.target.value)} placeholder="Somente números" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Senha</label>
                <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>

              {!isLogin && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo</label>
                    <input required={!isLogin} type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">E-mail (Opcional)</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Telefone (Opcional)</label>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">URL da Foto (Opcional)</label>
                    <input type="url" value={photoURL} onChange={e => setPhotoURL(e.target.value)} placeholder="https://..." className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
                  </div>
                </>
              )}

              <button disabled={loading} type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold p-4 rounded-xl mt-4 transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50">
                {isLogin ? 'Entrar com CPF' : 'Cadastrar'}
              </button>
            </form>

            <div className="text-center mt-4">
               <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-emerald-600 font-bold text-sm hover:underline">
                 {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça login'}
               </button>
            </div>
          </div>
       </div>
    </div>
  );
}
