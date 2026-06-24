
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X, LifeBuoy, Activity, ClipboardList, Info, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../../context/AppContext';
import { Role } from '../../types';
import { Logo } from '../ui/Logo';
import { NotificationBell } from './NotificationBell';
import { QuickActionFAB } from './QuickActionFAB';

export const LayoutWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, logout, activeRole, setActiveRole, isAuthLoading } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => { 
    if (!isAuthLoading && !currentUser && !['/portal', '/login/'].some(p => location.pathname.startsWith(p))) {
      navigate('/portal', { replace: true }); 
    }
  }, [currentUser, isAuthLoading, location.pathname, navigate]);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {currentUser ? (
        <nav className="bg-white border-b border-slate-200 px-4 md:px-8 py-0 sticky top-0 z-[1000] shadow-sm transition-all h-20 flex items-center">
          <div className="container mx-auto flex justify-between items-center max-w-7xl">
            <Link to="/" className="flex items-center gap-4 group transition-all shrink-0">
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 group-hover:bg-white group-hover:border-primary/30 transition-all duration-300">
                <Logo className="h-7 md:h-9" />
              </div>
              <div className="hidden lg:flex flex-col border-l border-slate-200 pl-4 py-1">
                <span className="text-[12px] uppercase tracking-[0.2em] font-black text-slate-800 group-hover:text-primary transition-colors leading-tight">e-Convention</span>
                <span className="text-[9px] uppercase tracking-[0.1em] font-medium text-slate-400">FST Marrakech</span>
              </div>
            </Link>
            
            <div className="flex items-center justify-end gap-6 lg:gap-12 flex-1 min-w-0">
              {/* Desktop Navigation */}
              <div className="hidden xl:flex items-center gap-10 shrink-0 h-20">
                {[
                  { to: '/dashboard', label: activeRole === Role.STUDENT ? 'Tableau de bord' : 'Pilotage' },
                  { to: '/requests', label: 'Dossiers' },
                  ...(activeRole === Role.ENCADRANT_FST ? [{ to: '/my-students', label: 'Étudiants' }] : []),
                  ...(activeRole === Role.STUDENT ? [{ to: '/guide', label: 'Guide' }] : [])
                ].map((link) => (
                  <Link 
                    key={link.to} 
                    to={link.to} 
                    className={`h-full flex items-center text-[10px] uppercase font-bold tracking-[0.15em] transition-all border-b-2 ${location.pathname === link.to ? 'text-primary border-primary' : 'text-slate-500 border-transparent hover:text-primary hover:border-slate-300'}`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              <div className="flex items-center gap-4 lg:gap-8 shrink-0">
                <div className="flex items-center gap-4 border-r border-slate-200 pr-4 lg:pr-8">
                  <NotificationBell />
                  {activeRole === Role.STUDENT && (
                    <Link 
                      to="/support" 
                      className="text-slate-400 hover:text-primary transition-colors flex items-center gap-2 group"
                      title="Support"
                    >
                      <LifeBuoy size={18} className="group-hover:rotate-45 transition-transform" />
                      <span className="hidden lg:block text-[9px] font-black uppercase tracking-widest">Support</span>
                    </Link>
                  )}
                </div>
                
                <div className="flex items-center gap-5">
                  <div className="text-right leading-none hidden sm:block shrink-0">
                    <Link to="/profile" className="group/name">
                      <p className="text-[11px] font-black uppercase tracking-tight text-slate-800 group-hover:text-primary transition-colors text-right" title={currentUser.name}>
                        {currentUser.name}
                      </p>
                    </Link>
                    <div className="mt-1 flex justify-end">
                      {currentUser.roles && currentUser.roles.length > 1 ? (
                        <div className="relative group/role">
                          <select 
                            value={activeRole || ''} 
                            onChange={(e) => {
                              setActiveRole(e.target.value as Role);
                              navigate('/dashboard');
                            }}
                            className="appearance-none bg-slate-50 text-[9px] uppercase font-black tracking-widest rounded-md pl-3 pr-8 py-1.5 outline-none border border-slate-200 cursor-pointer hover:border-primary transition-all text-primary/80"
                          >
                            {currentUser.roles.map(r => (
                              <option key={r} value={r} className="bg-white text-slate-800">{r}</option>
                            ))}
                          </select>
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-primary/40 group-hover/role:text-primary transition-colors">
                            <Menu size={10} strokeWidth={3} />
                          </div>
                        </div>
                      ) : (
                        <p className="text-[9px] uppercase font-bold text-slate-400 tracking-widest">{currentUser?.roles?.[0]}</p>
                      )}
                    </div>
                  </div>

                  <button 
                    onClick={logout} 
                    className="p-2 text-slate-400 hover:text-destructive hover:bg-destructive/5 rounded-lg transition-all hidden sm:flex shrink-0 border border-transparent hover:border-destructive/10"
                    title="Déconnexion"
                  >
                    <LogOut size={18} />
                  </button>

                  <button 
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
                    className={`w-10 h-10 md:hidden rounded-lg transition-all shrink-0 flex items-center justify-center ${isMobileMenuOpen ? 'bg-destructive text-white' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}
                  >
                    {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Menu */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="md:hidden fixed inset-0 bg-background/60 backdrop-blur-sm z-[1999]"
                />
                <motion.div 
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="md:hidden fixed inset-y-0 right-0 w-[85%] max-w-sm bg-background z-[2000] flex flex-col shadow-2xl border-l border-border h-[100dvh] overflow-hidden"
                >
                  <div className="p-4 border-b border-border flex items-center justify-between bg-card shrink-0">
                    <div className="bg-white p-1.5 rounded-lg shadow-sm border border-border/50">
                      <Logo className="h-6" />
                    </div>
                    <button 
                      onClick={() => setIsMobileMenuOpen(false)} 
                      className="p-3 bg-red-50 text-red-500 rounded-2xl transition-all hover:bg-red-100 hover:text-red-600 border border-red-100 shadow-sm flex items-center justify-center shrink-0"
                      aria-label="Fermer"
                    >
                      <X size={24} strokeWidth={2.5} className="shrink-0" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-24 scrollbar-hide">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-4 px-2">Navigation</p>
                  <Link to="/dashboard" className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${location.pathname === '/dashboard' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-secondary/30 text-foreground hover:bg-secondary/50'}`}>
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                      <Activity size={18} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest">Tableau de Bord</span>
                  </Link>
                  <Link to="/requests" className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${location.pathname === '/requests' || location.pathname === '/conventions' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-secondary/30 text-foreground hover:bg-secondary/50'}`}>
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                      <ClipboardList size={18} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest">Mes Dossiers</span>
                  </Link>
                  {activeRole === Role.STUDENT && (
                    <Link to="/guide" className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${location.pathname === '/guide' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-secondary/30 text-foreground hover:bg-secondary/50'}`}>
                      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                        <Info size={18} />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest">Guide</span>
                    </Link>
                  )}
                  {activeRole === Role.ENCADRANT_FST && (
                    <Link to="/my-students" className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${location.pathname === '/my-students' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-secondary/30 text-foreground hover:bg-secondary/50'}`}>
                      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                        <Users size={18} />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest">Mes Étudiants</span>
                    </Link>
                  )}
                </div>

                  <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground px-2">Préférences & Compte</p>
                    
                    <Link to="/profile" className="flex items-center gap-4 p-4 bg-primary/5 border border-primary/10 rounded-2xl hover:bg-primary/10 transition-all">
                      <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shrink-0 shadow-lg shadow-primary/20">
                        {currentUser.avatarUrl ? (
                          <img src={currentUser.avatarUrl} alt="" className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                        ) : currentUser.name[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black uppercase tracking-tight text-foreground truncate">{currentUser.name}</p>
                        <p className="text-[8px] font-bold text-primary uppercase tracking-[0.2em] mt-0.5">Voir mon profil</p>
                      </div>
                    </Link>

                    {currentUser.roles && currentUser.roles.length > 1 && (
                      <div className="p-4 bg-secondary/30 rounded-2xl space-y-2 relative group/mobrole">
                        <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground px-1">Changer de rôle</p>
                        <div className="relative">
                          <select 
                            value={activeRole || ''} 
                            onChange={(e) => {
                              setActiveRole(e.target.value as Role);
                              navigate('/dashboard');
                              setIsMobileMenuOpen(false);
                            }}
                            className="bg-card text-foreground text-[10px] uppercase font-bold tracking-widest rounded-xl px-4 py-3 outline-none border border-border w-full appearance-none"
                          >
                            {currentUser.roles.map(r => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-primary/40">
                            <Menu size={14} strokeWidth={3} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
              </div>

              <div className="p-6 border-t border-border bg-card">
                <button onClick={logout} className="w-full p-4 bg-destructive text-destructive-foreground rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 shadow-lg shadow-destructive/20 active:scale-[0.98] transition-all">
                  <LogOut size={18} />
                  Déconnexion
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  ) : null}
      <main className="flex-1 transition-colors relative overflow-x-hidden pb-12 md:pb-0">{children}</main>
      <QuickActionFAB />
      <footer className="py-12 md:py-16 border-t border-border text-center space-y-6 opacity-60 transition-all mb-20 md:mb-0">
        <div className="flex flex-col items-center gap-4">
          <div className="bg-white/50 p-2 rounded-xl grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
            <Logo className="h-6 md:h-8 mx-auto" />
          </div>
          <p className="text-[8px] md:text-[9px] uppercase tracking-[0.3em] font-black text-muted-foreground">Faculté des Sciences et Techniques de Marrakech</p>
          <div className="w-12 h-px bg-border mx-auto" />
          <p className="text-[7px] uppercase tracking-widest font-bold text-muted-foreground/60">© 2025 • Université Cadi Ayyad</p>
        </div>
      </footer>
    </div>
  );
};
