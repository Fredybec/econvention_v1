
import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../../context/AppContext';
import { Role } from '../../types';
import { Card } from '../../components/ui/Card';

export const LoginView = () => {
  const { type } = useParams<{ type: string }>();
  const { login, loginWithGoogle, isAuthLoading, users, updateCurrentPortal } = useAppContext();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [showGoogleMock, setShowGoogleMock] = useState(false);
  const [loginWithPass, setLoginWithPass] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [mockEmail, setMockEmail] = useState('');

  const handleGoogleLogin = async () => {
    setError('');
    const user = await loginWithGoogle();
    if (user) {
      const isStudentPortal = type === 'student';
      const hasStudentRole = user.roles?.includes(Role.STUDENT);
      const hasAdminRole = user.roles?.some(r => r !== Role.STUDENT);

      if (isStudentPortal && !hasStudentRole) {
        setError('Ce compte n\'est pas un compte étudiant. Veuillez utiliser le portail administration.');
        return;
      }
      if (!isStudentPortal && !hasAdminRole) {
        setError('Ce compte est un compte étudiant. Veuillez utiliser le portail étudiant.');
        return;
      }

      const portal = isStudentPortal ? 'student' : (user.roles?.includes(Role.SUPERADMIN) ? 'superadmin' : 'admin');
      updateCurrentPortal(portal);

      if (portal === 'superadmin') navigate('/superadmin');
      else navigate('/dashboard');
    } else {
      setError("Accès refusé : Votre compte n'est pas répertorié dans la base de données. Veuillez contacter le support technique à support.pfe@uca.ac.ma.");
    }
  };

  const filteredUsers = users.filter(u => {
    if (type === 'student') return u.roles?.includes(Role.STUDENT);
    return u.roles?.some(r => r !== Role.STUDENT);
  });
  
  const handleLogin = async (emailInput: string, passwordInput?: string) => {
    setError('');
    
    // If we already know the user needs a password from state, but none provided
    if (loginWithPass && !passwordInput) {
      setError('Veuillez saisir votre mot de passe.');
      return;
    }

    const user = await login(emailInput, passwordInput);
    if (user) {
      const isStudentPortal = type === 'student';
      const hasStudentRole = user.roles?.includes(Role.STUDENT);
      const hasAdminRole = user.roles?.some(r => r !== Role.STUDENT);

      if (isStudentPortal && !hasStudentRole) {
        setError('Ce compte n\'est pas un compte étudiant. Veuillez utiliser le portail administration.');
        return;
      }
      if (!isStudentPortal && !hasAdminRole) {
        setError('Ce compte est un compte étudiant. Veuillez utiliser le portail étudiant.');
        return;
      }

      const portal = isStudentPortal ? 'student' : (user.roles?.includes(Role.SUPERADMIN) ? 'superadmin' : 'admin');
      updateCurrentPortal(portal);

      if (portal === 'superadmin') navigate('/superadmin');
      else navigate('/dashboard');
    } else {
      // If user has a password but didn't provide one, we show the password field
      // We check the users list just for UI discovery if possible, but the login function handles errors
      const targetUser = users.find(u => u.email.toLowerCase() === emailInput.toLowerCase());
      if (targetUser) {
        setError('Authentification échouée. Veuillez vérifier vos informations.');
      } else {
        setError('Email non reconnu. Votre compte n\'est pas répertorié dans la base de données.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 md:p-6 text-left transition-colors duration-300">
      <AnimatePresence>
        {isAuthLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] bg-background/90 backdrop-blur-md flex flex-col items-center justify-center space-y-6"
          >
            <div className="relative">
              <div className="w-20 h-20 border-4 border-primary/20 rounded-full animate-pulse" />
              <Loader2 className="w-10 h-10 text-primary animate-spin absolute inset-0 m-auto" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-foreground uppercase tracking-tighter">Connexion en cours</h3>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold animate-pulse">Prière de patienter...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-lg space-y-6 animate-in fade-in duration-700">
        <div className="text-center space-y-4 mb-8">
          <Link to="/portal" className="text-[9px] text-muted-foreground uppercase tracking-widest hover:text-primary inline-flex items-center gap-2 font-bold transition-colors">
            <ChevronRight size={12} className="rotate-180" /> Retour au Portail
          </Link>
        </div>

        <Card className="p-8 md:p-12 border border-border shadow-sm rounded-[2.5rem] bg-card space-y-8">
           <div className="text-center space-y-2">
             <h2 className="text-lg md:text-xl text-foreground tracking-tight font-bold uppercase">Connexion {type === 'student' ? 'Étudiant' : 'Administration'}</h2>
             <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Portail Officiel FST Marrakech</p>
           </div>

           <div className="space-y-4">
              {!loginWithPass ? (
                <>
                  <button 
                    onClick={handleGoogleLogin}
                    disabled={isAuthLoading}
                    className="w-full flex items-center justify-center gap-4 p-4 bg-background border border-border rounded-2xl hover:border-primary hover:shadow-sm transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAuthLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    ) : (
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    )}
                    <span className="text-xs font-bold text-foreground uppercase tracking-widest">
                      {isAuthLoading ? 'Vérification...' : 'Continuer avec Google'}
                    </span>
                  </button>
                  <button 
                    onClick={() => setLoginWithPass(true)}
                    className="w-full text-center text-[9px] uppercase font-bold tracking-widest text-muted-foreground hover:text-primary transition-colors"
                  >
                    Ou se connecter avec email & mot de passe
                  </button>
                </>
              ) : (
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleLogin(loginEmail, loginPassword);
                  }}
                  className="space-y-4 animate-in slide-in-from-bottom-2 duration-300"
                >
                  <div className="space-y-2">
                    <label className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground ml-1">Email Institutionnel</label>
                    <input 
                      type="email"
                      required
                      placeholder="email@uca.ac.ma"
                      className="w-full p-4 bg-background border border-border rounded-xl focus:border-primary outline-none text-xs font-medium"
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground ml-1">Mot de passe</label>
                    <input 
                      type="password"
                      placeholder="••••••••"
                      className="w-full p-4 bg-background border border-border rounded-xl focus:border-primary outline-none text-xs font-medium"
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full p-4 bg-primary text-primary-foreground rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-all shadow-sm"
                  >
                    Se connecter
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setLoginWithPass(false);
                      setLoginEmail('');
                      setLoginPassword('');
                      setError('');
                    }}
                    className="w-full text-center text-[9px] uppercase font-bold tracking-widest text-muted-foreground hover:text-primary transition-colors"
                  >
                    Retour à la connexion Google
                  </button>
                </form>
              )}
              {error && <p className="text-[9px] text-red-500 font-bold uppercase tracking-tight text-center bg-red-500/5 p-2 rounded-lg border border-red-500/10">{error}</p>}
           </div>
        </Card>

        <footer className="text-center pt-8">
          <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground/40">
            © {new Date().getFullYear()} FST Marrakech • Support: support.pfe@uca.ac.ma
          </p>
        </footer>
      </div>
    </div>
  );
};
